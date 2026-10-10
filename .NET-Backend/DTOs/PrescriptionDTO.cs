using System.ComponentModel.DataAnnotations;

namespace HealthcareAPI.DTOs
{
    public class PrescriptionDTO
    {
        [Required]
        public int RecordID { get; set; }

        [Required]
        [MaxLength(100)]
        public string Medication { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Dosage { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Duration { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Instructions { get; set; }
    }
}
