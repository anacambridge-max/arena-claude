/**
 * Upstox Connect API
 * Mock authentication for development
 * 
 * In production with Analytics API:
 * - Use API key/secret from environment
 * - Generate access token
 * - Store securely server-side
 */

import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Check if API credentials are configured
    if (!upstoxService.isConfigured()) {
      return NextResponse.json({
        status: 'error',
        error: 'Upstox API credentials not configured',
        message: 'Please set UPSTOX_API_KEY and UPSTOX_API_SECRET in environment variables',
      }, { status: 400 });
    }
    
    // For development/demo: use a mock token
    // In production: implement proper Upstox authentication flow
    const mockToken = `mock_token_${Date.now()}`;
    upstoxService.setAccessToken(mockToken);
    
    return NextResponse.json({
      status: 'success',
      message: 'Connected to Upstox (demo mode)',
      data: {
        connected: true,
        expiresIn: 86400, // 24 hours
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to connect to Upstox',
      },
      { status: 500 }
    );
  }
}
