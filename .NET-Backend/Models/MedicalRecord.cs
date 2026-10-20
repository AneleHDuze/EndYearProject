using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HealthcareAPI.Models
{
    [Table("medicalrecords")]
    public class MedicalRecord
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("recordID")]
        public int RecordID { get; set; }

        // Required - Foreign Keys
        [Required]
        [Column("patientID")]
        public int PatientID { get; set; }

        [Required]
        [Column("doctorID")]
        public int DoctorID { get; set; }

        // Make nullable - for prescriptions WITHOUT appointments
        [Column("appointmentID")]
        public int? AppointmentID { get; set; }

        [Column("diagnosis")]
        public string Diagnosis { get; set; }

        [Column("treatment")]
        public string Treatment { get; set; }

        [Column("visitDate")]
        public DateTime? VisitDate { get; set; }

        // ============================================
        // NAVIGATION PROPERTIES
        
        // ============================================
        [ForeignKey(nameof(PatientID))]
        [JsonIgnore]
        public virtual Patient Patient { get; set; }

        [ForeignKey(nameof(DoctorID))]
        [JsonIgnore]
        public virtual Doctor Doctor { get; set; }

        [ForeignKey(nameof(AppointmentID))]
        [JsonIgnore]
        public virtual Appointment Appointment { get; set; }

        [JsonIgnore]
        public virtual ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    }
}

