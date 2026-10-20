using BCrypt.Net;
using HealthcareAPI.Data;
using HealthcareAPI.DTOs;
using HealthcareAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace HealthcareAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReceptionistController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReceptionistController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ============================================
        // GET: api/Receptionist
        // ============================================
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<Receptionist>>> GetReceptionists()
        {
            try
            {
                var receptionists = await _context.Receptionists
                    .OrderBy(r => r.Name)
                    .Select(r => new
                    {
                        r.StaffID,
                        r.Name,
                        r.Username,
                        r.Contact
                    })
                    .ToListAsync();

                return Ok(receptionists);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching receptionists: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Receptionist/5
        // ============================================
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Receptionist>> GetReceptionist(int id)
        {
            try
            {
                var receptionist = await _context.Receptionists
                    .FirstOrDefaultAsync(r => r.StaffID == id);

                if (receptionist == null)
                    return NotFound($"Receptionist with ID {id} not found");

                return Ok(receptionist);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching receptionist: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // POST: api/Receptionist
        // ============================================
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Receptionist>> CreateReceptionist([FromBody] CreateReceptionistDTO dto)
        {
            try
            {
                Console.WriteLine($"Creating receptionist: {dto.Name}");

                // Service-layer duplicate check (fast feedback)
                var existingReceptionist = await _context.Receptionists
                    .FirstOrDefaultAsync(r => r.Username == dto.Username);

                if (existingReceptionist != null)
                {
                    return Conflict(new
                    {
                        field = "username",
                        message = "A receptionist with this username already exists."
                    });
                }

                var receptionist = new Receptionist
                {
                    Name = dto.Name,
                    Username = dto.Username,
                    Contact = dto.Contact ?? "N/A",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
                };

                _context.Receptionists.Add(receptionist);

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException dbEx) when (IsDuplicateKeyError(dbEx))
                {
                    Console.WriteLine("Race condition detected on receptionist creation (error 1062)");

                    return Conflict(new
                    {
                        field = "username",
                        message = "A receptionist with this username was just created by another administrator."
                    });
                }

                Console.WriteLine($"Receptionist created with ID: {receptionist.StaffID}");

                return CreatedAtAction(nameof(GetReceptionist), new { id = receptionist.StaffID }, receptionist);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating receptionist: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // PUT: api/Receptionist/5
        // ============================================
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateReceptionist(int id, [FromBody] UpdateReceptionistDTO dto)
        {
            try
            {
                var receptionist = await _context.Receptionists.FindAsync(id);
                if (receptionist == null)
                    return NotFound($"Receptionist with ID {id} not found");

                if (!string.IsNullOrEmpty(dto.Name))
                    receptionist.Name = dto.Name;

                if (!string.IsNullOrEmpty(dto.Username))
                {
                    var existing = await _context.Receptionists
                        .FirstOrDefaultAsync(r => r.Username == dto.Username && r.StaffID != id);

                    if (existing != null)
                    {
                        return Conflict(new
                        {
                            field = "username",
                            message = "A receptionist with this username already exists."
                        });
                    }

                    receptionist.Username = dto.Username;
                }

                if (!string.IsNullOrEmpty(dto.Contact))
                    receptionist.Contact = dto.Contact;

                if (!string.IsNullOrEmpty(dto.Password))
                    receptionist.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

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

                return Ok(new { message = "Receptionist updated successfully", receptionist });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating receptionist: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // DELETE: api/Receptionist/5
        // ============================================
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteReceptionist(int id)
        {
            try
            {
                var receptionist = await _context.Receptionists.FindAsync(id);
                if (receptionist == null)
                    return NotFound($"Receptionist with ID {id} not found");

                _context.Receptionists.Remove(receptionist);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Receptionist deleted successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting receptionist: {ex.Message}");
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
