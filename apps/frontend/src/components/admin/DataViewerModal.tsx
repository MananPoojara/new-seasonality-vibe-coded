
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Download, ChevronLeft, ChevronRight, Loader2, Table as TableIcon, Calendar, Hash, FileSpreadsheet } from 'lucide-react';
import {Button}  from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// Helper function to format date as dd/mm/yyyy
const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

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
      const response = await api.get(`/analysis/symbols/${symbol}/${config.endpoint}`, {
        params: { page, limit: PAGE_SIZE }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
              <TableIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {symbol} 
                <span className="text-slate-300 font-light">|</span>
                <span className="text-slate-600 font-medium">{config.name}</span>
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {totalRecords.toLocaleString()} records
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(new Date())}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadCSV}
              className="hidden sm:flex border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-9 w-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50 relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm text-slate-500 font-medium">Loading data records...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-full">
                <X className="h-6 w-6" />
              </div>
              <p className="font-medium">Failed to load data</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <div className="p-4 bg-slate-100 rounded-full">
                <FileSpreadsheet className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">No data available for this timeframe</p>
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80 backdrop-blur w-16 text-center">
                      #
                    </th>
                    {columns.map(col => (
                      <th key={col} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/80 backdrop-blur whitespace-nowrap">
                        {formatColumnName(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {records.map((record: any, idx: number) => (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-3 text-xs text-slate-400 text-center font-mono border-r border-transparent">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      {columns.map(col => (
                        <td key={col} className="px-6 py-3 whitespace-nowrap">
                          {formatCellValue(record[col], col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white z-10">
          <div className="text-sm text-slate-500 font-medium">
            Showing <span className="text-slate-900">{((page - 1) * PAGE_SIZE) + 1}</span> to <span className="text-slate-900">{Math.min(page * PAGE_SIZE, totalRecords)}</span> of <span className="text-slate-900">{totalRecords.toLocaleString()}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center justify-center h-9 min-w-[3rem] px-3 rounded-md bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700">
              {page} <span className="text-slate-400 mx-1">/</span> {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-9 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
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

function formatCellValue(value: any, column: string): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-slate-300">-</span>;
  
  // Date formatting
  if (column.toLowerCase().includes('date') || column === 'createdAt' || column === 'updatedAt') {
    try {
      const date = new Date(value);
      return (
        <span className="text-slate-600 font-medium">
          {formatDate(date)}
        </span>
      );
    } catch {
      return String(value);
    }
  }
  
  // Boolean formatting
  if (typeof value === 'boolean') {
    return value ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
        True
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
        False
      </span>
    );
  }
  
  // Numeric formatting
  if (typeof value === 'number') {
    // Percentages and Returns
    if (column.toLowerCase().includes('percentage') || column.toLowerCase().includes('return')) {
      const isPositive = value > 0;
      const isNegative = value < 0;
      const formatted = value.toFixed(2) + '%';
      
      if (isPositive) return <span className="text-emerald-600 font-medium font-mono">+{formatted}</span>;
      if (isNegative) return <span className="text-rose-600 font-medium font-mono">{formatted}</span>;
      return <span className="text-slate-500 font-mono">{formatted}</span>;
    }
    
    // Integers / Large numbers
    if (Number.isInteger(value) && value > 9999) {
      return <span className="text-slate-700 font-mono">{value.toLocaleString()}</span>;
    }

    // Floating point prices
    if (!Number.isInteger(value)) {
       return <span className="text-slate-700 font-mono">{value.toFixed(2)}</span>;
    }

    return <span className="text-slate-700 font-mono">{value}</span>;
  }
  
  return <span className="text-slate-600">{String(value)}</span>;
}