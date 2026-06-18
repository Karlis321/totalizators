'use client';

export default function ConfirmDialog({
  title, body, warning, onConfirm, onCancel,
}: {
  title: string;
  body?: string;
  warning?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold text-grey-900">{title}</h2>
        {body && <p className="text-sm text-grey-600 mt-2">{body}</p>}
        {warning && (
          <div className="mt-3 bg-[#fffbeb] border border-[#fcd34d] text-[#92400e] text-sm font-medium px-3 py-2 rounded-lg">
            {warning}
          </div>
        )}
        <div className="mt-6 space-y-3">
          <button
            onClick={onConfirm}
            className="w-full h-11 bg-brand-green text-white rounded-lg font-medium text-sm"
          >
            Apstiprināt
          </button>
          <button
            onClick={onCancel}
            className="w-full h-11 bg-grey-100 text-grey-900 rounded-lg font-medium text-sm"
          >
            Atcelt
          </button>
        </div>
      </div>
    </div>
  );
}
