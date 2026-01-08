'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Download, ChevronLeft, ChevronRight, Loader2, Database } from 'lucide-react';
import Button from '@/components/ui/button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface DataViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  timeframe: string;
}

const TIMEFRAME_CONFIG: Record<string, { name: string; endpoint: string }> = {
  daily: { name: 'Daily Data', endpoint: 'daily' },
  mondayWeekly: { name: 'Monday Weekly', endpoint: 'monday-weekly' },
  expiryWeekly: { name: 'Expiry Weekly', endpoint: 'expiry-weekly' },
  monthly: { name: 'Monthly Data', endpoint: 'monthly' },
  yearly: { name: 'Yearly Data', endpoint: 'yearly' },
};

const PAGE_SIZE = 100;

export function DataViewerModal({ isOpen, onClose, symbol, timeframe }: DataViewerModalProps) {
  const [page, setPage] = useState(1);

  // Reset page when timeframe changes
  useEffect(() => {
    setPage(1);
  }, [timeframe]);

  const config = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG.daily;

  // Fetch data for the timeframe
  const { data, isLoading, error } = useQuery({
    queryKey: ['table-data', symbol, timeframe, page],
    queryFn: async () => {
      const params = { 
        page, 
        limit: PAGE_SIZE
      };
      
      const response = await api.get(`/analysis/symbols/${symbol}/${config.endpoint}`, {
        params
      });
      
      return response.data.data;
    },
    enabled: isOpen && !!symbol,
  });

  const handleDownloadCSV = async () => {
    try {
      const response = await api.get(`/analysis/symbols/${symbol}/${config.endpoint}/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${symbol}_${timeframe}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (!isOpen) return null;

  const totalPages = data?.pagination?.totalPages || 1;
  const totalRecords = data?.pagination?.total || 0;
  const records = data?.records || [];

  // Get column headers from first record
  const columns = records.length > 0 ? Object.keys(records[0]).filter(k => k !== 'id' && k !== 'tickerId') : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced Backdrop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Enhanced Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-slate-200/60">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-xl">
              <Database className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{symbol} - {config.name}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                <span>{totalRecords.toLocaleString()} total records</span>
                {records.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{columns.length} columns</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadCSV}
              className="border-slate-200 hover:bg-slate-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Enhanced Table Content */}
        <div className="flex-1 overflow-hidden bg-slate-50/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading analysis data...</p>
                <p className="text-slate-400 text-sm mt-1">Please wait while we fetch the records</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to load data</h3>
                <p className="text-slate-500 mb-4">There was an error loading the analysis data</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No data available</h3>
                <p className="text-slate-500">No records found for this timeframe and symbol</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col p-6">
              
              {/* Table Container with Horizontal Scroll */}
              <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative group">
                {/* Horizontal Scrollable Area */}
                <div className="overflow-x-auto overflow-y-auto h-full">
                  <table className="w-full min-w-max">
                    {/* Sticky Header */}
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 bg-slate-50 sticky left-0 z-20 min-w-[60px]">
                          #
                        </th>
                        {columns.map((col) => (
                          <th 
                            key={col} 
                            className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 last:border-r-0 whitespace-nowrap min-w-[120px]"
                          >
                            <span className="truncate">{formatColumnName(col)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    {/* Table Body with improved spacing */}
                    <tbody className="divide-y divide-slate-100">
                      {records.map((record: any, idx: number) => (
                        <tr 
                          key={idx} 
                          className={cn(
                            "hover:bg-slate-50/50 transition-colors",
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                          )}
                        >
                          <td className="px-4 py-3 text-sm text-slate-500 font-medium border-r border-slate-100 bg-white sticky left-0 z-10 min-w-[60px]">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          {columns.map(col => (
                            <td key={col} className="px-4 py-3 text-sm text-slate-900 border-r border-slate-100 last:border-r-0 whitespace-nowrap font-medium min-w-[120px]">
                              {formatCellValue(record[col], col)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              
              </div>
            </div>
          )}
        </div>

        {/* Modern Pagination */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-900">{((page - 1) * PAGE_SIZE) + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(page * PAGE_SIZE, totalRecords)}</span> of <span className="font-semibold text-slate-900">{totalRecords.toLocaleString()}</span> records
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-8 h-8 text-sm font-medium rounded-lg transition-colors",
                      page === pageNum
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatColumnName(col: string): string {
  return col
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatCellValue(value: any, column: string): string {
  if (value === null || value === undefined) return '-';
  
  if (column.toLowerCase().includes('date') || column === 'createdAt' || column === 'updatedAt') {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return String(value);
    }
  }
  
  if (typeof value === 'boolean') {
    return value ? '✓' : '✗';
  }
  
  if (typeof value === 'number') {
    if (column.toLowerCase().includes('percentage') || column.toLowerCase().includes('return')) {
      return value.toFixed(2) + '%';
    }
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toFixed(2);
  }
  
  return String(value);
}