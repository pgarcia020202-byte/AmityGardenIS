import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Logs to the console so it's visible via remote debugging (chrome://inspect
    // for Android, Safari Web Inspector for iOS) even if the on-screen UI is blank.
    console.error('App crashed:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    // Clear potentially-corrupt session state and reload from scratch.
    try {
      localStorage.removeItem('currentUser')
      localStorage.removeItem('currentPage')
      localStorage.removeItem('token')
    } catch (e) {
      // ignore storage errors
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-rose-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-4">
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-slate-100 text-slate-700 rounded-lg p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
            >
              <RefreshCw size={15} />
              Reload app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
