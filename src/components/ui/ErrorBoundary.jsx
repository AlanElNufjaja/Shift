import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Prevent one data widget from taking down the complete farm-assessment SPA. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Diagnostics belong in the console, not on a farmer-facing page.
    console.error('Field Shift panel error:', error, info.componentStack);
  }

  componentDidUpdate(previous) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      // A new field is a clean attempt to render the affected panel.
      this.setState({ failed: false });
    }
  }

  retry() {
    this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="rounded-2xl border border-[#e5d5ba] bg-[#fffaf1] p-5 text-[#75572c]" role="alert">
        <div className="flex items-center gap-2 font-bold"><AlertTriangle size={18} />{this.props.title || 'This section could not be displayed.'}</div>
        <p className="mt-2 text-sm">The rest of your assessment is still available. Try reopening this section; if the issue continues, check the browser console.</p>
        <button type="button" onClick={this.retry} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#153C2B] px-4 text-sm font-semibold text-white">
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  }
}
