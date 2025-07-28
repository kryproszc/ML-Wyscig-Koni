'use client';

import { useCallback, useState } from 'react';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function PaidWyniki() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Uwaga: usuwamy fallbacki typu `|| {}` itp.
  const simResultsRaw = useTrainDevideStoreDet((s) => s.simResults);
  const devJResultsRaw = useTrainDevideStoreDet((s) => s.devJResults);
  const finalDevVectorRaw = useTrainDevideStoreDet((s) => s.finalDevVector);
  const combinedDevJSummaryRaw = useTrainDevideStoreDet((s) => s.combinedDevJSummary);

  // Tworzymy bezpieczne fallbacki POZA hookiem
  const simResults = simResultsRaw ?? {};
  const devJResults = devJResultsRaw ?? [];
  const finalDevVector = finalDevVectorRaw ?? [];
  const combinedDevJSummary = combinedDevJSummaryRaw ?? [];

const allOptions = [
  ...Object.keys(simResults).map((curve) => ({
    type: 'curve',
    label: `Krzywa: ${curve}`,
    key: `curve-${curve}`,
  })),
  ...devJResults
    .filter((d) => Array.isArray(d.values) && d.values.length > 0)
    .map((d) => ({
      type: 'volume',
      label: `Volume ${d.volume}`,
      key: `volume-${d.volume}`,
    })),
  ...(combinedDevJSummary.length > 0
    ? [{
        type: 'devj',
        label: 'Pozostawione dev_j (combinedDevJSummary)',
        key: 'final-dev-j',
      }]
    : []),
  ...(finalDevVector.length > 0
    ? [{
        type: 'devj_raw',
        label: 'Raw finalDevVector (bez nadpisań)',
        key: 'final-dev-raw',
      }]
    : []),
];


  const handleSend = useCallback(async () => {
    if (!selectedKey) return;

    let payload: any = {};
if (selectedKey.startsWith('volume-')) {
  const volumeNum = parseInt(selectedKey.replace('volume-', ''));
  const found = devJResults.find((v) => v.volume === volumeNum);
  if (!found || !Array.isArray(found.values) || found.values.length === 0) {
    console.warn('Brak danych do wysyłki dla volume:', volumeNum);
    return;
  }
  payload = {
    volume: found.volume,
    values: found.values,
  };
}

    if (selectedKey.startsWith('curve-')) {
      const curveName = selectedKey.replace('curve-', '');
      const rawCoeffs = simResults[curveName];
      if (!rawCoeffs) return;
      const coeffs = Object.values(rawCoeffs).filter(
        (v): v is number => typeof v === 'number' && Number.isFinite(v)
      );
      payload = {
        curve_name: curveName,
        coeffs,
      };
    } else if (selectedKey.startsWith('volume-')) {
      const volumeNum = parseInt(selectedKey.replace('volume-', ''));
      const found = devJResults.find((v) => v.volume === volumeNum);
      if (!found) return;
      payload = {
        volume: found.volume,
        values: found.values,
      };
    } else if (selectedKey === 'final-dev-j') {
      const cleaned = combinedDevJSummary
        .map((v) => {
          const parsed = parseFloat(String(v));
          return Number.isFinite(parsed) ? parsed : null;
        })
        .filter((v): v is number => v !== null);

      payload = {
        final_dev_vector: cleaned,
      };
    } else if (selectedKey === 'final-dev-raw') {
      payload = {
        final_dev_vector: finalDevVector,
      };
    } else {
      console.warn('Nieznany typ danych');
      return;
    }

    console.log('⬆️ Payload wysyłany do backendu:', payload);

    try {
      const res = await fetch(`${API}/calc/paid/save_vector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      console.log('✅ Wysłano:', data);
    } catch (err) {
      console.error('❌ Błąd wysyłki:', err);
    }
  }, [selectedKey, simResults, devJResults, finalDevVector, combinedDevJSummary]);

  return (
    <div className="flex flex-col p-6 text-white gap-6 max-w-md">
      <h2 className="text-lg font-semibold">Wybierz dane do wysłania</h2>

<select
  className="bg-gray-600 text-white border border-gray-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
  onChange={(e) => setSelectedKey(e.target.value || null)}
  value={selectedKey || ''}
>
  <option value="">-- Wybierz krzywą, volume lub dev_j --</option>
  {allOptions.map((opt) => (
    <option key={opt.key} value={opt.key}>
      {opt.label}
    </option>
  ))}
</select>


      <button
        onClick={handleSend}
        disabled={!selectedKey}
        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 font-semibold transition disabled:opacity-50"
      >
        📤 Wyślij dane
      </button>

      {/* Podgląd wysyłanych danych */}
      {selectedKey === 'final-dev-j' && (
        <div className="mt-4 text-sm text-white">
          <h3 className="font-semibold mb-2">Podgląd combinedDevJSummary (z nadpisaniami):</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {combinedDevJSummary.map((val, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-700 rounded">
                j={idx}: {typeof val === 'number' ? val.toFixed(6) : '-'}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedKey === 'final-dev-raw' && (
        <div className="mt-4 text-sm text-white">
          <h3 className="font-semibold mb-2">Podgląd finalDevVector (czysty):</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {finalDevVector.map((val, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-700 rounded">
                j={idx}: {Number(val).toFixed(6)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-300 pt-6">
        Widok: <strong>Metoda Paid</strong>, krok: <strong>Wyniki</strong>
      </div>
    </div>
  );
}
