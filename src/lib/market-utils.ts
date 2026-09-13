/**
 * Market utilities for NSE timing and status
 * Uses Asia/Kolkata timezone
 */

import { format, isWithinInterval } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { MarketStatus } from '@/domain/prime';

const IST_TIMEZONE = 'Asia/Kolkata';

export function getCurrentISTTime(): Date {
  return toZonedTime(new Date(), IST_TIMEZONE);
}

export function formatISTTime(date: Date): string {
  return format(toZonedTime(date, IST_TIMEZONE), 'HH:mm:ss');
}

export function getMarketStatus(): MarketStatus {
  const now = getCurrentISTTime();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Market timings (IST)
  const preMarketStart = 9 * 60; // 09:00
  const marketOpen = 9 * 60 + 15; // 09:15
  const marketClose = 15 * 60 + 30; // 15:30
  const postMarketEnd = 16 * 60; // 16:00
  
  let session: MarketStatus['session'];
  let isOpen = false;
  let nextChange: string | null = null;
  
  if (timeInMinutes < preMarketStart) {
    session = 'CLOSED';
    nextChange = '09:00 (Pre-market)';
  } else if (timeInMinutes < marketOpen) {
    session = 'PRE_MARKET';
    nextChange = '09:15 (Market Open)';
  } else if (timeInMinutes < marketClose) {
    session = 'OPEN';
    isOpen = true;
    nextChange = '15:30 (Market Close)';
  } else if (timeInMinutes < postMarketEnd) {
    session = 'POST_MARKET';
    nextChange = null;
  } else {
    session = 'CLOSED';
    nextChange = 'Tomorrow 09:00';
  }
  
  // Check if it's a weekend
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    session = 'CLOSED';
    isOpen = false;
    nextChange = 'Monday 09:00';
  }
  
  return {
    isOpen,
    session,
    currentTime: formatISTTime(now),
    nextChange,
  };
}

export function isMarketHours(): boolean {
  const status = getMarketStatus();
  return status.isOpen;
}

export function getTodayDateIST(): string {
  const now = getCurrentISTTime();
  return format(now, 'yyyy-MM-dd');
}

export function getYesterdayDateIST(): string {
  const now = getCurrentISTTime();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return format(yesterday, 'yyyy-MM-dd');
}
