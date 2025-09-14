import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { CheckCircle, AlertCircle, XCircle, Clock, Info } from "lucide-react";

export interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending' | 'neutral';
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
  pulse?: boolean;
}

const defaultIcons = {
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  info: Info,
  pending: Clock,
  neutral: Info
};

const statusVariants = {
  default: {
    success: 'bg-chart-success text-white hover:bg-chart-success/90',
    warning: 'bg-chart-warning text-white hover:bg-chart-warning/90',
    error: 'bg-chart-error text-white hover:bg-chart-error/90',
    info: 'bg-chart-info text-white hover:bg-chart-info/90',
    pending: 'bg-chart-neutral text-white hover:bg-chart-neutral/90',
    neutral: 'bg-muted text-muted-foreground hover:bg-muted/90'
  },
  outline: {
    success: 'border-chart-success text-chart-success hover:bg-chart-success/10',
    warning: 'border-chart-warning text-chart-warning hover:bg-chart-warning/10',
    error: 'border-chart-error text-chart-error hover:bg-chart-error/10',
    info: 'border-chart-info text-chart-info hover:bg-chart-info/10',
    pending: 'border-chart-neutral text-chart-neutral hover:bg-chart-neutral/10',
    neutral: 'border-muted-foreground text-muted-foreground hover:bg-muted/10'
  },
  subtle: {
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800',
    error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800',
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800',
    pending: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800',
    neutral: 'bg-muted text-muted-foreground border-border'
  }
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 h-5',
  md: 'text-sm px-2.5 py-1 h-6',
  lg: 'text-base px-3 py-1.5 h-8'
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  icon,
  variant = 'subtle',
  size = 'md',
  className,
  showIcon = true,
  pulse = false
}) => {
  const Icon = icon || defaultIcons[status];
  
  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition-colors",
        statusVariants[variant][status],
        sizeClasses[size],
        pulse && status === 'pending' && "animate-pulse",
        className
      )}
    >
      {showIcon && Icon && (
        <Icon className={cn(iconSizes[size])} />
      )}
      {label}
    </Badge>
  );
};

// Convenience components for common statuses
export const SuccessBadge: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge {...props} status="success" />
);

export const WarningBadge: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge {...props} status="warning" />
);

export const ErrorBadge: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge {...props} status="error" />
);

export const InfoBadge: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge {...props} status="info" />
);

export const PendingBadge: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge {...props} status="pending" pulse />
);
