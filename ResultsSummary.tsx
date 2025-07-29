/* ------------------------------------------------------------------ */
/*                        ResultsSummary.tsx                          */
/* ------------------------------------------------------------------ */
'use client';

import { useCallback, useMemo, useState } from 'react';
import Modal from '@/components/Modal';

import { useTrainDevideStoreDet }         from '@/stores/trainDevideStoreDeterministyczny';
import { useTrainDevideStoreDetIncurred } from '@/stores/trainDevideStoreDeterministycznyIncurred';
import { useTrainDevideStoreSummary }     from '@/stores/trainDevideStoreSummary';
import WeightedTable                      from '@/components/WeightedTable';

/* ---------- helpers ---------- */
type DevJ = { volume: number; values: number[]; subIndex?: number };
type Sim  = Record<string, Record<string, number>>;

const buildPayload = (
  key: string | null,
  simResults: Sim,
  devJResults: DevJ[],
  finalDevVector: number[],
  combinedDevJSummary: (number | string)[],
) => {
  if (!key) return null;

  /* 1. krzywa CL */
  if (key.startsWith('curve-')) {
    const curve = key.replace('curve-', '');
    const raw   = simResults[curve];
    if (!raw) return null;
    const coeffs = Object.values(raw).filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v),
    );
    return { curve_name: curve, coeffs };
  }

  /* 2. dev_j z volume */
  if (key.startsWith('volume-')) {
    const [, volStr] = key.split('-');
    const vol  = Number(volStr);
    const item = devJResults.find(v => v.volume === vol);
    return item ? { volume: item.volume, values: item.values } : null;
  }

  /* 3. combined / raw */
  if (key === 'final-dev-j') {
    const cleaned = combinedDevJSummary
      .map(Number)
      .filter(v => Number.isFinite(v));
    return { final_dev_vector: cleaned };
  }
  if (key === 'final-dev-raw') {
    return { final_dev_vector: finalDevVector };
  }

  return null;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/* =====================  COMPONENT  ===================== */
export default function ResultsSummary() {
  /* ----- store Paid ----- */
  const simPaid   = useTrainDevideStoreDet(s => s.simResults)          ?? {};
  const devJPaid  = useTrainDevideStoreDet(s => s.devJResults)         ?? [];
  const finalPaid = useTrainDevideStoreDet(s => s.finalDevVector)      ?? [];
  const combPaid  = useTrainDevideStoreDet(s => s.combinedDevJSummary) ?? [];

  /* ----- store Incurred ----- */
  const simInc   = useTrainDevideStoreDetIncurred(s => s.simResults)          ?? {};
  const devJInc  = useTrainDevideStoreDetIncurred(s => s.devJResults)         ?? [];
  const finalInc = useTrainDevideStoreDetIncurred(s => s.finalDevVector)      ?? [];
  const combInc  = useTrainDevideStoreDetIncurred(s => s.combinedDevJSummary) ?? [];

  /* ----- Summary store ----- */
  const {
    selectedPaid,
    selectedIncurred,
    setSelectedPaid,
    setSelectedIncurred,

    comparisonRows,
    setComparisonRows,
  } = useTrainDevideStoreSummary();

  /* ----- modal ----- */
  const [showModal, setShowModal] = useState(false);

  /* ----- dropdown Paid ----- */
  const paidOptions = useMemo(() => [
    ...Object.keys(simPaid).map(c => ({
      key: `curve-${c}`, label: `Paid → krzywa ${c}`,
    })),
    ...devJPaid.map(d => ({
      key: `volume-${d.volume}-${d.subIndex ?? 0}`,
      label: `Paid → volume ${d.volume}${d.subIndex !== undefined ? ` (v${d.subIndex + 1})` : ''}`,
    })),
    ...(combPaid.length  ? [{ key: 'final-dev-j',  label: 'Paid → combined dev_j' }] : []),
    ...(finalPaid.length ? [{ key: 'final-dev-raw', label: 'Paid → raw dev_j'      }] : []),
  ], [simPaid, devJPaid, combPaid, finalPaid]);

  /* ----- dropdown Incurred ----- */
  const incurredOptions = useMemo(() => [
    ...Object.keys(simInc).map(c => ({
      key: `curve-${c}`, label: `Incurred → krzywa ${c}`,
    })),
    ...devJInc.map(d => ({
      key: `volume-${d.volume}-${d.subIndex ?? 0}`,
      label: `Incurred → volume ${d.volume}${d.subIndex !== undefined ? ` (v${d.subIndex + 1})` : ''}`,
    })),
    ...(combInc.length  ? [{ key: 'final-dev-j',  label: 'Incurred → combined dev_j' }] : []),
    ...(finalInc.length ? [{ key: 'final-dev-raw', label: 'Incurred → raw dev_j'      }] : []),
  ], [simInc, devJInc, combInc, finalInc]);

  /* ----- wysyłka ----- */
  const handleSend = useCallback(async () => {
    if (!selectedPaid || !selectedIncurred) {
      setShowModal(true);
      return;
    }

    const paidTriangle = useTrainDevideStoreDet.getState().paidTriangle          ?? [];
    const incTriangle  = useTrainDevideStoreDetIncurred.getState().incurredTriangle ?? [];

    const paidCoeff = buildPayload(selectedPaid,  simPaid, devJPaid, finalPaid, combPaid);
    const incCoeff  = buildPayload(selectedIncurred, simInc, devJInc, finalInc, combInc);

    if (!paidCoeff || !incCoeff) {
      console.error('❌ Nie udało się zbudować zestawów współczynników.');
      return;
    }

    const payload = {
      paid_data_det     : paidTriangle,
      incurred_data_det : incTriangle,
      paid_coeff_set    : paidCoeff,
      incurred_coeff_set: incCoeff,
    };

    try {
      const res = await fetch(`${API}/calc/summary/save_vector`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);

      const json = await res.json();
      if (json.comparison) setComparisonRows(json.comparison);
    } catch (e) {
      console.error('❌ Błąd wysyłki:', e);
    }
  }, [
    selectedPaid, selectedIncurred,
    simPaid, devJPaid, finalPaid, combPaid,
    simInc,  devJInc,  finalInc,  combInc,
    setComparisonRows,
  ]);

  /* ====================== UI ====================== */
  return (
    <div className="grid grid-cols-[300px_1fr] gap-10 p-6 text-white">
      {/* ────── lewa kolumna ────── */}
      <div className="flex flex-col gap-6 w-full max-w-md">
        <h2 className="text-lg font-semibold">Podsumowanie Paid + Incurred</h2>

        {/* select Paid */}
        <select
          className="bg-gray-700 rounded p-2"
          value={selectedPaid ?? ''}
          onChange={e => setSelectedPaid(e.target.value || null)}
        >
          <option value="">-- Wybierz Paid --</option>
          {paidOptions.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        {/* select Incurred */}
        <select
          className="bg-gray-700 rounded p-2"
          value={selectedIncurred ?? ''}
          onChange={e => setSelectedIncurred(e.target.value || null)}
        >
          <option value="">-- Wybierz Incurred --</option>
          {incurredOptions.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        {/* przycisk */}
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
        >
          📤 Wyślij na backend
        </button>

        <Modal
          isOpen={showModal}
          title="Wymagane dane"
          message="Musisz wskazać jeden zestaw Paid oraz jeden Incurred."
          onCancel={() => setShowModal(false)}
          onlyOk
        />
      </div>

      {/* ────── prawa kolumna ────── */}
      <div className="flex-1 overflow-auto">
        {comparisonRows.length > 0 && (
          <WeightedTable
            rows={comparisonRows.map(r => ({
              paid:     Number((r as any).Paid ?? r.paid),
              incurred: Number((r as any).Incurred ?? r.incurred),
            }))}
          />
        )}
      </div>
    </div>
  );
}
