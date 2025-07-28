'use client';
import React, { useMemo, useEffect } from 'react';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';
import type {
  DevJResult,
  CustomCell,
} from '@/stores/trainDevideStoreDeterministyczny';

/* -------------------------------------------------------------------------- */
/*                                PaidDevSummaryTab                           */
/* -------------------------------------------------------------------------- */

export default function PaidDevSummaryTab() {
  /* ----------------------------- store hooks ---------------------------- */
  const devJResults = useTrainDevideStoreDet(
    (s) => s.devJResults,
  ) as DevJResult[];

  const simResults = useTrainDevideStoreDet(
    (s) => s.simResults,
  ) as Record<string, Record<string, number>> | undefined;

  const tailCount = useTrainDevideStoreDet((s) => s.tailCount);

  const retainedCoeffCount = useTrainDevideStoreDet(
    (s) => s.retainedCoeffCount,
  );
  const setRetainedCoeffCount = useTrainDevideStoreDet(
    (s) => s.setRetainedCoeffCount,
  );

  const finalDevVector = useTrainDevideStoreDet((s) => s.finalDevVector);

  const selectedCurve = useTrainDevideStoreDet((s) => s.selectedCurve);
  const setSelectedCurve = useTrainDevideStoreDet((s) => s.setSelectedCurve);

  /** devFinalCustom: { [j‑index]: { curve, value } } */
  const devFinalCustom = useTrainDevideStoreDet(
    (s) => s.devFinalCustom,
  ) as Record<number, CustomCell>;
  const setDevFinalValue = useTrainDevideStoreDet(
    (s) => s.setDevFinalValue,
  ) as (idx: number, curve: string, val: number) => void;
  const clearDevFinalValue = useTrainDevideStoreDet(
    (s) => s.clearDevFinalValue,
  );


  /* ------------------------------ memo data ----------------------------- */
  const maxJ = useMemo(() => {
    if (!devJResults?.length) return 0;
    return Math.max(...devJResults.map((r) => r.values.length));
  }, [devJResults]);

  /** tabela porównawcza volume */
  const devVolumeRows: Array<[string, number, number[]]> = useMemo(
    () =>
      (devJResults ?? []).map((r) => [
        r.subIndex !== undefined ? `${r.volume}, ${r.subIndex + 1}` : `${r.volume}`,
        r.volume,
        r.values,
      ]),
    [devJResults],
  );

  const curveNames = useMemo(() => Object.keys(simResults ?? {}), [simResults]);

  const sortDp = (a: string, b: string) =>
    parseInt(a.replace('dp: ', ''), 10) - parseInt(b.replace('dp: ', ''), 10);

  const dpKeys = useMemo(() => {
    if (!simResults) return [];
    const firstCurve =
      (selectedCurve && simResults[selectedCurve]) ||
      Object.values(simResults)[0] ||
      {};
    return Object.keys(firstCurve).sort(sortDp);
  }, [simResults, selectedCurve]);

  /* ----------------------------- helpers ------------------------------- */
  const isLockedIdx = (idx: number) => idx < retainedCoeffCount;

  /** domyślna wartość ogona – jeśli nie ma override */
  const isDefaultTailCell = (curve: string, idx: number) =>
    curve === selectedCurve &&
    idx >= retainedCoeffCount &&
    !devFinalCustom[idx];


  /** 2) po zmianie retainedCoeffCount usuń override’y w zablokowanych kolumnach */
  useEffect(() => {
    Object.keys(devFinalCustom).forEach((k) => {
      const idx = Number(k);
      if (isLockedIdx(idx)) clearDevFinalValue(idx);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retainedCoeffCount]);

  /* ------------------------------ handlers ----------------------------- */
  const handleCellClick = (
    curve: string,
    idx: number,
    val: number | undefined,
  ) => {
    if (typeof val !== 'number') return;
    if (isLockedIdx(idx)) return;

    // klik w bazową krzywą – usuń override
    if (curve === selectedCurve) {
      clearDevFinalValue(idx);
      return;
    }

    // klik w inną krzywą
    const current = devFinalCustom[idx];
    if (current && current.curve === curve) {
      clearDevFinalValue(idx);
    } else {
      if (current) clearDevFinalValue(idx); // zdejmij poprzednią
      setDevFinalValue(idx, curve, val);
    }
  };

  /* ------------------------------ render ------------------------------- */
  return (
    <div className="flex h-full w-full text-white">
      {/* ---------------------------- SIDEBAR ---------------------------- */}
      <aside className="w-72 min-w-[250px] bg-gray-800 p-4 border-r border-gray-700">
        <label
          htmlFor="retainedCoeffInput"
          className="block mb-2 text-sm font-semibold text-gray-300"
        >
          Pozostawiona liczba współczynników
        </label>
        <input
          id="retainedCoeffInput"
          type="number"
          min={0}
          className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white"
          value={retainedCoeffCount}
          onChange={(e) => {
            const n = Number(e.target.value);
            const clamped = Math.max(0, Math.min(n, finalDevVector.length));
            setRetainedCoeffCount(clamped);
          }}
        />
      </aside>

      {/* ----------------------------- MAIN ----------------------------- */}
      <main className="flex-1 flex flex-col gap-10 p-6 overflow-x-auto">
        {/* 1. Dev podstawowe --------------------------------------------- */}
        <section>
          <h2 className="text-xl font-bold mb-4">1. Dev podstawowe</h2>

          {finalDevVector.length ? (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-max table-fixed bg-gray-900 text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800">-</th>
                    {finalDevVector.map((_, i) => (
                      <th
                        key={i}
                        className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center"
                      >
                        j={i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-700 px-3 py-2 bg-gray-800">
                      dev_j
                    </td>
                    {finalDevVector.map((v, i) => (
                      <td
                        key={i}
                        className="border border-gray-700 px-3 py-2 w-[80px] text-center"
                        style={
                          i < retainedCoeffCount
                            ? { backgroundColor: '#ccffcc', color: '#000' }
                            : undefined
                        }
                      >
                        {v.toFixed(6)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-yellow-400">Brak danych dev_j</p>
          )}
        </section>

        {/* 2. dev volume -------------------------------------------------- */}
        <section>
          <h2 className="text-xl font-bold mb-4">2. dev volume</h2>

          {devVolumeRows.length ? (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-max table-fixed bg-gray-900 text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 sticky left-0 z-10">
                      volume
                    </th>
                    {Array.from({ length: maxJ }, (_, i) => (
                      <th
                        key={i}
                        className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center"
                      >
                        j={i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devVolumeRows.map(([label, vol, values]) => (
                    <tr key={`${label}-${vol}`}>
                      <td className="border border-gray-700 px-3 py-2 bg-gray-800 sticky left-0 z-10">
                        {label}
                      </td>
                      {Array.from({ length: maxJ }, (_, j) => {
                        const v = values[j];
                        return (
                          <td
                            key={j}
                            className={`border border-gray-700 px-3 py-2 w-[80px] text-center ${
                              typeof v === 'number' ? '' : 'text-gray-500'
                            }`}
                          >
                            {typeof v === 'number' ? v.toFixed(6) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-yellow-400">
              Brak danych dla różnych volume.
            </p>
          )}
        </section>

        {/* 3. Dev krzywa z ogonem ----------------------------------------- */}
        <section>
          <h2 className="text-xl font-bold mb-4">3. Dev krzywa z ogonem</h2>

          {simResults ? (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-max table-fixed bg-gray-900 text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold">
                      Wybór
                    </th>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-10">
                      Krzywa
                    </th>
                    {dpKeys.map((dp) => (
                      <th
                        key={dp}
                        className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center"
                      >
                        {dp}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {curveNames.map((curve) => (
                    <tr key={curve}>
                      {/* radio */}
                      <td className="border border-gray-700 px-3 py-2 bg-gray-800 text-center">
                        <input
                          type="radio"
                          name="curveChoice"
                          className="accent-blue-500"
                          checked={selectedCurve === curve}
                          onChange={() => setSelectedCurve(curve)}
                        />
                      </td>

                      {/* label */}
                      <td className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-10">
                        {curve}
                        {selectedCurve === curve && ' (BASE)'}
                      </td>

                      {/* cells */}
                      {dpKeys.map((dpKey, idx) => {
                        const val = simResults[curve]?.[dpKey];
                        const override = devFinalCustom[idx];
                        const isOverrideCell =
                          override?.curve === curve;
                        const defaultTail = isDefaultTailCell(curve, idx);
                        const locked = isLockedIdx(idx);

                        const displayed = isOverrideCell
                          ? override.value
                          : val;

                        return (
                          <td
                            key={idx}
                            className={`border border-gray-700 px-3 py-2 w-[80px] text-center transition-colors duration-300 ${
                              locked
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer'
                            }`}
                            style={{
                              backgroundColor:
                                isOverrideCell || defaultTail
                                  ? '#ccffcc'
                                  : undefined,
                              color:
                                isOverrideCell || defaultTail
                                  ? '#000'
                                  : undefined,
                            }}
                            onClick={
                              locked
                                ? undefined
                                : () =>
                                    handleCellClick(curve, idx, val)
                            }
                            title={
                              locked
                                ? `Zablokowane – współczynnik j=${idx} jest wśród ${retainedCoeffCount} pierwszych`
                                : ''
                            }
                          >
                            {typeof displayed === 'number'
                              ? displayed.toFixed(6)
                              : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-yellow-400">Brak symulowanych krzywych.</p>
          )}

          {typeof tailCount === 'number' && tailCount > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Ogon: {tailCount} obserwacji.
            </p>
          )}
        </section>

        {/* 4. Wektor końcowy --------------------------------------------- */}
        <section>
          <h2 className="text-xl font-bold mb-4">4. Wektor końcowy</h2>

          {finalDevVector.length ? (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-max table-fixed bg-gray-900 text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center">
                      -
                    </th>
                    {finalDevVector.map((_, i) => (
                      <th
                        key={i}
                        className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center"
                      >
                        j={i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold text-center">
                      Wektor&nbsp;końcowy
                    </td>
                    {finalDevVector.map((v, i) => (
                      <td
                        key={i}
                        className="border border-gray-700 px-3 py-2 w-[80px] text-center"
                      >
                        {v.toFixed(6)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-yellow-400">
              Brak danych do wyświetlenia wektora końcowego.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
