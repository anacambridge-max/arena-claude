import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!upstoxService.isConfigured()) {
    return NextResponse.json({
      status: 'error',
      error: 'Upstox Analytics Token is not configured',
      message: 'Set UPSTOX_ANALYTICS_TOKEN in Vercel/server environment variables.',
    }, { status: 400 });
  }

  return NextResponse.json({
    status: 'success',
    message: 'Upstox Analytics Token is configured.',
    data: { connected: true },
  });
}
