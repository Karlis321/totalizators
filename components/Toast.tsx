'use client';
import { useEffect } from 'react';

export default function Toast({
  message, variant, onDismiss,
}: {
  message: string;
  variant: 'success' | 'error';
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-[148px] left-4 right-4 z-50 bg-grey-900 text-white text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-bottom-4"
    >
      <span className={variant === 'error' ? 'text-red-400' : 'text-green-400'}>
        {variant === 'error' ? '✕' : '✓'}
      </span>
      {message}
    </div>
  );
}
