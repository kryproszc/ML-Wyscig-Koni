/* -------------------------------------------------------------------------- */
/*                         DevJSelectorIncurred.tsx                           */
/* -------------------------------------------------------------------------- */

'use client';

import React, { useEffect, useState, useMemo } from 'react';

/* ▼ STORE INCURRED ► */
import {
  useTrainDevideStoreDetIncurred,
  type TrainDevideStoreDetIncurred,
} from '@/stores/trainDevideStoreDeterministycznyIncurred';

import { useUserStore } from '@/app/_components/useUserStore';
import Modal from '@/components/Modal';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DevJSelectorIncurred() {
  /* ──────────────────────────── STORE ──────────────────────────── */
  const {
    devPreviewCandidate,
    setDevPreviewCandidate,
    devJPreview,
    setDevJPreview,

    devFinalCustom,
    finalDevVector,

    selectedDevJIndexes,
    setSelectedDevJIndexes,

    r2Scores,
    setR2Scores,
    simResults,
    setSimResults,
    clearR2Scores,
    clearSimResults,
  } = useTrainDevideStoreDetIncurred();

  const userId = useUserStore((s) => s.userId);

  /* ────────────────────── AKTUALNY WEKTOR ─────────────────────── */
  const currentVector = useMemo<number[]>(() => {
    const merged = [...finalDevVector];
    (Object.entries(devFinalCustom ?? {}) as [
      string,
      TrainDevideStoreDetIncurred['devFinalCustom'][number],
    ][]).forEach(([idxStr, cell]) => {
      merged[Number(idxStr)] = cell.value;
    });
    return merged;
  }, [finalDevVector, devFinalCustom]);

  /* ─────────────────────────── STATE ──────────────────────────── */
  const [tailCount, setTailCount] = useState<number | ''>('');
  const [isConfirmUpdateOpen, setIsConfirmUpdateOpen] = useState(false);
  const [dpRange, setDpRange] = useState<[number, number]>([1, 13]);
  const [selectedCurves, setSelectedCurves] = useState<string[]>([
    'Exponential',
    'Weibull',
    'Power',
    'Inverse Power',
    'dev_j',
  ]);

  /* ───────────────────────── HANDLERS ─────────────────────────── */
  const openUpdateModal = () => {
    if (!currentVector.length) return;
    setDevPreviewCandidate(currentVector);
    setIsConfirmUpdateOpen(true);
  };

  const confirmUpdate = () => {
    setIsConfirmUpdateOpen(false);
    if (!devPreviewCandidate?.length) return;

    setDevJPreview(devPreviewCandidate);

    /* zaznaczamy j‑indeksy > 1 */
    const idxs = devPreviewCandidate
      .map((v, i) => (v > 1 ? i : -1))
      .filter((i) => i >= 0);
    setSelectedDevJIndexes(idxs);

    clearSimResults();
    clearR2Scores();
  };

  const toggleIndex = (index: number) => {
    if (!Array.isArray(devJPreview)) return;
    const v = devJPreview[index];
    if (v === undefined || v <= 1) return;

    const next = selectedDevJIndexes.includes(index)
      ? selectedDevJIndexes.filter((i) => i !== index)
      : [...selectedDevJIndexes, index];

    setSelectedDevJIndexes(next);
  };

  const handleSendToBackend = () => {
    if (!devJPreview || !userId || selectedDevJIndexes.length === 0) return;

    const validIndexes = selectedDevJIndexes
      .filter((i) => devJPreview[i]! > 1)
      .sort((a, b) => a - b);
    if (!validIndexes.length) return;

    const selVals = validIndexes.map((i) => devJPreview[i]!);

    fetch('http://localhost:8000/calc/incurred/selected_dev_j', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selected_dev_j: selVals,
        selected_indexes: validIndexes,
        tail_values: tailCount === '' ? null : [Number(tailCount)],
        user_id: userId,
        full_dev_j: devJPreview,
      }),
    })
      .then((r) => r.json())
      .then(({ simulation_results, r2_scores }) => {
        /* ► symulacje */
        const trs: Record<string, Record<string, number>> = {};
        Object.entries(simulation_results).forEach(([dpKey, curves]) => {
          Object.entries(curves as Record<string, number>).forEach(
            ([curve, val]) => {
              if (!trs[curve]) trs[curve] = {};
              trs[curve][dpKey] = val;
            },
          );
        });
        setSimResults(trs);

        /* ► R² */
        const r2: Record<string, number> = {};
        Object.entries(r2_scores ?? {}).forEach(([curve, obj]) => {
          const value = (obj as any)['Wartość'];
          r2[curve] = typeof value === 'number' ? value : Number(value);
        });
        setR2Scores(r2);
      })
      .catch((e) => console.error('❌ Błąd wysyłki:', e));
  };

  /* ───────────────────────── EFFECTS ─────────────────────────── */
/* ----------------------- EFFECTS ----------------------- */
useEffect(() => {
  if (!simResults) return;               // brak danych → stop
  const keys = Object.keys(simResults);  // wszystkie krzywe
  if (!keys.length) return;              // pusta mapa → stop

  const firstKey = keys[0] as keyof typeof simResults;      // <- bezpieczny klucz
  const sampleCurve = simResults[firstKey] ?? {};           // ← Record<string, number>

  const nums = Object.keys(sampleCurve)
    .map((k) => parseInt(k.replace('dp: ', ''), 10))
    .filter((n) => !isNaN(n));

  if (nums.length) setDpRange([Math.min(...nums), Math.max(...nums)]);
}, [simResults]);


  /* ─────────────────────────── RENDER ────────────────────────── */
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 text-white overflow-x-hidden">
      {/* --------- PANEL STEROWANIA --------- */}
      <div className="bg-gray-800 p-4 rounded-xl w-full lg:w-64 h-fit shadow-lg shrink-0">
        <h3 className="text-lg font-semibold mb-4">Panel sterowania</h3>

        <button
          onClick={openUpdateModal}
          disabled={!currentVector.length}
          className="w-full mb-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
        >
          Zaktualizuj wektor
        </button>

        <div className="mb-3">
          <label className="block text-sm mb-1">Ile obserwacji w ogonie:</label>
          <input
            type="number"
            min={0}
            value={tailCount}
            onChange={(e) =>
              setTailCount(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="w-full px-2 py-1 text-white bg-gray-700 rounded"
            placeholder="np. 2"
          />
        </div>

        <button
          onClick={handleSendToBackend}
          disabled={selectedDevJIndexes.length === 0}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
        >
          Wyślij wybrane
        </button>
      </div>

      {/* --------- PRAWA CZĘŚĆ --------- */}
      <div className="flex-1 flex flex-col gap-8 overflow-hidden">
        {/* ‑‑‑‑‑ Finalny wektor ‑‑‑‑‑ */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-center">
            Finalny wektor <code>dev_j</code>
          </h2>

          {Array.isArray(devJPreview) ? (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-max border-collapse bg-gray-900 rounded-xl shadow-md text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800">
                      -
                    </th>
                    {devJPreview.map((_, i) => (
                      <th
                        key={i}
                        className="border border-gray-700 px-3 py-2 bg-gray-800"
                      >
                        {i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-700 px-3 py-2 bg-gray-800">
                      0
                    </td>
                    {devJPreview.map((v, i) => {
                      const selectable = v > 1;
                      const sel = selectedDevJIndexes.includes(i);
                      return (
                        <td
                          key={i}
                          onClick={() => toggleIndex(i)}
                          className={`border border-gray-700 px-3 py-2 text-center transition ${
                            selectable
                              ? sel
                                ? 'bg-green-300 text-black font-semibold cursor-pointer'
                                : 'bg-gray-800 hover:bg-gray-700 cursor-pointer'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {v.toFixed(6)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-yellow-400">Wczytywanie wektora…</p>
          )}
        </div>

        {/* ‑‑‑‑‑ Tabela symulacji CL ‑‑‑‑‑ */}
        {simResults && (
          <div className="w-full">
            <h2 className="text-xl font-bold mb-4 text-center">
              Symulacja krzywych CL
            </h2>
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 sticky left-0">
                      Krzywa
                    </th>
                    {Object.keys(Object.values(simResults)[0] as Record<string, number>).map(
                      (dp) => (
                        <th
                          key={dp}
                          className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px]"
                        >
                          {dp}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(simResults).map(([curve, vals]) => (
                    <tr key={curve}>
                      <td className="border border-gray-700 px-3 py-2 bg-gray-800 sticky left-0">
                        {curve}
                      </td>
                      {Object.values(vals).map((v, i) => (
                        <td
                          key={i}
                          className="border border-gray-700 px-3 py-2 text-center w-[80px]"
                        >
                          {Number(v).toFixed(6)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ‑‑‑‑‑ R2 ‑‑‑‑‑ */}
        {r2Scores && (
          <div className="w-full">
            <h2 className="text-xl font-bold mb-4 text-center">
              R² dopasowania krzywych
            </h2>
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 sticky left-0">
                      Krzywa
                    </th>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 w-[120px]">
                      R²
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(r2Scores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([curve, val]) => (
                      <tr key={curve}>
                        <td className="border border-gray-700 px-3 py-2 bg-gray-800 sticky left-0">
                          {curve}
                        </td>
                        <td className="border border-gray-700 px-3 py-2 text-center">
                          {val.toFixed(6)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ‑‑‑‑‑ Zakres dp ‑‑‑‑‑ */}
        <div className="mb-4 flex flex-col lg:flex-row items-center gap-4">
          <label className="text-sm font-medium">Zakres dp:</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={dpRange[0]}
              onChange={(e) =>
                setDpRange([Number(e.target.value), dpRange[1]])
              }
              className="bg-gray-700 text-white px-2 py-1 rounded w-20"
            />
            <span className="text-sm">do</span>
            <input
              type="number"
              min={1}
              value={dpRange[1]}
              onChange={(e) =>
                setDpRange([dpRange[0], Number(e.target.value)])
              }
              className="bg-gray-700 text-white px-2 py-1 rounded w-20"
            />
          </div>
        </div>

        {/* ‑‑‑‑‑ Wybór krzywych ‑‑‑‑‑ */}
        <div className="flex flex-wrap gap-4 items-center text-sm">
          {['Exponential', 'Weibull', 'Power', 'Inverse Power', 'dev_j'].map(
            (c) => (
              <label key={c} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedCurves.includes(c)}
                  onChange={() =>
                    setSelectedCurves((prev) =>
                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                    )
                  }
                />
                {c}
              </label>
            ),
          )}
        </div>

        {/* ‑‑‑‑‑ Wykres ‑‑‑‑‑ */}
        {simResults && (
          <div className="w-full h-[400px] mt-4">
            <h2 className="text-xl font-bold mb-4 text-center">
              Wykres symulacji krzywych CL
            </h2>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(() => {
                  const firstCurve = Object.values(simResults)[0] as Record<
                    string,
                    number
                  >;
                  const allDp = Object.keys(firstCurve);

                  return allDp
                    .filter((dp) => {
                      const n = parseInt(dp.replace('dp: ', ''), 10);
                      return n >= dpRange[0] && n <= dpRange[1];
                    })
                    .map((dp) => {
                      const point: Record<string, number | string> = { dp };
                      for (const curve in simResults) {
                        point[curve] = (
                          simResults[curve] as Record<string, number>
                        )[dp] ?? 0;
                      }
                      const n = parseInt(dp.replace('dp: ', ''), 10);
                      const dev = devJPreview?.[n - 1];
                      if (typeof dev === 'number') point['dev_j'] = dev;
                      return point;
                    });
                })()}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                style={{ backgroundColor: '#1a1a2e', borderRadius: '12px' }}
              >
                <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                <XAxis
                  dataKey="dp"
                  stroke="#ccc"
                  interval={0}
                  tick={{ fill: '#ccc', fontSize: 12 }}
                />
                <YAxis stroke="#ccc" domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2c2c3e', borderColor: '#666' }}
                  labelStyle={{ color: '#aaa' }}
                />
                <Legend verticalAlign="bottom" height={50} wrapperStyle={{ paddingTop: 20 }} />

                {selectedCurves.includes('Exponential') && (
                  <Line
                    type="monotone"
                    dataKey="Exponential"
                    stroke="#4f8bff"
                    strokeWidth={2}
                    dot={{ stroke: '#4f8bff', strokeWidth: 1.5, r: 4, fill: '#1a1a2e' }}
                  />
                )}
                {selectedCurves.includes('Weibull') && (
                  <Line
                    type="monotone"
                    dataKey="Weibull"
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    dot={{ stroke: '#2dd4bf', strokeWidth: 1.5, r: 4, fill: '#1a1a2e' }}
                  />
                )}
                {selectedCurves.includes('Power') && (
                  <Line
                    type="monotone"
                    dataKey="Power"
                    stroke="#facc15"
                    strokeWidth={2}
                    dot={{ stroke: '#facc15', strokeWidth: 1.5, r: 4, fill: '#1a1a2e' }}
                  />
                )}
                {selectedCurves.includes('Inverse Power') && (
                  <Line
                    type="monotone"
                    dataKey="Inverse Power"
                    stroke="#f87171"
                    strokeWidth={2}
                    dot={{ stroke: '#f87171', strokeWidth: 1.5, r: 4, fill: '#1a1a2e' }}
                  />
                )}
                {selectedCurves.includes('dev_j') && (
                  <Line
                    type="monotone"
                    dataKey="dev_j"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ stroke: '#ef4444', strokeWidth: 2, r: 5, fill: '#1a1a2e' }}
                    name="dev_j (wejściowy)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* --------- MODAL --------- */}
      <Modal
        title="Aktualizacja wektora"
        message="Czy na pewno chcesz zaktualizować wektor?"
        isOpen={isConfirmUpdateOpen}
        onCancel={() => setIsConfirmUpdateOpen(false)}
        onConfirm={confirmUpdate}
      />
    </div>
  );
}
