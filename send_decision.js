const fs = require('fs');

const payload = JSON.parse(fs.readFileSync('payload.json', 'utf8'));

fetch("https://www.sharedos.ai/v1/audit/events", {
  method: "POST",
  headers: {
    "authorization": "Bearer sos_development_G0vSRVr0ygc2i8cVmsRwWcyleNhX4-8Z",
    "content-type": "application/json"
  },
  body: JSON.stringify(payload)
}).then(res => {
  console.log("Status:", res.status);
  return res.text();
}).then(text => {
  console.log("Response:", text);
}).catch(console.error);
