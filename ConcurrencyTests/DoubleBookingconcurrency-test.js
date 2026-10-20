// ================================================
// MEDICARE - CONCURRENCY TEST
// Two receptionists book the same slot simultaneously
// ================================================

const https = require('https');

// ==== TOKENS ====
const token1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjEiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJSZWNlcHRpb25pc3QiLCJqdGkiOiIyNWIzNzRlYS1lODc3LTQwNTEtOTE0OC04NTBmOTVhMWVmMTUiLCJleHAiOjE3OTE2ODY5NTYsImlzcyI6IkhlYWx0aGNhcmVBUEkiLCJhdWQiOiJIZWFsdGhjYXJlUmVhY3RBcHAifQ.4oF3C7DnQlIdIh-3KFPt-kyu2_0pi2mtD8Gu5QFeVfQ";
const token2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJSZWNlcHRpb25pc3QiLCJqdGkiOiIzOTVjMzY2Yi02ZWY5LTQ2ZjgtODhlMS1kMjdhYmVmZTdlNmYiLCJleHAiOjE3OTE2ODcwMDcsImlzcyI6IkhlYWx0aGNhcmVBUEkiLCJhdWQiOiJIZWFsdGhjYXJlUmVhY3RBcHAifQ.0Fz_1xq8IUNStHlrnR-IEI_U9VV1hhaH5BFXFyhc8ZU";

// ==== CONFIG ====
// Change the date and time for each test run (must be a fresh slot)
const payload = {
  patientID: 1,
  doctorID: 2,
  appointmentDate: "2026-11-26T00:00:00",
  appointmentTime: "10:00:00",
  reason: "Concurrency test"
};

// ================================================
// Send a booking request
// ================================================
function bookAppointment(token, label) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);

    const options = {
      hostname: 'localhost',
      port: 7184,
      path: '/api/Appointment/book',
      method: 'POST',
      rejectUnauthorized: false, // accept self-signed cert
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body, label });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, body: err.message, label });
    });

    req.write(data);
    req.end();
  });
}

// ================================================
// Main
// ================================================
async function main() {
  console.log("");
  console.log("================================================");
  console.log("  FIRING TWO SIMULTANEOUS REQUESTS");
  console.log("  Slot: Doctor", payload.doctorID,
              "on", payload.appointmentDate,
              "at", payload.appointmentTime);
  console.log("================================================");
  console.log("");

  // Fire both at the exact same moment
  const results = await Promise.all([
    bookAppointment(token1, "Receptionist 1 (Jane)"),
    bookAppointment(token2, "Receptionist 2 (Rochelle)")
  ]);

  // Print each response
  results.forEach(r => {
    console.log("--- RESPONSE from " + r.label + " ---");
    console.log("Status: " + r.status);
    console.log(r.body);
    console.log("");
  });

  console.log("================================================");
  console.log("  RESULT SUMMARY");
  console.log("================================================");

  const successes = results.filter(r => r.status === 200);
  const conflicts = results.filter(r => r.status === 409);

  if (successes.length === 1 && conflicts.length === 1) {
    console.log("SUCCESS: One request won, the other was rejected.");
    console.log("Double-booking prevention is working correctly.");
    console.log("");
    console.log("Winner: " + successes[0].label);
    console.log("Rejected: " + conflicts[0].label);
  } else if (successes.length === 2) {
    console.log("WARNING: Both requests succeeded.");
    console.log("Timing may not have been tight enough, or the constraint is missing.");
    console.log("Try a fresh slot and run again.");
  } else if (conflicts.length === 2) {
    console.log("Both requests were rejected.");
    console.log("The slot may already be booked. Use a fresh date/time.");
  } else {
    console.log("Unexpected result. Check the responses above.");
  }
  console.log("");
}

main();