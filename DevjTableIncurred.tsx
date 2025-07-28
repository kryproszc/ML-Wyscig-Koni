'use client';

import { useEffect } from 'react';
import Modal from '@/components/Modal';

/* ▼ store Incurred */
import {
  useTrainDevideStoreDetIncurred,
  type TrainDevideStoreDetIncurred,
} from '@/stores/trainDevideStoreDeterministycznyIncurred';

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

export default function DevjTableIncurred({
  devJResults,
  selectedVolume,
  onSelectVolume,
}: Props) {
  const maxLength = Math.max(...devJResults.map((r) => r.values.length));

  const finalDevJ          = useTrainDevideStoreDetIncurred((s) => s.finalDevJ);
  const setFinalDevJ       = useTrainDevideStoreDetIncurred((s) => s.setFinalDevJ);
  const devFinalCustom     = useTrainDevideStoreDetIncurred(
    (s) => s.devFinalCustom
  ) as TrainDevideStoreDetIncurred['devFinalCustom'];
  const setDevFinalValue   = useTrainDevideStoreDetIncurred((s) => s.setDevFinalValue);
  const clearDevFinalValue = useTrainDevideStoreDetIncurred((s) => s.clearDevFinalValue);
  const setDevPreview      = useTrainDevideStoreDetIncurred((s) => s.setDevPreviewCandidate);

  const isConfirmModalOpen     = useTrainDevideStoreDetIncurred((s) => s.isConfirmModalOpen);
  const openConfirmModal       = useTrainDevideStoreDetIncurred((s) => s.openConfirmModal);
  const closeConfirmModal      = useTrainDevideStoreDetIncurred((s) => s.closeConfirmModal);
  const confirmFinalDevJ       = useTrainDevideStoreDetIncurred((s) => s.confirmFinalDevJ);

  const isMissingFinalModalOpen = useTrainDevideStoreDetIncurred(
    (s) => s.isMissingFinalModalOpen
  );
  const closeMissingFinalModal  = useTrainDevideStoreDetIncurred(
    (s) => s.closeMissingFinalModal
  );

  const isSameResult = (a?: DevJResult, b?: DevJResult) =>
    !!a && !!b && a.volume === b.volume && a.subIndex === b.subIndex;

  const handleSelectFinal = (result: DevJResult) => {
    onSelectVolume(result.volume);

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

  /* 🔄 aktualizuj kandydata podglądu */
  useEffect(() => {
    if (!finalDevJ?.values) return;
    const merged = [...finalDevJ.values];
    Object.entries(devFinalCustom ?? {}).forEach(([idx, cell]) => {
      merged[Number(idx)] = cell.value;
    });
    setDevPreview(merged);
  }, [finalDevJ, devFinalCustom, setDevPreview]);

  /* ── RENDER ─────────────────────────────────────────────── */
  return (
    <div className="overflow-x-auto">
      {/* tabela wyników */}
      <table className="table-auto border-collapse border border-gray-700 text-white w-full mt-4">
        <thead>
          <tr>
            <th className="border border-gray-600 px-3 py-1 bg-slate-800 text-center">
              Final?
            </th>
            <th className="border border-gray-600 px-3 py-1 bg-slate-800 text-left">
              volume
            </th>
            {Array.from({ length: maxLength }, (_, j) => (
              <th
                key={`header-${j}`}
                className="border border-gray-600 px-3 py-1 bg-slate-800 text-center"
              >
                j={j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {devJResults.map((res) => {
            const label =
              res.subIndex !== undefined
                ? `${res.volume}, ${res.subIndex}`
                : `${res.volume}`;
            const key = `row-${res.volume}-${res.subIndex ?? 0}`;
            const isFinal = isSameResult(res, finalDevJ);

            return (
              <tr key={key} className={isFinal ? 'bg-green-200 text-black' : ''}>
                <td className="border border-gray-600 px-3 py-1 text-center bg-slate-900">
                  <input
                    type="radio"
                    name="finalDevJ"
                    checked={selectedVolume === res.volume}
                    onChange={() => handleSelectFinal(res)}
                    className="accent-blue-500"
                  />
                </td>
                <td className="border border-gray-600 px-3 py-1 bg-slate-800 font-mono">
                  {label}
                </td>

                {Array.from({ length: maxLength }, (_, j) => {
                  const val = res.values[j];
                  const selected = getDisplayedValue(j) === val;
                  return (
                    <td
                      key={`val-${key}-${j}`}
                      className={`border border-gray-600 px-3 py-1 text-center font-mono ${
                        typeof val === 'number'
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed'
                      } ${selected ? 'bg-green-200 text-black' : 'bg-slate-900 text-white'}`}
                      onClick={() => {
                        if (typeof val === 'number') {
                          if (selected && devFinalCustom[j]?.curve === 'dev_j') {
                            clearDevFinalValue(j);
                          } else {
                            setDevFinalValue(j, 'dev_j', val);
                          }
                        }
                      }}
                    >
                      {fmt(val)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* final vector */}
      {finalDevJ && (
        <div className="mt-6">
          <h3 className="text-white font-bold mb-2">
            Finalny wektor dev_j:
          </h3>
          <table className="table-auto border-collapse border border-gray-700 text-white w-full">
            <thead>
              <tr>
                <th className="border border-gray-600 px-3 py-1 bg-slate-800 text-left">
                  Wektor finalny
                </th>
                {Array.from({ length: maxLength }, (_, i) => (
                  <th
                    key={`finalHead-${i}`}
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
                {Array.from({ length: maxLength }, (_, i) => (
                  <td
                    key={`final-${i}`}
                    className="border border-gray-600 px-3 py-1 text-center bg-slate-900 font-mono"
                  >
                    {fmt(getDisplayedValue(i))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* modale */}
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
