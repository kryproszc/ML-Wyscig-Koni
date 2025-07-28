'use client';

import {
  useTrainDevideStoreDetIncurred,
} from '@/stores/trainDevideStoreDeterministycznyIncurred';

interface Props {
  data: (string | number)[][];
  weights?: number[][];
  selectedCells?: [number, number][];
  onClick?: (i: number, j: number) => void;
}

export function TableDataDetIncurred({
  data,
  weights,
  selectedCells = [],
  onClick,
}: Props) {
  /* ▼ akcja ze store Incurred */
  const toggleWeight = useTrainDevideStoreDetIncurred(
    (s) => s.toggleWeightCellDetIncurred
  );

  return (
    <div className="overflow-auto rounded-xl border border-slate-700 shadow-md">
      <table className="min-w-full table-fixed border border-slate-600">
        <tbody className="text-sm text-slate-200">
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-600 hover:bg-slate-800/30 transition-colors duration-200"
            >
              {row.map((cell, j) => {
                const isHeaderRow = i === 0;
                const isHeaderCol = j === 0;
                const isHeader = isHeaderRow || isHeaderCol;

                const isEmpty =
                  cell === null || cell === undefined || cell === '' || cell === '-';

                const isSelected = selectedCells.some(
                  ([r, c]) => r === i - 1 && c === j - 1
                );

                const content =
                  typeof cell === 'number'
                    ? new Intl.NumberFormat('pl-PL', {
                        maximumFractionDigits: 6,
                      }).format(cell)
                    : isEmpty
                    ? '-'
                    : cell;

                /* kolory */
                const cellStyle = isHeaderRow
                  ? 'bg-slate-800 text-white font-semibold uppercase'
                  : isHeaderCol
                  ? 'bg-slate-800 font-bold text-slate-400'
                  : isEmpty
                  ? 'bg-slate-900 text-slate-500'
                  : weights?.[i - 1]?.[j - 1] === 1
                  ? 'bg-[#3b228f] text-white' // aktywna waga
                  : 'bg-gray-800 text-slate-500'; // nieaktywna

                return (
                  <td
                    key={j}
                    className={`
                      px-4 py-2 border border-slate-600 whitespace-nowrap
                      transition-colors duration-200 cursor-pointer
                      ${cellStyle}
                    `}
                    onClick={() => {
                      if (!isHeader) {
                        toggleWeight(i - 1, j - 1); // zmiana wagi w store
                        onClick?.(i - 1, j - 1);     // ewentualny callback rodzica
                      }
                    }}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
