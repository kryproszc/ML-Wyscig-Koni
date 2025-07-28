'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { exportDevJToExcel } from '../../untils/exportToExcel';

/* ▼ store Incurred + typ CustomCell */
import {
  useTrainDevideStoreDetIncurred,
  type TrainDevideStoreDetIncurred,
} from '@/stores/trainDevideStoreDeterministycznyIncurred';

import type { DevJResult } from './DevjTableIncurred';

type Props = {
  onCalculate: () => void;
  devJResults: DevJResult[];
};

export default function SidebarPanelCLIncurred({
  onCalculate,
  devJResults,
}: Props) {
  const {
    volume,
    setVolume,
    clearDevJResults,
    setFinalDevJ,
    clearAllDevFinalValues,
    openMissingFinalModal,
    isMissingFinalModalOpen,
    closeMissingFinalModal,
    finalDevJ,
    finalDevVector,
    devFinalCustom,
  } = useTrainDevideStoreDetIncurred();

  /* lista nadpisanych komórek */
  const overrides = Object.entries(
    devFinalCustom as TrainDevideStoreDetIncurred['devFinalCustom']
  ).map(([idx, cell]) => ({
    index: Number(idx),
    curve: cell.curve,
    value: cell.value,
  }));

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  /* ── eksport do xlsx ───────────────────────────────────────── */
  const handleExport = () => {
    if (!finalDevJ || !finalDevJ.values?.length) {
      openMissingFinalModal();
      return;
    }
    exportDevJToExcel(devJResults, finalDevJ, finalDevVector, overrides);
  };

  /* ── reset wyników ─────────────────────────────────────────── */
  const handleResetConfirm = () => {
    clearDevJResults();
    setFinalDevJ(undefined);
    clearAllDevFinalValues();
    setIsResetModalOpen(false);
  };

  /* ── RENDER ───────────────────────────────────────────────── */
  return (
    <div className="w-[18%] bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
      {/* volume */}
      <div>
        <label className="text-sm text-white">Wybierz volume</label>
        <input
          type="number"
          min={0}
          className="w-full p-2 mt-1 rounded bg-white text-black"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      {/* przyciski */}
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
        Eksportuj do Excela
      </button>

      <button
        onClick={() => setIsResetModalOpen(true)}
        className="px-4 py-2 bg-rose-300 text-white rounded hover:bg-rose-400 transition"
      >
        Reset współczynników
      </button>

      {/* modal RESET */}
      <Modal
        isOpen={isResetModalOpen}
        title="Usunięcie współczynników"
        message="Czy na pewno chcesz usunąć współczynniki CL i wektory dev_j? Ta operacja jest nieodwracalna."
        onCancel={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
      />

      {/* modal brak finalnego wektora */}
      <Modal
        isOpen={isMissingFinalModalOpen}
        title="Brak finalnego wektora"
        message="Najpierw wybierz finalny wektor dev_j."
        onConfirm={closeMissingFinalModal}
        onlyOk
      />
    </div>
  );
}
