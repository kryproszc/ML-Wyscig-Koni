'use client';

import { useEffect, useState } from 'react';
import { TableData } from '@/components/TableData';
import type { RowData } from '@/types/table';

const incurredTriangle = [
  [5020, 9300, 11700, 12500, 14150, 16650, 18300, 18900, 19100, 19220],
  [250, 4650, 5990, 11100, 14200, 16250, 15900, 16600, 17050, null],
  [3890, 9700, 14850, 16800, 19350, 22900, 23550, 24250, null, null],
  [6050, 12200, 16600, 21800, 24100, 26750, 27700, null, null, null],
  [1350, 10100, 16150, 22600, 26400, 26650, null, null, null, null],
  [1750, 6900, 12350, 13600, 16400, null, null, null, null, null],
  [620, 4400, 11500, 12850, null, null, null, null, null, null],
  [1000, 7400, 13650, null, null, null, null, null, null, null],
  [3000, 5800, null, null, null, null, null, null, null, null],
  [1000, null, null, null, null, null, null, null, null, null],
];

export default function IncurredTriangleDet() {
  const [triangleData, setTriangleData] = useState<RowData[]>([]);

  useEffect(() => {
    setTriangleData([
      ['AY', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      ...incurredTriangle.map((row, i) => [
        String(i),
        ...row.map((cell) => (cell === null ? '' : cell)),
      ]),
    ]);
  }, []);

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-bold mb-4">Trójkąt Incurred – dane demo</h2>
      {triangleData.length > 0 ? (
        <TableData data={triangleData} />
      ) : (
        <p className="text-red-400">Brak danych trójkąta</p>
      )}
    </div>
  );
}
