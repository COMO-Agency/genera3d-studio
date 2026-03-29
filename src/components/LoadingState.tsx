/**
 * Einheitliche Loading-States für Genera3D Studio
 * Phase 3: UX-Verbesserungen - Konsistente Loading-States
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'skeleton-card' | 'skeleton-table' | 'skeleton-page';
  count?: number;
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

/**
 * Einheitliche Loading-State-Komponente
 * Verwendung: <LoadingState type="skeleton-table" count={5} />
 */
export function LoadingState({
  type = 'spinner',
  count = 3,
  className,
  text = 'Wird geladen...',
  fullScreen = false,
}: LoadingStateProps) {
  // Spinner Loading
  if (type === 'spinner') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2',
          fullScreen && 'min-h-[50vh]',
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    );
  }

  // Skeleton Card
  if (type === 'skeleton-card') {
    return (
      <div className={cn('space-y-4', className)} role="status" aria-busy="true">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Skeleton Table
  if (type === 'skeleton-table') {
    return (
      <div className={cn('space-y-3', className)} role="status" aria-busy="true">
        <div className="flex gap-4 pb-4 border-b">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Skeleton Page
  if (type === 'skeleton-page') {
    return (
      <div className={cn('space-y-6', className)} role="status" aria-busy="true">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Default skeleton
  return (
    <div className={cn('space-y-2', className)} role="status" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

/**
 * Button mit Loading-State
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText = 'Wird verarbeitet...',
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center',
        loading && 'cursor-wait',
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2
          className="mr-2 h-4 w-4 animate-spin"
          aria-hidden="true"
        />
      )}
      <span className={cn(loading && 'opacity-0', 'transition-opacity')}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          {loadingText}
        </span>
      )}
    </button>
  );
}

/**
 * Overlay Loading State für Modal/Dialog
 */
interface LoadingOverlayProps {
  show: boolean;
  text?: string;
}

export function LoadingOverlay({ show, text = 'Wird geladen...' }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

/**
 * Inline Loading Indicator
 */
export function InlineLoading({ text }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {text}
    </span>
  );
}
