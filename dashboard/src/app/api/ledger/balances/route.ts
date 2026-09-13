import { NextResponse } from 'next/server';
import { ledger } from '@/lib/escrow-state';

export async function GET() {
  return NextResponse.json(ledger.getAllBalances());
}
