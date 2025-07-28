'use client';

import { useCallback, useState } from 'react';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';
import Modal from '@/components/Modal';
import { ComparisonTable } from './ComparisonTable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function PaidWyniki() {
  const [showModal, setShowModal] = useState(false);

  /* ---------- STORE ---------- */
  const removeComparisonTable = useTrainDevideStoreDet((s) => s.removeComparisonTable);

  const selectedA            = useTrainDevideStoreDet((s) => s.selectedDataA);
  const selectedB            = useTrainDevideStoreDet((s) => s.selectedDataB);
  const setSelectedA         = useTrainDevideStoreDet((s) => s.setSelectedDataA);
  const setSelectedB         = useTrainDevideStoreDet((s) => s.setSelectedDataB);

  const simResults           = useTrainDevideStoreDet((s) => s.simResults)        ?? {};
  const devJResults          = useTrainDevideStoreDet((s) => s.devJResults)       ?? [];
  const finalDevVector       = useTrainDevideStoreDet((s) => s.finalDevVector)    ?? [];
  const combinedDevJSummary  = useTrainDevideStoreDet((s) => s.combinedDevJSummary) ?? [];

  const comparisonTables     = useTrainDevideStoreDet((s) => s.comparisonTables);
  const addComparisonTable   = useTrainDevideStoreDet((s) => s.addComparisonTable);
  const clearComparisonTables= useTrainDevideStoreDet((s) => s.clearComparisonTables);

  /* ---------- OPCJE SELECTA ---------- */
  const allOptions = [
    ...Object.keys(simResults).map((curve) => ({
      type: 'curve',
      label: `Krzywa: ${curve}`,
      key: `curve-${curve}`,
    })),
    ...devJResults.map((d, i) => ({
      type: 'volume',
      label: `Volume ${d.volume}${d.subIndex !== undefined ? ` (v${d.subIndex + 1})` : ''}`,
      key: `volume-${d.volume}-${d.subIndex ?? 0}`,
    })),

    ...(combinedDevJSummary.length > 0
      ? [{ type: 'devj', label: 'Pozostawione dev_j (combined)', key: 'final-dev-j' }]
      : []),
    ...(finalDevVector.length > 0
      ? [{ type: 'devj_raw', label: 'Raw finalDevVector', key: 'final-dev-raw' }]
      : []),
  ];

  const keyToLabelMap = Object.fromEntries(allOptions.map((o) => [o.key, o.label]));

  /* ---------- BUDOWANIE PAYLOADÓW ---------- */
  const buildPayload = (key: string | null): any | null => {
    if (!key) return null;

    if (key.startsWith('curve-')) {
      const curve = key.replace('curve-', '');
      const raw   = simResults[curve];
      if (!raw) return null;
      const coeffs = Object.values(raw).filter(
        (v): v is number => typeof v === 'number' && Number.isFinite(v),
      );
      return { curve_name: curve, coeffs };
    }

    if (key.startsWith('volume-')) {
      const vol = parseInt(key.replace('volume-', ''), 10);
      const found = devJResults.find((v) => v.volume === vol);
      return found ? { volume: found.volume, values: found.values } : null;
    }

    if (key === 'final-dev-j') {
      const cleaned = combinedDevJSummary
        .map((v) => {
          const n = parseFloat(String(v));
          return Number.isFinite(n) ? n : null;
        })
        .filter((v): v is number => v !== null);
      return { final_dev_vector: cleaned };
    }

    if (key === 'final-dev-raw') {
      return { final_dev_vector: finalDevVector };
    }

    return null;
  };

  /* ---------- WYSYŁKA DANYCH ---------- */
  const handleSend = useCallback(async () => {
    if (!selectedA || !selectedB) {
      setShowModal(true);
      return;
    }

    const triangle   = useTrainDevideStoreDet.getState().paidTriangle ?? [];
    const coeff_sets = [selectedA, selectedB].map(buildPayload).filter(Boolean);

    const payload = { paid_data_det: triangle, coeff_sets };

    try {
      const res = await fetch(`${API}/calc/paid/save_vector`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`❌ Błąd: ${res.status}`);
      const json = await res.json();
      console.log('✅ Odpowiedź:', json);

      if (json.comparison) {
        addComparisonTable({
          data  : json.comparison,
          labelA: keyToLabelMap[selectedA] ?? 'Projection A',
          labelB: keyToLabelMap[selectedB] ?? 'Projection B',
        });
      }
    } catch (err) {
      console.error('❌ Błąd wysyłki:', err);
    }
  }, [selectedA, selectedB, simResults, devJResults, finalDevVector, combinedDevJSummary]);

  /* ---------- EXPORT DO EXCELA ---------- */
  const handleExportToExcel = () => {
    if (comparisonTables.length === 0) return;

    const wb = XLSX.utils.book_new();

    comparisonTables.forEach((entry, idx) => {
      const renamed = entry.data.map((row) => {
        const obj: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          let newKey = k;
          if (k === 'Projection A') newKey = entry.labelA;
          if (k === 'Projection B') newKey = entry.labelB;
          const parsed =
            typeof v === 'string' && v.match(/^-?\d+([,\.]\d+)?$/)
              ? parseFloat(v.replace(',', '.'))
              : v;
          obj[newKey] = parsed;
        }
        return obj;
      });

      const sheet = XLSX.utils.json_to_sheet(renamed);
const baseName = `${entry.labelA} vs ${entry.labelB}`
  .replace(/[:\/\\\?\*\[\]]/g, '-')
  .substring(0, 25); // trochę krócej, by zmieścić numer

// dodaj licznik, jeśli nazwa się powtarza
let safe = baseName;
let sheetIndex = 1;
while (wb.SheetNames.includes(safe)) {
  safe = `${baseName}-${sheetIndex}`;
  sheetIndex++;
}


      XLSX.utils.book_append_sheet(wb, sheet, safe || `Porównanie ${idx + 1}`);
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'porownania_paid.xlsx',
    );
  };

  /* ---------- UI ---------- */
  return (
    <div className="grid grid-cols-[300px_1fr] p-6 gap-10 text-white">
      {/* Lewa kolumna */}
      <div className="flex flex-col gap-6 max-w-md w-full">
        <h2 className="text-lg font-semibold">Wybierz dane do wysłania</h2>

        <select
          className="bg-gray-700 text-white rounded p-2"
          onChange={(e) => setSelectedA(e.target.value || null)}
          value={selectedA || ''}
        >
          <option value="">-- Wybierz dane A --</option>
          {allOptions.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className="bg-gray-700 text-white rounded p-2"
          onChange={(e) => setSelectedB(e.target.value || null)}
          value={selectedB || ''}
        >
          <option value="">-- Wybierz dane B --</option>
          {allOptions.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          onClick={handleSend}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 font-semibold transition"
        >
          📤 Wyślij dane
        </button>

        <button
          onClick={clearComparisonTables}
          className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 font-semibold transition"
        >
          🧹 Wyczyść porównania
        </button>

        <button
          onClick={handleExportToExcel}
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 font-semibold transition"
        >
          📁 Eksportuj do Excela
        </button>

        <Modal
          isOpen={showModal}
          title="Wymagane dane"
          message="Aby wysłać dane, musisz wybrać dwa współczynniki (A i B)."
          onCancel={() => setShowModal(false)}
          onlyOk
        />

        <div className="text-sm text-gray-300 pt-6">
          Widok: <strong>Metoda Paid</strong>, krok: <strong>Wyniki</strong>
        </div>
      </div>

      {/* Prawa kolumna */}
      <div className="flex-1 overflow-auto flex flex-col gap-10">
        {comparisonTables.map((entry, idx) => (
          <div key={idx} className="relative">
            <button
              onClick={() => removeComparisonTable(idx)}
              className="absolute top-0 right-0 text-red-500 hover:text-red-700 text-xl p-2"
              title="Usuń porównanie"
            >
              ❌
            </button>

            <ComparisonTable
              data={entry.data}
              labelA={entry.labelA}
              labelB={entry.labelB}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
