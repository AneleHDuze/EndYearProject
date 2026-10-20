using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HealthcareAPI.Models
{
    [Table("prescriptions")]
    public class Prescription
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("prescriptionID")]
        public int PrescriptionID { get; set; }

        [Required]
        [Column("recordID")]
        public int RecordID { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("medication")]
        public string Medication { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("dosage")]
        public string Dosage { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("duration")]
        public string Duration { get; set; }

       
        [MaxLength(500)]
        [Column("instructions")]
        public string Instructions { get; set; }

        [Column("createdAt")]
        public DateTime? CreatedAt { get; set; }

        // Navigation Property
        [ForeignKey(nameof(RecordID))]
        [JsonIgnore]
        public virtual MedicalRecord MedicalRecord { get; set; }
    }
}
