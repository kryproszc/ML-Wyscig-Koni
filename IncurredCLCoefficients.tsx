'use client';

import { useEffect } from 'react';
import { TableDataDetIncurred } from '@/components/TableDataDetIncurred';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '@/app/_components/useUserStore';

/* ▼ STORE Incurred */
import {
  useTrainDevideStoreDetIncurred,
  type TrainDevideStoreDetIncurred,
} from '@/stores/trainDevideStoreDeterministycznyIncurred';

import SidebarPanelCLIncurred from './SidebarPanelCLIncurred';
import DevjTableIncurred from './DevjTableIncurred';

export default function IncurredCLCoefficients() {
  const userId = useUserStore((s) => s.userId);

  /* ── selektory ze store ───────────────────────────────────── */
  const selectedVolume        = useTrainDevideStoreDetIncurred((s) => s.selectedDevJVolume);
  const setSelectedVolume     = useTrainDevideStoreDetIncurred((s) => s.setSelectedDevJVolume);

  const trainDevideDet        = useTrainDevideStoreDetIncurred((s) => s.trainDevideDetIncurred);
  const selectedWeightsDet    = useTrainDevideStoreDetIncurred((s) => s.selectedWeightsDetIncurred);
  const selectedCellsDet      = useTrainDevideStoreDetIncurred((s) => s.selectedCellsDetIncurred);
  const volume                = useTrainDevideStoreDetIncurred((s) => s.volume);
  const devJResults           = useTrainDevideStoreDetIncurred((s) => s.devJResults);

  const setTrainDevideDet     = useTrainDevideStoreDetIncurred((s) => s.setTrainDevideDetIncurred);
  const setDevJ               = useTrainDevideStoreDetIncurred((s) => s.setDevJ);
  const addDevJResult         = useTrainDevideStoreDetIncurred((s) => s.addDevJResult);

  /* ── MUTATION 1 — train_devide_incurred ───────────────────── */
  const mutationTrainDevide = useMutation({
    mutationFn: async () => {
      const rawTriangle =
        useTrainDevideStoreDetIncurred.getState().incurredTriangle ?? [];

      const triangle = rawTriangle.slice(1); // pomijamy nagłówki

      const res = await fetch(
        'http://localhost:8000/calc/incurred/train_devide_incurred',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            incurred_data_det: triangle,
          }),
        }
      );

      return res.json() as Promise<{ train_devide?: number[][] }>;
    },

    onSuccess: (data) => {
      if (data.train_devide) {
        setTrainDevideDet(data.train_devide);
      } else {
        console.warn('[TrainDevideIncurred] brak train_devide w odpowiedzi');
      }
    },
  });

  /* ── MUTATION 2 — CL Incurred ─────────────────────────────── */
  const mutationCL = useMutation({
    mutationFn: async () => {
      const triangle =
        useTrainDevideStoreDetIncurred.getState().incurredTriangle ?? [];

      const safeWeights =
        selectedWeightsDet?.map((r) => r.map((c) => (c === 1 ? 1 : 0))) ?? [];

      const res = await fetch('http://localhost:8000/calc/incurred/cl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          incurred_data_det: triangle,
          weights: safeWeights,
        }),
      });

      return res.json() as Promise<{ train_devide?: number[][]; dev_j?: number[] }>;
    },

    onSuccess: (data) => {
      if (data.train_devide) setTrainDevideDet(data.train_devide);
      if (data.dev_j) {
        setDevJ(data.dev_j);
        addDevJResult(volume, data.dev_j);
        setSelectedVolume(volume);
      }
    },
  });

  /* ── pierwszy request train_devide ─────────────────────────── */
  useEffect(() => {
    const triangle =
      useTrainDevideStoreDetIncurred.getState().incurredTriangle;

    if (!triangle || triangle.length === 0) return;

    if (!trainDevideDet || trainDevideDet.length === 0) {
      mutationTrainDevide.mutate();
    }
  }, [trainDevideDet]);

  /* ── brak trójkąta? ───────────────────────────────────────── */
  const triangle = useTrainDevideStoreDetIncurred((s) => s.incurredTriangle);

  if (!triangle || triangle.length === 0) {
    return (
      <div className="p-6 text-yellow-300">
        ⏳ Oczekiwanie na dane wejściowe <code>incurredTriangle</code>…
      </div>
    );
  }

  /* ── RENDER ───────────────────────────────────────────────── */
  return (
    <div className="flex flex-row p-6 text-white gap-6">
<SidebarPanelCLIncurred
  onCalculate={() => mutationCL.mutate()}
  devJResults={devJResults}
/>

      <div className="w-3/4">
        <h2 className="text-xl font-bold mb-4">
          Współczynniki CL&nbsp;(Train Devide – Incurred)
        </h2>

        {trainDevideDet && trainDevideDet[0] ? (
          <>
            <TableDataDetIncurred
              data={[
                [''].concat(trainDevideDet[0].map((_, i) => i.toString())),
                ...trainDevideDet.map((row, i) => [
                  i.toString(),
                  ...row.map((c) => c ?? ''),
                ]),
              ]}
              weights={selectedWeightsDet}
              selectedCells={selectedCellsDet}
            />

            {devJResults.length > 0 && (
              <div className="mt-10">
                <h3 className="font-bold text-white mb-2">
                  Porównanie współczynników <code>dev_j</code> (różne volume):
                </h3>

                <DevjTableIncurred
                  devJResults={devJResults}
                  selectedVolume={selectedVolume}
                  onSelectVolume={setSelectedVolume}
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-yellow-400">
            Brak wyników obliczeń współczynników
          </p>
        )}
      </div>
    </div>
  );
}
