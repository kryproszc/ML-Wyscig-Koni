'use client';

import { useEffect } from 'react';
import { TableDataDet } from '@/components/TableDataDet';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '@/app/_components/useUserStore';
import {
  useTrainDevideStoreDet,
  type TrainDevideStoreDet,
} from '@/stores/trainDevideStoreDeterministyczny';
import SidebarPanelCL from './SidebarPanelCL';
import DevjTable from './DevjTable';




export default function PaidCLCoefficients() {
  const userId = useUserStore((s) => s.userId);

  const selectedVolume     = useTrainDevideStoreDet((s) => s.selectedDevJVolume);
  const setSelectedVolume  = useTrainDevideStoreDet((s) => s.setSelectedDevJVolume);

  const trainDevideDet     = useTrainDevideStoreDet((s) => s.trainDevideDet);
  const selectedWeightsDet = useTrainDevideStoreDet((s) => s.selectedWeightsDet);
  const selectedCellsDet   = useTrainDevideStoreDet((s) => s.selectedCellsDet);
  const volume             = useTrainDevideStoreDet((s) => s.volume);
  const devJResults        = useTrainDevideStoreDet((s) => s.devJResults);

  const setTrainDevideDet  = useTrainDevideStoreDet((s) => s.setTrainDevideDet);
  const setDevJ            = useTrainDevideStoreDet((s) => s.setDevJ);
  const addDevJResult      = useTrainDevideStoreDet((s) => s.addDevJResult);

const mutationTrainDevide = useMutation({
  mutationFn: async () => {
    const rawTriangle = useTrainDevideStoreDet.getState().paidTriangle ?? [];

    // 🟡 Pomijamy pierwszy wiersz
    const triangle = rawTriangle.slice(1);

    console.log("[mutationTrainDevide] Wysyłane dane do API:");
    console.log(JSON.stringify({
      user_id: userId,
      paid_data_det: triangle,
    }, null, 2));

    const res = await fetch('http://localhost:8000/calc/paid/train_devide_paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        paid_data_det: triangle,
      }),
    });

    return res.json() as Promise<{ train_devide?: number[][] }>;
  },

  onSuccess: (data) => {
    if (data.train_devide) {
      setTrainDevideDet(data.train_devide);
      console.log('[mutationTrainDevide] Otrzymano dane:', data.train_devide);
    } else {
      console.warn('[mutationTrainDevide] Brak danych train_devide w odpowiedzi!');
    }
  },
});




  // ✅ 2. mutationCL – jak wcześniej
  const mutationCL = useMutation({
    mutationFn: async () => {
const triangle = useTrainDevideStoreDet.getState().paidTriangle ?? [];
      const safeWeights: number[][] =
        selectedWeightsDet?.map((row) => row.map((c) => (c === 1 ? 1 : 0))) ?? [];

      const res = await fetch('http://localhost:8000/calc/paid/cl', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          user_id       : userId,
          paid_data_det : triangle,
          weights       : safeWeights,
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

useEffect(() => {
  const triangle = useTrainDevideStoreDet.getState().paidTriangle;

  if (!triangle || triangle.length === 0) {
    console.warn("[CL] Brak paidTriangle – czekam.");
    return;
  }

  if (!trainDevideDet || trainDevideDet.length === 0) {
    console.log("[CL] Dane gotowe – odpalam mutationTrainDevide");
    mutationTrainDevide.mutate();
  }
}, [trainDevideDet]);
const triangle = useTrainDevideStoreDet((s) => s.paidTriangle);

if (!triangle || triangle.length === 0) {
  return (
    <div className="p-6 text-yellow-300">
      ⏳ Oczekiwanie na dane wejściowe <code>paidTriangle</code>...
    </div>
  );
}

  /* ——— RENDER ——— */
  return (
    <div className="flex flex-row p-6 text-white gap-6">
      <SidebarPanelCL
        onCalculate={() => mutationCL.mutate()}
        devJResults={devJResults}
      />

      <div className="w-3/4">
        <h2 className="text-xl font-bold mb-4">
          Współczynniki CL&nbsp;(Train Devide)
        </h2>

        {trainDevideDet && trainDevideDet[0] ? (
          <>
            <TableDataDet
              data={[
                [''].concat(trainDevideDet[0].map((_, i) => i.toString())),
                ...trainDevideDet.map((row, i) => [
                  i.toString(),
                  ...row.map((cell) => cell ?? ''),
                ]),
              ]}
              weights={selectedWeightsDet}
              selectedCells={selectedCellsDet}
            />

            {devJResults.length > 0 && (
              <div className="mt-10">
                <h3 className="font-bold text-white mb-2">
                  Porównanie współczynników&nbsp;
                  <code>dev_j</code>&nbsp;(dla różnych volume):
                </h3>
                <DevjTable
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
