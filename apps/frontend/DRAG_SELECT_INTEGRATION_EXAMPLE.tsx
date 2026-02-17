/**
 * EXAMPLE: How to integrate drag-to-select into your existing daily page
 * 
 * This file shows the minimal changes needed to add drag-to-select functionality
 * to your existing chart implementation.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, BarChart3, Activity, Filter, 
  ChevronDown, Download, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Settings, LogOut
} from 'lucide-react';

import { analysisApi } from '@/lib/api';
import { useAnalysisStore } from '@/store/analysisStore';
import { Button } from '@/components/ui/button';

// ========================================
// NEW IMPORTS FOR DRAG-TO-SELECT
// ========================================
import { CumulativeChartWithDragSelect } from '@/components/charts';
import { useChartSelectionStore } from '@/store/chartSelectionStore';
// ========================================

import { 
  SymbolSelector, 
  DateRangePicker, 
  YearFilters, 
  MonthFilters, 
  WeekFilters, 
  DayFilters, 
  OutlierFilters,
  SuperimposedChartFilter
} from '@/components/filters';

const Loading = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => (
  <div className="flex items-center justify-center">
    <RefreshCw className={`animate-spin text-indigo-600 ${size === 'lg' ? 'h-10 w-10' : 'h-6 w-6'}`} />
  </div>
);

export default function DailyPageWithDragSelect() {
  const { selectedSymbols, startDate, endDate, lastNDays, filters, chartScale } = useAnalysisStore();
  const [activeTab, setActiveTab] = useState('chart');
  const [chartMode, setChartMode] = useState<'cumulative' | 'superimposed' | 'yearly-overlay'>('cumulative');
  
  // ========================================
  // NEW: Access chart selection store
  // ========================================
  const { timeRangeSelection, getDateRangeForAPI, clearTimeRangeSelection } = useChartSelectionStore();
  // ========================================

  // ========================================
  // MODIFIED: Use selected range in API query
  // ========================================
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: [
      'daily-analysis', 
      selectedSymbols, 
      startDate, 
      endDate, 
      lastNDays, 
      filters,
      // Add selection to query key to trigger refetch
      timeRangeSelection.isActive,
      timeRangeSelection.startDate,
      timeRangeSelection.endDate,
    ],
    queryFn: async () => {
      // Use selected range if active, otherwise use default range
      const dateRange = timeRangeSelection.isActive 
        ? getDateRangeForAPI() 
        : { startDate, endDate };

      const response = await analysisApi.daily({
        symbol: selectedSymbols[0],
        startDate: dateRange.startDate || startDate,
        endDate: dateRange.endDate || endDate,
        lastNDays,
        filters,
        chartScale,
      });
      return response.data.data;
    },
    enabled: selectedSymbols.length > 0,
  });
  // ========================================

  const symbolData = data?.[selectedSymbols[0]];
  const stats = symbolData?.statistics;

  // ========================================
  // NEW: Clear selection when filters change
  // ========================================
  useEffect(() => {
    // Clear selection when user applies new filters
    clearTimeRangeSelection();
  }, [selectedSymbols, startDate, endDate, filters]);
  // ========================================

  // ========================================
  // NEW: Handle range selection callback
  // ========================================
  const handleRangeSelected = (selectedStart: string, selectedEnd: string) => {
    console.log('📊 Date range selected:', selectedStart, 'to', selectedEnd);
    
    // Optional: Show notification
    // toast.success(`Range selected: ${selectedStart} to ${selectedEnd}`);
    
    // The query will automatically refetch due to queryKey dependency
  };
  // ========================================

  return (
    <div className="flex h-full bg-slate-50">
      {/* LEFT SIDEBAR - FILTER CONSOLE */}
      <aside className="bg-white border-r border-slate-200 flex flex-col overflow-hidden w-80">
        {/* ... Filter content (same as before) ... */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <SymbolSelector />
          <DateRangePicker />
          {/* ... other filters ... */}
        </div>

        {/* Apply Filters Button */}
        <div className="flex-shrink-0 p-3 border-t border-slate-100">
          <Button 
            onClick={() => {
              // Clear selection when applying new filters
              clearTimeRangeSelection();
              refetch();
            }} 
            disabled={isFetching || selectedSymbols.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg"
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
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Activity className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {selectedSymbols[0] || 'Select Symbol'}
              </h1>
              <p className="text-xs text-slate-500">Daily Analysis Engine</p>
            </div>
          </div>

          {/* ========================================
              NEW: Show selected range indicator
              ======================================== */}
          {timeRangeSelection.isActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="text-xs font-semibold text-indigo-700">
                Selected: {timeRangeSelection.startDate} → {timeRangeSelection.endDate}
              </div>
              <button
                onClick={clearTimeRangeSelection}
                className="text-indigo-600 hover:text-indigo-800"
                title="Clear selection"
              >
                ✕
              </button>
            </div>
          )}
          {/* ======================================== */}
        </header>

        {/* STATISTICS CARDS */}
        {stats && (
          <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3">
            <div className="grid grid-cols-4 gap-4">
              {/* ... stat cards (same as before) ... */}
            </div>
          </div>
        )}

        {/* CHART AREA */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full bg-white rounded-lg border border-slate-200 flex flex-col">
            {/* Chart Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">
                {chartMode === 'cumulative' ? 'Cumulative Returns' : 
                 chartMode === 'superimposed' ? 'Superimposed Pattern' : 
                 'Yearly Overlay Pattern'}
              </h3>
              <div className="flex items-center gap-2">
                {/* Chart mode toggle buttons */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setChartMode('cumulative')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                      chartMode === 'cumulative' 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Cumulative
                  </button>
                  {/* ... other mode buttons ... */}
                </div>
              </div>
            </div>

            {/* Chart Content */}
            <div className="flex-1 p-4 overflow-hidden relative">
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
                    {activeTab === 'chart' && chartMode === 'cumulative' && (
                      // ========================================
                      // REPLACED: Old CumulativeChart with new DragSelect version
                      // ========================================
                      <CumulativeChartWithDragSelect
                        data={symbolData.chartData}
                        chartScale={chartScale}
                        onRangeSelected={handleRangeSelected}
                      />
                      // ========================================
                    )}
                    
                    {/* Other chart modes remain the same */}
                    {activeTab === 'chart' && chartMode === 'superimposed' && (
                      <div>Superimposed Chart (can add drag-select later)</div>
                    )}
                    
                    {activeTab === 'chart' && chartMode === 'yearly-overlay' && (
                      <div>Yearly Overlay Chart (can add drag-select later)</div>
                    )}
                    
                    {activeTab === 'table' && (
                      <div>Data Table</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ========================================
                  NEW: Loading overlay when refetching with selection
                  ======================================== */}
              {isFetching && timeRangeSelection.isActive && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center gap-3">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-700">
                      Loading selected range...
                    </p>
                    <p className="text-xs text-slate-500">
                      {timeRangeSelection.startDate} to {timeRangeSelection.endDate}
                    </p>
                  </div>
                </div>
              )}
              {/* ======================================== */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SUMMARY OF CHANGES:
 * 
 * 1. Added imports:
 *    - CumulativeChartWithDragSelect from @/components/charts
 *    - useChartSelectionStore from @/store/chartSelectionStore
 * 
 * 2. Modified useQuery:
 *    - Added selection state to queryKey
 *    - Use selected range in API call when active
 * 
 * 3. Added selection management:
 *    - Clear selection when filters change
 *    - Handle range selection callback
 * 
 * 4. Updated UI:
 *    - Show selected range indicator in header
 *    - Replace old chart with new drag-select version
 *    - Add loading overlay for refetch
 * 
 * 5. Updated Apply Filters button:
 *    - Clear selection when applying new filters
 * 
 * That's it! The drag-to-select feature is now fully integrated.
 */
