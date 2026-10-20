const https = require('https');

// ----------------------------------------------------------------
// Admin token — paste from logging in as admin / admin123
// ----------------------------------------------------------------
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjEiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbiIsImp0aSI6IjVlYjhjOGNkLTJlMTItNDE4MC05ZTllLTMyYzY0MmM4NGE0YiIsImV4cCI6MTc5MjA3ODE2MiwiaXNzIjoiSGVhbHRoY2FyZUFQSSIsImF1ZCI6IkhlYWx0aGNhcmVSZWFjdEFwcCJ9.Oy2XV5T-HfUZ1hdaENOCb89OxrGuRYX9l1Vv-vW-YAA"
;

// ----------------------------------------------------------------
// Fresh receptionist details each run
// The username is unique per run thanks to Date.now()
// but BOTH requests inside this run use the SAME username
// ----------------------------------------------------------------
const payload = {
  name: "Concurrent Receptionist Test",
  username: "concurrentrecep_" + Date.now(),
  contact: "0820000000",
  password: "receptionist123"
};

function createReceptionist(label) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 7184,
      path: '/api/Receptionist',
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
  console.log("  RECEPTIONIST CREATION CONCURRENCY TEST");
  console.log("  Two simultaneous requests, same username");
  console.log("================================================");
  console.log("");
  console.log("  Username being tested: " + payload.username);
  console.log("");

  const results = await Promise.all([
    createReceptionist("Request 1"),
    createReceptionist("Request 2")
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
    console.log("SUCCESS: One creation won, the other was rejected.");
    console.log("Duplicate receptionist prevention is working.");
  } else if (successes.length === 2) {
    console.log("WARNING: Both succeeded — the constraint may not be applied.");
  } else {
    console.log("Unexpected result. Check responses above.");
  }
  console.log("");
}

main();