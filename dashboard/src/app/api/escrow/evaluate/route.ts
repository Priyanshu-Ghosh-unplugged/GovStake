import { NextRequest, NextResponse } from 'next/server';
import { ledger } from '@/lib/escrow-state';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { escrowGrantId, buyerId, workerId } = body;
    // Post-hoc evaluation — re-check audit trace for violations
    const hasViolation = ledger.auditTrace.some(
      (e) =>
        e.outcome === 'denied' &&
        (e.escrowId === escrowGrantId ||
          (e.workerId === workerId && e.buyerId === buyerId))
    );
    return NextResponse.json({ isSlashed: hasViolation, isEscalated: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
