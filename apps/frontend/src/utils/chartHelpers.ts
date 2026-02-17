/**
 * Chart Helper Utilities
 * 
 * Utility functions for chart operations, date conversions,
 * and data filtering for drag-to-select functionality.
 */

import { Time } from 'lightweight-charts';

/**
 * Convert Lightweight Charts Time to JavaScript Date
 */
export function timeToDate(time: Time): Date {
  if (typeof time === 'number') {
    // Unix timestamp in seconds
    return new Date(time * 1000);
  } else if (typeof time === 'string') {
    // ISO date string
    return new Date(time);
  } else if (time && typeof time === 'object') {
    // BusinessDay format: { year, month, day }
    const { year, month, day } = time as any;
    return new Date(year, month - 1, day);
  }
  return new Date();
}

/**
 * Convert JavaScript Date to Lightweight Charts Time (Unix timestamp)
 */
export function dateToTime(date: Date): Time {
  return Math.floor(date.getTime() / 1000) as Time;
}

/**
 * Format date for display
 */
export function formatDate(date: Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    case 'long':
      return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    case 'iso':
      return date.toISOString().split('T')[0];
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Filter chart data by date range
 */
export function filterDataByDateRange<T extends { date: string }>(
  data: T[],
  startDate: string | null,
  endDate: string | null
): T[] {
  if (!startDate || !endDate) return data;

  return data.filter((item) => {
    const itemDate = new Date(item.date).toISOString().split('T')[0];
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/**
 * Calculate statistics for selected range
 */
export function calculateRangeStatistics(data: Array<{ returnPercentage?: number; cumulative?: number }>) {
  if (!data || data.length === 0) {
    return {
      count: 0,
      totalReturn: 0,
      avgReturn: 0,
      minReturn: 0,
      maxReturn: 0,
      positiveCount: 0,
      negativeCount: 0,
      winRate: 0,
    };
  }

  const returns = data.map((d) => d.returnPercentage || 0);
  const positiveReturns = returns.filter((r) => r > 0);
  const negativeReturns = returns.filter((r) => r < 0);

  const totalReturn = returns.reduce((sum, r) => sum + r, 0);
  const avgReturn = totalReturn / returns.length;
  const minReturn = Math.min(...returns);
  const maxReturn = Math.max(...returns);

  return {
    count: data.length,
    totalReturn,
    avgReturn,
    minReturn,
    maxReturn,
    positiveCount: positiveReturns.length,
    negativeCount: negativeReturns.length,
    winRate: (positiveReturns.length / returns.length) * 100,
  };
}

/**
 * Get date range duration in days
 */
export function getDateRangeDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: string | null,
  endDate: string | null
): { valid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Start and end dates are required' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (start > end) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  const duration = getDateRangeDuration(startDate, endDate);
  if (duration < 1) {
    return { valid: false, error: 'Date range must be at least 1 day' };
  }

  return { valid: true };
}

/**
 * Generate preset date ranges
 */
export function getPresetDateRanges() {
  const today = new Date();
  const formatISO = (date: Date) => date.toISOString().split('T')[0];

  return {
    lastWeek: {
      label: 'Last Week',
      startDate: formatISO(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
      endDate: formatISO(today),
    },
    lastMonth: {
      label: 'Last Month',
      startDate: formatISO(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())),
      endDate: formatISO(today),
    },
    last3Months: {
      label: 'Last 3 Months',
      startDate: formatISO(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())),
      endDate: formatISO(today),
    },
    last6Months: {
      label: 'Last 6 Months',
      startDate: formatISO(new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())),
      endDate: formatISO(today),
    },
    lastYear: {
      label: 'Last Year',
      startDate: formatISO(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())),
      endDate: formatISO(today),
    },
    yearToDate: {
      label: 'Year to Date',
      startDate: formatISO(new Date(today.getFullYear(), 0, 1)),
      endDate: formatISO(today),
    },
  };
}

/**
 * Export selected data as CSV
 */
export function exportToCSV(
  data: any[],
  filename: string,
  columns?: { key: string; label: string }[]
) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Auto-detect columns if not provided
  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Create CSV header
  const header = cols.map((col) => col.label).join(',');

  // Create CSV rows
  const rows = data.map((row) =>
    cols.map((col) => {
      const value = row[col.key];
      // Handle values with commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - (now - lastCall));
    }
  };
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Get optimal chart height based on container
 */
export function getOptimalChartHeight(containerHeight: number): number {
  // Reserve space for header, padding, etc.
  const minHeight = 300;
  const maxHeight = 800;
  const calculatedHeight = containerHeight - 100; // Reserve 100px for UI elements

  return Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
}
