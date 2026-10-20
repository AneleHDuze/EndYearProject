using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthcareAPI.Models;
using HealthcareAPI.Data;
using Microsoft.AspNetCore.Authorization;
using System.Text.RegularExpressions;
using MySqlConnector;

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

        // GET: api/Patient
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

        // GET: api/Patient/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Patient>> GetPatient(int id)
        {
            try
            {
                var patient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.PatientID == id);

                if (patient == null)
                    return NotFound($"Patient with ID {id} not found");

                return Ok(patient);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching patient: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // POST: api/Patient/register
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

                // ---------- FORMAT + REQUIRED VALIDATION ----------

                // ID Number: required + exactly 13 digits
                if (string.IsNullOrWhiteSpace(patient.IDNumber) ||
                    !Regex.IsMatch(patient.IDNumber, @"^\d{13}$"))
                {
                    return BadRequest(new
                    {
                        field = "idNumber",
                        message = "ID number must be exactly 13 digits."
                    });
                }

                // Contact: required + 10 digits, starts with 0
                if (string.IsNullOrWhiteSpace(patient.Contact) ||
                    !Regex.IsMatch(patient.Contact, @"^0\d{9}$"))
                {
                    return BadRequest(new
                    {
                        field = "contact",
                        message = "Contact number must be 10 digits and start with 0."
                    });
                }

                // Email: required
                if (string.IsNullOrWhiteSpace(patient.Email))
                {
                    return BadRequest(new
                    {
                        field = "email",
                        message = "Email is required."
                    });
                }

                // Email: valid format
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

                // Medical History: required
                if (string.IsNullOrWhiteSpace(patient.MedicalHistory))
                {
                    return BadRequest(new
                    {
                        field = "medicalHistory",
                        message = "Medical history is required."
                    });
                }

                // ---------- SERVICE-LAYER DUPLICATE CHECKS ----------

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

                // ---------- AUTO-GENERATE DOB FROM SA ID ----------

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
                }

                patient.DateRegistered = DateTime.Now;

                // ---------- INSERT WITH CONCURRENCY CATCH ----------

                _context.Patients.Add(patient);

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException dbEx)
                    when (dbEx.InnerException is MySqlException mysqlEx && mysqlEx.Number == 1062)
                {
                    Console.WriteLine("Race condition detected on patient registration (error 1062)");
                    var msg = mysqlEx.Message.ToLower();

                    if (msg.Contains("unique_patient_idnumber"))
                    {
                        return Conflict(new
                        {
                            field = "idNumber",
                            message = "A patient with this ID number was just registered by another receptionist."
                        });
                    }
                    else if (msg.Contains("unique_patient_contact"))
                    {
                        return Conflict(new
                        {
                            field = "contact",
                            message = "A patient with this contact number was just registered by another receptionist."
                        });
                    }
                    else if (msg.Contains("ix_patients_email") || msg.Contains("unique_patient_email"))
                    {
                        return Conflict(new
                        {
                            field = "email",
                            message = "A patient with this email was just registered by another receptionist."
                        });
                    }

                    return Conflict(new
                    {
                        message = "This patient was just registered by another receptionist."
                    });
                }

                Console.WriteLine($"Patient registered with ID: {patient.PatientID}");
                return Ok(patient);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating patient: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Helper: Extract DOB from SA ID number
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