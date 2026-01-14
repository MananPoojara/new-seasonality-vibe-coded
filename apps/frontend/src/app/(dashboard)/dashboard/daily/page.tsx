'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { analysisApi } from '@/lib/api';
import { useAnalysisStore } from '@/store/analysisStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading, PageLoader } from '@/components/ui/loading';
import { SymbolSelector, DateRangePicker, YearFilters, MonthFilters, WeekFilters, DayFilters, OutlierFilters } from '@/components/filters';
import { SeasonalityChart, StatisticsCard, DataTable } from '@/components/charts';
import { RefreshCw, Filter, LayoutDashboard, Table as TableIcon, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function DailyPage() {
  const { selectedSymbols, startDate, endDate, lastNDays, filters, chartScale, setChartScale } = useAnalysisStore();
  const [showFilters, setShowFilters] = useState(true);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['daily-analysis', selectedSymbols, startDate, endDate, lastNDays, filters],
    queryFn: async () => {
      const response = await analysisApi.daily({
        symbols: selectedSymbols,
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

  return (
    <PageLoader loadingText="Preparing Analysis...">
      <div className="container mx-auto p-4 space-y-6 max-w-[1600px]">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/95 backdrop-blur sticky top-0 z-20 py-4 border-b">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Daily Seasonality</h1>
            <p className="text-muted-foreground">Analyze historical performance patterns for {selectedSymbols[0] || 'selected symbols'}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-1 border">
              <Button 
                variant={showFilters ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>

            <Select value={chartScale} onValueChange={(v) => setChartScale(v as 'linear' | 'log')}>
              <SelectTrigger className="w-[110px]">
                <Settings2 className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="log">Log</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={() => refetch()} 
              disabled={isFetching || selectedSymbols.length === 0}
              className="relative overflow-hidden group shadow-lg"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* Filters Section - Collapsible with Animation */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-primary/10 shadow-md bg-slate-50/50 dark:bg-slate-950/50">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Primary Selectors */}
                    <div className="lg:col-span-1 space-y-4 border-r pr-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4 text-primary" /> Asset Selection
                        </label>
                        <SymbolSelector />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Time Range</label>
                        <DateRangePicker />
                      </div>
                    </div>

                    {/* Granular Filters Grid */}
                    <div className="lg:col-span-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <YearFilters />
                          <MonthFilters />
                        </div>
                        <div className="space-y-4">
                          <WeekFilters weekType="expiry" />
                          <WeekFilters weekType="monday" />
                        </div>
                        <div className="space-y-4">
                          <DayFilters />
                          <OutlierFilters />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loading size="lg" />
            <p className="text-muted-foreground animate-pulse">Processing historical data...</p>
          </div>
        ) : symbolData ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
               <StatisticsCard statistics={symbolData.statistics} symbol={selectedSymbols[0]} />
            </div>

            {/* Featured Chart Section */}
            <div className="grid grid-cols-1 gap-6">
              <Card className="border-none shadow-2xl bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Seasonality Performance
                    </CardTitle>
                    <CardDescription>
                      Visualizing expected returns and volatility patterns
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="px-3 py-1 uppercase tracking-wider">
                    {chartScale} Scale
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6">
                   <div className="min-h-[450px] w-full bg-background/50 rounded-xl border border-dashed flex items-center justify-center">
                      <SeasonalityChart 
                        data={symbolData.data} 
                        title={`${selectedSymbols[0]} - Daily Trend Analysis`} 
                        chartScale={chartScale} 
                      />
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table Section */}
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable data={symbolData.data} title={`${selectedSymbols[0]} - Daily Data`} />
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Empty State */
          <Card className="border-dashed border-2 bg-muted/10">
            <CardContent className="py-32 flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-background p-4 rounded-full shadow-sm border">
                <LayoutDashboard className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div className="max-w-xs space-y-2">
                <h3 className="font-semibold text-xl">No Analysis Generated</h3>
                <p className="text-muted-foreground text-sm">
                  Select a trading symbol and timeframe to generate your seasonal daily analysis report.
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowFilters(true)}>
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLoader>
  );
}