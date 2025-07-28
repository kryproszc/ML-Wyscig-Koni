'use client';

import { useEffect } from 'react';
import { useDetailTableStore } from '@/stores/useDetailTableStore';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';
import { TableData } from '@/components/TableData';

export default function PaidTriangleDet() {
  const isValid = useDetailTableStore((s) => s.isValid);
  const json = useDetailTableStore((s) => s.selectedSheetJSON);

  const paidTriangle = useTrainDevideStoreDet((s) => s.paidTriangle);
  const setPaidTriangle = useTrainDevideStoreDet((s) => s.setPaidTriangle);

useEffect(() => {
  if (isValid && json && (!paidTriangle || paidTriangle.length === 0)) {
    const numericData = json
      .slice(1) // pomijamy pierwszy wiersz (nagłówki kolumn)
      .map((row) =>
        row
          .slice(1) // pomijamy pierwszą kolumnę (etykiety wierszy)
          .map((cell) => {
            const num = typeof cell === 'string' ? parseFloat(cell) : cell;
            return isNaN(num) ? null : num;
          })
      );

    setPaidTriangle(numericData);
    localStorage.setItem('paidTriangleCache', JSON.stringify(numericData));
    console.log('[PaidTriangleDet] setPaidTriangle → OK (oczyszczone)');
  }
}, [isValid, json]);


  if (!isValid || !json) {
    return (
      <p className="text-gray-400">
        Brak danych – wczytaj plik i kliknij <strong>Wybierz</strong> w zakładce Paid.
      </p>
    );
  }

  const table = json.map((row) => row.map((c) => (c === '' ? '' : c)));

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-bold mb-4">Trójkąt Paid – wczytane dane</h2>
      <TableData data={table} />
    </div>
  );
}
