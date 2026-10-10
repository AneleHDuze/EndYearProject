using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthcareAPI.Models;
using HealthcareAPI.Data;
using HealthcareAPI.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace HealthcareAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PrescriptionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PrescriptionController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ============================================
        // GET: api/Prescription/patient/5
        // ============================================
        [HttpGet("patient/{patientId}")]
        public async Task<IActionResult> GetPrescriptionsByPatient(int patientId)
        {
            try
            {
                Console.WriteLine($"Fetching prescriptions for patient: {patientId}");

                var prescriptions = await _context.Prescriptions
                    .Include(p => p.MedicalRecord)
                    .ThenInclude(mr => mr.Patient)
                    .Where(p => p.MedicalRecord.PatientID == patientId)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new
                    {
                        p.PrescriptionID,
                        p.RecordID,
                        p.Medication,
                        p.Dosage,
                        p.Duration,
                        p.Instructions,
                        p.CreatedAt,
                        VisitDate = p.MedicalRecord.VisitDate,
                        Diagnosis = p.MedicalRecord.Diagnosis,
                        PatientName = p.MedicalRecord.Patient.Name,
                        PatientID = p.MedicalRecord.Patient.PatientID
                    })
                    .ToListAsync();

                Console.WriteLine($"Found {prescriptions.Count} prescriptions");
                return Ok(prescriptions);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // POST: api/Prescription (single prescription)
        // ============================================
        [HttpPost]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> CreatePrescription([FromBody] PrescriptionDTO dto)
        {
            try
            {
                Console.WriteLine("========================================");
                Console.WriteLine("Creating Prescription");
                Console.WriteLine("========================================");
                Console.WriteLine($"   RecordID: {dto.RecordID}");
                Console.WriteLine($"   Medication: {dto.Medication}");
                Console.WriteLine($"   Dosage: {dto.Dosage}");
                Console.WriteLine($"   Duration: {dto.Duration}");

                var medicalRecord = await _context.MedicalRecords
                    .FirstOrDefaultAsync(mr => mr.RecordID == dto.RecordID);

                if (medicalRecord == null)
                {
                    Console.WriteLine($"Medical record with ID {dto.RecordID} NOT found");
                    return BadRequest($"Medical record with ID {dto.RecordID} not found. Please create a consultation first.");
                }
                Console.WriteLine($"Medical record found: {medicalRecord.RecordID}");

                var prescription = new Prescription
                {
                    RecordID = dto.RecordID,
                    Medication = dto.Medication,
                    Dosage = dto.Dosage,
                    Duration = dto.Duration,
                    Instructions = dto.Instructions ?? string.Empty,
                    CreatedAt = DateTime.Now
                };

                _context.Prescriptions.Add(prescription);
                await _context.SaveChangesAsync();

                Console.WriteLine($"Prescription created with ID: {prescription.PrescriptionID}");
                Console.WriteLine("========================================");

                return Ok(new
                {
                    message = "Prescription created successfully",
                    prescriptionID = prescription.PrescriptionID,
                    prescription = prescription
                });
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
                Console.WriteLine($"Error creating prescription: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // POST: api/Prescription/batch
        // Save multiple medications for the same medical record
        // ============================================
        [HttpPost("batch")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> CreatePrescriptionsBatch([FromBody] List<PrescriptionDTO> prescriptions)
        {
            try
            {
                Console.WriteLine("========================================");
                Console.WriteLine("Creating Batch Prescriptions");
                Console.WriteLine("========================================");

                if (prescriptions == null || prescriptions.Count == 0)
                {
                    return BadRequest("No prescriptions provided");
                }

                var recordId = prescriptions.First().RecordID;
                Console.WriteLine($"   RecordID: {recordId}");
                Console.WriteLine($"   Count: {prescriptions.Count}");

                var medicalRecord = await _context.MedicalRecords
                    .FirstOrDefaultAsync(mr => mr.RecordID == recordId);

                if (medicalRecord == null)
                {
                    Console.WriteLine($"Medical record {recordId} not found");
                    return BadRequest($"Medical record with ID {recordId} not found. Please create a consultation first.");
                }

                foreach (var dto in prescriptions)
                {
                    if (string.IsNullOrWhiteSpace(dto.Medication) ||
                        string.IsNullOrWhiteSpace(dto.Dosage) ||
                        string.IsNullOrWhiteSpace(dto.Duration))
                    {
                        return BadRequest("Medication, dosage, and duration are required for every entry.");
                    }
                }

                var createdList = new List<Prescription>();

                foreach (var dto in prescriptions)
                {
                    var prescription = new Prescription
                    {
                        RecordID = dto.RecordID,
                        Medication = dto.Medication.Trim(),
                        Dosage = dto.Dosage.Trim(),
                        Duration = dto.Duration.Trim(),
                        Instructions = dto.Instructions?.Trim() ?? string.Empty,
                        CreatedAt = DateTime.Now
                    };

                    _context.Prescriptions.Add(prescription);
                    createdList.Add(prescription);
                }

                await _context.SaveChangesAsync();

                Console.WriteLine($"Saved {createdList.Count} prescriptions");
                Console.WriteLine("========================================");

                return Ok(new
                {
                    message = $"{createdList.Count} prescription(s) saved",
                    count = createdList.Count,
                    prescriptions = createdList
                });
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
                Console.WriteLine($"Error creating batch prescriptions: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Prescription/5
        // ============================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPrescription(int id)
        {
            try
            {
                var prescription = await _context.Prescriptions
                    .Include(p => p.MedicalRecord)
                    .ThenInclude(mr => mr.Patient)
                    .FirstOrDefaultAsync(p => p.PrescriptionID == id);

                if (prescription == null)
                {
                    return NotFound($"Prescription with ID {id} not found");
                }

                return Ok(prescription);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}

