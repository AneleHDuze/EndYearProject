const https = require('https');

// --- Two different receptionists ---
const token1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJSZWNlcHRpb25pc3QiLCJqdGkiOiI2ZDZmMTUyNy03MzRkLTQ3MmItYjEwMC0xY2UyMzZmZTlhMzEiLCJleHAiOjE3OTIwMzk4NzQsImlzcyI6IkhlYWx0aGNhcmVBUEkiLCJhdWQiOiJIZWFsdGhjYXJlUmVhY3RBcHAifQ.2FBMXBOhEDBXretMPZIP-sRwM89Lml4zMyX-CZj4ZgE";
const token2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjEiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJSZWNlcHRpb25pc3QiLCJqdGkiOiI1OGZjOGFjOS0xOTZkLTQzY2UtYWRlNC00ODdjYzA3MjRjNjEiLCJleHAiOjE3OTIwMzk5NDUsImlzcyI6IkhlYWx0aGNhcmVBUEkiLCJhdWQiOiJIZWFsdGhjYXJlUmVhY3RBcHAifQ.xqdGZ_pLjqDOkcndibuXL7-hT7vTlfA4DdQWRJah6rY";

// --- Fresh patient details (change each run) ---
const payload = {
  name: "Concurrent Patient",
  idNumber: "9512315800099",   // 13 digits, must be FRESH
  contact: "0729876611",       // 10 digits starting with 0, FRESH
  gender: "Male",
  dateOfBirth: "1995-12-31T00:00:00",
  email: "Test123@gmail.com",
  medicalHistory: "we dont know"
};

function registerPatient(token, label) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 7184,
      path: '/api/Patient/register',
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body, label }));
    });

    req.on('error', (err) => resolve({ status: 0, body: err.message, label }));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("");
  console.log("================================================");
  console.log("  PATIENT REGISTRATION CONCURRENCY TEST");
  console.log("  Two receptionists, same patient details");
  console.log("================================================");
  console.log("");

  const results = await Promise.all([
    registerPatient(token1, "Rochelle (userId 3)"),
    registerPatient(token2, "Jane (userId 1)")
  ]);

  results.forEach(r => {
    console.log(`--- RESPONSE from ${r.label} ---`);
    console.log(`Status: ${r.status}`);
    console.log(r.body);
    console.log("");
  });

  const successes = results.filter(r => r.status === 200 || r.status === 201);
  const conflicts = results.filter(r => r.status === 409);

  console.log("================================================");
  console.log("  RESULT");
  console.log("================================================");

  if (successes.length === 1 && conflicts.length === 1) {
    console.log("SUCCESS: One registration won, the other was rejected.");
    console.log("Duplicate patient prevention is working.");
  } else if (successes.length === 2) {
    console.log("WARNING: Both succeeded — the constraint may not be applied.");
  } else if (conflicts.length === 2) {
    console.log("Both were rejected — the ID already exists in the DB.");
    console.log("Change idNumber and contact in the script, then run again.");
  } else {
    console.log("Unexpected result. Check responses above.");
  }
}

main();