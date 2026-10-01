import { useEffect, useState } from 'react';

export type ToastKind = 'success' | 'warning' | 'error';

export type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

const DURATION_MS: Record<ToastKind, number> = {
  success: 4000,
  warning: 5000,
  error: 6000,
};

let nextId = 1;
let toasts: ToastItem[] = [];
const listeners = new Set<(next: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function showToast(kind: ToastKind, message: string) {
  const text = message.trim();
  if (!text) return;
  const id = nextId++;
  toasts = [...toasts, { id, kind, message: text }];
  emit();
  window.setTimeout(() => dismissToast(id), DURATION_MS[kind]);
}

export function useToasts() {
  const [items, setItems] = useState(toasts);

  useEffect(() => {
    listeners.add(setItems);
    setItems(toasts);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return items;
}
