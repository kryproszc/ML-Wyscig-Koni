import { TableData } from '@/components/TableData';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const PaidTriangleDet = dynamic(() => import('./PaidTriangleDet'), { ssr: false });

export default function PaidViewTrian() {
  const triangle = useTrainDevideStoreDet((s) => s.paidTriangle);

  useEffect(() => {
    console.log('[PaidViewTrian] triangle:', triangle);
  }, [triangle]);

  if (!triangle) {
    return (
      <div className="space-y-4">
        <p className="text-gray-400 text-sm">
          Brak danych do wyświetlenia. Najpierw wczytaj plik poniżej.
        </p>
        <PaidTriangleDet />
      </div>
    );
  }

const colCount = triangle[0]?.length ?? 0;
const headerRow = ['-'].concat(Array.from({ length: colCount }, (_, i) => i.toString()));

const viewData = triangle.map((row, i) =>
  [i.toString(), ...row.map((cell) => (cell ?? '').toString())]
);


  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Podgląd danych – PaidViewTrian</h2>
      <TableData data={[headerRow, ...viewData]} />
    </div>
  );
}
