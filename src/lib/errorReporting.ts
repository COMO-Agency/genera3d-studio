/**
 * Error Reporting Setup für Genera3D Studio
 * Phase 4: Monitoring & Tests - Sentry-Integration vorbereitet
 *
 * Hinweis: Für die vollständige Integration muss @sentry/react installiert werden:
 * npm install @sentry/react
 * oder
 * bun add @sentry/react
 */

import { toast } from "@/hooks/use-toast";

// Error severity levels
type ErrorSeverity = "low" | "medium" | "high" | "critical";

interface ErrorContext {
  user?: {
    id?: string;
    email?: string;
  };
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

interface AppError {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context?: ErrorContext;
  timestamp: string;
}

// In-memory error queue (fallback before Sentry is set up)
const errorQueue: AppError[] = [];
const MAX_QUEUE_SIZE = 100;

// Vite-compatible environment check
const isDev = import.meta.env.DEV;

/**
 * Haupt-Funktion zum Loggen von Fehlern
 * Wird später durch Sentry ersetzt
 */
export function captureError(
  error: Error | string,
  severity: ErrorSeverity = "medium",
  context?: ErrorContext,
): void {
  const errorMessage = typeof error === "string" ? error : error.message;
  const stack = typeof error === "string" ? undefined : error.stack;

  const appError: AppError = {
    message: errorMessage,
    stack,
    severity,
    context,
    timestamp: new Date().toISOString(),
  };

  // Add to queue (capped)
  errorQueue.push(appError);
  if (errorQueue.length > MAX_QUEUE_SIZE) {
    errorQueue.shift();
  }

  // Always log to console in development
  if (isDev) {
    console.error("[Error Reporting]", appError);
  }

  // Show user feedback for critical errors
  if (severity === "critical" || severity === "high") {
    toast({
      title: "Fehler aufgetreten",
      description:
        "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
      variant: "destructive",
    });
  }

  // TODO: Send to Sentry when configured
  // Sentry.captureException(error, {
  //   level: severity,
  //   user: context?.user,
  //   extra: context?.extra,
  //   tags: context?.tags,
  // });
}

/**
 * React Error Boundary Handler
 */
export function captureComponentError(
  error: Error,
  errorInfo: React.ErrorInfo,
  componentName?: string,
): void {
  captureError(error, "high", {
    extra: {
      componentStack: errorInfo.componentStack,
      componentName,
    },
    tags: {
      errorType: "react_error_boundary",
      component: componentName || "unknown",
    },
  });
}

/**
 * API Error Handler
 */
export function captureApiError(
  error: Error,
  endpoint: string,
  statusCode?: number,
): void {
  const severity: ErrorSeverity =
    statusCode && statusCode >= 500 ? "high" : "medium";

  captureError(error, severity, {
    extra: {
      endpoint,
      statusCode,
    },
    tags: {
      errorType: "api_error",
      endpoint: endpoint.replace(/\//g, "_"),
      statusCode: String(statusCode || "unknown"),
    },
  });
}

/**
 * Performance Monitoring
 * Markiert wichtige Performance-Metriken
 */
export function measurePerformance(
  name: string,
  startTime: number,
  context?: Record<string, unknown>,
): void {
  const duration = performance.now() - startTime;

  // Log slow operations
  if (duration > 1000) {
    captureError(
      `Slow operation: ${name} took ${duration.toFixed(2)}ms`,
      "low",
      {
        extra: {
          operation: name,
          duration,
          ...context,
        },
        tags: {
          errorType: "performance",
          operation: name,
        },
      },
    );
  }

  // TODO: Send to Sentry performance monitoring
  // Sentry.addBreadcrumb({
  //   category: 'performance',
  //   message: `${name}: ${duration.toFixed(2)}ms`,
  //   level: 'info',
  // });
}

/**
 * Breadcrumbs für Debugging
 * Hilft bei der Nachvollziehbarkeit von Fehlern
 */
export function addBreadcrumb(
  message: string,
  category: string,
  _level: "info" | "warning" | "error" = "info",
  data?: Record<string, unknown>,
): void {
  // In development, log breadcrumbs
  if (isDev) {
    console.warn(`[Breadcrumb] ${category}: ${message}`, data);
  }

  // TODO: Send to Sentry
  // Sentry.addBreadcrumb({
  //   message,
  //   category,
  //   level,
  //   data,
  // });
}

/**
 * User Context setzen
 * Wichtig für die Fehlerzuordnung
 */
export function setUserContext(_userId?: string, _email?: string): void {
  // TODO: Send to Sentry
  // Sentry.setUser({
  //   id: userId,
  //   email,
  // });
}

/**
 * Clear User Context (z.B. bei Logout)
 */
export function clearUserContext(): void {
  // TODO: Send to Sentry
  // Sentry.setUser(null);
}

/**
 * Holt alle gesammelten Fehler (für Debugging)
 */
export function getErrorQueue(): AppError[] {
  return [...errorQueue];
}

/**
 * Löscht die Fehler-Queue
 */
export function clearErrorQueue(): void {
  errorQueue.length = 0;
}

// Global error handler for uncaught errors
if (typeof window !== "undefined") {
  window.onerror = (message, source, lineno, colno, error) => {
    captureError(error || String(message), "critical", {
      extra: {
        source,
        lineno,
        colno,
      },
      tags: {
        errorType: "window_onerror",
      },
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    captureError(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
      "high",
      {
        tags: {
          errorType: "unhandled_promise_rejection",
        },
      },
    );
  };
}
