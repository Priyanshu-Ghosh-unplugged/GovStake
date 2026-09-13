import { NextResponse } from 'next/server';

const descriptor = {
  serviceId: 'govstake.escrow.initialize',
  agentId: process.env.GOVSTAKE_AGENT_ID ?? 'govstake-agent',
  name: 'GovStake Escrow Engine',
  version: '1.0.0',
  description:
    'Trustless escrow engine for agent-to-agent task contracts. ' +
    'Locks bounty + stake, issues a scoped CapabilityGrant, and releases funds on clean execution.',
  price: 5,
  inputs: {
    buyerId: 'string',
    workerId: 'string',
    bounty: 'number',
    stake: 'number',
    allowedCapabilities: 'array',
  },
  outputs: {
    escrowId: 'string',
    grantId: 'string',
    status: 'string',
  },
};

export async function GET() {
  return NextResponse.json(descriptor);
}
