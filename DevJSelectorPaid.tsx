/* -------------------------------------------------------------------------- */
/*                              DevJSelectorPaid.tsx                           */
/* -------------------------------------------------------------------------- */

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useTrainDevideStoreDet } from "@/stores/trainDevideStoreDeterministyczny";
import { useUserStore } from "@/app/_components/useUserStore";
import type { CustomCell } from "@/stores/trainDevideStoreDeterministyczny";
import Modal from "@/components/Modal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function DevJSelectorPaid() {
  /* =============================== STORE ================================= */

  const {
    /* ---- stan / akcje dla podglądu i aktualizacji wektora ---- */
    devPreviewCandidate,
    setDevPreviewCandidate,          // ✅ dodano
    devJPreview,
    setDevJPreview,

    /* ---- wektor końcowy i nadpisania ---- */
    devFinalCustom,
    finalDevVector,

    /* ---- zaznaczenie współczynników j>1 ---- */
    selectedDevJIndexes,
    setSelectedDevJIndexes,

    /* ---- wyniki symulacji i R² ---- */
    r2Scores,
    setR2Scores,
    simResults,
    setSimResults,
    clearR2Scores,
    clearSimResults,
  } = useTrainDevideStoreDet();

  const userId = useUserStore((s) => s.userId);

  /* =========================== BIEŻĄCY VEKTOR ============================ */

  const currentVector = useMemo<number[]>(() => {
    const base = finalDevVector;
    const merged = [...base];

    // uwzględnij ręczne nadpisania
    (Object.entries(devFinalCustom ?? {}) as [string, CustomCell][]).forEach(
      ([idxStr, cell]) => {
        const idx = Number(idxStr);
        merged[idx] = cell.value;
      }
    );

    return merged;
  }, [finalDevVector, devFinalCustom]);

  /* =============================== STATE ================================= */

  const [tailCount, setTailCount] = useState<number | "">("");
  const [isConfirmUpdateOpen, setIsConfirmUpdateOpen] = useState(false);
  const [dpRange, setDpRange] = useState<[number, number]>([1, 13]);
  const [selectedCurves, setSelectedCurves] = useState<string[]>([
    "Exponential",
    "Weibull",
    "Power",
    "Inverse Power",
    "dev_j",
  ]);

  /* ============================ HANDLERS ================================= */

  /** Otwiera modal oraz zapisuje kandydat do podglądu. */
  const openUpdateModal = () => {
    if (!currentVector.length) return;
    setDevPreviewCandidate(currentVector); // 🔑 zapisz kandydat
    setIsConfirmUpdateOpen(true);          // otwórz modal
  };

  /** Zatwierdzenie w modalu – ustawia podglądowy dev_j. */
  const confirmUpdate = () => {
    setIsConfirmUpdateOpen(false);

    if (!devPreviewCandidate?.length) return;

    setDevJPreview(devPreviewCandidate);

    // zaznacz j‑indeksy > 1
    const filteredIndexes = devPreviewCandidate
      .map((val, idx) => (val > 1 ? idx : -1))
      .filter((i) => i >= 0);
    setSelectedDevJIndexes(filteredIndexes);

    // wyczyść stare wyniki symulacji i R²
    clearSimResults();
    clearR2Scores();
  };

const toggleIndex = (index: number) => {
  if (!Array.isArray(devJPreview)) return;
  const val = devJPreview[index];
  if (val === undefined || val <= 1) return;

  const next =
    selectedDevJIndexes.includes(index)
      ? selectedDevJIndexes.filter((i) => i !== index)
      : [...selectedDevJIndexes, index];

  setSelectedDevJIndexes(next);   // ← przekazujemy tablicę, nie funkcję
};

  /** Wysyła zaznaczone wartości do backendu. */
  const handleSendToBackend = () => {
    if (!devJPreview || !userId || selectedDevJIndexes.length === 0) return;

    const validIndexes = selectedDevJIndexes
      .filter((i) => devJPreview?.[i] !== undefined && devJPreview[i]! > 1)
      .sort((a, b) => a - b);

    if (validIndexes.length === 0) return;

    const selectedValues = validIndexes.map((i) => devJPreview[i]!);

    fetch("http://localhost:8000/calc/paid/selected_dev_j", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selected_dev_j: selectedValues,
        selected_indexes: validIndexes,
        tail_values: tailCount === "" ? null : [Number(tailCount)],
        user_id: userId,
        full_dev_j: devJPreview,
      }),
    })
      .then((res) => res.json())
      .then(({ simulation_results, r2_scores }) => {
        /* --- transformacja simulation_results --- */
        const transformed: Record<string, Record<string, number>> = {};
        Object.entries(simulation_results).forEach(([dpKey, curves]) => {
          Object.entries(curves as Record<string, number>).forEach(
            ([curveName, val]) => {
              if (!transformed[curveName]) transformed[curveName] = {};
              transformed[curveName][dpKey] = val;
            }
          );
        });
        setSimResults(transformed);

        /* --- transformacja r2_scores --- */
        const r2Map: Record<string, number> = {};
        Object.entries(r2_scores ?? {}).forEach(([curve, obj]) => {
          const value = (obj as any)["Wartość"];
          r2Map[curve] = typeof value === "number" ? value : Number(value);
        });
        setR2Scores(r2Map);
      })
      .catch((err) => console.error("❌ Błąd wysyłki:", err));
  };

  /* ============================= EFFECTS ================================= */

  /** Aktualizacja zakresu dp, gdy przychodzą wyniki symulacji. */
  useEffect(() => {
    if (simResults && Object.keys(simResults).length > 0) {
      const [firstKey] = Object.keys(simResults);
      if (!firstKey) return;
      const sampleCurve = simResults[firstKey];
      const dpKeys = Object.keys(sampleCurve ?? {});
      const dpNums = dpKeys
        .map((k) => parseInt(k.replace("dp: ", ""), 10))
        .filter((n) => !isNaN(n));

      if (dpNums.length > 0) {
        setDpRange([Math.min(...dpNums), Math.max(...dpNums)]);
      }
    }
  }, [simResults]);

  /* ============================== RENDER ================================= */

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 text-white overflow-x-hidden">
      {/* --------------------------- PANEL STEROWANIA ---------------------- */}
      <div className="bg-gray-800 p-4 rounded-xl w-full lg:w-64 h-fit shadow-lg shrink-0">
        <h3 className="text-lg font-semibold mb-4">Panel sterowania</h3>

        <button
          onClick={openUpdateModal}
          className="w-full mb-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          disabled={!currentVector.length}
        >
          Zaktualizuj wektor
        </button>

        <div className="mb-3">
          <label className="block text-sm mb-1">
            Ile obserwacji w&nbsp;ogonie:
          </label>
          <input
            type="number"
            min={0}
            value={tailCount}
            onChange={(e) => {
              const val = e.target.value;
              setTailCount(val === "" ? "" : parseInt(val));
            }}
            className="w-full px-2 py-1 text-white bg-gray-700 rounded placeholder-gray-400"
            placeholder="np. 2"
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

      {/* ------------------------ PRAWA CZĘŚĆ (tabele) --------------------- */}
      <div className="flex-1 flex flex-col gap-8 overflow-hidden">
        {/* ---------- 1. Finalny wektor dev_j (podgląd) ---------- */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-center">
            Finalny wektor <code>dev_j</code>
          </h2>

          {Array.isArray(devJPreview) ? (
            <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
              <table className="min-w-max border-collapse bg-gray-900 rounded-xl shadow-md text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800">-</th>
                    {devJPreview.map((_, index) => (
                      <th
                        key={index}
                        className="border border-gray-700 px-3 py-2 bg-gray-800"
                      >
                        {index}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-700 px-3 py-2 bg-gray-800">0</td>
                    {devJPreview.map((value, index) => {
                      const isSelectable = value > 1;
                      const isSelected = selectedDevJIndexes.includes(index);
                      return (
                        <td
                          key={index}
                          onClick={() => toggleIndex(index)}
                          className={`border border-gray-700 px-3 py-2 text-center transition ${
                            isSelectable
                              ? isSelected
                                ? "bg-green-300 text-black font-semibold cursor-pointer"
                                : "bg-gray-800 hover:bg-gray-700 cursor-pointer"
                              : "bg-gray-700 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {value.toFixed(6)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-yellow-400 text-center">Wczytywanie wektora…</p>
          )}
        </div>

        {/* ---------- 2. Tabela wyników CL ---------- */}
        {simResults && (
          <div className="w-full mt-8">
            <h2 className="text-xl font-bold mb-4 text-center">
              Symulacja krzywych CL
            </h2>
            <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
              <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-10">
                      Krzywa
                    </th>
                    {Object.keys(Object.values(simResults ?? {})[0] ?? {}).map(
                      (dpKey, i) => (
                        <th
                          key={i}
                          className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center whitespace-nowrap overflow-hidden text-ellipsis"
                        >
                          {dpKey}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(simResults).map(([curve, values]) => (
                    <tr key={curve}>
                      <td className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-10">
                        {curve}
                      </td>
                      {Object.values(values).map((val, i) => (
                        <td
                          key={i}
                          className="border border-gray-700 px-3 py-2 text-center w-[80px] whitespace-nowrap overflow-hidden text-ellipsis"
                        >
                          {Number(val).toFixed(6)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------- 3. Tabela R² ---------- */}
        {r2Scores && (
          <div className="w-full mt-8">
            <h2 className="text-xl font-bold mb-4 text-center">
              R² dopasowania krzywych
            </h2>
            <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
              <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-10">
                      Krzywa
                    </th>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 w-[120px] text-center">
                      R²
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(r2Scores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([curve, r2]) => (
                      <tr key={curve}>
                        <td className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-10">
                          {curve}
                        </td>
                        <td className="border border-gray-700 px-3 py-2 text-center">
                          {r2.toFixed(6)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------- 4. Zakres dp ---------- */}
        <div className="mb-4 flex flex-col lg:flex-row items-center gap-4">
          <label className="text-sm font-medium">Zakres dp:</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={dpRange[0]}
              onChange={(e) =>
                setDpRange([parseInt(e.target.value), dpRange[1]])
              }
              className="bg-gray-700 text-white px-2 py-1 rounded w-20"
            />
            <span className="text-sm">do</span>
            <input
              type="number"
              min={1}
              value={dpRange[1]}
              onChange={(e) =>
                setDpRange([dpRange[0], parseInt(e.target.value)])
              }
              className="bg-gray-700 text-white px-2 py-1 rounded w-20"
            />
          </div>
        </div>

        {/* ---------- 5. Wybór krzywych ---------- */}
        <div className="flex flex-wrap gap-4 items-center text-sm">
          {["Exponential", "Weibull", "Power", "Inverse Power", "dev_j"].map(
            (curve) => (
              <label key={curve} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedCurves.includes(curve)}
                  onChange={() =>
                    setSelectedCurves((prev) =>
                      prev.includes(curve)
                        ? prev.filter((c) => c !== curve)
                        : [...prev, curve]
                    )
                  }
                />
                {curve}
              </label>
            )
          )}
        </div>

        {/* ---------- 6. Wykres ---------- */}
        {simResults && (
          <div className="w-full h-[400px] mt-4">
            <h2 className="text-xl font-bold mb-4 text-center">
              Wykres symulacji krzywych CL
            </h2>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(() => {
                  const allDpKeys = Object.keys(
                    simResults?.["Exponential"] ?? {}
                  );
                  return allDpKeys
                    .filter((dpKey) => {
                      const dpNum = parseInt(dpKey.replace("dp: ", ""), 10);
                      return dpNum >= dpRange[0] && dpNum <= dpRange[1];
                    })
                    .map((dpKey) => {
                      const point: Record<string, number | string> = {
                        dp: dpKey,
                      };
                      for (const curveName in simResults) {
                        point[curveName] = simResults[curveName]?.[dpKey] ?? 0;
                      }
                      const dpNum = parseInt(dpKey.replace("dp: ", ""), 10);
                      const devJVal = devJPreview?.[dpNum - 1];
                      if (typeof devJVal === "number" && !isNaN(devJVal)) {
                        point["dev_j"] = devJVal;
                      }
                      return point;
                    });
                })()}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                style={{
                  backgroundColor: "#1a1a2e",
                  borderRadius: "12px",
                  padding: "10px",
                }}
              >
                <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                <XAxis
                  dataKey="dp"
                  stroke="#ccc"
                  interval={0}
                  tick={{ fill: "#ccc", fontSize: 12 }}
                />
                <YAxis stroke="#ccc" domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2c2c3e",
                    borderColor: "#666",
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#aaa" }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={50}
                  wrapperStyle={{ paddingTop: 20 }}
                />

                {selectedCurves.includes("Exponential") && (
                  <Line
                    type="monotone"
                    dataKey="Exponential"
                    stroke="#4f8bff"
                    strokeWidth={2}
                    dot={{
                      stroke: "#4f8bff",
                      strokeWidth: 1.5,
                      r: 4,
                      fill: "#1a1a2e",
                    }}
                  />
                )}
                {selectedCurves.includes("Weibull") && (
                  <Line
                    type="monotone"
                    dataKey="Weibull"
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    dot={{
                      stroke: "#2dd4bf",
                      strokeWidth: 1.5,
                      r: 4,
                      fill: "#1a1a2e",
                    }}
                  />
                )}
                {selectedCurves.includes("Power") && (
                  <Line
                    type="monotone"
                    dataKey="Power"
                    stroke="#facc15"
                    strokeWidth={2}
                    dot={{
                      stroke: "#facc15",
                      strokeWidth: 1.5,
                      r: 4,
                      fill: "#1a1a2e",
                    }}
                  />
                )}
                {selectedCurves.includes("Inverse Power") && (
                  <Line
                    type="monotone"
                    dataKey="Inverse Power"
                    stroke="#f87171"
                    strokeWidth={2}
                    dot={{
                      stroke: "#f87171",
                      strokeWidth: 1.5,
                      r: 4,
                      fill: "#1a1a2e",
                    }}
                  />
                )}
                {selectedCurves.includes("dev_j") && (
                  <Line
                    type="monotone"
                    dataKey="dev_j"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ stroke: "#ef4444", strokeWidth: 2, r: 5, fill: "#1a1a2e" }}
                    name="dev_j (wejściowy)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ----------------------------- MODAL ------------------------------- */}
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
