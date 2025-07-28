'use client';

import { useState } from 'react';
import { useTableStore } from '@/stores/tableStore';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny'; // ✅ Dodano
import PaidViewTrian from './PaidViewTrian';
import IncurredTriangleDet from './IncurredTriangleDet';
import PaidCLCoefficients from './PaidCLCoefficients';
import IncurredCLCoefficients from './IncurredCLCoefficients';
import DevJSelectorPaid from './DevJSelectorPaid';
import DevJSelectorPaidIncurred from './DevJSelectorIncurred';
import PaidDevSummaryTab from './PaidDevSummaryTab';
import DevJSelectorIncurredSummaryTab from './DevJSelectorIncurredSummaryTab';

import  PaidWyniki  from './PaidWyniki';
import  IncurredWyniki  from './IncurredWyniki';



const STEP_TABS = [
  "Trójkąt",
  "Współczynniki CL",
  "Wybór dev_j",
  "Dopasowanie krzywej CL",
  "Wybór krzywej CL",
  "Wyniki"
];

export function DeterministicMethodsTab() {
  const [method, setMethod] = useState<"paid" | "incurred">("paid");
  const [step, setStep] = useState(0);
  const { clData } = useTableStore();
  const { finalDevJ } = useTrainDevideStoreDet(); // ✅ Dodano

  return (
    <div className="w-full text-white">
      {/* Główne zakładki */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setMethod("paid")}
          className={`px-4 py-2 transition-all ${
            method === "paid"
              ? "border-b-2 border-blue-400 text-blue-400 font-semibold"
              : "hover:text-blue-300"
          }`}
        >
          Metoda Paid
        </button>
        <button
          onClick={() => setMethod("incurred")}
          className={`px-4 py-2 transition-all ${
            method === "incurred"
              ? "border-b-2 border-blue-400 text-blue-400 font-semibold"
              : "hover:text-blue-300"
          }`}
        >
          Metoda Incurred
        </button>
      </div>

      {/* Podzakładki */}
      <div className="flex w-full rounded overflow-hidden border border-slate-700 bg-[#1e293b] mb-4">
        {STEP_TABS.map((label, index) => (
          <button
            key={index}
            onClick={() => setStep(index)}
            className={`flex-1 px-3 py-2 text-sm text-center transition-all
              ${step === index
                ? "bg-[#0f172a] text-white border-r border-slate-700 border-b-4 border-b-blue-400 font-medium"
                : "hover:bg-slate-700 text-blue-200 border-r border-slate-700"}`}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {/* Treść kroków */}
      {step === 0 && method === "paid" && <PaidViewTrian />}
      {step === 0 && method === "incurred" && <IncurredTriangleDet />}

      {step === 1 && method === "paid" && <PaidCLCoefficients />}
      {step === 1 && method === "incurred" && <IncurredCLCoefficients />}


    {step === 3 && method === "paid" && <DevJSelectorPaid />}
    {step === 3 && method === "incurred" && <DevJSelectorPaidIncurred />}

    {step === 4 && method === "paid" && <PaidDevSummaryTab />}
    {step === 4 && method === "incurred" && <DevJSelectorIncurredSummaryTab />}

    {step === 5 && method === "paid" && <PaidWyniki />}
    {step === 5 && method === "incurred" && <IncurredWyniki />}


      {step > 1 && (
        <div className="p-4">
          <p>
            Widok: <strong>{method === "paid" ? "Metoda Paid" : "Metoda Incurred"}</strong>, krok:{" "}
            <strong>{STEP_TABS[step]}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
