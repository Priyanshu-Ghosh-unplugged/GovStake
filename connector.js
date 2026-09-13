import { readFileSync, writeFileSync } from "fs";

const STATE_FILE = ".sharednet-state.json";
const BACKEND_URL = "http://localhost:3001";

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); }
  catch { return null; }
}
function saveState(s) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), "utf8"); }

async function api(method, url, body, token) {
  const opts = { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function handleMessage(msg, state) {
  // if (msg.member_id === state.memberId) return; // ignore self
  console.log(`[Message] ${msg.sender_name || msg.member_id}: ${msg.content}`);
  
  if (msg.content.includes("!escrow init")) {
    console.log("-> Processing escrow init");
    try {
      const res = await fetch(`${BACKEND_URL}/api/escrow/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: "buyer123", workerId: "worker123", bounty: 5, stake: 3 })
      });
      const data = await res.json();
      await api("POST", `${state.base}/api/v1/rooms/${state.room}/messages`, { 
        content: `Escrow Initialized! ID: ${data.escrowId} Grant: ${data.grantId}` 
      }, state.memberToken);
    } catch(e) {
      console.error(e);
    }
  } else if (msg.content.includes("!escrow exec")) {
    console.log("-> Processing escrow exec");
    try {
      const res = await fetch(`${BACKEND_URL}/api/escrow/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: "buyer123", workerId: "worker123" }) // requires escrowGrantId ideally
      });
      const data = await res.json();
      await api("POST", `${state.base}/api/v1/rooms/${state.room}/messages`, { 
        content: `Escrow Executed! Status: ${data.status} Slashed: ${data.evaluation?.isSlashed}` 
      }, state.memberToken);
    } catch(e) {
      console.error(e);
    }
  }
}

async function main() {
  const state = loadState();
  if (!state) throw new Error("No state. Run join first.");
  console.log(`Listening on SharedNet Room: ${state.room}...`);
  while (true) {
    try {
      const url = `${state.base}/api/v1/rooms/${state.room}/wait?after=${state.lastSeq}`;
      const res = await api("GET", url, null, state.memberToken);
      for (const msg of res.items ?? []) {
        await handleMessage(msg, state);
        if ((msg.sequence ?? 0) > state.lastSeq) { state.lastSeq = msg.sequence; saveState(state); }
      }
      if (res.next_cursor && Number(res.next_cursor) > state.lastSeq) {
        state.lastSeq = Number(res.next_cursor); saveState(state);
      }
    } catch (err) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

main().catch(console.error);
