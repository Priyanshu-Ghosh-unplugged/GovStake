import type { CapabilityGrant } from "@aicoo/sharedos";

export class Ledger {
  private balances: Map<string, number> = new Map();
  private escrows: Map<string, { buyerId: string; workerId: string; bounty: number; stake: number; grantId: string; status: string }> = new Map();
  private capabilityGrants: CapabilityGrant[] = [];

  constructor() {
    // BUG FIX #3: No hardcoded agent IDs. Any agent gets 100 credits on first touch.
    // Seed a few well-known names for local dev/testing convenience only.
  }

  // BUG FIX #3: Dynamic balance init — any agent ID is valid.
  private getOrInitBalance(agentId: string, defaultCredits = 100): number {
    if (!this.balances.has(agentId)) {
      this.balances.set(agentId, defaultCredits);
      console.log(`[Ledger] Initialized balance for new agent ${agentId}: ${defaultCredits} credits`);
    }
    return this.balances.get(agentId)!;
  }

  public getBalance(agentId: string): number {
    return this.getOrInitBalance(agentId);
  }

  public createEscrow(
    escrowId: string,
    buyerId: string,
    workerId: string,
    bounty: number,
    stake: number,
    grantId: string
  ): void {
    const buyerBal  = this.getOrInitBalance(buyerId);
    const workerBal = this.getOrInitBalance(workerId);

    if (buyerBal < bounty) {
      throw new Error(`Buyer ${buyerId} has insufficient funds (${buyerBal}) for bounty ${bounty}`);
    }
    if (workerBal < stake) {
      throw new Error(`Worker ${workerId} has insufficient funds (${workerBal}) for stake ${stake}`);
    }

    // Lock funds into escrow
    this.balances.set(buyerId,  buyerBal  - bounty);
    this.balances.set(workerId, workerBal - stake);

    this.escrows.set(escrowId, { buyerId, workerId, bounty, stake, grantId, status: 'active' });
    console.log(`[Ledger] Escrow ${escrowId} created: buyer=${buyerId} worker=${workerId} bounty=${bounty} stake=${stake}`);
  }

  public slashStake(workerId: string, penalty: number): void {
    // Stake is already deducted (locked in escrow); slash burns it.
    // The penalty amount is kept by GovStake as the enforcement fee.
    console.log(`[Ledger] Slashing ${penalty} from worker ${workerId} (stake burned)`);
    // Update any active escrow for this worker to 'slashed'
    for (const [id, escrow] of this.escrows.entries()) {
      if (escrow.workerId === workerId && escrow.status === 'active') {
        this.escrows.set(id, { ...escrow, status: 'slashed' });
      }
    }
  }

  public refundBounty(buyerId: string, bounty: number): void {
    const bal = this.getOrInitBalance(buyerId);
    this.balances.set(buyerId, bal + bounty);
    console.log(`[Ledger] Refunding ${bounty} credits to buyer ${buyerId} (new balance: ${bal + bounty})`);
  }

  public awardPenaltyFee(buyerId: string, fee: number): void {
    const bal = this.getOrInitBalance(buyerId);
    this.balances.set(buyerId, bal + fee);
    console.log(`[Ledger] Penalty fee ${fee} credited to buyer ${buyerId}`);
  }

  public releaseFunds(workerId: string, amount: number): void {
    const bal = this.getOrInitBalance(workerId);
    this.balances.set(workerId, bal + amount);
    console.log(`[Ledger] Released ${amount} credits to worker ${workerId} (new balance: ${bal + amount})`);
    // Mark escrows as completed
    for (const [id, escrow] of this.escrows.entries()) {
      if (escrow.workerId === workerId && escrow.status === 'active') {
        this.escrows.set(id, { ...escrow, status: 'completed' });
      }
    }
  }

  public getEscrow(escrowId: string) {
    return this.escrows.get(escrowId) ?? null;
  }

  public getAllEscrows() {
    return Array.from(this.escrows.entries()).map(([id, data]) => ({ id, ...data }));
  }

  public getAllBalances() {
    return Object.fromEntries(this.balances.entries());
  }

  public addGrant(grant: CapabilityGrant): void {
    this.capabilityGrants.push(grant);
    console.log(`[Ledger] Added capability grant ${grant.id}`);
  }

  public auditTrace: any[] = [];
  public addAuditLog(event: any): void {
    // Deduplicate by eventId/id
    const eventId = event.eventId ?? event.id;
    if (eventId && this.auditTrace.some(e => (e.eventId ?? e.id) === eventId)) return;
    this.auditTrace.unshift(event);
    if (this.auditTrace.length > 100) {
      this.auditTrace.pop();
    }
  }

  public getGrants(namespaceId: string, subject: any, issuer: any): CapabilityGrant[] {
    return this.capabilityGrants.filter(
      (candidate) =>
        candidate.namespaceId === namespaceId &&
        JSON.stringify(candidate.subject) === JSON.stringify(subject) &&
        JSON.stringify(candidate.issuer) === JSON.stringify(issuer),
    );
  }
}

export const ledger = new Ledger();
