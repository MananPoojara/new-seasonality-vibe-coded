'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, BarChart3, Activity, Filter, 
  ChevronDown, Download, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Settings, LogOut, Calendar
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
  MonthFilters,
  OutlierFilters
} from '@/components/filters';

const Loading = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => (
  <div className="flex items-center justify-center">
    <RefreshCw className={cn("animate-spin text-purple-600", size === 'lg' ? 'h-10 w-10' : 'h-6 w-6')} />
  </div>
);

export default function MonthlyPage() {
  const { selectedSymbols, startDate, endDate, filters, chartScale } = useAnalysisStore();
  const [monthType, setMonthType] = useState<'calendar' | 'expiry'>('calendar');
  const [activeTab, setActiveTab] = useState('chart');
  const [chartMode, setChartMode] = useState<'cumulative' | 'superimposed' | 'yearly-overlay' | 'aggregate'>('cumulative');
  const [aggregateType, setAggregateType] = useState<'total' | 'avg' | 'max' | 'min'>('total');
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
    queryKey: ['monthly-analysis', selectedSymbols, startDate, endDate, filters, monthType],
    queryFn: async () => {
      const response = await analysisApi.monthly({
        symbol: selectedSymbols[0],
        startDate,
        endDate,
        monthType,
        filters,
        chartScale,
      });
      return response.data.data;
    },
    enabled: selectedSymbols.length > 0,
  });

  const symbolData = data?.[selectedSymbols[0]];
  const stats = symbolData?.statistics;

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
      link.download = `${selectedSymbols[0]}_monthly_${monthType}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
    }
  };

  const handleExportCSV = () => {
    if (!symbolData?.chartData) return;
    
    const csvData = symbolData.chartData.map((row: any) => ({
      Date: new Date(row.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      'Return %': row.returnPercentage?.toFixed(2),
      'Cumulative': row.cumulative?.toFixed(2),
    }));
    
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map((row: any) => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `${selectedSymbols[0]}_monthly_${monthType}_${new Date().toISOString().split('T')[0]}.csv`;
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
            <Filter className="h-4 w-4 text-purple-600" />
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
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Month Type</label>
                <Select value={monthType} onValueChange={(v) => setMonthType(v as 'calendar' | 'expiry')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white shadow-lg">
                    <SelectItem value="calendar">Calendar Month</SelectItem>
                    <SelectItem value="expiry">Expiry Month</SelectItem>
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

          <FilterSection title="Month Filters">
            <MonthFilters />
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
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg"
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
              "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 transition-colors group",
              isResizing && "bg-purple-500"
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
              <Activity className="h-6 w-6 text-purple-600" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {selectedSymbols[0] || 'Select Symbol'}
                </h1>
                <p className="text-xs text-slate-500">Monthly Analysis Engine ({monthType === 'calendar' ? 'Calendar' : 'Expiry'})</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">1H</span>
              <span className="text-slate-500 font-semibold">1D</span>
              <span className="text-slate-500 font-semibold">1W</span>
              <span className="text-purple-600 font-bold">1M</span>
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

              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs cursor-pointer" title={selectedSymbols[0] || 'User'}>
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
                {chartMode === 'cumulative' ? 'Cumulative Returns' : 
                 chartMode === 'superimposed' ? 'Superimposed Pattern' : 
                 chartMode === 'aggregate' ? `Aggregate (${aggregateType.toUpperCase()})` :
                 'Yearly Overlay Pattern'}
              </h3>
              <div className="flex items-center gap-2">
                {/* Chart Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setChartMode('cumulative')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                      chartMode === 'cumulative' 
                        ? "bg-white text-purple-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Cumulative
                  </button>
                  <button
                    onClick={() => setChartMode('superimposed')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                      chartMode === 'superimposed' 
                        ? "bg-white text-purple-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Superimposed
                  </button>
                  <button
                    onClick={() => setChartMode('yearly-overlay')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                      chartMode === 'yearly-overlay' 
                        ? "bg-white text-purple-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Yearly Overlay
                  </button>
                  <button
                    onClick={() => setChartMode('aggregate')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                      chartMode === 'aggregate' 
                        ? "bg-white text-purple-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Aggregate
                  </button>
                </div>
                
                {/* Aggregate Type Selector */}
                {chartMode === 'aggregate' && (
                  <>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <Select value={aggregateType} onValueChange={(v) => setAggregateType(v as any)}>
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white shadow-lg">
                        <SelectItem value="total">Total</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                
                <div className="w-px h-6 bg-slate-200"></div>
                
                <button
                  onClick={() => setActiveTab('chart')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                    activeTab === 'chart' 
                      ? "bg-purple-50 text-purple-600" 
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
                      ? "bg-purple-50 text-purple-600" 
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
                      chartMode === 'cumulative' ? (
                        <CumulativeChart 
                          data={symbolData.chartData} 
                          chartScale={chartScale}
                        />
                      ) : chartMode === 'superimposed' ? (
                        <SuperimposedChart 
                          data={symbolData.chartData}
                          symbol={selectedSymbols[0]}
                        />
                      ) : chartMode === 'aggregate' ? (
                        <AggregateChart 
                          data={symbolData.chartData}
                          aggregateType={aggregateType}
                        />
                      ) : (
                        <YearlyOverlayChart 
                          data={symbolData.chartData}
                          symbol={selectedSymbols[0]}
                        />
                      )
                    ) : (
                      <SeasonalDataTable data={symbolData.chartData} />
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

// Cumulative Chart Component
function CumulativeChart({ data, chartScale }: { 
  data: any[]; 
  chartScale: 'linear' | 'log';
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; date: string; value: number } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

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
          color: '#9333EA',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#9333EA',
          style: 2,
        },
      },
    });

    chartRef.current = chart;

    const areaSeries = chart.addAreaSeries({
      lineColor: '#9333EA',
      topColor: 'rgba(147, 51, 234, 0.4)',
      bottomColor: 'rgba(147, 51, 234, 0.0)',
      lineWidth: 2,
    });

    const chartData = data.map((d: any) => ({
      time: Math.floor(new Date(d.date).getTime() / 1000) as any,
      value: d.cumulative || 0,
      originalDate: d.date,
    }));

    areaSeries.setData(chartData);
    chart.timeScale().fitContent();

    // Tooltip handler
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setTooltip(null);
        return;
      }

      const dataPoint = param.seriesData.get(areaSeries);
      if (dataPoint) {
        const dateStr = new Date(param.time * 1000).toLocaleDateString('en-IN', { 
          month: 'short', 
          year: 'numeric' 
        });
        
        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          date: dateStr,
          value: dataPoint.value,
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
            top: `${tooltip.y - 50}px`,
          }}
        >
          <div className="font-semibold text-slate-700 mb-1">{tooltip.date}</div>
          <div className="text-purple-600 font-bold">
            Cumulative: {tooltip.value.toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}

// Superimposed Chart - Shows average pattern across all years
function SuperimposedChart({ data, symbol }: { data: any[]; symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; month: number; value: number; avgReturn: number } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // Group by month (1-12)
    const monthGroups: Record<number, number[]> = {};
    
    data.forEach((d: any) => {
      const month = new Date(d.date).getMonth() + 1; // 1-12
      if (!monthGroups[month]) {
        monthGroups[month] = [];
      }
      monthGroups[month].push(d.returnPercentage || 0);
    });

    // Calculate average return for each month and compound it
    const sortedMonths = Object.keys(monthGroups).map(Number).sort((a, b) => a - b);
    let compoundedValue = 1; // Start at 1 (100%)
    
    const superimposedData = sortedMonths.map(month => {
      const avgReturn = monthGroups[month].reduce((sum, val) => sum + val, 0) / monthGroups[month].length;
      
      // Compound: multiply by (1 + avgReturn/100)
      compoundedValue = compoundedValue * (1 + avgReturn / 100);
      
      return {
        month,
        avgReturn,
        compoundedReturn: (compoundedValue - 1) * 100, // Convert back to percentage
      };
    });

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
          color: '#9333EA',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#9333EA',
          style: 2,
        },
      },
      timeScale: {
        timeVisible: false,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const areaSeries = chart.addAreaSeries({
      lineColor: '#000000',
      topColor: 'rgba(224, 231, 255, 0.4)',
      bottomColor: 'rgba(224, 231, 255, 0.0)',
      lineWidth: 2,
    });

    const chartData = superimposedData.map((d: any) => ({
      time: d.month as any,
      value: d.compoundedReturn,
      avgReturn: d.avgReturn,
    }));

    areaSeries.setData(chartData as any);
    
    // Configure time scale to show month names
    chart.timeScale().fitContent();
    (chart.timeScale() as any).applyOptions({
      tickMarkFormatter: (time: any) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[time - 1] || '';
      },
    });

    // Tooltip handler
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setTooltip(null);
        return;
      }

      const dataPoint = param.seriesData.get(areaSeries);
      if (dataPoint) {
        const originalData = superimposedData.find((d: any) => d.month === param.time);
        
        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          month: param.time,
          value: dataPoint.value,
          avgReturn: originalData?.avgReturn || 0,
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
  }, [data]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div ref={chartContainerRef} className="h-full w-full relative">
      {tooltip && tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs z-50"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 60}px`,
          }}
        >
          <div className="font-semibold text-slate-700 mb-1">{monthNames[tooltip.month - 1]}</div>
          <div className="text-purple-600 font-bold">
            YTD Return: {tooltip.value.toFixed(2)}%
          </div>
          <div className="text-slate-600">
            Avg Monthly: {tooltip.avgReturn.toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}

// Yearly Overlay Chart - Each year's pattern overlaid
function YearlyOverlayChart({ data, symbol }: { data: any[]; symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; data: any[] } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // Group data by year
    const yearGroups: Record<number, any[]> = {};
    data.forEach((d: any) => {
      const year = new Date(d.date).getFullYear();
      if (!yearGroups[year]) {
        yearGroups[year] = [];
      }
      yearGroups[year].push(d);
    });

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
      },
      timeScale: {
        timeVisible: false,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Color palette for different years
    const colors = [
      '#9333EA', '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
      '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#6366F1'
    ];

    const seriesMap = new Map();
    const years = Object.keys(yearGroups).map(Number).sort((a, b) => a - b);

    years.forEach((year, idx) => {
      const yearData = yearGroups[year];
      const color = colors[idx % colors.length];
      
      const lineSeries = chart.addLineSeries({
        color,
        lineWidth: 2,
        title: year.toString(),
      });

      // Calculate cumulative returns for this year
      let cumulative = 0;
      const chartData = yearData.map((d: any, i: number) => {
        cumulative += d.returnPercentage || 0;
        return {
          time: (i + 1) as any, // Month number 1-12
          value: cumulative,
          year,
          month: new Date(d.date).getMonth() + 1,
        };
      });

      lineSeries.setData(chartData as any);
      seriesMap.set(year, lineSeries);
    });

    chart.timeScale().fitContent();
    (chart.timeScale() as any).applyOptions({
      tickMarkFormatter: (time: any) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[time - 1] || '';
      },
    });

    // Tooltip handler
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setTooltip(null);
        return;
      }

      const tooltipData: any[] = [];
      seriesMap.forEach((series, year) => {
        const dataPoint = param.seriesData.get(series);
        if (dataPoint) {
          tooltipData.push({
            year,
            value: dataPoint.value,
            color: colors[years.indexOf(year) % colors.length],
          });
        }
      });

      if (tooltipData.length > 0) {
        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          data: tooltipData,
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
  }, [data]);

  return (
    <div ref={chartContainerRef} className="h-full w-full relative">
      {tooltip && tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs z-50 max-h-64 overflow-y-auto"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 100}px`,
          }}
        >
          <div className="font-semibold text-slate-700 mb-2">All Years</div>
          {tooltip.data.map((d: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-slate-600">{d.year}:</span>
              </div>
              <span className="font-bold" style={{ color: d.color }}>
                {d.value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Aggregate Chart - Shows total/avg/max/min by month
function AggregateChart({ data, aggregateType }: { 
  data: any[]; 
  aggregateType: 'total' | 'avg' | 'max' | 'min';
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; month: string; value: number } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // Group by month
    const monthGroups: Record<number, number[]> = {};
    data.forEach((d: any) => {
      const month = new Date(d.date).getMonth() + 1;
      if (!monthGroups[month]) {
        monthGroups[month] = [];
      }
      monthGroups[month].push(d.returnPercentage || 0);
    });

    // Calculate aggregate values
    const aggregateData = Object.keys(monthGroups).map(Number).sort((a, b) => a - b).map(month => {
      const values = monthGroups[month];
      let aggregateValue = 0;
      
      switch (aggregateType) {
        case 'total':
          aggregateValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          aggregateValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'max':
          aggregateValue = Math.max(...values);
          break;
        case 'min':
          aggregateValue = Math.min(...values);
          break;
      }
      
      return {
        month,
        value: aggregateValue,
      };
    });

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
      },
      timeScale: {
        timeVisible: false,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const histogramSeries = chart.addHistogramSeries({
      color: '#9333EA',
      priceFormat: {
        type: 'price',
      },
    });

    const chartData = aggregateData.map((d: any) => ({
      time: d.month as any,
      value: d.value,
      color: d.value >= 0 ? '#10B981' : '#EF4444',
    }));

    histogramSeries.setData(chartData as any);
    chart.timeScale().fitContent();
    
    (chart.timeScale() as any).applyOptions({
      tickMarkFormatter: (time: any) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[time - 1] || '';
      },
    });

    // Tooltip handler
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setTooltip(null);
        return;
      }

      const dataPoint = param.seriesData.get(histogramSeries);
      if (dataPoint) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          month: monthNames[param.time - 1],
          value: dataPoint.value,
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
  }, [data, aggregateType]);

  return (
    <div ref={chartContainerRef} className="h-full w-full relative">
      {tooltip && tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs z-50"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 50}px`,
          }}
        >
          <div className="font-semibold text-slate-700 mb-1">{tooltip.month}</div>
          <div className={cn(
            "font-bold",
            tooltip.value >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {aggregateType.toUpperCase()}: {tooltip.value.toFixed(2)}%
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
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Date</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">Return %</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((row: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  {new Date(row.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </td>
                <td className={cn(
                  "px-4 py-2 text-right font-semibold",
                  (row.returnPercentage || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {(row.returnPercentage || 0).toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right font-semibold text-slate-700">
                  {(row.cumulative || 0).toFixed(2)}%
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
