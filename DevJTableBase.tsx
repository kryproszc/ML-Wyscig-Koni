'use client';

import Modal from '@/components/Modal';
import { fmt } from './useDevJHelpers';

export type DevJResult = {
  volume: number;
  subIndex?: number;
  values: number[];
};

export type DevJTableBaseProps = {
  results: DevJResult[];
  maxLength: number;
  columnLabels?: string[]; // opcjonalne etykiety kolumn

  displayed: (j: number) => number | undefined;
  selectedVolume?: number;
  selectedSubIndex?: number;
  onSelectVolume: (v: number, subIndex?: number) => void;

  onCellToggle?: (j: number, value: number) => void;

  isConfirmModalOpen : boolean;
  onConfirmFinal     : () => void;
  onCancelConfirm    : () => void;
  
  formatNumber?: (n?: number) => string; // opcjonalna funkcja formatowania
};

export default function DevJTableBase({
  results,
  maxLength,
  columnLabels,
  displayed,
  selectedVolume,
  selectedSubIndex,
  onSelectVolume,
  onCellToggle,
  isConfirmModalOpen,
  onConfirmFinal,
  onCancelConfirm,
  formatNumber = fmt, // domyślnie używa fmt, ale może być nadpisane
}: DevJTableBaseProps) {
  return (
    <div className="overflow-x-auto">
      <table className="table-auto border-collapse border border-gray-700 text-white w-full mt-4">
        <thead>
          <tr>
            <th className="border border-gray-600 px-3 py-1 bg-slate-800">Final?</th>
            <th className="border border-gray-600 px-3 py-1 bg-slate-800">volume</th>
            {Array.from({ length: maxLength }).map((_, j) => (
              <th
                key={j}
                className="border border-gray-600 px-3 py-1 bg-slate-800 text-center"
              >
                {columnLabels && columnLabels.length > j ? columnLabels[j] : `j=${j}`}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {results.map((r) => {
            const key = `${r.volume}-${r.subIndex ?? 0}`;
            return (
              <tr key={key}>
                <td className="border border-gray-600 px-3 py-1 text-center bg-slate-900">
                  <input
                    type="radio"
                    name="finalDevJSelection"
                    checked={selectedVolume === r.volume && (selectedSubIndex ?? 0) === (r.subIndex ?? 0)}
                    onChange={() => onSelectVolume(r.volume, r.subIndex)}
                  />
                </td>
                <td className="border border-gray-600 px-3 py-1 bg-slate-800 font-mono">
                  {r.subIndex !== undefined ? `${r.volume},${r.subIndex}` : r.volume}
                </td>

                {Array.from({ length: maxLength }).map((_, j) => {
                  const val = r.values[j];
                  const selected = displayed(j) === val;
                  return (
                    <td
                      key={`${key}-${j}`}
                      className={`border border-gray-600 px-3 py-1 text-center font-mono ${
                        typeof val === 'number' ? 'cursor-pointer' : 'cursor-not-allowed'
                      } ${selected ? 'bg-green-200 text-black' : 'bg-slate-900 text-white'}`}
                      onClick={() =>
                        typeof val === 'number' && onCellToggle?.(j, val)
                      }
                    >
                      {formatNumber(val)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        title="Zmiana wektora finalnego"
        message="Czy na pewno chcesz zmienić wektor finalny? Utracisz zmiany."
        isOpen={isConfirmModalOpen}
        onConfirm={onConfirmFinal}
        onCancel={onCancelConfirm}
      />
    </div>
  );
}
