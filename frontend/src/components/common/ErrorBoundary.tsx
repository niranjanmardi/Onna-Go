import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-[#E8E8E5] rounded-2xl p-8 shadow-sm">
            <div className="flex justify-center mb-6">
              <Logo size="lg" showTagline={false} theme="light" />
            </div>

            <div className="w-12 h-12 mx-auto rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h1 className="text-xl font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
              Something went wrong
            </h1>
            <p className="text-[#737373] text-sm mt-2 leading-relaxed">
              An unexpected display error occurred while rendering the page. Your trip and expense data is safe.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] text-left font-mono text-xs text-[#E11D48] max-h-24 overflow-y-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleClearAndReset}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F4F4F2] text-[#737373] hover:text-[#171717] font-medium text-sm rounded-xl border border-[#E8E8E5] transition-colors"
                title="Clears local browser cache and returns to landing"
              >
                <Trash2 className="w-4 h-4 text-[#A3A3A3]" />
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
