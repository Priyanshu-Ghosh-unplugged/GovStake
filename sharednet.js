#!/usr/bin/env node
/**
 * SharedNet Room Helper -- sharednet.js
 * Usage:
 *   node sharednet.js join "<invite>"
 *   node sharednet.js listen
 *   node sharednet.js say "your message"
 *   node sharednet.js history [--last N]
 *
 * Invite formats accepted:
 *   ROOM=rom_...  TOKEN=rit_...  BASE=https://www.sharednet.ai
 *   https://www.sharednet.ai/join/rit_...
 *   rit_...@rom_...   (for_agents format)
 *
 * State saved to .sharednet-state.json (never prints tokens).
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const STATE_FILE = ".sharednet-state.json";
const AGENT_NAME = "govstake-agent";
const RUNTIME_KIND = "gemini-cli";

function loadState() {
  if (!existsSync(STATE_FILE)) return null;
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); }
  catch { return null; }
}

function saveState(s) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), "utf8");
}

function parseInvite(raw) {
  raw = raw.trim();
  const roomMatch  = raw.match(/ROOM\s*=\s*(rom_\S+)/);
  const tokenMatch = raw.match(/TOKEN\s*=\s*(rit_\S+)/);
  const baseMatch  = raw.match(/BASE\s*=\s*(https?:\/\/\S+)/);
  if (roomMatch && tokenMatch) {
    return { room: roomMatch[1], token: tokenMatch[1], base: (baseMatch ? baseMatch[1] : "https://www.sharednet.ai").replace(/\/$/, "") };
  }
  const forAgents = raw.match(/^(rit_\S+)@(rom_\S+)$/);
  if (forAgents) return { token: forAgents[1], room: forAgents[2], base: "https://www.sharednet.ai" };
  const linkMatch = raw.match(/https?:\/\/([^/]+)\/join\/(rit_\S+)/);
  if (linkMatch) return { token: linkMatch[2], room: null, base: `https://${linkMatch[1]}` };
  throw new Error("Cannot parse invite. Expected ROOM=rom_... TOKEN=rit_..., a /join/<TOKEN> link, or token@room.");
}

async function api(method, url, body, token) {
  const opts = { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function cmdJoin(inviteRaw) {
  const invite = parseInvite(inviteRaw);
  let room = invite.room;
  const base = invite.base;
  if (!room) {
    console.log("Resolving room from invite link...");
    const info = await api("GET", `${base}/api/v1/invites/${invite.token}`, null, invite.token);
    room = info.room_id ?? info.room ?? info.data?.room_id;
    if (!room) throw new Error(`Cannot determine room id: ${JSON.stringify(info)}`);
  }
  console.log(`Joining room ${room}...`);
  const joined = await api("POST", `${base}/api/v1/rooms/${room}/join`,
    { name: AGENT_NAME, runtime: { kind: RUNTIME_KIND } }, invite.token);
  const memberToken = joined.member_token ?? joined.token;
  if (!memberToken) throw new Error(`Join response missing member_token: ${JSON.stringify(joined)}`);
  const history = joined.history?.items ?? [];
  const lastSeq = history.length ? Math.max(...history.map(m => m.sequence ?? 0)) : 0;
  const state = { room, base, memberId: joined.member_id ?? joined.id, memberToken, lastSeq };
  saveState(state);
  console.log("\n? Joined SharedNet Room");
  console.log(`   Room ID   : ${room}`);
  console.log(`   Member ID : ${state.memberId}`);
  console.log(`   Last seq  : ${lastSeq}`);
  if (history.length) {
    console.log("\n-- Recent history --");
    for (const msg of history) console.log(`[${msg.sequence}] ${msg.sender_name ?? msg.member_id ?? "?"}: ${msg.content}`);
  }
  console.log("\nJoined and listening.");
  console.log("Run: node sharednet.js listen");
}

async function cmdSay(content) {
  const state = loadState();
  if (!state) throw new Error('Not joined. Run: node sharednet.js join "<invite>"');
  const res = await api("POST", `${state.base}/api/v1/rooms/${state.room}/messages`, { content }, state.memberToken);
  console.log(`Message sent (seq ${res.sequence ?? res.data?.sequence ?? "?"}).`);
}

async function cmdHistory(last = 20) {
  const state = loadState();
  if (!state) throw new Error('Not joined. Run: node sharednet.js join "<invite>"');
  const url = new URL(`${state.base}/api/v1/rooms/${state.room}/messages`);
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", String(last));
  const res = await api("GET", url.toString(), null, state.memberToken);
  const items = (res.items ?? []).reverse();
  if (!items.length) { console.log("(no messages)"); return; }
  for (const msg of items) console.log(`[${msg.sequence}] ${msg.sender_name ?? msg.member_id ?? "?"}: ${msg.content}`);
}

async function cmdListen() {
  const state = loadState();
  if (!state) throw new Error('Not joined. Run: node sharednet.js join "<invite>"');
  console.log(`Listening on ${state.room} from seq ${state.lastSeq}. Ctrl+C to stop.\n`);
  while (true) {
    try {
      const url = `${state.base}/api/v1/rooms/${state.room}/wait?after=${state.lastSeq}`;
      const res = await api("GET", url, null, state.memberToken);
      for (const msg of res.items ?? []) {
        if (msg.member_id !== state.memberId) {
          console.log(`[${msg.sequence}] ${msg.sender_name ?? msg.member_id ?? "?"}: ${msg.content}`);
        }
        if ((msg.sequence ?? 0) > state.lastSeq) { state.lastSeq = msg.sequence; saveState(state); }
      }
      if (res.next_cursor && Number(res.next_cursor) > state.lastSeq) {
        state.lastSeq = Number(res.next_cursor); saveState(state);
      }
    } catch (err) {
      console.error("Wait error (retry in 5s):", err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

const [,, cmd, ...rest] = process.argv;
(async () => {
  switch (cmd) {
    case "join":    await cmdJoin(rest.join(" ")); break;
    case "say":     await cmdSay(rest.join(" ")); break;
    case "history": {
      const i = rest.indexOf("--last");
      await cmdHistory(i !== -1 ? Number(rest[i+1]) : 20);
      break;
    }
    case "listen":  await cmdListen(); break;
    default:
      console.log(`
SharedNet Room Helper
---------------------
  node sharednet.js join "<invite>"      Join a room
  node sharednet.js say  "message"       Post a message
  node sharednet.js history [--last N]   Show last N messages (default 20)
  node sharednet.js listen               Long-poll loop (Ctrl+C to stop)
      `);
  }
})().catch(err => { console.error("Error:", err.message); process.exit(1); });
