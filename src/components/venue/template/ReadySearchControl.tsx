"use client";

import { cloneElement, useSyncExternalStore, type ReactElement } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function useSeatControlsReady() {
  return useSyncExternalStore(subscribe, clientReady, serverReady);
}

/** Keep SSR content visible, but accept a ticket only after its React handlers are ready. */
export default function ReadySearchControl({ children }: { children: ReactElement<{ disabled?: boolean; title?: string }> }) {
  const ready = useSeatControlsReady();
  return cloneElement(children, {
    disabled: !ready || children.props.disabled,
    title: ready ? children.props.title : "検索の準備中です",
  });
}
