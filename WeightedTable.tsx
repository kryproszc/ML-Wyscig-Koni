'use client';

import { useState, useMemo, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type Row = {
  paid: number;
  incurred: number;
};

type Weight = {
  wPaid: number;
  wInc: number;
};

type EnrichedRow = Row & Weight & { sum: number };

/**
 * Struktura wierszy eksportowanych do Excela (używa etykiet kolumnowych).
 */
interface ExcelRow {
  Paid: number | string;
  'Waga paid': number | string;
  Incurred: number | string;
  'Waga incurred': number | string;
  Sum: number | string;
}

interface Props {
  rows: Row[];
  onChange?: (rows: EnrichedRow[], grandTotal: number) => void;
  /** Opcjonalna nazwa pliku XLSX, domyślnie `weighted_table.xlsx` */
  fileName?: string;
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export default function WeightedTable({ rows, onChange, fileName = 'weighted_table.xlsx' }: Props) {
  const [weights, setWeights] = useState<Weight[]>(() =>
    rows.map(() => ({ wPaid: 1, wInc: 1 }))
  );

  // ▸ Synchronizuj długość tablic przy zmianie `rows`
  useEffect(() => {
    setWeights((prev) => rows.map((_, i) => prev[i] ?? { wPaid: 1, wInc: 1 }));
  }, [rows.length]);

  // ▸ Zmiana wag
  const handleWeightChange = (
    rowIdx: number,
    field: keyof Weight,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const num = parseFloat(e.target.value);
    setWeights((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        [field]: Number.isFinite(num) ? num : 0,
      } as Weight;
      return next;
    });
  };

  // ▸ Enrichment + total
  const { enrichedRows, grandTotal } = useMemo(() => {
    const merged: EnrichedRow[] = rows.map((row, i) => {
      const { wPaid, wInc } = weights[i] ?? { wPaid: 1, wInc: 1 };
      const sum = row.paid * wPaid + row.incurred * wInc;
      return { ...row, wPaid, wInc, sum };
    });
    const total = merged.reduce((acc, r) => acc + r.sum, 0);
    return { enrichedRows: merged, grandTotal: total };
  }, [rows, weights]);

  // ▸ Callback do rodzica
  useEffect(() => {
    if (onChange) onChange(enrichedRows, grandTotal);
  }, [enrichedRows, grandTotal, onChange]);

  // ──────────────────────────────────────
  // Excel export ↓↓↓
  // ──────────────────────────────────────
  const handleExport = () => {
    // 1. Dane → ExcelRow[]
    const data: ExcelRow[] = enrichedRows.map(({ paid, wPaid, incurred, wInc, sum }) => ({
      Paid: paid,
      'Waga paid': wPaid,
      Incurred: incurred,
      'Waga incurred': wInc,
      Sum: sum,
    }));

    // 2. Dodaj wiersz z sumą ważoną
    data.push({ Paid: '', 'Waga paid': '', Incurred: '', 'Waga incurred': 'TOTAL', Sum: grandTotal });

    // 3. SheetJS magic
    const ws = XLSX.utils.json_to_sheet(data, {
      header: ['Paid', 'Waga paid', 'Incurred', 'Waga incurred', 'Sum'],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'WeightedTable');
    XLSX.writeFile(wb, fileName);
  };

  // ──────────────────────────────────────
  // UI
  // ──────────────────────────────────────
  const TABLE_HEADERS = ['Paid', 'Waga paid', 'Incurred', 'Waga incurred', 'Sum'];

  return (
    <div className="overflow-x-auto rounded-lg shadow-md">
      {/* ▸ Przycisk eksportu */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition"
        >
          ⬇️ Eksportuj Excel
        </button>
      </div>

      <table className="min-w-full border-collapse border border-gray-700 rounded-lg">
        <thead className="bg-gray-800 text-gray-300 uppercase text-xs tracking-wider divide-x divide-gray-700">
          <tr>
            {TABLE_HEADERS.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-2 text-center border border-gray-700"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-700">
          {enrichedRows.map((row, i) => (
            <tr
              key={i}
              className={clsx(
                i % 2 ? 'bg-gray-700/40' : 'bg-gray-700/20',
                'hover:bg-gray-600/40 transition-colors'
              )}
            >
              {/* Paid */}
              <td className="px-4 py-2 text-right tabular-nums border border-gray-700">
                {row.paid.toLocaleString()}
              </td>

              {/* Waga paid */}
              <td className="px-4 py-2 border border-gray-700">
                <input
                  type="number"
                  step="0.01"
                  value={row.wPaid}
                  onChange={(e) => handleWeightChange(i, 'wPaid', e)}
                  className="w-24 bg-gray-800 rounded px-2 py-1 text-right border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </td>

              {/* Incurred */}
              <td className="px-4 py-2 text-right tabular-nums border border-gray-700">
                {row.incurred.toLocaleString()}
              </td>

              {/* Waga incurred */}
              <td className="px-4 py-2 border border-gray-700">
                <input
                  type="number"
                  step="0.01"
                  value={row.wInc}
                  onChange={(e) => handleWeightChange(i, 'wInc', e)}
                  className="w-24 bg-gray-800 rounded px-2 py-1 text-right border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </td>

              {/* Sum */}
              <td className="px-4 py-2 text-right tabular-nums font-semibold border border-gray-700">
                {row.sum.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="bg-gray-800 text-gray-300 font-semibold border-t border-gray-700">
            <td colSpan={4} className="px-4 py-2 text-right border border-gray-700">
              Suma ważona
            </td>
            <td className="px-4 py-2 text-right tabular-nums border border-gray-700">
              {grandTotal.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}