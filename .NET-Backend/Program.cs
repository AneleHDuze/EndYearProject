using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using HealthcareAPI.Data;
using HealthcareAPI.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register HttpClient and SmsService for sending SMS via Textbee
builder.Services.AddHttpClient();
builder.Services.AddScoped<HealthcareAPI.Services.SmsService>();

// Get connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// Configure JWT Authentication
var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "YourSuperSecretKeyHereAtLeast32CharactersLong123!");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "HealthcareAPI",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "HealthcareReactApp",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:3000",
                    "https://localhost:3000",
                    "https://localhost:7184"
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("ReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ================================================
// SEED USERS WITH BCrypt
// ================================================
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    try
    {
        dbContext.Database.EnsureCreated();
        Console.WriteLine("Database verified.");

        // SEED ADMIN
        if (!dbContext.Admins.Any())
        {
            var admin = new Admin
            {
                Name = "System Administrator",
                Contact = "0812345678",
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123")
            };
            dbContext.Admins.Add(admin);
            Console.WriteLine("Admin user created: admin / admin123");
        }
        else
        {
            Console.WriteLine("Admin user already exists");
        }

        // SEED DOCTORS
        if (!dbContext.Doctors.Any())
        {
            var doctors = new[]
            {
                new Doctor
                {
                    Name = "Dr. John Smith",
                    Specialization = "Cardiology",
                    Availability = "Available",
                    Username = "drjohn",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("doctor123")
                },
                new Doctor
                {
                    Name = "Dr. Sarah Johnson",
                    Specialization = "Pediatrics",
                    Availability = "Available",
                    Username = "drsarah",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("doctor123")
                },
                new Doctor
                {
                    Name = "Dr. Michael Brown",
                    Specialization = "Orthopedics",
                    Availability = "Available",
                    Username = "drmichael",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("doctor123")
                }
            };

            dbContext.Doctors.AddRange(doctors);
            Console.WriteLine("Doctor users created: drjohn, drsarah, drmichael / doctor123");
        }
        else
        {
            Console.WriteLine("Doctor users already exist");
        }

        // SEED RECEPTIONIST
        if (!dbContext.Receptionists.Any())
        {
            var receptionist = new Receptionist
            {
                Name = "Jane Receptionist",
                Contact = "0823456789",
                Username = "receptionist",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("receptionist123")
            };
            dbContext.Receptionists.Add(receptionist);
            Console.WriteLine("Receptionist user created: receptionist / receptionist123");
        }
        else
        {
            Console.WriteLine("Receptionist user already exists");
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine("Database seeding completed!");

        // Display users
        Console.WriteLine("\nUsers in database:");
        foreach (var a in dbContext.Admins)
            Console.WriteLine($"  - Admin: {a.Username}");
        foreach (var d in dbContext.Doctors)
            Console.WriteLine($"  - Doctor: {d.Username}");
        foreach (var r in dbContext.Receptionists)
            Console.WriteLine($"  - Receptionist: {r.Username}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database seeding failed: {ex.Message}");
    }
}

app.Run();