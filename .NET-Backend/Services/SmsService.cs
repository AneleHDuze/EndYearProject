using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HealthcareAPI.Services
{
    public class SmsService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<SmsService> _logger;

        public SmsService(HttpClient httpClient, IConfiguration config, ILogger<SmsService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        // ============================================
        // Send an SMS immediately
        // ============================================
        public async Task<bool> SendSmsAsync(string toNumber, string message)
        {
            return await SendSmsInternalAsync(toNumber, message, null);
        }

        // ============================================
        // Schedule an SMS for a future time
        // scheduledAt must be within 72 hours from now
        // ============================================
        public async Task<bool> SendScheduledSmsAsync(string toNumber, string message, DateTime scheduledAt)
        {
            // Textbee allows scheduling up to 72 hours in advance
            var maxSchedule = DateTime.UtcNow.AddHours(72);
            if (scheduledAt > maxSchedule)
            {
                _logger.LogWarning($"Scheduled time {scheduledAt} is beyond the 72-hour limit. Sending immediately instead.");
                scheduledAt = DateTime.UtcNow;
            }

            return await SendSmsInternalAsync(toNumber, message, scheduledAt);
        }

        // ============================================
        // Internal send logic
        // ============================================
        private async Task<bool> SendSmsInternalAsync(string toNumber, string message, DateTime? scheduledAt)
        {
            try
            {
                var enabled = _config.GetValue<bool>("Textbee:Enabled");
                if (!enabled)
                {
                    _logger.LogInformation($"[SMS DISABLED] Would send to {toNumber}: {message}");
                    return true;
                }

                var apiKey = _config["Textbee:ApiKey"];
                var deviceId = _config["Textbee:DeviceId"];
                var baseUrl = _config["Textbee:BaseUrl"] ?? "https://api.textbee.dev/api/v1";

                if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(deviceId))
                {
                    _logger.LogError("Textbee API key or Device ID is missing in configuration");
                    return false;
                }

                // Normalize phone number — remove spaces, ensure it starts with +
                var normalizedTo = NormalizePhoneNumber(toNumber);

                var url = $"{baseUrl}/gateway/devices/{deviceId}/send-sms";

                // Build the request body
                var requestBody = new
                {
                    recipients = new[] { normalizedTo },
                    message = message,
                    @override = false,
                    scheduledAt = scheduledAt.HasValue
                        ? scheduledAt.Value.ToUniversalTime().ToString("o")
                        : null
                };

                var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
                {
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                });

                var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                };

                request.Headers.Add("x-api-key", apiKey);

                var response = await _httpClient.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"SMS sent to {normalizedTo}. Response: {responseBody}");
                    return true;
                }

                _logger.LogError($"Failed to send SMS to {normalizedTo}. Status: {response.StatusCode}. Body: {responseBody}");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending SMS to {toNumber}: {ex.Message}");
                return false;
            }
        }

        // ============================================
        // Normalize phone to E.164 format (+27...)
        // ============================================
        private string NormalizePhoneNumber(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return phone;

            // Remove spaces, dashes, parentheses
            var cleaned = new string(phone.Where(c => char.IsDigit(c) || c == '+').ToArray());

            // If it starts with 0 (South African local), replace with +27
            if (cleaned.StartsWith("0") && cleaned.Length == 10)
            {
                return "+27" + cleaned.Substring(1);
            }

            // If it doesn't start with +, assume it's already country-code prefixed
            if (!cleaned.StartsWith("+"))
            {
                return "+" + cleaned;
            }

            return cleaned;
        }
    }
}