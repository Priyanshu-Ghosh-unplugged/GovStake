import { ledger } from './ledger.js';
import { kernel } from './kernel.js';
import {
  SharedOSExecutor,
  StandardRuntime,
  agentExecutionCapability,
  type AgentTurnDriver,
  type AccessContext,
  type CapabilityGrant,
} from '@aicoo/sharedos';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config(); // uses .env in cwd, or environment variables already set (Vercel)

/**
 * A deterministic AgentTurnDriver that represents the escrow worker agent.
 * It opens a session, attempts one tool call (files.search on the allowed path),
 * then completes. Every step is authorized by the SharedOSKernel and recorded
 * in the AuditSink that simultaneously writes to our local ledger AND POSTs
 * to the SharedOS audit endpoint.
 */
const escrowWorkerDriver: AgentTurnDriver = {
  async open(request) {
    let step = 0;
    return {
      async next(input) {
        step++;
        if (step === 1) {
          // First step: attempt a files.search on the allowed work path
          return {
            type: 'tool_call',
            call: {
              id: crypto.randomUUID(),
              tool: 'files.search',
              arguments: {
                path: ['Work'],
                query: 'escrow instructions',
              },
              traceId: request.context.traceId,
              requestedAt: new Date().toISOString(),
            },
          };
        }
        // Second step: complete with the result
        return {
          type: 'complete',
          output: {
            summary: 'Escrow worker turn completed.',
            toolResult: input,
          },
        };
      },
    };
  },
};

export class EscrowEngine {
  constructor() {}

  public async constructDeterministicGrant(
    buyerId: string,
    workerId: string,
    allowedCapabilities: any[]
  ): Promise<any> {
    const workerAgent = { kind: 'agent' as const, agentId: workerId };
    const buyerAgent  = { kind: 'agent' as const, agentId: buyerId };

    // BUG FIX #1: The kernel requires a `sharedos.execution` capability (via
    // agentExecutionCapability) in every grant to authorize the turn envelope.
    // Without it, admitTurn() rejects with "no_matching_grant" before any tool
    // call is attempted. Prepend it here alongside the task-scoped capabilities.
    const executionCap = agentExecutionCapability(workerAgent, buyerAgent);

    const taskCapabilities = allowedCapabilities.length > 0
      ? allowedCapabilities
      : [
          {
            resource: { namespace: 'files', path: ['Work'] },
            actions: ['search'],
            scope: 'descendants',
          },
        ];

    const escrowGrant: CapabilityGrant = {
      id: `gnt_${Date.now()}_${crypto.randomUUID()}`,
      namespaceId: 'govstake',
      issuer: buyerAgent,
      subject: workerAgent,
      // Execution capability must come first so admitTurn() passes
      capabilities: [executionCap, ...taskCapabilities],
      constraints: {
        purposes: ['escrow_contract_execution'],
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
      issuedAt: new Date().toISOString(),
    };

    ledger.addGrant(escrowGrant);
    return escrowGrant;
  }

  public async executeEscrowTurn(workerId: string, buyerId: string) {
    const workerAgent = { kind: 'agent' as const, agentId: workerId };
    const buyerAgent  = { kind: 'agent' as const, agentId: buyerId };
    const traceId     = crypto.randomUUID();
    const executionId = crypto.randomUUID();
    const now         = new Date().toISOString();

    console.log(`[Engine] Building AccessContext for worker=${workerId}`);

    // Build the trusted AccessContext server-side — never from request body
    const context: AccessContext = {
      namespaceId: 'govstake',
      actor:       workerAgent,
      authority:   buyerAgent,          // buyer issued the grant
      owner:       buyerAgent,          // buyer owns the resources
      purpose:     'escrow_contract_execution',
      traceId,
      enabledToolNamespaces: ['files'],
      now,
    };

    // List what this agent can actually see (kernel filters by grants)
    const visibleTools = await kernel.listTools(context);
    console.log(`[Engine] Visible tools for ${workerId}: [${visibleTools.map(t => t.name).join(', ')}]`);

    const runtime  = new StandardRuntime(escrowWorkerDriver);
    const executor = new SharedOSExecutor(kernel, runtime, {
      defaultMaxSteps:    8,
      defaultMaxToolCalls: 8,
      defaultTimeoutMs:   30_000,
    });

    const result = await executor.execute({
      version:     '1',
      executionId,
      agent:       workerAgent,
      context,
      message: {
        version:   '1',
        id:        crypto.randomUUID(),
        sender:    buyerAgent,
        receiver:  workerAgent,
        purpose:   'escrow_contract_execution',
        payload:   { text: 'Execute escrow instructions per the signed grant.' },
        traceId,
        createdAt: now,
      },
      tools: [...visibleTools],
    });

    console.log(`[Engine] Turn result: status=${result.status} events=${result.events.length}`);

    // Push all native kernel events into the local ledger (kernel already
    // sent them through BatchedAuditSink → SharedOS audit endpoint)
    for (const ev of result.events) {
      ledger.addAuditLog(ev as any);
    }

    return result;
  }

  public async evaluateAuditLogAndSlash(
    executionId: string,
    escrowGrantId: string,
    buyerId: string,
    workerId: string,
    traceEvents: any[]
  ) {
    console.log(`[Engine] Evaluating trace for execution ${executionId}`);

    let isSlashed   = false;
    let isEscalated = false;

    for (const event of (traceEvents ?? [])) {
      ledger.addAuditLog(event);

      // BUG FIX #2: The kernel emits "turn.denied" and "turn.ended" (with
      // outcome:"denied") — NOT "tool.denied". Check both canonical forms.
      const isDenied =
        event.type === 'turn.denied' ||
        (event.type === 'turn.ended' && event.outcome === 'denied') ||
        (event.type === 'authorization.checked' && event.outcome === 'denied' &&
          // Only slash on tool-level denials, not the turn-level admitTurn check
          event.resource?.namespace !== 'sharedos.execution');

      if (isDenied) {
        console.log(`[Engine] Violation detected — unauthorized operation: ${event.type} ${event.reason ?? ''}`);
        isSlashed = true;
        break;
      }
      if (event.type === 'escalated' || event.outcome === 'escalated') {
        isEscalated = true;
      }
    }

    if (isSlashed) {
      ledger.slashStake(workerId, 3);
      ledger.refundBounty(buyerId, 5);
      ledger.awardPenaltyFee(buyerId, 1);
      console.log(`[Engine] Slashing complete. Escrow revoked.`);
    } else if (!isEscalated) {
      ledger.releaseFunds(workerId, 8);
      console.log(`[Engine] Execution successful. Funds released.`);
    } else {
      console.log(`[Engine] Execution escalated. Awaiting manual resolution.`);
    }

    return { isSlashed, isEscalated };
  }
}
