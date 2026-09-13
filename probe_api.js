const KEY = 'sos_development_-1T70OY-cNlbMUgchfnwn19HK9dFqS65';
const BASE = 'https://www.sharedos.ai';

async function run() {
  // Try different base paths to find the real API
  const paths = [
    '/health',
    '/api/health',
    '/api/v1/health',
    '/v1/turns',
    '/api/v1/turns',
  ];

  for (const path of paths) {
    const method = path.includes('turns') ? 'POST' : 'GET';
    const opts = {
      method,
      headers: {
        authorization: `Bearer ${KEY}`,
        'content-type': 'application/json',
        accept: 'application/json'
      }
    };
    if (method === 'POST') {
      opts.body = JSON.stringify({ version: "1", executionId: "test", agent: { kind: "agent", agentId: "test" }, message: { version: "1", id: "m1", sender: { kind: "agent", agentId: "b" }, receiver: { kind: "agent", agentId: "w" }, purpose: "test", payload: {}, traceId: "tr1", createdAt: new Date().toISOString() } });
    }
    try {
      const r = await fetch(`${BASE}${path}`, opts);
      const text = await r.text();
      const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
      console.log(`${method} ${path} → ${r.status} | ${isJson ? text.substring(0, 300) : '[HTML]'}`);
    } catch(e) {
      console.log(`${method} ${path} → ERROR: ${e.message}`);
    }
  }

  // Also try the arena / SharedNet API endpoint
  const arenaEndpoints = [
    'https://arena.sharedos.ai/v1/turns',
    'https://api.sharedos.ai/v1/turns',
    'https://cloud.sharedos.ai/v1/turns',
  ];
  
  for (const url of arenaEndpoints) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ version: "1", executionId: "test" })
      });
      console.log(`POST ${url} → ${r.status} | ${(await r.text()).substring(0, 200)}`);
    } catch(e) {
      console.log(`POST ${url} → ${e.message}`);
    }
  }
}

run().catch(console.error);
