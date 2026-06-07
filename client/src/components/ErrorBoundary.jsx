import { Component } from 'react';
import { Coffee, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream-100 dark:bg-night px-6 text-center">
        <Coffee size={48} className="text-espresso-300 mb-4" />
        <h2 className="font-display text-xl font-semibold text-roast-dark dark:text-cream-100 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-espresso-400 dark:text-espresso-300 mb-6 max-w-xs">
          BrewBuddy hit an unexpected error. Refresh to get back to your coffee.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
