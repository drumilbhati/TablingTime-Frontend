import React from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${danger ? "bg-rose-100" : "bg-gray-100"}`}>
            {/* icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18" stroke={danger ? "#ef4444" : "#4b5563"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6" stroke={danger ? "#ef4444" : "#4b5563"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 11v6" stroke={danger ? "#ef4444" : "#4b5563"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11v6" stroke={danger ? "#ef4444" : "#4b5563"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-gray-900">{title}</h3>
            {description && (
              <p className="mt-2 text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 bg-white border rounded-md text-sm font-medium">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-bold text-white ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-gray-900 hover:bg-gray-800"} disabled:opacity-50`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
