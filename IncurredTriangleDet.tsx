'use client';

import { useEffect } from 'react';
import { TableData } from '@/components/TableData';

/* ▼ store z arkuszem Incurred */
import { useIncurredTableStore } from '@/stores/useIncurredTableStore';

/* ▼ store deterministyczny Incurred */
import { useTrainDevideStoreDetIncurred } from '@/stores/trainDevideStoreDeterministycznyIncurred';

export default function IncurredTriangleDet() {
  /* ── 1. dane ze stanu loadera XLSX ─────────────────────────── */
  const isValid = useIncurredTableStore((s) => s.isValid);
  const json    = useIncurredTableStore((s) => s.selectedSheetJSON);

  /* ── 2. trójkąt Incurred w głównym store (↓ patrz pkt 2) ────── */
  const incurredTriangle    = useTrainDevideStoreDetIncurred((s) => s.incurredTriangle);
  const setIncurredTriangle = useTrainDevideStoreDetIncurred((s) => s.setIncurredTriangle);

  /* ── 3. kiedy mamy poprawny arkusz → czyścimy i zapisujemy ──── */
  useEffect(() => {
    if (
      isValid &&
      json &&
      (!incurredTriangle || incurredTriangle.length === 0)
    ) {
      /* wycinamy nagłówki (wiersz 0 i kolumna 0) + parsujemy liczby */
      const numericData = (json as any[][])
        .slice(1)
        .map((row) =>
          row.slice(1).map((cell) => {
            const num = typeof cell === 'string' ? parseFloat(cell) : cell;
            return isNaN(num) ? null : num;
          })
        );

      setIncurredTriangle(numericData);
      localStorage.setItem(
        'incurredTriangleCache',
        JSON.stringify(numericData)
      );
      console.log(
        '[IncurredTriangleDet] setIncurredTriangle → OK (oczyszczone)'
      );
    }
  }, [isValid, json, incurredTriangle, setIncurredTriangle]);

  /* ── 4. brak / błąd danych ─────────────────────────────────── */
  if (!isValid || !json) {
    return (
      <p className="text-gray-400">
        Brak danych – wczytaj plik i kliknij{' '}
        <strong>Wybierz</strong> w zakładce Incurred.
      </p>
    );
  }

  /* ── 5. podgląd tabeli – zamieniamy null/'' na '' dla estetyki ─ */
  const table = (json as any[][]).map((row) =>
    row.map((c) => (c === '' ? '' : c))
  );

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-bold mb-4">
        Trójkąt Incurred – wczytane dane
      </h2>
      <TableData data={table} />
    </div>
  );
}
