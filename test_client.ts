import { SharedOSClient } from '@aicoo/sharedos-client';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const client = new SharedOSClient({
  baseUrl: process.env.SHAREDOS_CLOUD_URL || 'https://www.sharedos.ai',
  token: process.env.SHAREDOS_KEY || 'sos_development_-1T70OY-cNlbMUgchfnwn19HK9dFqS65',
  projectId: 'project_govstake'
});

async function run() {
  try {
    const workerAgent = { kind: "agent", agentId: "worker_test" } as const;
    const buyerAgent = { kind: "agent", agentId: "buyer_test" } as const;

    const result = await client.executeTurn({
      version: "1",
      executionId: crypto.randomUUID(),
      agent: workerAgent,
      message: {
        version: "1",
        id: crypto.randomUUID(),
        sender: buyerAgent,
        receiver: workerAgent,
        purpose: "escrow_contract_execution",
        payload: { text: "Execute escrow instructions." },
        traceId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
    });
    console.log("Success:", result);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

run();
