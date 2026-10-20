using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthcareAPI.Data;
using HealthcareAPI.Models;
using HealthcareAPI.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Text.Json;
using System.Text;

namespace HealthcareAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReportController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ============================================
        // GET: api/Report
        // ============================================
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetReports()
        {
            try
            {
                var reports = await _context.Reports
                    .Include(r => r.Admin)
                    .OrderByDescending(r => r.GeneratedAt)
                    .Select(r => new
                    {
                        r.ReportID,
                        r.Type,
                        r.GeneratedAt,
                        r.Summary,
                        Admin = r.Admin == null ? null : new { r.Admin.Name }
                    })
                    .ToListAsync();

                return Ok(reports);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching reports: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Report/{id}
        // ============================================
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetReport(int id)
        {
            try
            {
                var report = await _context.Reports
                    .Include(r => r.Admin)
                    .FirstOrDefaultAsync(r => r.ReportID == id);

                if (report == null)
                    return NotFound($"Report with ID {id} not found");

                return Ok(report);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching report: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // POST: api/Report/generate
        // ============================================
        [HttpPost("generate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GenerateReport([FromBody] GenerateReportDTO dto)
        {
            try
            {
                Console.WriteLine("========================================");
                Console.WriteLine("Generating Report");
                Console.WriteLine("========================================");
                Console.WriteLine($"   Type: {dto.ReportType}");
                Console.WriteLine($"   Department: {dto.Department}");
                Console.WriteLine($"   DoctorID: {dto.DoctorID}");
                Console.WriteLine($"   StartDate: {dto.StartDate}");
                Console.WriteLine($"   EndDate: {dto.EndDate}");

                if (string.IsNullOrWhiteSpace(dto.ReportType))
                {
                    return BadRequest(new { message = "Report type is required." });
                }

                object summary;

                switch (dto.ReportType)
                {
                    case "Appointment Report":
                        summary = await BuildAppointmentSummary(dto);
                        break;

                    case "Patient Report":
                        summary = await BuildPatientSummary(dto);
                        break;

                    case "Prescription Report":
                        summary = await BuildPrescriptionSummary(dto);
                        break;

                    case "Doctor Performance Report":
                        summary = await BuildDoctorSummary(dto);
                        break;

                    case "Department Report":
                        summary = await BuildDepartmentSummary(dto);
                        break;

                    default:
                        summary = new
                        {
                            message = "Report type not yet implemented.",
                            generatedOn = DateTime.Now
                        };
                        break;
                }

                var adminId = int.Parse(
                    User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"
                );

                var report = new Report
                {
                    GeneratedBy = adminId,
                    Type = dto.ReportType,
                    GeneratedAt = DateTime.Now,
                    Summary = JsonSerializer.Serialize(summary)
                };

                _context.Reports.Add(report);
                await _context.SaveChangesAsync();

                Console.WriteLine($"Report created with ID: {report.ReportID}");

                var createdReport = await _context.Reports
                    .Include(r => r.Admin)
                    .FirstOrDefaultAsync(r => r.ReportID == report.ReportID);

                return Ok(createdReport);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating report: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Report/{id}/download
        // ============================================
        [HttpGet("{id}/download")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DownloadReport(int id)
        {
            try
            {
                var report = await _context.Reports
                    .Include(r => r.Admin)
                    .FirstOrDefaultAsync(r => r.ReportID == id);

                if (report == null)
                    return NotFound($"Report with ID {id} not found");

                var sb = new StringBuilder();
                sb.AppendLine("================================================");
                sb.AppendLine("               MEDICARE REPORT                  ");
                sb.AppendLine("================================================");
                sb.AppendLine();
                sb.AppendLine($"Report ID:     {report.ReportID}");
                sb.AppendLine($"Report Type:   {report.Type}");
                sb.AppendLine($"Generated By:  {report.Admin?.Name ?? "Unknown"}");
                sb.AppendLine($"Generated At:  {report.GeneratedAt:yyyy-MM-dd HH:mm:ss}");
                sb.AppendLine();
                sb.AppendLine("------------------ SUMMARY --------------------");
                sb.AppendLine();

                try
                {
                    using var doc = JsonDocument.Parse(report.Summary ?? "{}");
                    var prettyJson = JsonSerializer.Serialize(
                        doc.RootElement,
                        new JsonSerializerOptions { WriteIndented = true }
                    );
                    sb.AppendLine(prettyJson);
                }
                catch
                {
                    sb.AppendLine(report.Summary ?? "No summary available.");
                }

                sb.AppendLine();
                sb.AppendLine("================================================");
                sb.AppendLine("Generated by Medicare Hospital Management System");

                var bytes = Encoding.UTF8.GetBytes(sb.ToString());
                var fileName = $"MedicareReport_{report.ReportID}_{report.Type.Replace(" ", "_")}.txt";

                return File(bytes, "text/plain", fileName);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error downloading report: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // HELPER: Appointment Report Summary
        // ============================================
        private async Task<object> BuildAppointmentSummary(GenerateReportDTO dto)
        {
            var query = _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor)
                .AsQueryable();

            if (!string.IsNullOrEmpty(dto.DoctorID) && int.TryParse(dto.DoctorID, out int doctorId))
            {
                query = query.Where(a => a.DoctorID == doctorId);
            }

            if (!string.IsNullOrWhiteSpace(dto.Department))
            {
                query = query.Where(a => a.Doctor.Specialization == dto.Department);
            }

            if (!string.IsNullOrEmpty(dto.StartDate) && DateTime.TryParse(dto.StartDate, out var start))
            {
                query = query.Where(a => a.AppointmentDate >= start);
            }

            if (!string.IsNullOrEmpty(dto.EndDate) && DateTime.TryParse(dto.EndDate, out var end))
            {
                query = query.Where(a => a.AppointmentDate <= end.AddDays(1));
            }

            var list = await query.ToListAsync();

            return new
            {
                TotalAppointments = list.Count,
                Scheduled = list.Count(a => a.Status == "Scheduled"),
                Completed = list.Count(a => a.Status == "Completed"),
                Cancelled = list.Count(a => a.Status == "Cancelled"),
                Rescheduled = list.Count(a => a.Status == "Rescheduled"),
                ByDoctor = list
                    .GroupBy(a => a.Doctor.Name)
                    .Select(g => new { Doctor = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .ToList(),
                GeneratedOn = DateTime.Now
            };
        }

        // ============================================
        // HELPER: Patient Report Summary
        // ============================================
        private async Task<object> BuildPatientSummary(GenerateReportDTO dto)
        {
            var query = _context.Patients.AsQueryable();

            if (!string.IsNullOrEmpty(dto.StartDate) && DateTime.TryParse(dto.StartDate, out var start))
            {
                query = query.Where(p => p.DateRegistered >= start);
            }

            if (!string.IsNullOrEmpty(dto.EndDate) && DateTime.TryParse(dto.EndDate, out var end))
            {
                query = query.Where(p => p.DateRegistered <= end.AddDays(1));
            }

            var list = await query.ToListAsync();

            return new
            {
                TotalPatients = list.Count,
                Male = list.Count(p => p.Gender == "Male"),
                Female = list.Count(p => p.Gender == "Female"),
                Other = list.Count(p => p.Gender == "Other" || p.Gender == null),
                RegisteredThisMonth = list.Count(p =>
                    p.DateRegistered.HasValue &&
                    p.DateRegistered.Value.Month == DateTime.Now.Month &&
                    p.DateRegistered.Value.Year == DateTime.Now.Year),
                GeneratedOn = DateTime.Now
            };
        }

        // ============================================
        // HELPER: Prescription Report Summary
        // ============================================
        private async Task<object> BuildPrescriptionSummary(GenerateReportDTO dto)
        {
            var query = _context.Prescriptions
                .Include(p => p.MedicalRecord)
                .AsQueryable();

            if (!string.IsNullOrEmpty(dto.StartDate) && DateTime.TryParse(dto.StartDate, out var start))
            {
                query = query.Where(p => p.CreatedAt >= start);
            }

            if (!string.IsNullOrEmpty(dto.EndDate) && DateTime.TryParse(dto.EndDate, out var end))
            {
                query = query.Where(p => p.CreatedAt <= end.AddDays(1));
            }

            var list = await query.ToListAsync();

            return new
            {
                TotalPrescriptions = list.Count,
                TopMedications = list
                    .GroupBy(p => p.Medication)
                    .Select(g => new { Medication = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(5)
                    .ToList(),
                GeneratedOn = DateTime.Now
            };
        }

        // ============================================
        // HELPER: Doctor Performance Report Summary
        // ============================================
        private async Task<object> BuildDoctorSummary(GenerateReportDTO dto)
        {
            var doctors = await _context.Doctors
                .Include(d => d.Appointments)
                .ToListAsync();

            return new
            {
                TotalDoctors = doctors.Count,
                ByDoctor = doctors
                    .Select(d => new
                    {
                        Name = d.Name,
                        Specialization = d.Specialization,
                        Availability = d.Availability,
                        TotalAppointments = d.Appointments?.Count ?? 0,
                        CompletedAppointments = d.Appointments?.Count(a => a.Status == "Completed") ?? 0
                    })
                    .OrderByDescending(d => d.TotalAppointments)
                    .ToList(),
                GeneratedOn = DateTime.Now
            };
        }

        // ============================================
        // HELPER: Department Report Summary
        // ============================================
        private async Task<object> BuildDepartmentSummary(GenerateReportDTO dto)
        {
            var appointments = await _context.Appointments
                .Include(a => a.Doctor)
                .ToListAsync();

            return new
            {
                TotalDepartments = appointments
                    .Select(a => a.Doctor?.Specialization)
                    .Where(s => !string.IsNullOrEmpty(s))
                    .Distinct()
                    .Count(),
                ByDepartment = appointments
                    .Where(a => a.Doctor != null)
                    .GroupBy(a => a.Doctor.Specialization)
                    .Select(g => new
                    {
                        Department = g.Key,
                        TotalAppointments = g.Count(),
                        Completed = g.Count(a => a.Status == "Completed"),
                        Cancelled = g.Count(a => a.Status == "Cancelled")
                    })
                    .OrderByDescending(x => x.TotalAppointments)
                    .ToList(),
                GeneratedOn = DateTime.Now
            };
        }
    }
}