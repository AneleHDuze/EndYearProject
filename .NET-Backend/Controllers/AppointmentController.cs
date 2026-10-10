using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthcareAPI.Models;
using HealthcareAPI.Data;
using HealthcareAPI.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using MySqlConnector;
using HealthcareAPI.Services;

namespace HealthcareAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AppointmentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly SmsService _smsService;

        public AppointmentController(ApplicationDbContext context, SmsService smsService)
        {
            _context = context;
            _smsService = smsService;
        }

        // ============================================
        // GET: api/Appointment/doctor/1
        // Returns ALL appointments (Scheduled, Completed, Cancelled)
        // ============================================
        [HttpGet("doctor/{doctorId}")]
        public async Task<ActionResult<IEnumerable<Appointment>>> GetDoctorAppointments(int doctorId)
        {
            try
            {
                var appointments = await _context.Appointments
                    .Include(a => a.Patient)
                    .Include(a => a.Doctor)
                    .Where(a => a.DoctorID == doctorId)
                    .OrderBy(a => a.AppointmentDate)
                    .ThenBy(a => a.AppointmentTime)
                    .ToListAsync();

                return Ok(appointments);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching doctor appointments: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Appointment/5
        // ============================================
        [HttpGet("{id}")]
        public async Task<ActionResult<Appointment>> GetAppointment(int id)
        {
            try
            {
                var appointment = await _context.Appointments
                    .Include(a => a.Patient)
                    .Include(a => a.Doctor)
                    .FirstOrDefaultAsync(a => a.AppointmentID == id);

                if (appointment == null)
                {
                    return NotFound($"Appointment with ID {id} not found");
                }

                return Ok(appointment);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching appointment: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // GET: api/Appointment
        // ============================================
        [HttpGet]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<ActionResult<IEnumerable<Appointment>>> GetAllAppointments()
        {
            try
            {
                var appointments = await _context.Appointments
                    .Include(a => a.Patient)
                    .Include(a => a.Doctor)
                    .OrderByDescending(a => a.AppointmentDate)
                    .ToListAsync();

                return Ok(appointments);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching all appointments: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // POST: api/Appointment/book
        // Double-booking check + unique constraint catch + SMS notification
        // ============================================
        [HttpPost("book")]
        [Authorize(Roles = "Receptionist,Admin")]
        public async Task<ActionResult<Appointment>> BookAppointment([FromBody] AppointmentDTO appointmentDTO)
        {
            try
            {
                Console.WriteLine($"Booking appointment for patient: {appointmentDTO.PatientID}");
                Console.WriteLine($"   Doctor: {appointmentDTO.DoctorID}");
                Console.WriteLine($"   Date: {appointmentDTO.AppointmentDate}");
                Console.WriteLine($"   Time: {appointmentDTO.AppointmentTime}");

                // Check if doctor exists
                var doctor = await _context.Doctors.FindAsync(appointmentDTO.DoctorID);
                if (doctor == null)
                {
                    return BadRequest("Doctor not found");
                }

                // Check if patient exists
                var patient = await _context.Patients.FindAsync(appointmentDTO.PatientID);
                if (patient == null)
                {
                    return BadRequest("Patient not found");
                }

                // STEP 1: Service-layer double-booking check (fast feedback)
                var existingAppointment = await _context.Appointments
                    .AnyAsync(a => a.DoctorID == appointmentDTO.DoctorID &&
                                  a.AppointmentDate == appointmentDTO.AppointmentDate &&
                                  a.AppointmentTime == appointmentDTO.AppointmentTime &&
                                  a.Status != "Cancelled");

                if (existingAppointment)
                {
                    Console.WriteLine($"Doctor {appointmentDTO.DoctorID} already booked at {appointmentDTO.AppointmentTime} on {appointmentDTO.AppointmentDate}");
                    return Conflict(new
                    {
                        message = "Doctor is not available at this time. Please select a different time or date.",
                        conflict = true
                    });
                }

                // Get the current user ID from the token
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

                var appointment = new Appointment
                {
                    PatientID = appointmentDTO.PatientID,
                    DoctorID = appointmentDTO.DoctorID,
                    BookedBy = userId,
                    BookedDate = DateTime.Now,
                    AppointmentDate = appointmentDTO.AppointmentDate,
                    AppointmentTime = appointmentDTO.AppointmentTime,
                    Reason = appointmentDTO.Reason,
                    Status = "Scheduled"
                };

                // STEP 2: Add to context, then save. MySQL UNIQUE constraint may reject under race condition.
                _context.Appointments.Add(appointment);

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException dbEx)
                    when (dbEx.InnerException is MySqlException mysqlEx && mysqlEx.Number == 1062)
                {
                    // Race condition: another receptionist booked this slot milliseconds earlier
                    Console.WriteLine("Race condition detected - slot already taken (error 1062)");
                    return Conflict(new
                    {
                        message = "This slot was just booked by another receptionist. Please pick a different time.",
                        conflict = true
                    });
                }

                Console.WriteLine($"Appointment booked successfully: {appointment.AppointmentID}");

                var createdAppointment = await _context.Appointments
                    .Include(a => a.Patient)
                    .Include(a => a.Doctor)
                    .FirstOrDefaultAsync(a => a.AppointmentID == appointment.AppointmentID);

                // ============================================
                // SMS: confirmation + 30-minute reminder
                // ============================================
                try
                {
                    if (createdAppointment != null &&
                        !string.IsNullOrEmpty(createdAppointment.Patient?.Contact))
                    {
                        var apptDate = createdAppointment.AppointmentDate.ToString("dd MMM yyyy");
                        var apptTime = createdAppointment.AppointmentTime.ToString(@"hh\:mm");

                        // Immediate confirmation SMS
                        var confirmationMessage =
                            $"Hi {createdAppointment.Patient.Name}, your appointment with " +
                            $"Dr. {createdAppointment.Doctor.Name} is confirmed for " +
                            $"{apptDate} at {apptTime}. - Medicare";

                        await _smsService.SendSmsAsync(
                            createdAppointment.Patient.Contact,
                            confirmationMessage);

                        // Schedule reminder 30 minutes before the appointment
                        var appointmentDateTime = createdAppointment.AppointmentDate.Date
                            .Add(createdAppointment.AppointmentTime);
                        var reminderTime = appointmentDateTime.AddMinutes(-30);

                        if (reminderTime > DateTime.Now && reminderTime <= DateTime.Now.AddHours(72))
                        {
                            var reminderMessage =
                                $"Reminder: Hi {createdAppointment.Patient.Name}, you have an " +
                                $"appointment with Dr. {createdAppointment.Doctor.Name} in 30 minutes " +
                                $"at {apptTime}. - Medicare";

                            await _smsService.SendScheduledSmsAsync(
                                createdAppointment.Patient.Contact,
                                reminderMessage,
                                reminderTime);
                        }
                        else
                        {
                            Console.WriteLine($"Reminder not scheduled. Reason: outside 72-hour window or in the past.");
                        }
                    }
                }
                catch (Exception smsEx)
                {
                    // SMS failure must NOT cancel the booking
                    Console.WriteLine($"SMS send failed (non-fatal): {smsEx.Message}");
                }
                // ============================================

                return Ok(createdAppointment);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error booking appointment: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // PUT: api/Appointment/complete/5
        // Marks an appointment as Completed
        // ============================================
        [HttpPut("complete/{id}")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> CompleteAppointment(int id)
        {
            try
            {
                var appointment = await _context.Appointments.FindAsync(id);
                if (appointment == null)
                    return NotFound($"Appointment with ID {id} not found");

                if (appointment.Status == "Completed")
                    return BadRequest("Appointment is already completed");

                if (appointment.Status == "Cancelled")
                    return BadRequest("Cannot complete a cancelled appointment");

                appointment.Status = "Completed";
                await _context.SaveChangesAsync();

                Console.WriteLine($"Appointment {id} marked as completed");
                return Ok(new { message = "Appointment marked as completed", status = "Completed" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error completing appointment: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // PUT: api/Appointment/cancel/5
        // ============================================
        [HttpPut("cancel/{id}")]
        public async Task<IActionResult> CancelAppointment(int id)
        {
            try
            {
                var appointment = await _context.Appointments.FindAsync(id);
                if (appointment == null)
                    return NotFound($"Appointment with ID {id} not found");

                if (appointment.Status == "Cancelled")
                    return BadRequest("Appointment is already cancelled");

                if (appointment.Status == "Completed")
                    return BadRequest("Cannot cancel a completed appointment");

                appointment.Status = "Cancelled";
                await _context.SaveChangesAsync();

                return Ok(new { message = "Appointment cancelled successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error cancelling appointment: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ============================================
        // PUT: api/Appointment/reschedule/5
        // ============================================
        [HttpPut("reschedule/{id}")]
        public async Task<IActionResult> RescheduleAppointment(int id, [FromBody] RescheduleDTO rescheduleDTO)
        {
            try
            {
                var appointment = await _context.Appointments.FindAsync(id);
                if (appointment == null)
                    return NotFound($"Appointment with ID {id} not found");

                if (appointment.Status == "Cancelled")
                    return BadRequest("Cannot reschedule a cancelled appointment");

                if (appointment.Status == "Completed")
                    return BadRequest("Cannot reschedule a completed appointment");

                // Check if new slot is available
                var conflict = await _context.Appointments
                    .AnyAsync(a => a.DoctorID == appointment.DoctorID &&
                                  a.AppointmentDate == rescheduleDTO.NewDate &&
                                  a.AppointmentTime == rescheduleDTO.NewTime &&
                                  a.Status != "Cancelled" &&
                                  a.AppointmentID != id);

                if (conflict)
                    return BadRequest("Time slot is not available");

                appointment.AppointmentDate = rescheduleDTO.NewDate;
                appointment.AppointmentTime = rescheduleDTO.NewTime;
                appointment.Status = "Rescheduled";

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException dbEx)
                    when (dbEx.InnerException is MySqlException mysqlEx && mysqlEx.Number == 1062)
                {
                    // Race condition on reschedule
                    return Conflict(new
                    {
                        message = "This slot was just booked by someone else. Please choose a different time.",
                        conflict = true
                    });
                }

                return Ok(new { message = "Appointment rescheduled successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error rescheduling appointment: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}

