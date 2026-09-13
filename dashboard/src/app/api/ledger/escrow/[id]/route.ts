import { NextRequest, NextResponse } from 'next/server';
import { ledger } from '@/lib/escrow-state';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const escrow = ledger.getEscrow(id);
  if (!escrow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(escrow);
}
