/**
 * Prime Technical Master Dashboard Client Component
 * Main orchestrator for the dashboard UI
 */

'use client';

import { useState, useEffect } from 'react';
import type { PrimeScanResult, MarketStatus } from '@/domain/prime';
import { DashboardHeader } from './dashboard/header';
import { MarketStatusBar } from './dashboard/market-status-bar';
import { SummaryCards } from './dashboard/summary-cards';
import { ScannerTable } from './dashboard/scanner-table';
import { StockDetailPanel } from './dashboard/stock-detail-panel';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ScannerResponse {
  status: string;
  data: {
    summary: {
      universeCount: number;
      scannedCount: number;
      buyCount: number;
      sellCount: number;
      setupCount: number;
      confirmedCount: number;
      watchCount: number;
      fakeBreakoutCount: number;
      noTradeCount: number;
    };
    marketStatus: MarketStatus;
    results: PrimeScanResult[];
    generatedAt: string;
  };
}

export function DashboardClient() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<ScannerResponse['data'] | null>(null);
  const [selectedStock, setSelectedStock] = useState<PrimeScanResult | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Check Upstox connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/upstox/status');
      const data = await res.json();
      setIsConnected(data.data?.connected || false);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to check connection:', err);
      setIsConnected(false);
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/upstox/connect', { method: 'POST' });
      const data = await res.json();
      
      if (data.status === 'success') {
        setIsConnected(true);
        // Auto-run scan after connection
        handleScan();
      } else {
        setError(data.message || 'Failed to connect to Upstox');
      }
    } catch (err) {
      setError('Failed to connect to Upstox');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/upstox/prime-scan');
      const data: ScannerResponse = await res.json();
      
      if (data.status === 'success') {
        setScanData(data.data);
        setLastUpdate(new Date().toLocaleString());
      } else {
        setError('Failed to run Prime scan');
      }
    } catch (err) {
      setError('Failed to run Prime scan');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (isConnected) {
      handleScan();
    } else {
      checkConnection();
    }
  };

  // Default market status for initial render
  const defaultMarketStatus: MarketStatus = {
    isOpen: false,
    session: 'CLOSED',
    currentTime: new Date().toLocaleTimeString(),
    nextChange: null,
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader
        isConnected={isConnected}
        isLoading={isLoading}
        onConnect={handleConnect}
        onRefresh={handleRefresh}
        onScan={handleScan}
        lastUpdate={lastUpdate}
      />
      
      <MarketStatusBar marketStatus={scanData?.marketStatus || defaultMarketStatus} />
      
      <main className="mx-auto max-w-[1800px] px-4 py-6">
        {/* Error State */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-600/30 bg-red-500/10 p-4 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && !scanData && (
          <div className="flex min-h-[600px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
              <p className="mt-4 text-slate-400">Loading Prime Scanner...</p>
            </div>
          </div>
        )}
        
        {/* Not Connected State */}
        {!isLoading && !isConnected && !scanData && (
          <div className="flex min-h-[600px] items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <AlertCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-white">UPSTOX DISCONNECTED</h2>
              <p className="mt-2 text-slate-400">
                Connect Upstox to start market scanning
              </p>
              <button
                onClick={handleConnect}
                className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                CONNECT UPSTOX
              </button>
            </div>
          </div>
        )}
        
        {/* Dashboard Content */}
        {scanData && (
          <div className="space-y-6">
            <SummaryCards summary={scanData.summary} />
            
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Prime Scanner Results
                </h2>
                <div className="text-sm text-slate-400">
                  {scanData.results.length} stocks scanned
                </div>
              </div>
              
              <ScannerTable
                results={scanData.results}
                onSelectStock={setSelectedStock}
                selectedStock={selectedStock}
              />
            </div>
            
            {/* Important Disclaimer */}
            <div className="rounded-lg border border-amber-600/30 bg-amber-500/10 p-4 text-sm text-amber-400">
              <p className="font-semibold">IMPORTANT DISCLAIMER:</p>
              <p className="mt-2">
                This scanner is for educational and research purposes only. 
                Confirmation rules are NOT VERIFIED. Do not use for actual trading without 
                proper validation. No trading signals should be considered investment advice.
              </p>
            </div>
          </div>
        )}
      </main>
      
      {/* Stock Detail Panel */}
      {selectedStock && (
        <StockDetailPanel stock={selectedStock} onClose={() => setSelectedStock(null)} />
      )}
    </div>
  );
}
