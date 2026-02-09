'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, BarChart3, Activity, Filter, 
  ChevronDown, Download, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Settings, LogOut, TrendingUp
} from 'lucide-react';
import { createChart, ColorType } from 'lightweight-charts';

import { analysisApi } from '@/lib/api';
import { useAnalysisStore } from '@/store/analysisStore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { 
  SymbolSelector, 
  DateRangePicker, 
  YearFilters,
  OutlierFilters
} from '@/components/filters';

const Loading = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => (
  <div className="flex items-center justify-center">
    <RefreshCw className={cn("animate-spin text-amber-600", size === 'lg' ? 'h-10 w-10' : 'h-6 w-6')} />
  </div>
);

export default function YearlyPage() {
  const { selectedSymbols, startDate, endDate, filters, chartScale } = useAnalysisStore();
  const [yearType, setYearType] = useState<'calendar' | 'expiry'>('calendar');
  const [activeTab, setActiveTab] = useState('chart');
  const [filterOpen, setFilterOpen] = useState(true);
  const [filterWidth, setFilterWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const chartRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = e.clientX - 64;
    if (newWidth >= 200 && newWidth <= 500) {
      setFilterWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['yearly-analysis', selectedSymbols, startDate, endDate, filters, yearType],
    queryFn: async () => {
      console.log('Fetching yearly data for:', selectedSymbols[0], {
        startDate,
        endDate,
        yearType,
        filters
      });
      
      const response = await analysisApi.yearly({
        symbol: selectedSymbols[0],
        startDate,
        endDate,
        yearType,
        filters,
        chartScale,
      });
      
      console.log('Yearly API Response:', response.data);
      return response.data.data;
    },
    enabled: selectedSymbols.length > 0,
  });

  const symbolData = data?.[selectedSymbols[0]];
  const stats = symbolData?.statistics;

  console.log('Symbol Data:', symbolData); // Debug log
  console.log('Chart Data:', symbolData?.chartData); // Debug log

  const handleSnapshot = async () => {
    if (!chartRef.current) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        background: '#ffffff',
        scale: 2,
        logging: false,
      } as any);
      
      const link = document.createElement('a');
      link.download = `${selectedSymbols[0]}_yearly_${yearType}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
    }
  };

  const handleExportCSV = () => {
    if (!symbolData?.tableData && !symbolData?.data) return;
    
    const dataToExport = symbolData.tableData || symbolData.data || symbolData.chartData;
    
    const csvData = dataToExport.map((row: any) => ({
      Year: new Date(row.date).getFullYear(),
      Open: row.open?.toFixed(2) || '',
      High: row.high?.toFixed(2) || '',
      Low: row.low?.toFixed(2) || '',
      Close: row.close?.toFixed(2) || '',
      'Return %': row.returnPercentage?.toFixed(2) || '',
    }));
    
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map((row: any) => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `${selectedSymbols[0]}_yearly_${yearType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="flex h-full bg-slate-50" style={{ userSelect: isResizing ? 'none' : 'auto' }}>
      {/* LEFT SIDEBAR - FILTER CONSOLE */}
      <aside 
        style={{ 
          width: filterOpen ? filterWidth : 0,
          transition: isResizing ? 'none' : 'width 0.3s ease-out'
        }}
        className="bg-white border-r border-slate-200 flex flex-col overflow-hidden relative"
      >
        <div className="flex-shrink-0 h-14 border-b border-slate-100 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-amber-600" />
            <h2 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Filter Console</h2>
          </div>
          <button 
            onClick={() => setFilterOpen(false)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Market Context */}
          <FilterSection title="Market Context" defaultOpen>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Asset Class</label>
                <SymbolSelector />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Year Type</label>
                <Select value={yearType} onValueChange={(v) => setYearType(v as 'calendar' | 'expiry')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white shadow-lg">
                    <SelectItem value="calendar">Calendar Year</SelectItem>
                    <SelectItem value="expiry">Expiry Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterSection>

          {/* Time Ranges */}
          <FilterSection title="Time Ranges" defaultOpen>
            <div className="space-y-3">
              <DateRangePicker />
            </div>
          </FilterSection>

          {/* Temporal Filters */}
          <FilterSection title="Year Filters">
            <YearFilters />
          </FilterSection>

          {/* Risk Management */}
          <FilterSection title="Risk Management">
            <OutlierFilters />
          </FilterSection>
        </div>

        {/* Apply Filters Button */}
        <div className="flex-shrink-0 p-3 border-t border-slate-100">
          <Button 
            onClick={() => refetch()} 
            disabled={isFetching || selectedSymbols.length === 0}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg"
          >
            {isFetching ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Computing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-current" />
                APPLY FILTERS
              </div>
            )}
          </Button>
        </div>

        {/* RESIZE HANDLE */}
        {filterOpen && (
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-amber-400 transition-colors group",
              isResizing && "bg-amber-500"
            )}
          >
            <div className="absolute right-0 top-0 bottom-0 w-4 -mr-2" />
          </div>
        )}
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* TOP HEADER */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {!filterOpen && (
              <button 
                onClick={() => setFilterOpen(true)}
                className="p-2 hover:bg-slate-100 rounded"
              >
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-amber-600" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {selectedSymbols[0] || 'Select Symbol'}
                </h1>
                <p className="text-xs text-slate-500">Yearly Analysis Engine ({yearType === 'calendar' ? 'Calendar' : 'Expiry'})</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">1H</span>
              <span className="text-slate-500 font-semibold">1D</span>
              <span className="text-slate-500 font-semibold">1W</span>
              <span className="text-slate-500 font-semibold">1M</span>
              <span className="text-amber-600 font-bold">1Y</span>
            </div>
            
            {/* User Profile Section */}
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
              <button
                onClick={() => {}}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    window.location.href = '/login';
                  }
                }}
                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>

              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs cursor-pointer" title={selectedSymbols[0] || 'User'}>
                {selectedSymbols[0]?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* STATISTICS CARDS */}
        {stats && (
          <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3">
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="CAGR"
                value={`${(stats.cagr || 0).toFixed(2)}%`}
                subtitle={`Avg: ${(stats.avgReturnAll || 0).toFixed(2)}%`}
                trend={(stats.cagr || 0) >= 0 ? 'up' : 'down'}
              />
              <StatCard
                label="WIN RATE"
                value={`${(stats.winRate || 0).toFixed(1)}%`}
                subtitle="Hist. Avg"
                trend={(stats.winRate || 0) > 50 ? 'up' : 'down'}
              />
              <StatCard
                label="MAX DRAWDOWN"
                value={`${(stats.maxDrawdown || 0).toFixed(2)}%`}
                subtitle={`Max Gain: ${(stats.maxGain || 0).toFixed(2)}%`}
                trend="down"
              />
              <StatCard
                label="SHARPE RATIO"
                value={(stats.sharpeRatio || 0).toFixed(2)}
                subtitle={
                  stats.sharpeRatio > 2 ? 'Excellent' :
                  stats.sharpeRatio > 1 ? 'Good' :
                  stats.sharpeRatio > 0 ? 'Fair' : 'Poor'
                }
                trend={(stats.sharpeRatio || 0) > 0 ? 'up' : 'down'}
              />
            </div>
          </div>
        )}

        {/* CHART AREA */}
        <div className={cn("flex-1 p-4", activeTab === 'data' ? 'overflow-visible' : 'overflow-hidden')}>
          <div className="h-full bg-white rounded-lg border border-slate-200 flex flex-col">
            {/* Chart Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">
                Yearly Candlestick Chart
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('chart')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                    activeTab === 'chart' 
                      ? "bg-amber-50 text-amber-600" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Chart
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                    activeTab === 'table' 
                      ? "bg-amber-50 text-amber-600" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Data
                </button>
                
                {activeTab === 'chart' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSnapshot}
                    disabled={!symbolData}
                  >
                    SNAPSHOT
                  </Button>
                )}
              </div>
            </div>

            {/* Chart Content */}
            <div className={cn("flex-1 p-4", activeTab === 'data' ? 'overflow-visible' : 'overflow-hidden')} ref={chartRef}>
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center"
                  >
                    <Loading size="lg" />
                    <p className="mt-4 text-sm text-slate-500">Loading market data...</p>
                  </motion.div>
                ) : !symbolData ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center"
                  >
                    <BarChart3 className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">System Idle</h3>
                    <p className="text-sm text-slate-500 mt-2">Configure filters and click Apply Filters</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="content"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="h-full"
                  >
                    {activeTab === 'chart' ? (
                      <CandlestickChart 
                        data={symbolData.tableData || symbolData.data || symbolData.chartData} 
                        chartScale={chartScale}
                      />
                    ) : (
                      <SeasonalDataTable data={symbolData.tableData || symbolData.data || symbolData.chartData} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, subtitle, change, trend }: {
  label: string;
  value: string;
  subtitle?: string;
  change?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-xl font-bold text-slate-900">{value}</div>
        {change && (
          <div className={cn(
            "text-xs font-semibold flex items-center gap-1",
            trend === 'up' ? "text-green-600" : "text-red-600"
          )}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {change}
          </div>
        )}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

// Filter Section Component
function FilterSection({ title, children, defaultOpen = false }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
      >
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
        <ChevronDown className={cn(
          "h-4 w-4 text-slate-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Candlestick Chart Component - Main chart for yearly data
function CandlestickChart({ data, chartScale }: { 
  data: any[]; 
  chartScale: 'linear' | 'log';
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
    date: string; 
    open: number;
    high: number;
    low: number;
    close: number;
    returnPercentage: number;
  } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    console.log('Yearly Chart Data:', data); // Debug log

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: '#e2e8f0' },
        horzLines: { color: '#e2e8f0' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#D97706',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#D97706',
          style: 2,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Filter out invalid data and convert to chart format
    const chartData = data
      .filter((d: any) => d.open && d.high && d.low && d.close) // Only include valid OHLC data
      .map((d: any) => ({
        time: Math.floor(new Date(d.date).getTime() / 1000) as any,
        open: parseFloat(d.open) || 0,
        high: parseFloat(d.high) || 0,
        low: parseFloat(d.low) || 0,
        close: parseFloat(d.close) || 0,
        originalDate: d.date,
        returnPercentage: d.returnPercentage || 0,
      }));

    console.log('Processed Chart Data:', chartData); // Debug log

    if (chartData.length > 0) {
      candlestickSeries.setData(chartData);
      chart.timeScale().fitContent();
    }

    // Tooltip handler
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setTooltip(null);
        return;
      }

      const dataPoint = param.seriesData.get(candlestickSeries);
      if (dataPoint) {
        const originalData = data.find((d: any) => 
          Math.floor(new Date(d.date).getTime() / 1000) === param.time
        );
        
        const dateStr = new Date(param.time * 1000).toLocaleDateString('en-IN', { 
          year: 'numeric' 
        });
        
        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          date: dateStr,
          open: dataPoint.open,
          high: dataPoint.high,
          low: dataPoint.low,
          close: dataPoint.close,
          returnPercentage: originalData?.returnPercentage || 0,
        });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, chartScale]);

  return (
    <div ref={chartContainerRef} className="h-full w-full relative">
      {tooltip && tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs z-50"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 120}px`,
          }}
        >
          <div className="font-semibold text-slate-700 mb-2">{tooltip.date}</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Open:</span>
              <span className="font-semibold text-slate-900">{tooltip.open.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">High:</span>
              <span className="font-semibold text-green-600">{tooltip.high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Low:</span>
              <span className="font-semibold text-red-600">{tooltip.low.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Close:</span>
              <span className="font-semibold text-slate-900">{tooltip.close.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between gap-4">
              <span className="text-slate-600">Return:</span>
              <span className={cn(
                "font-bold",
                tooltip.returnPercentage >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {tooltip.returnPercentage.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Data Table Component
function SeasonalDataTable({ data }: { data: any[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const currentData = data.slice(startIdx, endIdx);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Year</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">Open</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">High</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">Low</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">Close</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">Return %</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((row: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-semibold text-slate-700">
                  {new Date(row.date).getFullYear()}
                </td>
                <td className="px-4 py-2 text-right text-slate-600">
                  {(row.open || 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right text-green-600 font-semibold">
                  {(row.high || 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right text-red-600 font-semibold">
                  {(row.low || 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right text-slate-700 font-semibold">
                  {(row.close || 0).toFixed(2)}
                </td>
                <td className={cn(
                  "px-4 py-2 text-right font-bold",
                  (row.returnPercentage || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {(row.returnPercentage || 0).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Showing {startIdx + 1} to {Math.min(endIdx, data.length)} of {data.length} entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}