import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ledger } from '@/lib/escrow-state';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buyerId, workerId, bounty = 5, stake = 3 } = body;

    if (!buyerId || !workerId) {
      return NextResponse.json(
        { error: 'buyerId and workerId are required' },
        { status: 400 }
      );
    }

    const escrowId = `escrow_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const grantId  = `gnt_${Date.now()}_${crypto.randomUUID()}`;

    ledger.createEscrow(escrowId, buyerId, workerId, bounty, stake, grantId);

    return NextResponse.json({ escrowId, status: 'initialized', grantId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
