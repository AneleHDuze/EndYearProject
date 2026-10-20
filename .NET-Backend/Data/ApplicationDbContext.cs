using Microsoft.EntityFrameworkCore;
using HealthcareAPI.Models;

namespace HealthcareAPI.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Patient> Patients { get; set; }
        public DbSet<Doctor> Doctors { get; set; }
        public DbSet<Receptionist> Receptionists { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<MedicalRecord> MedicalRecords { get; set; }
        public DbSet<Prescription> Prescriptions { get; set; }
        public DbSet<Report> Reports { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ============================================
            // MAP TO EXISTING TABLE NAMES
            // ============================================
            modelBuilder.Entity<Patient>().ToTable("patients");
            modelBuilder.Entity<Doctor>().ToTable("doctors");
            modelBuilder.Entity<Receptionist>().ToTable("receptionists");
            modelBuilder.Entity<Admin>().ToTable("admins");
            modelBuilder.Entity<Appointment>().ToTable("appointments");
            modelBuilder.Entity<MedicalRecord>().ToTable("medicalrecords");
            modelBuilder.Entity<Prescription>().ToTable("prescriptions");
            modelBuilder.Entity<Report>().ToTable("reports");

            // ============================================
            // PATIENT CONFIGURATION
            // ============================================
            modelBuilder.Entity<Patient>(entity =>
            {
                entity.HasKey(e => e.PatientID);
                entity.Property(e => e.PatientID).HasColumnName("patientID").ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50).HasColumnName("name");
                entity.Property(e => e.IDNumber).IsRequired().HasMaxLength(13).HasColumnName("IDNumber");
                entity.Property(e => e.Contact).IsRequired().HasMaxLength(10).HasColumnName("contact");
                entity.Property(e => e.MedicalHistory).HasColumnName("medicalHistory");
                entity.Property(e => e.DateRegistered).HasColumnName("dateRegistered");
                
                entity.Property(e => e.Gender).HasMaxLength(10).HasColumnName("gender");
                entity.Property(e => e.DateOfBirth).HasColumnName("dateOfBirth");
                entity.Property(e => e.Email).HasMaxLength(100).HasColumnName("email");
                entity.HasIndex(e => e.IDNumber).IsUnique();
                entity.HasIndex(e => e.Email).IsUnique();
            });

            // ============================================
            // DOCTOR CONFIGURATION
            // ============================================
            modelBuilder.Entity<Doctor>(entity =>
            {
                entity.HasKey(e => e.DoctorID);
                entity.Property(e => e.DoctorID).HasColumnName("doctorID").ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50).HasColumnName("name");
                entity.Property(e => e.Specialization).IsRequired().HasMaxLength(50).HasColumnName("specialization");
                entity.Property(e => e.Availability).HasMaxLength(20).HasDefaultValue("Available").HasColumnName("availability");
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50).HasColumnName("username");
                entity.Property(e => e.PasswordHash).IsRequired().HasColumnName("passwordHash");
                entity.HasIndex(e => e.Username).IsUnique();
            });

            // ============================================
            // RECEPTIONIST CONFIGURATION
            // ============================================
            modelBuilder.Entity<Receptionist>(entity =>
            {
                entity.HasKey(e => e.StaffID);
                entity.Property(e => e.StaffID).HasColumnName("staffID").ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50).HasColumnName("name");
                entity.Property(e => e.Contact).IsRequired().HasMaxLength(50).HasColumnName("contact");
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50).HasColumnName("username");
                entity.Property(e => e.PasswordHash).IsRequired().HasColumnName("passwordHash");
                entity.HasIndex(e => e.Username).IsUnique();
            });

            // ============================================
            // ADMIN CONFIGURATION
            // ============================================
            modelBuilder.Entity<Admin>(entity =>
            {
                entity.HasKey(e => e.AdminID);
                entity.Property(e => e.AdminID).HasColumnName("adminID").ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50).HasColumnName("name");
                entity.Property(e => e.Contact).IsRequired().HasMaxLength(10).HasColumnName("contact");
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50).HasColumnName("username");
                entity.Property(e => e.PasswordHash).IsRequired().HasColumnName("passwordHash");
                entity.HasIndex(e => e.Username).IsUnique();
            });

            // ============================================
            // APPOINTMENT CONFIGURATION
            // ============================================
            modelBuilder.Entity<Appointment>(entity =>
            {
                entity.HasKey(e => e.AppointmentID);
                entity.Property(e => e.AppointmentID).HasColumnName("appointmentID").ValueGeneratedOnAdd();
                entity.Property(e => e.PatientID).HasColumnName("patientID");
                entity.Property(e => e.DoctorID).HasColumnName("doctorID");
                entity.Property(e => e.BookedBy).HasColumnName("bookedBy");
                entity.Property(e => e.BookedDate).HasColumnName("bookedDate");
                entity.Property(e => e.AppointmentDate).HasColumnName("appointmentDate");
                entity.Property(e => e.AppointmentTime).HasColumnName("appointmentTime");
                entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Scheduled").HasColumnName("status");
                entity.Property(e => e.Reason).HasMaxLength(255).HasColumnName("reason");

                entity.HasIndex(e => e.AppointmentDate);
                entity.HasIndex(e => e.Status);

                entity.HasOne(e => e.Patient)
                    .WithMany(p => p.Appointments)
                    .HasForeignKey(e => e.PatientID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Doctor)
                    .WithMany(d => d.Appointments)
                    .HasForeignKey(e => e.DoctorID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.BookedByReceptionist)
                    .WithMany(r => r.Appointments)
                    .HasForeignKey(e => e.BookedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ============================================
            // MEDICAL RECORD CONFIGURATION
            // ============================================
            modelBuilder.Entity<MedicalRecord>(entity =>
            {
                entity.HasKey(e => e.RecordID);
                entity.Property(e => e.RecordID).HasColumnName("recordID").ValueGeneratedOnAdd();
                entity.Property(e => e.PatientID).HasColumnName("patientID");
                entity.Property(e => e.DoctorID).HasColumnName("doctorID");
                entity.Property(e => e.AppointmentID).HasColumnName("appointmentID");
                entity.Property(e => e.Diagnosis).HasColumnName("diagnosis");
                entity.Property(e => e.Treatment).HasColumnName("treatment");
                entity.Property(e => e.VisitDate).HasColumnName("visitDate");

                entity.HasIndex(e => e.PatientID);
                entity.HasIndex(e => e.DoctorID);
                entity.HasIndex(e => e.AppointmentID).IsUnique();

                entity.HasOne(e => e.Patient)
                    .WithMany(p => p.MedicalRecords)
                    .HasForeignKey(e => e.PatientID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Doctor)
                    .WithMany(d => d.MedicalRecords)
                    .HasForeignKey(e => e.DoctorID)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Appointment)
                    .WithOne(a => a.MedicalRecord)
                    .HasForeignKey<MedicalRecord>(e => e.AppointmentID)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ============================================
            // PRESCRIPTION CONFIGURATION
            // ============================================
            modelBuilder.Entity<Prescription>(entity =>
            {
                entity.HasKey(e => e.PrescriptionID);
                entity.Property(e => e.PrescriptionID).HasColumnName("prescriptionID").ValueGeneratedOnAdd();
                entity.Property(e => e.RecordID).HasColumnName("recordID");
                entity.Property(e => e.Medication).IsRequired().HasMaxLength(100).HasColumnName("medication");
                entity.Property(e => e.Dosage).IsRequired().HasMaxLength(100).HasColumnName("dosage");
                entity.Property(e => e.Duration).IsRequired().HasMaxLength(50).HasColumnName("duration");

                entity.HasOne(e => e.MedicalRecord)
                    .WithMany(mr => mr.Prescriptions)
                    .HasForeignKey(e => e.RecordID)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============================================
            // REPORT CONFIGURATION
            // ============================================
            modelBuilder.Entity<Report>(entity =>
            {
                entity.HasKey(e => e.ReportID);
                entity.Property(e => e.ReportID).HasColumnName("reportID").ValueGeneratedOnAdd();
                entity.Property(e => e.GeneratedBy).HasColumnName("generatedBy");
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50).HasColumnName("type");
                entity.Property(e => e.GeneratedAt).HasColumnName("generatedAt");
                entity.Property(e => e.Summary).HasColumnName("summary");

                entity.HasOne(e => e.Admin)
                    .WithMany(a => a.Reports)
                    .HasForeignKey(e => e.GeneratedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
