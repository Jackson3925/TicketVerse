import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mb-4">
              There was an error loading this content.
            </p>
            <Button variant="outline" size="sm" onClick={this.resetError}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Simple ticket card error fallback
export const TicketCardErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ resetError }) => (
  <Card className="border-destructive/50">
    <CardContent className="p-4 text-center">
      <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
      <p className="text-sm font-medium mb-1">Ticket Error</p>
      <p className="text-xs text-muted-foreground mb-3">
        Unable to load ticket details
      </p>
      <Button variant="outline" size="sm" onClick={resetError}>
        <RefreshCw className="h-3 w-3 mr-1" />
        Retry
      </Button>
    </CardContent>
  </Card>
);

export default ErrorBoundary;