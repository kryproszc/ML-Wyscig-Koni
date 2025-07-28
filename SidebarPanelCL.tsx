'use client';

import { useState } from 'react';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';
import type { CustomCell } from '@/stores/trainDevideStoreDeterministyczny';
import { exportDevJToExcel } from '../../untils/exportToExcel';
import Modal from '@/components/Modal';
import type { DevJResult } from './DevjTable';

type Props = {
  onCalculate: () => void;
  devJResults: DevJResult[];
};

export default function SidebarPanelCL({ onCalculate, devJResults }: Props) {
  const {
    volume,
    setVolume,
    clearDevJResults,
    setFinalDevJ,
    clearAllDevFinalValues,       // ← poprawiona nazwa
    openMissingFinalModal,
    isMissingFinalModalOpen,
    closeMissingFinalModal,
    finalDevJ,
    finalDevVector,
    devFinalCustom,
  } = useTrainDevideStoreDet();

  const overrides = Object.entries(devFinalCustom as Record<number, CustomCell>).map(
    ([idx, cell]) => ({
      index: Number(idx),
      curve: cell.curve,
      value: cell.value,
    })
  );

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleExport = () => {
    if (!finalDevJ || !finalDevJ.values?.length) {
      openMissingFinalModal();
      return;
    }

    // Dostosuj do własnego podpisu funkcji exportDevJToExcel
    // Przykładowo:
    // exportDevJToExcel(devJResults, finalDevJ, finalDevVector, overrides);
    exportDevJToExcel(devJResults, finalDevJ, finalDevVector, overrides);
  };

  const handleResetConfirm = () => {
    clearDevJResults();
    setFinalDevJ(undefined);
    clearAllDevFinalValues();
    setIsResetModalOpen(false);
  };

  return (
    <div className="w-[18%] bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <div>
        <label className="text-sm text-white">Wybierz volume</label>
        <input
          type="number"
          className="w-full p-2 mt-1 rounded bg-white text-black"
          value={volume}
          min={0}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      <button
        onClick={onCalculate}
        className="mt-2 px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 transition"
      >
        Oblicz
      </button>

      <button
        onClick={handleExport}
        className="px-4 py-2 bg-amber-300 text-white rounded hover:bg-amber-400 transition"
      >
        Eksportuj do Excela
      </button>

      <button
        onClick={() => setIsResetModalOpen(true)}
        className="px-4 py-2 bg-rose-300 text-white rounded hover:bg-rose-400 transition"
      >
        Reset współczynników
      </button>

      <Modal
        isOpen={isResetModalOpen}
        title="Usunięcie współczynników"
        message="Czy na pewno chcesz usunąć współczynniki CL i wektory dev_j? Ta operacja jest nieodwracalna."
        onCancel={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
      />

      <Modal
        isOpen={isMissingFinalModalOpen}
        title="Brak finalnego wektora"
        message="Najpierw wybierz finalny wektor dev_j."
        onConfirm={closeMissingFinalModal}
        onlyOk
      />
    </div>
  );
}
