'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Button from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { 
  Database, Search, Calendar, 
  BarChart3, TrendingUp, Archive, ExternalLink, Eye, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MetricCard } from './MetricCard';
import { DataViewerModal } from './DataViewerModal';

interface LatestDataRecord {
  date: string;
  close: number;
  returnPercentage: number | null;
}

const TIMEFRAME_INFO = {

  daily: {
    name: 'Daily Data',
    description: 'OHLCV data with calculated fields',
    icon: Calendar,
    color: 'text-blue-600'
  },
  mondayWeekly: {
    name: 'Monday Weekly',
    description: 'Monday-based weekly aggregations',
    icon: BarChart3,
    color: 'text-green-600'
  },
  expiryWeekly: {
    name: 'Expiry Weekly',
    description: 'Expiry-based weekly aggregations',
    icon: BarChart3,
    color: 'text-teal-600'
  },
  monthly: {
    name: 'Monthly Data',
    description: 'Monthly aggregation with returns',
    icon: TrendingUp,
    color: 'text-purple-600'
  },
  yearly: {
    name: 'Yearly Data',
    description: 'Yearly aggregation with returns',
    icon: Archive,
    color: 'text-orange-600'
  }
};

export function CalculatedDataSection() {
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTab, setViewerTab] = useState('daily');

  // Fetch analysis stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['analysis-stats'],
    queryFn: async () => {
      const response = await api.get('/analysis/stats');
      return response.data.data;
    },
  });

  // Fetch symbol data
  const { data: symbolData, isLoading: symbolLoading } = useQuery({
    queryKey: ['symbol-analysis', selectedSymbol],
    queryFn: async () => {
      if (!selectedSymbol) return null;
      const response = await api.get(`/analysis/symbols/${selectedSymbol}/summary`);
      return response.data.data;
    },
    enabled: !!selectedSymbol,
  });

  const handleSearchSymbol = async () => {
    if (!searchSymbol.trim()) {
      toast.error('Please enter a symbol');
      return;
    }
    setSelectedSymbol(searchSymbol.toUpperCase().trim());
  };

  const handleViewData = async (symbol: string, timeframe: string) => {
    setSelectedSymbol(symbol);
    setViewerTab(timeframe);
    setViewerOpen(true);
  };

  const handleDeleteTicker = async (symbol: string) => {
    if (!confirm(`Are you sure you want to delete ${symbol} and ALL its data from all tables? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/analysis/symbols/${symbol}`);
      if (response.data.success) {
        toast.success(`${symbol} deleted successfully. ${response.data.data.totalDeleted} records removed.`);
        setSelectedSymbol(null);
        // Use a more gentle refresh approach
        // Wait a bit for the success message to show, then reload
        setTimeout(() => {
          window.location.href = window.location.pathname;
        }, 2000);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to delete ticker');
    }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Symbols"
          value={statsData?.totalSymbols || 0}
          icon={Database}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
          isLoading={statsLoading}
          tooltip="Total number of symbols with calculated data"
        />
        <MetricCard
          title="Daily Records"
          value={statsData?.recordCounts?.daily || 0}
          icon={Calendar}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          isLoading={statsLoading}
          tooltip="Total daily seasonality records"
        />
        <MetricCard
          title="Weekly Records"
          value={statsData?.recordCounts?.weekly || 0}
          icon={BarChart3}
          iconColor="text-violet-600"
          iconBgColor="bg-violet-50"
          isLoading={statsLoading}
          tooltip="Total weekly aggregated records"
        />
        <MetricCard
          title="Total Records"
          value={statsData?.recordCounts?.total || 0}
          icon={ExternalLink}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-50"
          isLoading={statsLoading}
          tooltip="Total calculated records across all timeframes"
        />
      </div>

      {/* Enhanced Symbol Search */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Symbol Analysis</h3>
              <p className="text-sm text-slate-600">Search and analyze calculated seasonality data</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Enter symbol (e.g., RELIANCE, NIFTY, INFY)"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSymbol()}
                className="pl-10 border-slate-200 focus:border-blue-300 focus:ring-blue-200 h-11"
              />
            </div>
            <Button 
              onClick={handleSearchSymbol} 
              disabled={!searchSymbol.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          </div>
          
          {/* Quick suggestions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 font-medium">Popular symbols:</span>
            {['NIFTY', 'RELIANCE', 'TCS', 'INFY'].map((symbol) => (
              <button
                key={symbol}
                onClick={() => {
                  setSearchSymbol(symbol);
                  setSelectedSymbol(symbol);
                }}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Symbol Data - Enhanced design */}
      {selectedSymbol && (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Data for {selectedSymbol}</h3>
                <p className="text-sm text-slate-600">Available calculated data across all timeframes</p>
              </div>
              <Button
                onClick={() => handleDeleteTicker(selectedSymbol)}
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Ticker
              </Button>
            </div>
          </div>
          <div className="p-6">
            {symbolLoading ? (
              <div className="flex justify-center py-12">
                <Loading />
              </div>
            ) : symbolData ? (
              <div className="space-y-8">
                {/* Symbol Info - Enhanced layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Records</p>
                    <p className="text-xl font-bold text-slate-900">{symbolData.totalRecords?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Date Range</p>
                    <p className="text-xl font-bold text-slate-900">
                      {symbolData.firstDataDate ? new Date(symbolData.firstDataDate).toLocaleDateString() : 'N/A'} - {symbolData.lastDataDate ? new Date(symbolData.lastDataDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Last Updated</p>
                    <p className="text-xl font-bold text-slate-900">
                      {symbolData.lastUpdated ? new Date(symbolData.lastUpdated).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Data Availability - Enhanced cards */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-4">Available Timeframes</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(TIMEFRAME_INFO).map(([timeframe, info]) => {
                      const count = symbolData.dataAvailable?.[timeframe as keyof typeof symbolData.dataAvailable] || 0;
                      const Icon = info.icon;
                      
                      return (
                        <div key={timeframe} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-slate-50 rounded-lg">
                              <Icon className={cn("h-5 w-5", info.color)} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{info.name}</p>
                              <p className="text-sm text-slate-600">{info.description}</p>
                              <p className="text-xs text-slate-500 font-medium">
                                {count.toLocaleString()} records available
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleViewData(selectedSymbol, timeframe)}
                            variant="outline"
                            size="sm"
                            disabled={count === 0}
                            className="border-slate-200 hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Data
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Latest Data Preview */}
                {symbolData.latestData && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Latest Data Points</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(symbolData.latestData).map(([timeframe, data]) => {
                        if (!data) return null;
                        
                        const info = TIMEFRAME_INFO[timeframe as keyof typeof TIMEFRAME_INFO];
                        if (!info) return null;
                        const Icon = info.icon;
                        const record = data as LatestDataRecord;
                        
                        return (
                          <div key={timeframe} className="p-3 border rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <Icon className={cn("h-4 w-4", info.color)} />
                              <span className="font-medium text-sm">{info.name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Date:</span> {new Date(record.date).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Close:</span> {record.close}
                              </div>
                              {record.returnPercentage !== null && (
                                <div>
                                  <span className="text-muted-foreground">Return:</span> 
                                  <span className={cn(
                                    "ml-1",
                                    record.returnPercentage > 0 ? "text-green-600" : "text-red-600"
                                  )}>
                                    {record.returnPercentage}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No calculated data found for {selectedSymbol}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recently Updated Symbols */}
      {statsData?.recentlyUpdated?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Recently Updated Symbols</h3>
            <p className="text-sm text-slate-600">Latest data processing activity</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {statsData.recentlyUpdated.map((symbol: any) => (
                <div key={symbol.symbol} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{symbol.symbol}</p>
                      <p className="text-sm text-slate-600">
                        {symbol.totalRecords?.toLocaleString()} records • Updated {new Date(symbol.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedSymbol(symbol.symbol)}
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Viewer Modal */}
      {selectedSymbol && (
        <DataViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          symbol={selectedSymbol}
          timeframe={viewerTab}
        />
      )}
    </div>
  );
}