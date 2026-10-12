"use client";

import { Component, type ReactNode } from "react";

export function GuideLoading() {
  return <div className="zr-container min-h-60 py-8" role="status" aria-live="polite" aria-busy="true">会場ガイドを読み込んでいます…</div>;
}

export default class GuideLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="zr-container min-h-60 py-8" role="alert">
      <p>会場ガイドを読み込めませんでした。通信状態を確認してください。</p>
      <button type="button" className="mt-3 min-h-11 rounded-lg border px-4" onClick={() => window.location.reload()}>再読み込み</button>
    </div>;
    return this.props.children;
  }
}
