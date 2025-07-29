'use client';

import { useState } from 'react';
import { useTableStore } from '@/stores/tableStore';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';

// ——— widoki Paid / Incurred ———
import PaidViewTrian from './PaidViewTrian';
import IncurredTriangleDet from './IncurredTriangleDet';
import PaidCLCoefficients from './PaidCLCoefficients';
import IncurredCLCoefficients from './IncurredCLCoefficients';
import DevJSelectorPaid from './DevJSelectorPaid';
import DevJSelectorPaidIncurred from './DevJSelectorIncurred';
import PaidDevSummaryTab from './PaidDevSummaryTab';
import DevJSelectorIncurredSummaryTab from './DevJSelectorIncurredSummaryTab';
import PaidWyniki from './PaidWyniki';
import IncurredWyniki from './IncurredWyniki';

// 🆕 Placeholder component for the upcoming combined results tab (empty for now)
import ResultsSummary from './ResultsSummary';

/**
 * -------------------------------------------------------------
 *  ❯  Zmiany (v2)
 *  1. Zakładka „Summary” zostaje na razie pusta i renderuje
 *     tylko komponent <ResultsSummary /> (placeholder).
 *  2. Etykieta zakładki po angielsku: „Results Summary”.
 * -------------------------------------------------------------
 */

const STEP_TABS = [
  'Trójkąt',
  'Współczynniki CL',
  'Wybór dev_j',
  'Dopasowanie krzywej CL',
  'Wybór krzywej CL',
  'Wyniki',
];

const METHOD_TABS: { id: 'paid' | 'incurred' | 'summary'; label: string }[] = [
  { id: 'paid', label: 'Metoda Paid' },
  { id: 'incurred', label: 'Metoda Incurred' },
  { id: 'summary', label: 'Results Summary' },
];

export function DeterministicMethodsTab() {
  const [method, setMethod] = useState<'paid' | 'incurred' | 'summary'>('paid');
  const [step, setStep] = useState(0);
  const { clData } = useTableStore(); // eslint‑disable‑line @typescript-eslint/no-unused-vars
  const { finalDevJ } = useTrainDevideStoreDet(); // eslint‑disable‑line @typescript-eslint/no-unused-vars

  // Zmiana głównej zakładki resetuje krok na 0 (bez miksowania kroków pomiędzy metodami)
  const handleChangeMethod = (newMethod: 'paid' | 'incurred' | 'summary') => {
    setMethod(newMethod);
    if (newMethod !== 'summary') setStep(0);
  };

  return (
    <div className="w-full text-white">
      {/* ──────────────────  Główne zakładki  ────────────────── */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        {METHOD_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleChangeMethod(id)}
            className={`px-4 py-2 transition-all ${
              method === id
                ? 'border-b-2 border-blue-400 text-blue-400 font-semibold'
                : 'hover:text-blue-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ──────────────────  Pod‑zakładki kroków  ────────────────── */}
      {method !== 'summary' && (
        <div className="flex w-full rounded overflow-hidden border border-slate-700 bg-[#1e293b] mb-4">
          {STEP_TABS.map((label, index) => (
            <button
              key={index}
              onClick={() => setStep(index)}
              className={`flex-1 px-3 py-2 text-sm text-center transition-all ${
                step === index
                  ? 'bg-[#0f172a] text-white border-r border-slate-700 border-b-4 border-b-blue-400 font-medium'
                  : 'hover:bg-slate-700 text-blue-200 border-r border-slate-700'
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      )}

      {/* ──────────────────  Treść kroków  ────────────────── */}
      {/**  🔹 Metoda Paid */}
      {method === 'paid' && (
        <>
          {step === 0 && <PaidViewTrian />}
          {step === 1 && <PaidCLCoefficients />}
          {step === 3 && <DevJSelectorPaid />}
          {step === 4 && <PaidDevSummaryTab />}
          {step === 5 && <PaidWyniki />}
        </>
      )}

      {/**  🔹 Metoda Incurred */}
      {method === 'incurred' && (
        <>
          {step === 0 && <IncurredTriangleDet />}
          {step === 1 && <IncurredCLCoefficients />}
          {step === 3 && <DevJSelectorPaidIncurred />}
          {step === 4 && <DevJSelectorIncurredSummaryTab />}
          {step === 5 && <IncurredWyniki />}
        </>
      )}

      {/* ──────────────────  Results Summary (pusta)  ────────────────── */}
      {method === 'summary' && <ResultsSummary />}

      {/* ──────────────────  Pasek informacyjny  ────────────────── */}
      {method !== 'summary' && step > 1 && (
        <div className="p-4">
          <p>
            Widok: <strong>{method === 'paid' ? 'Metoda Paid' : 'Metoda Incurred'}</strong>, krok:{' '}
            <strong>{STEP_TABS[step]}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
