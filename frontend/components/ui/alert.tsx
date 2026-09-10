import React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'danger' | 'destructive' | 'success' | 'default';
}

export function Alert({ className = '', variant = 'info', children, ...props }: AlertProps) {
  const variants: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200',
    warning: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200',
    danger: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200',
    destructive: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200',
    default: 'bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100',
  };

  const selectedClass = variants[variant] || variants.default;

  return (
    <div className={`p-4 rounded-xl border flex gap-3 text-sm ${selectedClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AlertDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div className={`text-xs sm:text-sm ${className}`} {...props}>
      {children}
    </div>
  );
}
