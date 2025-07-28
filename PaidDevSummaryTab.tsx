/* ------------------------------------------------------------------ */
/*                       PaidDevSummaryTab.tsx                        */
/* ------------------------------------------------------------------ */
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTrainDevideStoreDet } from "@/stores/trainDevideStoreDeterministyczny";

export default function PaidDevSummaryTab() {
  /* ---------- lokalny stan komponentu --------------------------- */
const leftCount        = useTrainDevideStoreDet(s => s.leftCountSummary);
const setLeftCount     = useTrainDevideStoreDet(s => s.setLeftCountSummary);


const selectedCurve = useTrainDevideStoreDet(s => s.selectedCurveSummary);
const setSelectedCurve = useTrainDevideStoreDet(s => s.setSelectedCurveSummary);

const manualOverrides = useTrainDevideStoreDet(s => s.manualOverridesSummary);
const setManualOverrides = useTrainDevideStoreDet(s => s.setManualOverridesSummary);

const [editingIndex, setEditingIndex] = useState<number | null>(null);
const [editValue, setEditValue] = useState<string>('');



  /* ---------- czyścimy ręczne nadpisania, jeśli wpadną do części zablokowanej --- */
useEffect(() => {
  const current = manualOverrides;
  const filtered: typeof manualOverrides = {};

  for (const [key, val] of Object.entries(current)) {
    const idx = Number(key);
    if (idx >= leftCount) filtered[idx] = val;
  }

  setManualOverrides(filtered);
}, [leftCount]);





  /* ---------- dane & akcje ze store’a ---------------------------- */
  const devJPreview = useTrainDevideStoreDet((s) => s.devJPreview);
  const simResults = useTrainDevideStoreDet((s) => s.simResults);

  const handleLeftCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!Number.isNaN(val) && val >= 0) setLeftCount(val);
  };

  /* ---------- brak danych → nic nie wyświetlamy ------------------ */
  if (!simResults || !devJPreview?.length) {
    return <p className="text-gray-400 text-center">Brak danych do podsumowania.</p>;
  }

  /* ---------- pomocnicze listy nagłówków dp ---------------------- */
  const dpHeaders = useMemo(() => {
    const allKeys = new Set<string>();
    Object.values(simResults).forEach((curve) => {
      Object.keys(curve).forEach((k) => allKeys.add(k));
    });
    return Array.from(allKeys).sort((a, b) => {
      const aPart = a.split(":")[1] ?? "0";
      const bPart = b.split(":")[1] ?? "0";
      return parseInt(aPart) - parseInt(bPart);
    });
  }, [simResults]);

  /* ------------------------------------------------------------------ */
  /*                   Jak wybierane są współczynniki dev_j             */
  /* ------------------------------------------------------------------ */

  const combinedDevJ = useMemo(() => {
    const maxLen = Math.max(devJPreview.length, dpHeaders.length);
    const arr: (number | string)[] = new Array(maxLen).fill("-");

    // 1) wartości z devJPreview
    for (let i = 0; i < Math.min(leftCount, maxLen); i++) {
      const v = devJPreview[i];
      arr[i] = v !== undefined ? v.toFixed(6) : "-";
    }

    // 2) wartości z wybranej krzywej CL
    if (selectedCurve) {
      for (let i = leftCount; i < maxLen; i++) {
        const dpKey = `dp: ${i + 1}`;
        const val = simResults[selectedCurve]?.[dpKey as keyof typeof simResults[string]];
        if (Number.isFinite(val)) {
          arr[i] = Number(val).toFixed(6);
        }
      }
    }

    // 3) ręczne nadpisania — muszą być ostatnie, by mieć priorytet
    for (let i = 0; i < maxLen; i++) {
      const override = manualOverrides[i];
      if (override && Number.isFinite(override.value)) {
        arr[i] = Number(override.value).toFixed(6);
      }
    }

    return arr;
  }, [leftCount, selectedCurve, devJPreview, simResults, dpHeaders, manualOverrides]);
  const setCombinedDevJSummary = useTrainDevideStoreDet(s => s.setCombinedDevJSummary);
useEffect(() => {
  setCombinedDevJSummary(combinedDevJ);
}, [combinedDevJ]);
  const maxLen = Math.max(devJPreview.length, dpHeaders.length);

  /* ---------- RENDER -------------------------------------------- */
  return (
    <div className="flex w-full h-full">
      {/* SIDEBAR */}
      <aside className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-6">
        <h3 className="text-lg font-semibold">Ustawienia</h3>
        <label className="flex flex-col gap-2 text-sm font-medium">
          <span>Ilość pozostawionych</span>
          <input
            type="number"
            min={0}
            value={leftCount}
            onChange={handleLeftCountChange}
            className="bg-gray-600 border border-gray-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
          />
        </label>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col gap-10 w-full p-6 overflow-x-auto">
        {/* Dev podstawowe */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-center">1. Dev podstawowe</h2>
          <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
            <table className="min-w-max border-collapse bg-gray-900 rounded-xl shadow-md text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800">-</th>
                  {devJPreview.map((_, idx) => (
                    <th key={idx} className="border border-gray-700 px-3 py-2 bg-gray-800">
                      j={idx}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 bg-gray-800">dev_j</td>
                  {devJPreview.map((val, idx) => (
                    <td
                      key={idx}
                      className={`border border-gray-700 px-3 py-2 text-center ${idx < leftCount ? "bg-green-700/70" : ""}`}
                    >
                      {val !== undefined ? val.toFixed(6) : "-"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Symulacja krzywych CL */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-center">Symulacja krzywych CL</h2>
          <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
            <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-20">
                    Wybór
                  </th>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-[62px] z-20">
                    Krzywa
                  </th>
                  {dpHeaders.map((dpKey) => (
                    <th key={dpKey} className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center">
                      {dpKey}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(simResults).map(([curve, values]) => (
                  <tr key={curve} className="hover:bg-gray-800/40">
                    {/* Wybór */}
                    <td className="border border-gray-700 px-3 py-2 text-center sticky left-0 bg-gray-900 z-10">
                      <input
                        type="radio"
                        name="curve-select"
                        checked={selectedCurve === curve}
                        onChange={() => setSelectedCurve(curve)}
                        className="form-radio text-blue-600 bg-gray-700 border-gray-600"
                      />
                    </td>

                    {/* Nazwa krzywej */}
                    <td className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-[62px] z-10">
                      {curve}
                    </td>

                    {/* wartości dp */}
                    {dpHeaders.map((dpKey, idx) => {
                      const val = (values as Record<string, number | undefined>)[dpKey];
                      const blocked = idx < leftCount;
                      const isManual = manualOverrides[idx]?.curve === curve;
                      const selectedRow = selectedCurve === curve;

                      /* ---------- wyliczamy klasę tła ---------- */
                      let bg = "";
                      if (blocked) {
                        if (isManual) bg = "bg-green-500/40";
                        else if (selectedRow) bg = "bg-green-700/40";
                        else bg = "bg-gray-800/60";
                      } else {
                        if (isManual) bg = "bg-green-500/70";
                        else if (selectedRow && !manualOverrides[idx]) bg = "bg-green-700/70";
                      }

                      return (
                        <td
                          key={dpKey}
                          onClick={() => {
                            if (blocked || !Number.isFinite(val)) return;
                          const copy = { ...manualOverrides };
                          if (manualOverrides[idx]?.curve === curve) {
                            delete copy[idx];
                          } else {
                            copy[idx] = { curve, value: val! };
                          }
                          setManualOverrides(copy);

                          }}
                          className={`border border-gray-700 px-3 py-2 w-[80px] text-center transition-colors ${
                            blocked ? "cursor-not-allowed text-gray-500" : "cursor-pointer"
                          } ${bg}`}
                          title={
                            blocked
                              ? "Ta kolumna jest zablokowana (pozostawiona z lewej)"
                              : isManual
                              ? "Ręcznie wybrana wartość – kliknij ponownie, by usunąć"
                              : "Kliknij, aby ustawić ręcznie"
                          }
                        >
                          {Number.isFinite(val) ? Number(val).toFixed(6) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!selectedCurve && (
              <p className="text-yellow-400 mt-4 text-center">
                Wybierz krzywą, aby uzupełnić współczynniki po pozycji {leftCount}.
              </p>
            )}
          </div>
        </section>

{/* Pozostawione dev_j */}
<section>
  <h2 className="text-xl font-bold mb-4 text-center">Pozostawione dev_j</h2>
  <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
    <table className="min-w-max border-collapse bg-gray-900 rounded-xl shadow-md text-sm">
      <thead>
        <tr>
          <th className="border border-gray-700 px-3 py-2 bg-gray-800">-</th>
          {Array.from({ length: maxLen }).map((_, idx) => (
            <th key={idx} className="border border-gray-700 px-3 py-2 bg-gray-800">
              j={idx}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border border-gray-700 px-3 py-2 bg-gray-800">Dev_final_krzywa</td>
          {combinedDevJ.map((val, idx) => {
            const isEditing = editingIndex === idx;

            return (
              <td
                key={idx}
                className={`border border-gray-700 text-center px-3 py-2 ${
                  isEditing ? 'bg-blue-900/50' : 'hover:bg-gray-700/40 cursor-pointer'
                }`}
                onClick={() => {
                  if (typeof val === 'string') return;
                  setEditingIndex(idx);
                  setEditValue(val.toString());
                }}
                title="Kliknij, aby edytować wartość ręcznie"
              >
                {isEditing ? (
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
onBlur={() => {
  const num = parseFloat(editValue);
  if (!Number.isNaN(num)) {
    const current = manualOverrides[idx]?.value;
    if (current !== num) {
      setManualOverrides({
        ...manualOverrides,
        [idx]: { curve: "manual", value: num },
      });
    }
  }
  setEditingIndex(null);
}}

                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full px-2 py-1 rounded bg-white text-black border border-blue-400 text-sm text-center shadow"
                  />
                ) : (
                  val
                )}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  </div>
</section>


      </div>
    </div>
  );
}
