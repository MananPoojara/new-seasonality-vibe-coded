'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analysisApi } from '@/lib/api';
import { useAnalysisStore } from '@/store/analysisStore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
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
import { Play, TrendingUp, TrendingDown, BarChart3, Target, Calendar, Percent, Hash, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, Bar, BarChart, ComposedChart, Cell
} from 'recharts';

type ChartType = 'line' | 'bar' | 'candlestick';

export default function DailyPage() {
  const { selectedSymbols, startDate, endDate, lastNDays, filters } = useAnalysisStore();
  const [activeTab, setActiveTab] = useState('chart');
  const [chartType, setChartType] = useState<ChartType>('line');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['daily-analysis', selectedSymbols, startDate, endDate, lastNDays, filters],
    queryFn: async () => {
      const response = await analysisApi.daily({
        symbol: selectedSymbols[0],
        startDate,
        endDate,
        lastNDays,
        filters,
      });
      return response.data;
    },
    enabled: selectedSymbols.length > 0,
  });

  const symbolData = data?.data?.[selectedSymbols[0]];
  const stats = symbolData?.statistics;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
      {/* Stats Bar */}
      <div className="flex-shrink-0 border rounded-lg bg-card mx-4 mt-4">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">{selectedSymbols[0] || 'Select Symbol'}</h1>
              <span className="text-sm text-muted-foreground px-2 py-0.5 bg-muted rounded">Daily Analysis</span>
            </div>
            
            {stats ? (
              <div className="flex items-center gap-6 flex-wrap">
                <StatsBox icon={<Hash className="h-4 w-4" />} label="Records" value={stats.totalCount || stats.allCount || 0} />
                <StatsBox icon={<Target className="h-4 w-4" />} label="Win Rate" value={`${(stats.winRate || stats.posAccuracy || 0).toFixed(1)}%`} valueColor={(stats.winRate || stats.posAccuracy || 0) > 50 ? 'text-green-600' : 'text-red-600'} />
                <StatsBox icon={<TrendingUp className="h-4 w-4" />} label="Avg Return" value={`${(stats.avgReturnAll || 0).toFixed(2)}%`} valueColor={(stats.avgReturnAll || 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
                <StatsBox icon={<Percent className="h-4 w-4" />} label="Total Return" value={`${(stats.cumulativeReturn || 0).toFixed(2)}%`} valueColor={(stats.cumulativeReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
                <div className="h-8 w-px bg-border" />
                <StatsBox icon={<TrendingUp className="h-4 w-4 text-green-600" />} label="Positive" value={stats.positiveCount || stats.posCount || 0} valueColor="text-green-600" />
                <StatsBox icon={<TrendingDown className="h-4 w-4 text-red-600" />} label="Negative" value={stats.negativeCount || stats.negCount || 0} valueColor="text-red-600" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Run analysis to see statistics</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 border rounded-lg bg-card overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between bg-muted/30">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="chart" className="text-xs px-3">Chart</TabsTrigger>
                <TabsTrigger value="table" className="text-xs px-3">Data Table</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-2">
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Loading size="lg" />
                  <p className="text-sm text-muted-foreground">Analyzing data...</p>
                </div>
              </div>
            ) : symbolData ? (
              <>
                {activeTab === 'chart' && (
                  <div className="h-full min-h-[400px]">
                    <ZoomableChart data={symbolData.data} chartType={chartType} chartId="daily" />
                  </div>
                )}
                {activeTab === 'table' && <DataTable data={symbolData.data} title="" />}
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-sm">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">No Data</h3>
                    <p className="text-sm text-muted-foreground mt-1">Select a symbol and click Run Analysis</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        <div className="w-72 flex-shrink-0 flex flex-col border rounded-lg bg-card overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b bg-muted/30">
            <h2 className="font-semibold text-sm">Filters</h2>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              <FilterSection title="Symbol" icon={<BarChart3 className="h-4 w-4" />}><SymbolSelector /></FilterSection>
              <FilterSection title="Date Range" icon={<Calendar className="h-4 w-4" />}><DateRangePicker /></FilterSection>
              <Separator />
              <FilterSection title="Year Filters"><YearFilters /></FilterSection>
              <FilterSection title="Month Filters"><MonthFilters /></FilterSection>
              <FilterSection title="Week Filters (Monday)"><WeekFilters weekType="monday" /></FilterSection>
              <FilterSection title="Week Filters (Expiry)"><WeekFilters weekType="expiry" /></FilterSection>
              <FilterSection title="Day Filters"><DayFilters /></FilterSection>
              <Separator />
              <FilterSection title="Outlier Filters"><OutlierFilters /></FilterSection>
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 p-4 border-t bg-muted/30">
            <Button onClick={() => refetch()} disabled={isFetching || selectedSymbols.length === 0} className="w-full">
              <Play className={`h-4 w-4 mr-2 ${isFetching ? 'animate-pulse' : ''}`} />
              {isFetching ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsBox({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`font-semibold text-sm ${valueColor || ''}`}>{value}</div>
      </div>
    </div>
  );
}

function FilterSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">{icon}<span>{title}</span></div>
      {children}
    </div>
  );
}

function ZoomableChart({ data, chartType, chartId = 'daily' }: { data: any[]; chartType: ChartType; chartId?: string }) {
  const [zoomDomain, setZoomDomain] = useState<{ start: number; end: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    let cumulative = 1; // Start at 1 (100%)
    return data.map((d: any, index: number) => {
      const date = new Date(d.date);
      const fullDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const shortLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const returnPct = d.returnPercentage || 0;
      cumulative = cumulative * (1 + returnPct / 100);
      const cumulativeReturn = (cumulative - 1) * 100;
      return {
        ...d,
        index,
        fullDate,
        label: shortLabel,
        returnPercentage: returnPct,
        cumulativeReturn: Number(cumulativeReturn.toFixed(2)),
        open: d.open || 0,
        high: d.high || 0,
        low: d.low || 0,
        close: d.close || 0,
      };
    });
  }, [data]);

  const visibleData = useMemo(() => {
    if (!zoomDomain) return chartData;
    return chartData.slice(zoomDomain.start, zoomDomain.end + 1);
  }, [chartData, zoomDomain]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const currentStart = zoomDomain?.start ?? 0;
    const currentEnd = zoomDomain?.end ?? chartData.length - 1;
    const range = currentEnd - currentStart;
    
    if (e.deltaY < 0) {
      const newRange = Math.max(10, Math.floor(range * (1 - zoomFactor)));
      const center = Math.floor((currentStart + currentEnd) / 2);
      const newStart = Math.max(0, center - Math.floor(newRange / 2));
      const newEnd = Math.min(chartData.length - 1, newStart + newRange);
      setZoomDomain({ start: newStart, end: newEnd });
    } else {
      const newRange = Math.min(chartData.length - 1, Math.floor(range * (1 + zoomFactor)));
      const center = Math.floor((currentStart + currentEnd) / 2);
      const newStart = Math.max(0, center - Math.floor(newRange / 2));
      const newEnd = Math.min(chartData.length - 1, newStart + newRange);
      if (newEnd - newStart >= chartData.length - 1) setZoomDomain(null);
      else setZoomDomain({ start: newStart, end: newEnd });
    }
  }, [zoomDomain, chartData.length]);

  const handleReset = () => setZoomDomain(null);
  const handleZoomIn = () => {
    const currentStart = zoomDomain?.start ?? 0;
    const currentEnd = zoomDomain?.end ?? chartData.length - 1;
    const range = currentEnd - currentStart;
    const newRange = Math.max(10, Math.floor(range * 0.7));
    const center = Math.floor((currentStart + currentEnd) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(chartData.length - 1, newStart + newRange);
    setZoomDomain({ start: newStart, end: newEnd });
  };
  const handleZoomOut = () => {
    const currentStart = zoomDomain?.start ?? 0;
    const currentEnd = zoomDomain?.end ?? chartData.length - 1;
    const range = currentEnd - currentStart;
    const newRange = Math.min(chartData.length - 1, Math.floor(range * 1.3));
    const center = Math.floor((currentStart + currentEnd) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(chartData.length - 1, newStart + newRange);
    if (newEnd - newStart >= chartData.length - 1) setZoomDomain(null);
    else setZoomDomain({ start: newStart, end: newEnd });
  };

  const gradientId = `colorReturn${chartId}`;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-end gap-1 mb-2">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleZoomIn} title="Zoom In"><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleZoomOut} title="Zoom Out"><ZoomOut className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleReset} title="Reset Zoom"><RotateCcw className="h-3.5 w-3.5" /></Button>
        {zoomDomain && <span className="text-xs text-muted-foreground ml-2">Showing {visibleData.length} of {chartData.length}</span>}
      </div>
      <div ref={chartRef} className="flex-1" onWheel={handleWheel}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <AreaChart data={visibleData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="returnPercentage" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
            </AreaChart>
          ) : chartType === 'bar' ? (
            <BarChart data={visibleData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Bar dataKey="returnPercentage" radius={[2, 2, 0, 0]}>
                {visibleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.returnPercentage >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <CandlestickChart data={visibleData} />
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="font-bold text-sm mb-1">{data.fullDate}</p>
      <p className="text-sm">
        Return: <span className={data.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>{data.returnPercentage?.toFixed(2)}%</span>
      </p>
    </div>
  );
}

function CandlestickTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="font-bold text-sm mb-2">{data.fullDate}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Open:</span><span>{data.open?.toFixed(2)}</span>
        <span className="text-muted-foreground">High:</span><span>{data.high?.toFixed(2)}</span>
        <span className="text-muted-foreground">Low:</span><span>{data.low?.toFixed(2)}</span>
        <span className="text-muted-foreground">Close:</span><span>{data.close?.toFixed(2)}</span>
      </div>
    </div>
  );
}

function CandlestickChart({ data }: { data: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width || 800, height: Math.max(height, 350) || 400 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate min/max for Y axis
  const allValues = data.flatMap(d => [d.high, d.low, d.open, d.close]).filter(v => v != null && v > 0);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) * 0.08;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRange = yMax - yMin;

  // Chart margins
  const margin = { top: 20, right: 70, bottom: 35, left: 15 };
  const plotWidth = dimensions.width - margin.left - margin.right;
  const plotHeight = dimensions.height - margin.top - margin.bottom;

  const toY = (val: number) => margin.top + ((yMax - val) / yRange) * plotHeight;
  const toX = (index: number) => margin.left + ((index + 0.5) / data.length) * plotWidth;

  // Y-axis ticks - smart tick calculation
  const calculateNiceTicks = (min: number, max: number, count: number) => {
    const range = max - min;
    const roughStep = range / count;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;
    let niceStep;
    if (residual <= 1.5) niceStep = magnitude;
    else if (residual <= 3) niceStep = 2 * magnitude;
    else if (residual <= 7) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;
    
    const niceMin = Math.floor(min / niceStep) * niceStep;
    const niceMax = Math.ceil(max / niceStep) * niceStep;
    const ticks = [];
    for (let val = niceMin; val <= niceMax; val += niceStep) {
      if (val >= min && val <= max) ticks.push(val);
    }
    return ticks;
  };

  const yTicks = calculateNiceTicks(yMin, yMax, 6);

  // X-axis labels - show ~8 labels max
  const xLabelInterval = Math.max(1, Math.ceil(data.length / 8));
  const xLabels = data.filter((_, i) => i % xLabelInterval === 0);

  // Candle width calculation
  const candleSpacing = plotWidth / data.length;
  const candleWidth = Math.max(1, Math.min(candleSpacing * 0.7, 12));

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });
      
      // Find which candle is being hovered
      const index = Math.floor((x - margin.left) / candleSpacing);
      if (index >= 0 && index < data.length && x >= margin.left && x <= dimensions.width - margin.right) {
        setHoveredIndex(index);
      } else {
        setHoveredIndex(null);
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full relative" 
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <svg width="100%" height="100%" style={{ minHeight: 350 }}>
        {/* Background */}
        <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="#fafafa" />
        
        {/* Horizontal grid lines */}
        {yTicks.map((val, i) => (
          <g key={i}>
            <line 
              x1={margin.left} 
              y1={toY(val)} 
              x2={dimensions.width - margin.right} 
              y2={toY(val)} 
              stroke="#e5e7eb" 
              strokeWidth={1}
            />
            <text 
              x={dimensions.width - margin.right + 8} 
              y={toY(val) + 4} 
              textAnchor="start" 
              fontSize={11} 
              fill="#6b7280"
            >
              {val.toLocaleString()}
            </text>
          </g>
        ))}

        {/* Vertical grid lines */}
        {xLabels.map((d, i) => {
          const originalIndex = data.indexOf(d);
          const x = toX(originalIndex);
          return (
            <line 
              key={i}
              x1={x} 
              y1={margin.top} 
              x2={x} 
              y2={dimensions.height - margin.bottom} 
              stroke="#f0f0f0" 
              strokeWidth={1}
            />
          );
        })}

        {/* Candlesticks */}
        {data.map((d, i) => {
          const x = toX(i);
          const isGreen = d.close >= d.open;
          const color = isGreen ? '#26a69a' : '#ef5350';
          
          const highY = toY(d.high);
          const lowY = toY(d.low);
          const openY = toY(d.open);
          const closeY = toY(d.close);
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(1, Math.abs(openY - closeY));

          return (
            <g key={i}>
              {/* Wick */}
              <line 
                x1={x} 
                y1={highY} 
                x2={x} 
                y2={lowY} 
                stroke={color} 
                strokeWidth={1} 
              />
              {/* Body */}
              <rect 
                x={x - candleWidth / 2} 
                y={bodyTop} 
                width={candleWidth} 
                height={bodyHeight} 
                fill={isGreen ? color : color}
                stroke={color}
                strokeWidth={0.5}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map((d, i) => {
          const originalIndex = data.indexOf(d);
          const x = toX(originalIndex);
          return (
            <text 
              key={i} 
              x={x} 
              y={dimensions.height - margin.bottom + 20} 
              textAnchor="middle" 
              fontSize={11} 
              fill="#6b7280"
            >
              {d.label}
            </text>
          );
        })}

        {/* Crosshair */}
        {hoveredIndex !== null && (
          <>
            <line 
              x1={toX(hoveredIndex)} 
              y1={margin.top} 
              x2={toX(hoveredIndex)} 
              y2={dimensions.height - margin.bottom} 
              stroke="#9ca3af" 
              strokeWidth={1} 
              strokeDasharray="4 2"
            />
            <line 
              x1={margin.left} 
              y1={mousePos.y} 
              x2={dimensions.width - margin.right} 
              y2={mousePos.y} 
              stroke="#9ca3af" 
              strokeWidth={1} 
              strokeDasharray="4 2"
            />
          </>
        )}

        {/* Border */}
        <rect 
          x={margin.left} 
          y={margin.top} 
          width={plotWidth} 
          height={plotHeight} 
          fill="none" 
          stroke="#e5e7eb" 
          strokeWidth={1}
        />
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div 
          className="absolute top-2 left-16 bg-white/95 border border-gray-200 rounded shadow-lg px-3 py-2 pointer-events-none z-10"
        >
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold text-gray-700">{data[hoveredIndex].fullDate}</span>
            <span className="text-gray-500">O: <span className="text-gray-900 font-medium">{data[hoveredIndex].open?.toFixed(2)}</span></span>
            <span className="text-gray-500">H: <span className="text-gray-900 font-medium">{data[hoveredIndex].high?.toFixed(2)}</span></span>
            <span className="text-gray-500">L: <span className="text-gray-900 font-medium">{data[hoveredIndex].low?.toFixed(2)}</span></span>
            <span className="text-gray-500">C: <span className={`font-medium ${data[hoveredIndex].close >= data[hoveredIndex].open ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>{data[hoveredIndex].close?.toFixed(2)}</span></span>
            <span className="text-gray-500">Cum: <span className={`font-medium ${data[hoveredIndex].cumulativeReturn >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>{data[hoveredIndex].cumulativeReturn?.toFixed(2)}%</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
