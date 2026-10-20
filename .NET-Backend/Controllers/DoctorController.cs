using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthcareAPI.Models;
using HealthcareAPI.Data;
using HealthcareAPI.DTOs;
using Microsoft.AspNetCore.Authorization;
using MySqlConnector;

namespace HealthcareAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DoctorController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DoctorController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ============================================
        // GET: api/Doctor
        // ============================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetDoctors()
        {
            try
            {
                var doctors = await _context.Doctors
                    .OrderBy(d => d.Name)
                    .Select(d => new
                    {
                        d.DoctorID,
                        d.Name,
                        d.Specialization,
                        d.Availability,
                        d.Username
                    })
                    .ToListAsync();

                return Ok(doctors);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching doctors: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Doctor/{id}
        // ============================================
        [HttpGet("{id}")]
        public async Task<ActionResult<Doctor>> GetDoctor(int id)
        {
            try
            {
                var doctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.DoctorID == id);

                if (doctor == null)
                    return NotFound($"Doctor with ID {id} not found");

                return Ok(doctor);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching doctor: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Doctor/available
        // ============================================
        [HttpGet("available")]
        public async Task<ActionResult<IEnumerable<object>>> GetAvailableDoctors()
        {
            try
            {
                var doctors = await _context.Doctors
                    .Where(d => d.Availability == "Available")
                    .OrderBy(d => d.Name)
                    .Select(d => new
                    {
                        d.DoctorID,
                        d.Name,
                        d.Specialization,
                        d.Availability,
                        d.Username
                    })
                    .ToListAsync();

                return Ok(doctors);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching available doctors: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // POST: api/Doctor
        // ============================================
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Doctor>> CreateDoctor([FromBody] CreateDoctorDTO dto)
        {
            try
            {
                Console.WriteLine($"Creating doctor: {dto.Name}");

                // Service-layer duplicate check (fast feedback)
                var existingDoctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.Username == dto.Username);

                if (existingDoctor != null)
                {
                    return Conflict(new
                    {
                        field = "username",
                        message = "A doctor with this username already exists."
                    });
                }

                var doctor = new Doctor
                {
                    Name = dto.Name,
                    Username = dto.Username,
                    Specialization = string.IsNullOrEmpty(dto.Specialization) ? "General" : dto.Specialization,
                    Availability = string.IsNullOrEmpty(dto.Availability) ? "Available" : dto.Availability,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
                };

                _context.Doctors.Add(doctor);

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException dbEx) when (IsDuplicateKeyError(dbEx))
                {
                    Console.WriteLine("Race condition detected on doctor creation (error 1062)");

                    return Conflict(new
                    {
                        field = "username",
                        message = "A doctor with this username was just created by another administrator."
                    });
                }

                Console.WriteLine($"Doctor created with ID: {doctor.DoctorID}");

                return Ok(new
                {
                    doctorID = doctor.DoctorID,
                    name = doctor.Name,
                    username = doctor.Username,
                    specialization = doctor.Specialization,
                    availability = doctor.Availability,
                    role = "Doctor"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating doctor: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // PUT: api/Doctor/{id}
        // ============================================
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateDoctor(int id, [FromBody] UpdateDoctorDTO dto)
        {
            try
            {
                var doctor = await _context.Doctors.FindAsync(id);
                if (doctor == null)
                    return NotFound($"Doctor with ID {id} not found");

                if (!string.IsNullOrEmpty(dto.Name))
                    doctor.Name = dto.Name;

                if (!string.IsNullOrEmpty(dto.Username))
                {
                    var existing = await _context.Doctors
                        .FirstOrDefaultAsync(d => d.Username == dto.Username && d.DoctorID != id);

                    if (existing != null)
                    {
                        return Conflict(new
                        {
                            field = "username",
                            message = "A doctor with this username already exists."
                        });
                    }

                    doctor.Username = dto.Username;
                }

                if (!string.IsNullOrEmpty(dto.Specialization))
                    doctor.Specialization = dto.Specialization;

                if (!string.IsNullOrEmpty(dto.Availability))
                    doctor.Availability = dto.Availability;

                if (!string.IsNullOrEmpty(dto.Password))
                    doctor.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException dbEx) when (IsDuplicateKeyError(dbEx))
                {
                    return Conflict(new
                    {
                        field = "username",
                        message = "This username was just taken by another administrator."
                    });
                }

                return Ok(new { message = "Doctor updated successfully", doctor });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating doctor: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // PUT: api/Doctor/{id}/availability
        // ============================================
        [HttpPut("{id}/availability")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateAvailability(int id, [FromBody] string availability)
        {
            try
            {
                var doctor = await _context.Doctors.FindAsync(id);
                if (doctor == null)
                    return NotFound($"Doctor with ID {id} not found");

                doctor.Availability = availability;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Availability updated successfully", availability = doctor.Availability });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating availability: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // DELETE: api/Doctor/{id}
        // ============================================
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            try
            {
                var doctor = await _context.Doctors.FindAsync(id);
                if (doctor == null)
                    return NotFound($"Doctor with ID {id} not found");

                _context.Doctors.Remove(doctor);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Doctor deleted successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting doctor: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // Helper: Walk the exception chain looking for MySQL 1062
        // ============================================
        private static bool IsDuplicateKeyError(DbUpdateException ex)
        {
            Exception? current = ex;
            while (current != null)
            {
                if (current is MySqlException mysqlEx && mysqlEx.Number == 1062)
                    return true;
                current = current.InnerException;
            }
            return false;
        }
    }
}
