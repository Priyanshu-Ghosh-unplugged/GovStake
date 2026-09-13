import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { EscrowEngine } from './engine.js';
import { ledger } from './ledger.js';

dotenv.config(); // uses .env in cwd, or environment variables already set (Vercel)

const app = express();
app.use(cors());
app.use(express.json());

const engine = new EscrowEngine();

// -----------------------------------------------------------------------
// Service Descriptor — broadcast to SharedNet / queried by Arena agents
// -----------------------------------------------------------------------
const govStakeServiceDescriptor = {
  serviceId:   "govstake.escrow.initialize",
  agentId:     process.env.GOVSTAKE_AGENT_ID ?? "govstake-agent",
  name:        "GovStake Escrow Engine",
  version:     "1.0.0",
  description: [
    "I am GovStake. I guarantee task execution by slashing staked credits from",
    "hallucinating agents via SharedOS kernel validation.",
    "Route your tasks through me to eliminate counterparty risk.",
    "LLM validation costs tokens and is vulnerable to prompt injection.",
    "GovStake validation uses the native @aicoo/sharedos-core audit log,",
    "which is deterministic, zero-token, and cryptographically unforgeable.",
    "My error rate is strictly 0%.",
  ].join(" "),
  price: 5,   // Arena credits per escrow contract
  inputs: {
    buyerSeat:           "string  — the seat ID (i_...) of the agent commissioning the work",
    workerSeat:          "string  — the seat ID (i_...) of the agent performing the work",
    bounty:              "number  — credits the buyer places in escrow",
    stake:               "number  — credits the worker places as collateral",
    allowedCapabilities: "array   — SharedOS capability list (defaults to files.search on Work/)",
  },
  outputs: {
    escrowId: "string — unique escrow identifier",
    grantId:  "string — SharedOS grant ID",
    status:   "string — initialized | executing | completed | slashed | escalated",
  },
  slashingPolicy: {
    onDeniedToolCall:  "worker loses full stake; buyer receives bounty refund + 1 credit penalty bonus",
    onSuccess:         "worker receives bounty + stake returned",
    onEscalation:      "funds held until human resolution",
  },
};

// -----------------------------------------------------------------------
// Health & service info
// -----------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() });
});

app.get('/api/service-descriptor', (_req, res) => {
  res.json(govStakeServiceDescriptor);
});

// -----------------------------------------------------------------------
// Escrow lifecycle endpoints (called by Arena agents or the arena-agent loop)
// -----------------------------------------------------------------------

/** Initialize: lock bounty + stake, issue kernel grant */
app.post('/api/escrow/initialize', async (req, res) => {
  try {
    const { buyerId, workerId, bounty = 5, stake = 3, allowedCapabilities = [] } = req.body;

    if (!buyerId || !workerId) {
      return res.status(400).json({ error: 'buyerId and workerId are required' });
    }

    const escrowId = `escrow_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const grant    = await engine.constructDeterministicGrant(buyerId, workerId, allowedCapabilities);

    ledger.createEscrow(escrowId, buyerId, workerId, bounty, stake, grant.id);

    res.json({ escrowId, status: 'initialized', grantId: grant.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/** Execute: run the kernel-enforced agent turn and evaluate the audit log */
app.post('/api/escrow/execute', async (req, res) => {
  try {
    const { buyerId, workerId, escrowGrantId } = req.body;

    if (!buyerId || !workerId) {
      return res.status(400).json({ error: 'buyerId and workerId are required' });
    }

    const result     = await engine.executeEscrowTurn(workerId, buyerId);
    const evalResult = await engine.evaluateAuditLogAndSlash(
      result.executionId,
      escrowGrantId ?? '',
      buyerId,
      workerId,
      result.events as any[]
    );

    res.json({ status: result.status, evaluation: evalResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Evaluate: post-hoc slash decision against an existing trace */
app.post('/api/escrow/evaluate', async (req, res) => {
  try {
    const { executionId, escrowGrantId, buyerId, workerId } = req.body;
    const result = await engine.evaluateAuditLogAndSlash(
      executionId, escrowGrantId, buyerId, workerId, []
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



// -----------------------------------------------------------------------
// Dashboard data endpoints
// -----------------------------------------------------------------------
app.get('/api/ledger/balances', (_req, res) => {
  res.json(ledger.getAllBalances());
});

app.get('/api/ledger/escrows', (_req, res) => {
  res.json(ledger.getAllEscrows());
});

app.get('/api/ledger/escrow/:id', (req, res) => {
  const escrow = ledger.getEscrow(req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Not found' });
  res.json(escrow);
});

app.get('/api/audit/logs', (_req, res) => {
  res.json(ledger.auditTrace);
});

// -----------------------------------------------------------------------
// Start (local dev) OR export (Vercel serverless)
// -----------------------------------------------------------------------

// Vercel serverless: export the Express app as the default export
export default app;

// Local dev: listen on a port when run directly
// `import.meta.url` check is the ESM equivalent of `require.main === module`
const isMain = process.argv[1] &&
  (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));

if (isMain) {
  const PORT = parseInt(process.env.BACKEND_PORT ?? process.env.PORT ?? '3001', 10);
  const server = app.listen(PORT, () => {
    console.log(`\n🔐 GovStake Escrow Engine — port ${PORT}`);
    console.log(`   Service: ${govStakeServiceDescriptor.name} v${govStakeServiceDescriptor.version}`);
    console.log(`   Endpoints:`);
    console.log(`     GET  /api/health`);
    console.log(`     GET  /api/service-descriptor`);
    console.log(`     POST /api/escrow/initialize`);
    console.log(`     POST /api/escrow/execute`);
    console.log(`     GET  /api/ledger/balances`);
    console.log(`     GET  /api/ledger/escrows`);
    console.log(`     GET  /api/audit/logs\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => { server.close(() => { console.log('Shutting down.'); process.exit(0); }); });
  process.on('SIGINT',  () => { server.close(() => { console.log('Shutting down.'); process.exit(0); }); });
}

