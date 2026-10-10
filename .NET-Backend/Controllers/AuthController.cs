using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HealthcareAPI.DTOs;
using HealthcareAPI.Data;
using Microsoft.EntityFrameworkCore;
// NO using BCrypt.Net needed - use full namespace directly

namespace HealthcareAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDTO>> Login(LoginDTO loginDTO)
        {
            Console.WriteLine($" Login attempt: {loginDTO.Username}");

            // Check Admin
            var admin = await _context.Admins
                .FirstOrDefaultAsync(a => a.Username == loginDTO.Username);
            if (admin != null)
            {
                Console.WriteLine($" Admin found: {admin.Username}");

                // Use full namespace: BCrypt.Net.BCrypt.Verify
                bool passwordMatch = BCrypt.Net.BCrypt.Verify(loginDTO.Password, admin.PasswordHash);
                Console.WriteLine($"Password match: {passwordMatch}");

                if (passwordMatch)
                {
                    return Ok(new LoginResponseDTO
                    {
                        UserId = admin.AdminID,
                        Name = admin.Name,
                        Role = "Admin",
                        Token = GenerateJwtToken(admin.AdminID, "Admin")
                    });
                }
            }

            // Check Doctor
            var doctor = await _context.Doctors
                .FirstOrDefaultAsync(d => d.Username == loginDTO.Username);
            if (doctor != null)
            {
                Console.WriteLine($" Doctor found: {doctor.Username}");

                bool passwordMatch = BCrypt.Net.BCrypt.Verify(loginDTO.Password, doctor.PasswordHash);
                Console.WriteLine($"Password match: {passwordMatch}");

                if (passwordMatch)
                {
                    return Ok(new LoginResponseDTO
                    {
                        UserId = doctor.DoctorID,
                        Name = doctor.Name,
                        Role = "Doctor",
                        Token = GenerateJwtToken(doctor.DoctorID, "Doctor")
                    });
                }
            }

            // Check Receptionist
            var receptionist = await _context.Receptionists
                .FirstOrDefaultAsync(r => r.Username == loginDTO.Username);
            if (receptionist != null)
            {
                Console.WriteLine($"Receptionist found: {receptionist.Username}");

                bool passwordMatch = BCrypt.Net.BCrypt.Verify(loginDTO.Password, receptionist.PasswordHash);
                Console.WriteLine($"Password match: {passwordMatch}");

                if (passwordMatch)
                {
                    return Ok(new LoginResponseDTO
                    {
                        UserId = receptionist.StaffID,
                        Name = receptionist.Name,
                        Role = "Receptionist",
                        Token = GenerateJwtToken(receptionist.StaffID, "Receptionist")
                    });
                }
            }

            Console.WriteLine($" Login failed for: {loginDTO.Username}");
            return Unauthorized("Invalid username or password");
        }

        private string GenerateJwtToken(int userId, string role)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration["Jwt:Key"] ?? "YourSuperSecretKeyHereAtLeast32CharactersLong123!"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"] ?? "HealthcareAPI",
                audience: _configuration["Jwt:Audience"] ?? "HealthcareReactApp",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}