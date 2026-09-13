export class Ledger {
    balances = new Map();
    escrows = new Map();
    capabilityGrants = [];
    constructor() {
        // Initial balances for demonstration
        this.balances.set("agent_a_id", 100);
        this.balances.set("agent_b_id", 100);
    }
    getBalance(agentId) {
        return this.balances.get(agentId) || 0;
    }
    createEscrow(escrowId, buyerId, workerId, bounty, stake, grantId) {
        if (this.getBalance(buyerId) < bounty) {
            throw new Error("Buyer has insufficient funds for bounty");
        }
        if (this.getBalance(workerId) < stake) {
            throw new Error("Worker has insufficient funds for stake");
        }
        // Deduct funds into escrow
        this.balances.set(buyerId, this.getBalance(buyerId) - bounty);
        this.balances.set(workerId, this.getBalance(workerId) - stake);
        this.escrows.set(escrowId, { buyerId, workerId, bounty, stake, grantId });
    }
    slashStake(workerId, penalty) {
        // In a real system, the stake is in the escrow, but for simplicity here we just manage it logic-wise
        // We deduct from the escrow or from the agent directly.
        console.log(`[Ledger] Slashing ${penalty} from worker ${workerId}`);
    }
    refundBounty(buyerId, bounty) {
        this.balances.set(buyerId, this.getBalance(buyerId) + bounty);
        console.log(`[Ledger] Refunding ${bounty} to buyer ${buyerId}`);
    }
    awardPenaltyFee(buyerId, fee) {
        this.balances.set(buyerId, this.getBalance(buyerId) + fee);
        console.log(`[Ledger] Awarding penalty fee ${fee} to buyer ${buyerId}`);
    }
    releaseFunds(workerId, amount) {
        this.balances.set(workerId, this.getBalance(workerId) + amount);
        console.log(`[Ledger] Releasing funds ${amount} to worker ${workerId}`);
    }
    getEscrow(escrowId) {
        return this.escrows.get(escrowId);
    }
    getAllEscrows() {
        return Array.from(this.escrows.entries()).map(([id, data]) => ({ id, ...data }));
    }
    addGrant(grant) {
        this.capabilityGrants.push(grant);
        console.log(`[Ledger] Added capability grant ${grant.id}`);
    }
    auditTrace = [];
    addAuditLog(event) {
        this.auditTrace.unshift(event);
        if (this.auditTrace.length > 50) {
            this.auditTrace.pop();
        }
    }
    getGrants(namespaceId, subject, issuer) {
        return this.capabilityGrants.filter((candidate) => candidate.namespaceId === namespaceId &&
            JSON.stringify(candidate.subject) === JSON.stringify(subject) &&
            JSON.stringify(candidate.issuer) === JSON.stringify(issuer));
    }
}
export const ledger = new Ledger();
