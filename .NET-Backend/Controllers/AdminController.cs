using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthcareAPI.Models;
using HealthcareAPI.Data;
using Microsoft.AspNetCore.Authorization;
using BCrypt.Net;
using HealthcareAPI.DTOs;
using MySqlConnector;

namespace HealthcareAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AdminController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ============================================
        // GET: api/Admin
        // ============================================
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<Admin>>> GetAdmins()
        {
            try
            {
                var admins = await _context.Admins
                    .OrderBy(a => a.Name)
                    .Select(a => new
                    {
                        a.AdminID,
                        a.Name,
                        a.Username,
                        a.Contact
                    })
                    .ToListAsync();

                return Ok(admins);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching admins: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Admin/5
        // ============================================
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Admin>> GetAdmin(int id)
        {
            try
            {
                var admin = await _context.Admins
                    .FirstOrDefaultAsync(a => a.AdminID == id);

                if (admin == null)
                {
                    return NotFound($"Admin with ID {id} not found");
                }

                return Ok(admin);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching admin: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // POST: api/Admin
        // ============================================
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Admin>> CreateAdmin([FromBody] CreateAdminDTO dto)
        {
            try
            {
                Console.WriteLine($"Creating admin: {dto.Name}");
                Console.WriteLine($"   Username: {dto.Username}");

                // Service-layer duplicate check (fast feedback)
                var existingAdmin = await _context.Admins
                    .FirstOrDefaultAsync(a => a.Username == dto.Username);

                if (existingAdmin != null)
                {
                    return Conflict(new
                    {
                        field = "username",
                        message = "An admin with this username already exists."
                    });
                }

                var admin = new Admin
                {
                    Name = dto.Name,
                    Username = dto.Username,
                    Contact = dto.Contact ?? "N/A",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
                };

                _context.Admins.Add(admin);

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException dbEx) when (IsDuplicateKeyError(dbEx))
                {
                    Console.WriteLine("Race condition detected on admin creation (error 1062)");
                    return Conflict(new
                    {
                        field = "username",
                        message = "An admin with this username was just created by another administrator."
                    });
                }

                Console.WriteLine($"Admin created with ID: {admin.AdminID}");
                return CreatedAtAction(nameof(GetAdmin), new { id = admin.AdminID }, admin);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating admin: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // PUT: api/Admin/5
        // ============================================
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateAdmin(int id, [FromBody] UpdateAdminDTO dto)
        {
            try
            {
                var admin = await _context.Admins.FindAsync(id);
                if (admin == null)
                {
                    return NotFound($"Admin with ID {id} not found");
                }

                if (!string.IsNullOrEmpty(dto.Name))
                    admin.Name = dto.Name;

                if (!string.IsNullOrEmpty(dto.Username))
                {
                    var existing = await _context.Admins
                        .FirstOrDefaultAsync(a => a.Username == dto.Username && a.AdminID != id);
                    if (existing != null)
                    {
                        return Conflict(new
                        {
                            field = "username",
                            message = "An admin with this username already exists."
                        });
                    }
                    admin.Username = dto.Username;
                }

                if (!string.IsNullOrEmpty(dto.Contact))
                    admin.Contact = dto.Contact;

                if (!string.IsNullOrEmpty(dto.Password))
                    admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

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

                return Ok(new { message = "Admin updated successfully", admin });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating admin: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // DELETE: api/Admin/5
        // ============================================
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteAdmin(int id)
        {
            try
            {
                var admin = await _context.Admins.FindAsync(id);
                if (admin == null)
                {
                    return NotFound($"Admin with ID {id} not found");
                }

                _context.Admins.Remove(admin);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Admin deleted successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting admin: {ex.Message}");
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
