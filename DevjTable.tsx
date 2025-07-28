'use client';

import { useEffect } from 'react';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';
import Modal from '@/components/Modal';
import { exportDevJToExcel } from '../../untils/exportToExcel';
import type { CustomCell } from '@/stores/trainDevideStoreDeterministyczny';

export type DevJResult = {
  volume: number;
  subIndex?: number;
  values: number[];
};

type Props = {
  devJResults: DevJResult[];
  selectedVolume?: number;
  onSelectVolume: (v: number) => void;
};


export default function DevjTable({
  devJResults,
  selectedVolume,
  onSelectVolume,
}: Props) {
  const maxLength = Math.max(...devJResults.map((r) => r.values.length));

  const finalDevJ           = useTrainDevideStoreDet((s) => s.finalDevJ);
  const setFinalDevJ        = useTrainDevideStoreDet((s) => s.setFinalDevJ);
  const devFinalCustom      = useTrainDevideStoreDet((s) => s.devFinalCustom) as Record<number, CustomCell>;
  const setDevFinalValue    = useTrainDevideStoreDet((s) => s.setDevFinalValue);
  const clearDevFinalValue  = useTrainDevideStoreDet((s) => s.clearDevFinalValue);
  const setDevPreviewCandidate = useTrainDevideStoreDet((s) => s.setDevPreviewCandidate);

  const isConfirmModalOpen  = useTrainDevideStoreDet((s) => s.isConfirmModalOpen);
  const openConfirmModal    = useTrainDevideStoreDet((s) => s.openConfirmModal);
  const closeConfirmModal   = useTrainDevideStoreDet((s) => s.closeConfirmModal);
  const confirmFinalDevJ    = useTrainDevideStoreDet((s) => s.confirmFinalDevJ);

  const isMissingFinalModalOpen = useTrainDevideStoreDet((s) => s.isMissingFinalModalOpen);
  const closeMissingFinalModal  = useTrainDevideStoreDet((s) => s.closeMissingFinalModal);

  const isSameResult = (a?: DevJResult, b?: DevJResult) =>
    !!a && !!b && a.volume === b.volume && a.subIndex === b.subIndex;

const handleSelectFinal = (result: DevJResult) => {
  onSelectVolume(result.volume); // <- ustaw wybrany volume

  if (Object.keys(devFinalCustom ?? {}).length > 0) {
    openConfirmModal(result);
  } else {
    setFinalDevJ(result);
  }
};

  const getDisplayedValue = (j: number): number | undefined => {
    const cell = devFinalCustom?.[j];
    if (cell) return cell.value;
    return finalDevJ?.values[j];
  };

  const fmt = (n: number | undefined) =>
    typeof n === 'number' ? n.toFixed(6) : '-';

  // 🔄 Uaktualnia devPreviewCandidate za każdym razem, gdy zmienia się finalDevJ lub nadpisania
  useEffect(() => {
    if (!finalDevJ?.values) return;
    const merged = [...finalDevJ.values];
    Object.entries(devFinalCustom ?? {}).forEach(([indexStr, cell]) => {
      const index = parseInt(indexStr, 10);
      merged[index] = cell.value;
    });
    setDevPreviewCandidate(merged);
  }, [finalDevJ, devFinalCustom, setDevPreviewCandidate]);

  return (
    <div className="overflow-x-auto">
      <table className="table-auto border-collapse border border-gray-700 text-white w-full mt-4">
        <thead>
          <tr>
            <th className="border border-gray-600 px-3 py-1 bg-slate-800 text-center">Final?</th>
            <th className="border border-gray-600 px-3 py-1 bg-slate-800 text-left">volume</th>
            {Array.from({ length: maxLength }, (_, j) => (
              <th
                key={`header-j-${j}`}
                className="border border-gray-600 px-3 py-1 bg-slate-800 text-center"
              >
                j={j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {devJResults.map((result) => {
            const label = result.subIndex !== undefined
              ? `${result.volume}, ${result.subIndex}`
              : `${result.volume}`;
            const key = `row-vol-${result.volume}-${result.subIndex ?? 0}`;
            const isFinal = isSameResult(result, finalDevJ);

            return (
              <tr key={key} className={isFinal ? 'bg-green-200 text-black' : ''}>
                <td className="border border-gray-600 px-3 py-1 text-center bg-slate-900">
<input
  type="radio"
  name="finalDevJ"
  checked={selectedVolume === result.volume}
  onChange={() => handleSelectFinal(result)}
  className="accent-blue-500"
/>

                </td>
                <td className="border border-gray-600 px-3 py-1 bg-slate-800 font-mono">{label}</td>
                {Array.from({ length: maxLength }, (_, j) => {
                  const value = result.values[j];
                  const selected = getDisplayedValue(j) === value;
                  return (
                    <td
                      key={`val-${key}-${j}`}
                      className={`border border-gray-600 px-3 py-1 text-center font-mono ${
                        typeof value === 'number' ? 'cursor-pointer' : 'cursor-not-allowed'
                      } ${selected ? 'bg-green-200 text-black' : 'bg-slate-900 text-white'}`}
                      onClick={() => {
                        if (typeof value === 'number') {
                          if (selected && devFinalCustom[j]?.curve === 'dev_j') {
                            clearDevFinalValue(j);
                          } else {
                            setDevFinalValue(j, 'dev_j', value);
                          }
                        }
                      }}
                    >
                      {fmt(value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {finalDevJ && (
        <div className="mt-6">
          <h3 className="text-white font-bold mb-2">Finalny wektor dev_j:</h3>
          <table className="table-auto border-collapse border border-gray-700 text-white w-full">
            <thead>
              <tr>
                <th className="border border-gray-600 px-3 py-1 bg-slate-800 text-left">
                  Wektor finalny
                </th>
                {Array.from({ length: maxLength }, (_, i) => (
                  <th
                    key={`final-head-${i}`}
                    className="border border-gray-600 px-3 py-1 bg-slate-800 text-center"
                  >
                    j={i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-600 px-3 py-1 bg-slate-800 font-bold">
                  dev_final
                </td>
                {Array.from({ length: maxLength }, (_, i) => {
                  const value = getDisplayedValue(i);
                  return (
                    <td
                      key={`final-val-${i}`}
                      className="border border-gray-600 px-3 py-1 text-center bg-slate-900 font-mono"
                    >
                      {fmt(value)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title="Zmiana wektora finalnego"
        message="Czy na pewno chcesz zmienić wektor finalny? Utracisz zmiany."
        isOpen={isConfirmModalOpen}
        onCancel={closeConfirmModal}
        onConfirm={confirmFinalDevJ}
      />

      <Modal
        title="Brak finalnego wektora"
        message="Najpierw wybierz finalny wektor dev_j."
        isOpen={isMissingFinalModalOpen}
        onlyOk
        onConfirm={closeMissingFinalModal}
      />
    </div>
  );
}
