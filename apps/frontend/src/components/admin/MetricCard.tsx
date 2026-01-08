'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  isLoading?: boolean;
  tooltip?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  isLoading = false,
  tooltip,
  className
}: MetricCardProps) {
  return (
    <div 
      className={cn(
        "group relative bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      title={tooltip}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      
      <div className="relative">
        {/* Icon */}
        <div className={cn(
          "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-transform duration-200 group-hover:scale-105",
          iconBgColor
        )}>
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>

        {/* Value - Hero element */}
        <div className="mb-2">
          {isLoading ? (
            <div className="h-10 w-24 bg-slate-200 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
        </div>

        {/* Title - Secondary */}
        <p className="text-sm font-medium text-slate-500 leading-tight">
          {title}
        </p>

        {/* Subtle indicator dot */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-slate-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
    </div>
  );
}