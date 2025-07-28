'use client';

import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';

interface Props {
  data: (string | number)[][];
  weights?: number[][];
  selectedCells?: [number, number][];
  onClick?: (i: number, j: number) => void;
}

export function TableDataDet({ data, weights, selectedCells = [], onClick }: Props) {
  const toggleWeight = useTrainDevideStoreDet((s) => s.toggleWeightCellDet); // 🆕 używamy store

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

                const isShaded =
                  !isHeader &&
                  !isEmpty &&
                  weights?.[i - 1]?.[j - 1] === 0;

                const isSelected = selectedCells.some(
                  ([rowIdx, colIdx]) => rowIdx === i - 1 && colIdx === j - 1
                );

                const content =
                  typeof cell === 'number'
                    ? new Intl.NumberFormat('pl-PL', {
                        maximumFractionDigits: 6,
                      }).format(cell)
                    : isEmpty
                    ? '-'
                    : cell;

                const baseStyle = `
                  px-4 py-2 border border-slate-600 whitespace-nowrap transition-colors duration-200 cursor-pointer
                `;

const cellStyle = isHeaderRow
  ? 'bg-slate-800 text-white font-semibold uppercase'
  : isHeaderCol
  ? 'bg-slate-800 font-bold text-slate-400'
  : isEmpty
  ? 'bg-slate-900 text-slate-500'
  : weights?.[i - 1]?.[j - 1] === 1
  ? 'bg-[#3b228f] text-white' // 🟣 fioletowe podświetlenie dla aktywnych wag
  : 'bg-gray-800 text-slate-500'; // ❌ nieaktywna lub niekliknięta



                return (
                  <td
                    key={j}
                    onClick={() => {
                      if (!isHeader) {
                        toggleWeight(i - 1, j - 1); // 🆕 klik = toggle wagi
                        if (onClick) onClick(i - 1, j - 1); // zachowujemy dodatkową obsługę jeśli potrzebna
                      }
                    }}
                    className={`${baseStyle} ${cellStyle}`}
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
