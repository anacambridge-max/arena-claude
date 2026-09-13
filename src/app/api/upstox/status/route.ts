/**
 * Upstox Status API
 * Returns connection status without exposing tokens
 */

import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isConfigured = upstoxService.isConfigured();
    const isAuthenticated = upstoxService.isAuthenticated();
    
    return NextResponse.json({
      status: 'success',
      data: {
        configured: isConfigured,
        connected: isAuthenticated,
        // Never expose actual tokens
        hasToken: isAuthenticated,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to check Upstox status',
      },
      { status: 500 }
    );
  }
}
