import { Component } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './UI';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });

        // Log to error tracking service (e.g., Sentry)
        if (import.meta.env.PROD) {
            // window.Sentry?.captureException(error);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white border border-zinc-200 rounded-lg p-8 text-center">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-zinc-900" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-zinc-600 mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <details className="text-left mb-6 bg-zinc-50 p-4 rounded border border-zinc-200">
                                <summary className="cursor-pointer font-semibold text-sm mb-2">
                                    Error Details (Dev Only)
                                </summary>
                                <pre className="text-xs text-zinc-900 overflow-auto">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                        <div className="flex gap-3 justify-center">
                            <Button onClick={this.handleReset}>Go to Home</Button>
                            <Button variant="secondary" onClick={() => window.location.reload()}>
                                Reload Page
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
