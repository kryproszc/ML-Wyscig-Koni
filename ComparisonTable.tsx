import React from 'react';

type ComparisonTableProps = {
  data: any[];
  labelA?: string;
  labelB?: string;
};

const formatNumber = (val: any, isPercent = false) => {
  const num = Number(val);
  if (!isFinite(num)) return '-';

  const formatted = Math.round(num).toLocaleString('pl-PL');
  return isPercent ? `${formatted}\u00A0%` : formatted;
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ data, labelA, labelB }) => {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  const renamedColumns = columns.map((col) => {
    if (col === 'Projection A') return labelA || col;
    if (col === 'Projection B') return labelB || col;
    return col;
  });

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-bold mb-4">📊 Porównanie wyników</h2>
      <div className="overflow-x-auto rounded border border-gray-700 bg-gray-900 shadow">
        <table className="w-full table-auto text-base text-left">
          <thead className="bg-gray-800">
            <tr>
              {renamedColumns.map((label, i) => (
                <th key={i} className="px-4 py-3 border-b border-gray-700 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => {
              const isSumRow = row['Wiersz'] === 'Suma';

              return (
                <tr
                  key={rowIndex}
                  className={`hover:bg-gray-800 ${isSumRow ? 'font-bold bg-gray-800' : ''}`}
                >
                  {columns.map((key, colIndex) => {
                    const rawVal = row[key];

                    // Zastąp "Suma" etykietą
                    if (key === 'Wiersz' && rawVal === 'Suma') {
                      return (
                        <td key={colIndex} className="px-4 py-2 border-b border-gray-700">
                          SUMA
                        </td>
                      );
                    }

                    const isPercent = key.toLowerCase().includes('%');
                    const formatted = formatNumber(rawVal, isPercent);

                    return (
                      <td key={colIndex} className="px-4 py-2 border-b border-gray-700">
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
