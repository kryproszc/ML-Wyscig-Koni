import React from "react";

export type CorRowData = (string | number | null)[];

interface Props {
  data: CorRowData[];
}

export function TableDataCor({ data }: Props) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-700 shadow-md">
      <table className="min-w-full table-auto border-collapse">
        <tbody className="text-sm text-slate-200">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-800/30 transition-colors duration-200">
              {row.map((cell, j) => {
                const isAY = j === 0;
                const isEmpty = cell === null || cell === undefined || cell === '' || cell === '-';

                const content =
                  typeof cell === 'number'
                    ? new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 6 }).format(cell)
                    : isEmpty
                    ? '-'
                    : String(cell);

                return (
                  <td
                    key={j}
                    className={`px-4 py-2 border border-slate-600 whitespace-nowrap transition-colors duration-200
                      ${
                        isAY
                          ? "bg-slate-800 font-bold text-slate-400"
                          : "bg-slate-800 brightness-75"
                      }
                    `}
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
