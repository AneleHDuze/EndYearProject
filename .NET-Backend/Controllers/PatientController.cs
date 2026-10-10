using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthcareAPI.Models;
using HealthcareAPI.Data;
using Microsoft.AspNetCore.Authorization;
using System.Text.RegularExpressions;

namespace HealthcareAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PatientController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PatientController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ============================================
        // GET: api/Patient
        // ============================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Patient>>> GetPatients()
        {
            try
            {
                var patients = await _context.Patients
                    .OrderBy(p => p.Name)
                    .ToListAsync();

                return Ok(patients);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching patients: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Patient/5
        // ============================================
        [HttpGet("{id}")]
        public async Task<ActionResult<Patient>> GetPatient(int id)
        {
            try
            {
                var patient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.PatientID == id);

                if (patient == null)
                {
                    return NotFound($"Patient with ID {id} not found");
                }

                return Ok(patient);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching patient: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // POST: api/Patient/register
        // Validates format + checks duplicates by ID, phone, and email
        // Auto-generates Date of Birth from SA ID number
        // ============================================
        [HttpPost("register")]
        [Authorize(Roles = "Receptionist,Admin")]
        public async Task<ActionResult<Patient>> RegisterPatient([FromBody] Patient patient)
        {
            try
            {
                Console.WriteLine($"Registering patient: {patient.Name}");
                Console.WriteLine($"   ID Number: {patient.IDNumber}");
                Console.WriteLine($"   Contact: {patient.Contact}");
                Console.WriteLine($"   Gender: {patient.Gender}");
                Console.WriteLine($"   Email: {patient.Email}");
                Console.WriteLine($"   DOB (from client): {patient.DateOfBirth}");

                // ============================================
                // FORMAT VALIDATION
                // ============================================

                // ID Number: exactly 13 digits
                if (string.IsNullOrWhiteSpace(patient.IDNumber) ||
                    !Regex.IsMatch(patient.IDNumber, @"^\d{13}$"))
                {
                    return BadRequest(new
                    {
                        field = "idNumber",
                        message = "ID number must be exactly 13 digits."
                    });
                }

                // Contact: 10 digits, starts with 0
                if (string.IsNullOrWhiteSpace(patient.Contact) ||
                    !Regex.IsMatch(patient.Contact, @"^0\d{9}$"))
                {
                    return BadRequest(new
                    {
                        field = "contact",
                        message = "Contact number must be 10 digits and start with 0."
                    });
                }

                // Email: valid format (optional field, but if provided must be valid)
                if (!string.IsNullOrWhiteSpace(patient.Email))
                {
                    try
                    {
                        var addr = new System.Net.Mail.MailAddress(patient.Email);
                        if (addr.Address != patient.Email)
                        {
                            return BadRequest(new
                            {
                                field = "email",
                                message = "Invalid email format."
                            });
                        }
                    }
                    catch
                    {
                        return BadRequest(new
                        {
                            field = "email",
                            message = "Invalid email format."
                        });
                    }
                }

                // ============================================
                // DUPLICATE CHECK: ID Number
                // ============================================
                var existingByIdNumber = await _context.Patients
                    .FirstOrDefaultAsync(p => p.IDNumber == patient.IDNumber);

                if (existingByIdNumber != null)
                {
                    return Conflict(new
                    {
                        field = "idNumber",
                        message = "A patient with this ID number already exists.",
                        existingPatientID = existingByIdNumber.PatientID
                    });
                }

                // ============================================
                // DUPLICATE CHECK: Contact (phone)
                // ============================================
                if (!string.IsNullOrWhiteSpace(patient.Contact))
                {
                    var existingByPhone = await _context.Patients
                        .FirstOrDefaultAsync(p => p.Contact == patient.Contact);

                    if (existingByPhone != null)
                    {
                        return Conflict(new
                        {
                            field = "contact",
                            message = "A patient with this contact number already exists.",
                            existingPatientID = existingByPhone.PatientID
                        });
                    }
                }

                // ============================================
                // DUPLICATE CHECK: Email
                // ============================================
                if (!string.IsNullOrWhiteSpace(patient.Email))
                {
                    var existingByEmail = await _context.Patients
                        .FirstOrDefaultAsync(p => p.Email == patient.Email);

                    if (existingByEmail != null)
                    {
                        return Conflict(new
                        {
                            field = "email",
                            message = "A patient with this email already exists.",
                            existingPatientID = existingByEmail.PatientID
                        });
                    }
                }

                // ============================================
                // AUTO-GENERATE DOB FROM SA ID IF NOT PROVIDED
                // SA ID format: YYMMDDSSSSSCCZ
                // ============================================
                if (!patient.DateOfBirth.HasValue
                    && !string.IsNullOrEmpty(patient.IDNumber)
                    && patient.IDNumber.Length == 13)
                {
                    var parsedDob = ParseSouthAfricanIdDateOfBirth(patient.IDNumber);
                    if (parsedDob.HasValue)
                    {
                        patient.DateOfBirth = parsedDob.Value;
                        Console.WriteLine($"   DOB auto-generated from ID: {parsedDob.Value:yyyy-MM-dd}");
                    }
                    else
                    {
                        Console.WriteLine($"   Could not parse DOB from ID — invalid date portion");
                    }
                }

                // Set registration date
                patient.DateRegistered = DateTime.Now;

                _context.Patients.Add(patient);
                await _context.SaveChangesAsync();

                Console.WriteLine($"Patient registered with ID: {patient.PatientID}");

                return Ok(patient);
            }
            catch (DbUpdateException dbEx)
            {
                Console.WriteLine($"Database error: {dbEx.Message}");
                Console.WriteLine($"Inner exception: {dbEx.InnerException?.Message}");
                return StatusCode(500, new
                {
                    error = "Database error occurred",
                    details = dbEx.InnerException?.Message
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating patient: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // Helper: Extract Date of Birth from SA ID number
        // Format: YYMMDDSSSSSCCZ (13 digits)
        // Century rule:
        //   YY 00-25 -> 2000-2025
        //   YY 26-99 -> 1926-1999
        // ============================================
        private DateTime? ParseSouthAfricanIdDateOfBirth(string idNumber)
        {
            if (string.IsNullOrEmpty(idNumber) || idNumber.Length != 13)
                return null;

            if (!int.TryParse(idNumber.Substring(0, 2), out int yy)) return null;
            if (!int.TryParse(idNumber.Substring(2, 2), out int mm)) return null;
            if (!int.TryParse(idNumber.Substring(4, 2), out int dd)) return null;

            int year = yy <= 25 ? 2000 + yy : 1900 + yy;

            if (mm < 1 || mm > 12) return null;
            if (dd < 1 || dd > 31) return null;

            try
            {
                return new DateTime(year, mm, dd);
            }
            catch
            {
                return null;
            }
        }
    }
}