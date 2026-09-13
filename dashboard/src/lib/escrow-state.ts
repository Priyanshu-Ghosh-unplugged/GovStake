/**
 * In-memory escrow ledger — shared singleton within a serverless instance.
 * Runs without any external dependencies, suitable for Vercel Edge/Node runtime.
 */

import crypto from 'crypto';

export type EscrowStatus = 'active' | 'completed' | 'slashed' | 'escalated';

export interface EscrowRecord {
  id: string;
  buyerId: string;
  workerId: string;
  bounty: number;
  stake: number;
  grantId: string;
  status: EscrowStatus;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  type: string;
  outcome?: string;
  tool?: string;
  action?: string;
  timestamp: string;
  escrowId?: string;
  workerId?: string;
  buyerId?: string;
}

class EscrowLedger {
  private balances = new Map<string, number>();
  private escrows = new Map<string, EscrowRecord>();
  auditTrace: AuditEvent[] = [];

  private initBalance(agentId: string, defaultCredits = 100): number {
    if (!this.balances.has(agentId)) {
      this.balances.set(agentId, defaultCredits);
    }
    return this.balances.get(agentId)!;
  }

  getBalance(agentId: string): number {
    return this.initBalance(agentId);
  }

  getAllBalances(): Record<string, number> {
    return Object.fromEntries(this.balances.entries());
  }

  createEscrow(
    escrowId: string,
    buyerId: string,
    workerId: string,
    bounty: number,
    stake: number,
    grantId: string
  ): EscrowRecord {
    const buyerBal = this.initBalance(buyerId);
    const workerBal = this.initBalance(workerId);

    if (buyerBal < bounty)
      throw new Error(`Buyer ${buyerId} has insufficient funds (${buyerBal}) for bounty ${bounty}`);
    if (workerBal < stake)
      throw new Error(`Worker ${workerId} has insufficient funds (${workerBal}) for stake ${stake}`);

    this.balances.set(buyerId, buyerBal - bounty);
    this.balances.set(workerId, workerBal - stake);

    const record: EscrowRecord = {
      id: escrowId, buyerId, workerId, bounty, stake, grantId,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.escrows.set(escrowId, record);
    return record;
  }

  getEscrow(id: string): EscrowRecord | null {
    return this.escrows.get(id) ?? null;
  }

  getAllEscrows(): EscrowRecord[] {
    return Array.from(this.escrows.values());
  }

  updateEscrowStatus(workerId: string, status: EscrowStatus) {
    for (const [, escrow] of this.escrows.entries()) {
      if (escrow.workerId === workerId && escrow.status === 'active') {
        escrow.status = status;
      }
    }
  }

  releaseFunds(workerId: string, amount: number) {
    const bal = this.initBalance(workerId);
    this.balances.set(workerId, bal + amount);
    this.updateEscrowStatus(workerId, 'completed');
  }

  slashStake(workerId: string, buyerId: string, bounty: number) {
    const buyerBal = this.initBalance(buyerId);
    this.balances.set(buyerId, buyerBal + bounty + 1); // refund + penalty bonus
    this.updateEscrowStatus(workerId, 'slashed');
  }

  addAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const entry: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.auditTrace.unshift(entry);
    if (this.auditTrace.length > 100) this.auditTrace.pop();
    return entry;
  }
}

// Module-level singleton — persists across warm serverless invocations
const globalForLedger = globalThis as unknown as { __escrowLedger: EscrowLedger };
if (!globalForLedger.__escrowLedger) {
  globalForLedger.__escrowLedger = new EscrowLedger();
}
export const ledger = globalForLedger.__escrowLedger;

/** Simulate a deterministic escrow turn (no external SharedOS call needed) */
export function simulateEscrowExecution(
  workerId: string,
  buyerId: string,
  escrowGrantId: string
): { isSlashed: boolean; isEscalated: boolean; events: AuditEvent[] } {
  const executionId = crypto.randomUUID();

  // Simulate a successful tool call
  const toolEvent = ledger.addAuditEvent({
    type: 'authorization.checked',
    outcome: 'allowed',
    tool: 'files.search',
    action: 'search',
    escrowId: escrowGrantId,
    workerId,
    buyerId,
  });

  const completeEvent = ledger.addAuditEvent({
    type: 'turn.ended',
    outcome: 'completed',
    escrowId: escrowGrantId,
    workerId,
    buyerId,
  });

  // Release funds on success
  ledger.releaseFunds(workerId, 8);

  return {
    isSlashed: false,
    isEscalated: false,
    events: [toolEvent, completeEvent],
  };
}
