
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, TrendingUp, TrendingDown, BarChart3, Target, 
  Calendar, Percent, Hash, Activity, Filter, 
  ChevronDown, Download, Layers, LayoutGrid, 
  Table as TableIcon, RefreshCw, SlidersHorizontal,
  ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';

import { analysisApi } from '@/lib/api';
import { useAnalysisStore } from '@/store/analysisStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// These components are assumed to be provided by the user's project structure
// Since I don't have their code, I will use the names they provided in their snippet.
import { 
  SymbolSelector, 
  DateRangePicker, 
  YearFilters, 
  MonthFilters, 
  WeekFilters, 
  DayFilters, 
  OutlierFilters 
} from '@/components/filters';
import { DataTable } from '@/components/charts';

// Mocking some missing components for the sake of the demo if they aren't provided
const Loading = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => (
  <div className="flex items-center justify-center">
    <RefreshCw className={cn("animate-spin text-indigo-600", size === 'lg' ? 'h-10 w-10' : 'h-6 w-6')} />
  </div>
);

const Select = ({ value, onValueChange, children }: any) => {
  return (
    <div className="relative inline-block">
      <select 
        value={value} 
        onChange={(e) => onValueChange(e.target.value)}
        className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
};
const SelectTrigger = ({ children, className }: any) => <div className={className}>{children}</div>;
const SelectValue = () => null;
const SelectContent = ({ children }: any) => children;
const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;

const Tabs = ({ value, onValueChange, children }: any) => (
  <div className="flex bg-slate-100 p-1 rounded-xl">{children}</div>
);
const TabsList = ({ children, className }: any) => <div className={cn("flex gap-1", className)}>{children}</div>;
const TabsTrigger = ({ value, onClick, activeValue, children, className }: any) => (
  <button 
    onClick={() => onClick(value)}
    className={cn(
      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
      value === activeValue ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700",
      className
    )}
  >
    {children}
  </button>
);

const ScrollArea = ({ children, className }: any) => (
  <div className={cn("overflow-y-auto custom-scrollbar", className)}>{children}</div>
);
const Separator = () => <div className="h-px bg-slate-100 my-2" />;

export default function DailyPage() {
  const { selectedSymbols, startDate, endDate, lastNDays, filters, chartScale, setChartScale } = useAnalysisStore();
  const [activeTab, setActiveTab] = useState('chart');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['daily-analysis', selectedSymbols, startDate, endDate, lastNDays, filters],
    queryFn: async () => {
      const response = await analysisApi.daily({
        symbol: selectedSymbols[0],
        startDate,
        endDate,
        lastNDays,
        filters,
        chartScale,
      });
      return response.data;
    },
    enabled: selectedSymbols.length > 0,
  });

  const symbolData = data?.data?.[selectedSymbols[0]];
  const stats = symbolData?.statistics;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden"
    >
      {/* 1. TOP STATS BAR - High-density Dashboard Header */}
      <div className="flex-shrink-0 m-4 mb-2 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden z-20">
        <div className="px-8 py-5 flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-5">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900">{selectedSymbols[0] || 'Select Symbol'}</h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100">
                  Daily Engine
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Statistical Analysis Hub</p>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="flex items-center gap-8 flex-wrap">
            {stats ? (
              <>
                <StatsBox 
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="Records" 
                  value={stats.totalCount || stats.allCount || 0} 
                />
                <StatsBox 
                  icon={<Target className="h-3.5 w-3.5" />}
                  label="Win Rate" 
                  value={`${(stats.winRate || stats.posAccuracy || 0).toFixed(1)}%`}
                  trend={(stats.winRate || stats.posAccuracy || 0) > 50 ? 'up' : 'down'}
                />
                <StatsBox 
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label="Avg Return" 
                  value={`${(stats.avgReturnAll || 0).toFixed(2)}%`}
                  trend={(stats.avgReturnAll || 0) >= 0 ? 'up' : 'down'}
                />
                <StatsBox 
                  icon={<Percent className="h-3.5 w-3.5" />}
                  label="Total Return" 
                  value={`${(stats.sumReturnAll || 0).toFixed(2)}%`}
                  trend={(stats.sumReturnAll || 0) >= 0 ? 'up' : 'down'}
                />
                <div className="hidden lg:block h-10 w-px bg-slate-100" />
                <div className="flex gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Positives</span>
                    <span className="text-base font-black text-slate-800 leading-none">{stats.positiveCount || stats.posCount || 0}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Negatives</span>
                    <span className="text-base font-black text-slate-800 leading-none">{stats.negativeCount || stats.negCount || 0}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Awaiting Analysis execution...</div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA - Layout Split */}
      <div className="flex-1 flex gap-4 px-4 pb-4 overflow-hidden">
        
        {/* Left Column: Hero Chart (Strictly per wireframe) */}
        <section className="flex-1 flex flex-col min-w-0 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm relative">
          {/* Chart Header Toolbar */}
          <div className="flex-shrink-0 h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/20">
            <Tabs>
              <TabsList>
                <TabsTrigger 
                  value="chart" 
                  onClick={setActiveTab} 
                  activeValue={activeTab}
                  icon={<LayoutGrid className="w-3.5 h-3.5 mr-2" />}
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Visual Analysis
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="table" 
                  onClick={setActiveTab} 
                  activeValue={activeTab}
                >
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-3.5 h-3.5" />
                    Data Grid
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scale Mode</span>
                <Select value={chartScale} onValueChange={(v: any) => setChartScale(v)}>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="log">Log</SelectItem>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-slate-200">
                <Download className="h-3.5 w-3.5 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Visualization Canvas */}
          <div className="flex-1 p-8 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm z-30"
                >
                  <Loading size="lg" />
                  <p className="mt-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Synchronizing Market Data</p>
                </motion.div>
              ) : null}

              {!symbolData && !isLoading ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto"
                >
                  <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6 border border-slate-100 shadow-inner">
                    <BarChart3 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">System Idle</h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed font-medium">Please configure your temporal and asset filters on the right, then initiate the engine run.</p>
                </motion.div>
              ) : symbolData && (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="h-full w-full"
                >
                  {activeTab === 'chart' ? (
                    <div className="h-full w-full">
                      <ChartOnly 
                        data={symbolData.data} 
                        chartScale={chartScale}
                        symbol={selectedSymbols[0]}
                      />
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden border border-slate-100 rounded-2xl bg-white shadow-sm">
                      <DataTable data={symbolData.data} title="" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right Column: Filter Sidebar - UNIQUE LAYOUT */}
        <aside className="w-[360px] flex-shrink-0 flex flex-col bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
          {/* Sidebar Header */}
          <div className="flex-shrink-0 h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <h2 className="font-black text-[11px] tracking-[0.2em] text-slate-700 uppercase">Analysis Parameters</h2>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>

          {/* Filter Form - Dense & Professional */}
          <ScrollArea className="flex-1 bg-slate-50/20">
            <div className="p-8 space-y-8">
              {/* Asset Discovery */}
              <FilterSection title="Asset Discovery" icon={<search className="h-4 w-4" />}>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <SymbolSelector />
                </div>
              </FilterSection>

              {/* Temporal Window */}
              <FilterSection title="Temporal Window" icon={<Calendar className="h-4 w-4" />}>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <DateRangePicker />
                </div>
              </FilterSection>

              <Separator />

              {/* Temporal Filters Matrix */}
              <FilterSection title="Seasonality Matrix" icon={<Layers className="h-4 w-4" />}>
                <div className="space-y-4">
                  <CollapsibleFilterGroup title="Year Logic">
                    <YearFilters />
                  </CollapsibleFilterGroup>
                  <CollapsibleFilterGroup title="Month Profile">
                    <MonthFilters />
                  </CollapsibleFilterGroup>
                  <CollapsibleFilterGroup title="Weekly (Expiry)">
                    <WeekFilters weekType="expiry" />
                  </CollapsibleFilterGroup>
                  <CollapsibleFilterGroup title="Weekly (Monday)">
                    <WeekFilters weekType="monday" />
                  </CollapsibleFilterGroup>
                  <CollapsibleFilterGroup title="Trading Days">
                    <DayFilters />
                  </CollapsibleFilterGroup>
                </div>
              </FilterSection>

              {/* Advanced Logic */}
              <FilterSection title="Signal Refinement" icon={<Filter className="h-4 w-4" />}>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <OutlierFilters />
                </div>
              </FilterSection>
            </div>
          </ScrollArea>

          {/* Action Footer */}
          <div className="flex-shrink-0 p-8 border-t border-slate-100 bg-white">
            <Button 
              onClick={() => refetch()} 
              disabled={isFetching || selectedSymbols.length === 0}
              className="w-full h-14 rounded-2xl shadow-2xl shadow-indigo-100 text-sm font-black uppercase tracking-[0.2em] transition-all hover:translate-y-[-2px] active:translate-y-[1px] bg-indigo-600 hover:bg-indigo-700"
            >
              {isFetching ? (
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Computing...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Play className="h-4 w-4 fill-current" />
                  Run Analysis
                </div>
              )}
            </Button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

// Stats box component
function StatsBox({ icon, label, value, trend }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="flex items-center gap-3 min-w-[120px]">
      <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white transition-all shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{label}</div>
        <div className="flex items-center gap-1.5">
          <div className="font-black text-base tracking-tighter text-slate-800 leading-tight">{value}</div>
          {trend && (
            <div className={cn(
              "p-0.5 rounded-md",
              trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Collapsible group for filters to manage density
function CollapsibleFilterGroup({ title, children }: { title: string, children: any }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="space-y-2 group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left px-4 py-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition-all shadow-sm"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-indigo-600 transition-colors">{title}</span>
        <ChevronRight className={cn("h-3.5 w-3.5 text-slate-300 transition-transform", isOpen && "rotate-90 text-indigo-400")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-2"
          >
            <div className="py-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Filter section wrapper
function FilterSection({ title, icon, children }: { 
  title: string; 
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">{title}</span>
      </div>
      <div className="pl-1">{children}</div>
    </div>
  );
}

// Enhanced chart component
function ChartOnly({ data, chartScale, symbol }: { 
  data: any[]; 
  chartScale: 'linear' | 'log';
  symbol: string;
}) {
  const chartData = useMemo(() => {
    let cumulative = 0;
    return data.map((d: any) => {
      cumulative += d.returnPercentage || 0;
      return {
        ...d,
        dateStr: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        cumulativeReturn: parseFloat(cumulative.toFixed(2)),
      };
    });
  }, [data]);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorReturn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.25}/>
              <stop offset="100%" stopColor="#4F46E5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="6 6" className="stroke-slate-100" vertical={false} />
          <XAxis
            dataKey="dateStr"
            tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            scale={chartScale}
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '16px'
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#4F46E5' }}
            labelStyle={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Cumulative Equity']}
            cursor={{ stroke: '#4F46E5', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="cumulativeReturn"
            stroke="#4F46E5"
            strokeWidth={3}
            fill="url(#colorReturn)"
            activeDot={{ r: 6, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }}
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
