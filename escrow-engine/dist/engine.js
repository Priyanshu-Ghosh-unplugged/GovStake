import { ledger } from './ledger.js';
import { SharedOSClient } from '@aicoo/sharedos-client';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
const clientOptions = {
    baseUrl: process.env.SHAREDOS_CLOUD_URL || 'https://api.sharedos.cloud',
    token: process.env.SHAREDOS_KEY || 'default_dev_key',
    projectId: process.env.SHAREDOS_PROJECT_ID || 'project_govstake'
};
export const client = new SharedOSClient(clientOptions);
import crypto from 'crypto';
export class EscrowEngine {
    constructor() { }
    async constructDeterministicGrant(buyerId, workerId, allowedCapabilities) {
        const escrowGrant = {
            id: `gnt_${Date.now()}_${crypto.randomUUID()}`,
            namespaceId: "govstake",
            issuer: { kind: "agent", agentId: buyerId },
            subject: { kind: "agent", agentId: workerId },
            capabilities: allowedCapabilities,
            constraints: {
                purposes: ["escrow_contract_execution"],
                expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour TTL
                maxUses: 5,
            },
            issuedAt: new Date().toISOString(),
        };
        // Store directly in local ledger
        ledger.addGrant(escrowGrant);
        return escrowGrant;
    }
    async executeEscrowTurn(workerId, buyerId) {
        const workerAgent = { kind: "agent", agentId: workerId };
        const buyerAgent = { kind: "agent", agentId: buyerId };
        const purpose = "escrow_contract_execution";
        const traceId = crypto.randomUUID();
        console.log(`[Engine] Starting remote execution for worker ${workerId}`);
        const result = await client.executeTurn({
            version: "1",
            executionId: crypto.randomUUID(),
            agent: workerAgent,
            message: {
                version: "1",
                id: crypto.randomUUID(),
                sender: buyerAgent,
                receiver: workerAgent,
                purpose: purpose,
                payload: { text: "Execute escrow instructions." },
                traceId: traceId,
                createdAt: new Date().toISOString(),
            },
        });
        return result;
    }
    async evaluateAuditLogAndSlash(executionId, escrowGrantId, buyerId, workerId, traceEvents) {
        console.log(`[Engine] Evaluating trace for execution ${executionId}`);
        let isSlashed = false;
        let isEscalated = false;
        // Evaluate each event in the trace
        if (traceEvents) {
            for (const event of traceEvents) {
                ledger.addAuditLog(event);
                if (event.type === "tool.denied") {
                    console.log(`[Engine] Violation detected! Agent attempted unauthorized call.`);
                    isSlashed = true;
                    break;
                }
                if (event.type === "escalated") {
                    isEscalated = true;
                }
            }
        }
        if (isSlashed) {
            ledger.slashStake(workerId, 3);
            ledger.refundBounty(buyerId, 5);
            ledger.awardPenaltyFee(buyerId, 1);
            console.log(`[Engine] Slashing complete. Escrow revoked.`);
        }
        else if (!isEscalated) {
            ledger.releaseFunds(workerId, 8);
            console.log(`[Engine] Execution successful. Funds released.`);
        }
        else {
            console.log(`[Engine] Execution escalated. Awaiting manual resolution.`);
        }
        return { isSlashed, isEscalated };
    }
}
