import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'success',
    data: {
      configured: upstoxService.isConfigured(),
      connected: upstoxService.isAuthenticated(),
      hasToken: upstoxService.isAuthenticated(),
    },
  });
}
