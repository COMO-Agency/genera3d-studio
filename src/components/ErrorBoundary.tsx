import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { captureComponentError } from "@/lib/errorReporting";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    console.error("ErrorBoundary caught:", error, errorInfo);
    
    // Send to error reporting
    captureComponentError(error, errorInfo, this.props.componentName);
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-secondary p-6" role="alert" aria-live="assertive">
          <div className="text-center max-w-md space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Etwas ist schiefgelaufen</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "Ein unerwarteter Fehler ist aufgetreten."}
            </p>
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="text-left text-xs text-muted-foreground bg-muted p-2 rounded">
                <summary>Stack Trace</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                Erneut versuchen
              </Button>
              <Button onClick={this.handleReload}>
                Seite neu laden
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
