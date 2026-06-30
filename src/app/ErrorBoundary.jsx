import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("public_app_render_failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="placeholder-page section-shell">
        <p>页面加载失败</p>
        <h1>这部分内容暂时无法显示</h1>
        <a className="button button-secondary" href="#/">返回首页</a>
      </main>
    );
  }
}
