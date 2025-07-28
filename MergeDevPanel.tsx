'use client';
import React, { useMemo } from 'react';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';

type DevJResult = {
  volume: number;
  subIndex?: number;
  values: number[];
};

export default function PaidDevSummaryTab() {
  const devJ = useTrainDevideStoreDet((s) => s.devJ); // podstawowy
  const devJResults = useTrainDevideStoreDet((s) => s.devJResults); // różne volume
  const simResults = useTrainDevideStoreDet((s) => s.simResults); // krzywe z ogonem
  const tailCount = useTrainDevideStoreDet((s) => s.tailCount);   // jeśli przeniesione do store

  // ====== Tabela 1: Dev podstawowe ======
  const baseDevHeader = useMemo(
    () => (devJ ? devJ.map((_, i) => `j=${i}`) : []),
    [devJ]
  );

  // ====== Tabela 2: Dev volume ======
  // Masz już DevjTable – możesz go tu użyć. Poniżej prosta implementacja w tym komponencie:
  const devVolumeRows: Array<[string, number, number[]]> = useMemo(() => {
    return (devJResults ?? []).map((r: DevJResult) => {
      const label = r.subIndex !== undefined ? `${r.volume}, ${r.subIndex + 1}` : `${r.volume}`;
      return [label, r.volume, r.values];
    });
  }, [devJResults]);

  // maksymalna długość j w devJResults, żeby wyrównać kolumny
  const maxJ = useMemo(
    () =>
      devJResults.reduce((max, r) => Math.max(max, r.values.length), 0),
    [devJResults]
  );

  // ====== Tabela 3: Dev krzywa z ogonem ======
  // simResults jest Record<string, Record<string, number>> -> [curveName][dpKey] = value
  const curveNames = useMemo(
    () => Object.keys(simResults ?? {}),
    [simResults]
  );

  const dpKeys = useMemo(() => {
    if (!simResults) return [];
    // zakładamy, że wszystkie krzywe mają te same dp keys; weź z pierwszej
    const firstCurveValues = Object.values(simResults)[0] ?? {};
    return Object.keys(firstCurveValues); // np. 'dp: 1', 'dp: 2', ...
  }, [simResults]);



function mergeDevVectors(
  baseDev: number[],
  curveMap: Record<string, number>, // simResults[curveName]
  splitIndex: number
): number[] {
  const result: number[] = [];
  const curveLen = Object.keys(curveMap).length;
  const maxLen = Math.max(baseDev.length, curveLen);

  for (let i = 0; i < maxLen; i++) {
    if (i < splitIndex) {
      result[i] = baseDev[i] ?? curveMap[`dp: ${i + 1}`] ?? 1;
    } else {
      result[i] = curveMap[`dp: ${i + 1}`] ?? baseDev[i] ?? 1;
    }
  }
  return result;
}



  return (
    <div className="flex flex-col gap-10 p-6 text-white">
      {/* 1. Dev podstawowe */}
      <section>
        <h2 className="text-xl font-bold mb-4">1. Dev podstawowe</h2>
        {devJ ? (
          <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
            <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800">-</th>
                  {baseDevHeader.map((label, idx) => (
                    <th
                      key={idx}
                      className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 bg-gray-800">dev_j</td>
                  {devJ.map((val, idx) => (
                    <td
                      key={idx}
                      className="border border-gray-700 px-3 py-2 text-center w-[80px]"
                    >
                      {val.toFixed(6)}
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

      {/* 2. dev volume */}
      <section>
        <h2 className="text-xl font-bold mb-4">2. dev volume</h2>

        {devVolumeRows.length > 0 ? (
          <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
            <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
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
                          className={`border border-gray-700 px-3 py-2 text-center w-[80px] ${
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
          <p className="text-yellow-400">Brak danych dla różnych volume.</p>
        )}
      </section>

      {/* 3. Dev krzywa z ogonem (symulacja) */}
      <section>
        <h2 className="text-xl font-bold mb-4">3. Dev krzywa z ogonem</h2>
        {simResults ? (
          <div className="relative w-full max-w-full overflow-x-auto rounded-xl">
            <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-10">
                    Krzywa
                  </th>
                  {dpKeys.map((dpKey) => (
                    <th
                      key={dpKey}
                      className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px] text-center whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                      {dpKey}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {curveNames.map((curve) => (
                  <tr key={curve}>
                    <td className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-0 z-10">
                      {curve}
                    </td>
                    {dpKeys.map((dpKey, i) => {
                      const val = simResults[curve]?.[dpKey];
                      return (
                        <td
                          key={i}
                          className="border border-gray-700 px-3 py-2 text-center w-[80px] whitespace-nowrap overflow-hidden text-ellipsis"
                        >
                          {typeof val === 'number' ? val.toFixed(6) : '-'}
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
            Ogon: {tailCount} obserwacji (liczba dopisana przy symulacji).
          </p>
        )}
      </section>
    </div>
  );
}
