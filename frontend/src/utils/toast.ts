export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastCallback = (toast: ToastItem) => void;

class ToastManager {
  private listeners: Set<ToastCallback> = new Set();

  subscribe(callback: ToastCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastItem = { id, message, type, duration };
    this.listeners.forEach((listener) => listener(toast));
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }
}

export const toast = new ToastManager();
