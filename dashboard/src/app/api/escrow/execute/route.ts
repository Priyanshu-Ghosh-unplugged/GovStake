import { NextRequest, NextResponse } from 'next/server';
import { simulateEscrowExecution } from '@/lib/escrow-state';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buyerId, workerId, escrowGrantId } = body;

    if (!buyerId || !workerId) {
      return NextResponse.json(
        { error: 'buyerId and workerId are required' },
        { status: 400 }
      );
    }

    const result = simulateEscrowExecution(workerId, buyerId, escrowGrantId ?? '');

    return NextResponse.json({
      status: 'completed',
      evaluation: {
        isSlashed: result.isSlashed,
        isEscalated: result.isEscalated,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
