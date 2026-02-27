import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-background p-6">
          <div className="text-center space-y-4 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
