const fs = require('fs');

const payload = JSON.parse(fs.readFileSync('payload_turns.json', 'utf8'));

fetch("https://www.sharedos.ai/v1/turns", {
  method: "POST",
  headers: {
    "authorization": "Bearer sos_development_-1T70OY-cNlbMUgchfnwn19HK9dFqS65",
    "content-type": "application/json"
  },
  body: JSON.stringify(payload)
}).then(res => {
  console.log("Status:", res.status);
  return res.text();
}).then(text => {
  console.log("Response:", text);
}).catch(console.error);
