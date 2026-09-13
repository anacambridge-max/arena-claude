/**
 * F&O Universe API
 * Returns list of NSE F&O eligible stocks
 */

import { NextResponse } from 'next/server';
import { NSE_FNO_STOCKS, getFNOCount, getMockFNOInstruments } from '@/data/fno-universe';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const instruments = getMockFNOInstruments();
    
    return NextResponse.json({
      status: 'success',
      data: {
        count: getFNOCount(),
        stocks: NSE_FNO_STOCKS,
        instruments,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to fetch F&O universe',
      },
      { status: 500 }
    );
  }
}
