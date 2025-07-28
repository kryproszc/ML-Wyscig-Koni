'use client';

import React from 'react';

type ModalProps = {
  title: string;
  message: string;
  isOpen: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onlyOk?: boolean;
};

export default function Modal({
  title,
  message,
  isOpen,
  onCancel,
  onConfirm,
  onlyOk = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200">
      <div className="bg-slate-800 text-white p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="mb-4">{message}</p>

        <div className="flex justify-end gap-3">
          {!onlyOk && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              Anuluj
            </button>
          )}
          <button
            onClick={onConfirm ?? onCancel}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
