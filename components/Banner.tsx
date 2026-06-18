type Variant = 'success' | 'warning' | 'error' | 'info';

const styles: Record<Variant, string> = {
  success: 'bg-brand-green-light text-[#166534] border border-[#86efac]',
  warning: 'bg-[#fffbeb] text-[#92400e] border border-[#fcd34d]',
  error:   'bg-red-50 text-red-600 border border-[#fca5a5]',
  info:    'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]',
};

export default function Banner({ variant, message }: { variant: Variant; message: string }) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`px-4 py-3 rounded-xl text-sm font-medium ${styles[variant]}`}
    >
      {message}
    </div>
  );
}
