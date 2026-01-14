import { useState, useCallback } from 'react';

export interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((toast: Toast) => {
    // Simple console logging for now - can be enhanced with UI toast component
    console.log(`[Toast ${toast.variant || 'default'}]`, toast.title, toast.description);
    
    setToasts((prev) => [...prev, toast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== toast));
    }, 5000);
  }, []);

  return { toast, toasts };
}
