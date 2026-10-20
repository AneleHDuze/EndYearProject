namespace HealthcareAPI.DTOs
{
    public class GenerateReportDTO
    {
        public string ReportType { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? DoctorID { get; set; }
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
    }
}