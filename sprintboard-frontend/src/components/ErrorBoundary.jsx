import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { if (import.meta.env.DEV) console.error("SprintBoard UI error:", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="fatal-screen"><div className="fatal-card"><AlertTriangle size={30}/><h1>Something went wrong</h1><p>The workspace could not render this screen. Try reloading the page.</p><button className="btn btn-primary" onClick={() => window.location.reload()}><RefreshCw size={16}/> Reload workspace</button></div></main>;
  }
}
