'use client';

import { TableData } from '@/components/TableData';
import { Button } from '@/components/ui/button';
import { useTableStore } from '@/stores/tableStore';
import { useMutation } from '@tanstack/react-query';
import { calcClCalcClPostMutation } from '@/client/@tanstack/react-query.gen';

export function PaidView(): React.ReactElement {
const {
  selectedSheetName: sheetName,
  selectedSheetJSON: sheetJSON,
  selectedCells,
  setSelectedCells,
  setProcessedData,
  setProcessedTriangle,
  setClData,
  setClWeights,
} = useTableStore();


  const mutation = useMutation({
    ...calcClCalcClPostMutation(),
onSuccess: (data) => {
  const parsed = data as { data: (string | number)[][] };

  const numericData = parsed.data.map((row) =>
    row.map((cell) => (typeof cell === 'number' ? cell : Number(cell) || 0))
  );

  const headerRow = (sheetJSON?.[0] ?? []).map((cell) => cell ?? "");
  const rowHeaders = (sheetJSON?.slice(1).map((row) => row[0] ?? "") ?? []);

  // 🚀 USUWAMY pierwszy wiersz i pierwszą kolumnę
  const trimmedNumericData = numericData.slice(1).map(row => row.slice(1));

  const clDataWithHeaders = [
    ["", ...headerRow.slice(1)],
    ...trimmedNumericData.map((row, idx) => [
      rowHeaders[idx] ?? "",
      ...row.map((cell) => cell ?? ""),
    ]),
  ];

  setProcessedData(trimmedNumericData);  // <- jeśli potrzebujesz dalej trimmed
  setProcessedTriangle(trimmedNumericData);  // <- też trimmed
  setClData(clDataWithHeaders);

  const defaultWeights = trimmedNumericData.map((row) =>
    row.map(() => 1)
  );
  setClWeights(defaultWeights);

  console.log('✅ Trójkąt przetworzony i zapisany do store.');
},



    onError: (err) => {
      console.error('❌ Błąd przetwarzania trójkąta:', err);
    },
  });

  const handleConfirm = (): void => {
    if (!sheetJSON || !selectedCells) return;

    mutation.mutate({
      body: {
        data: sheetJSON,
        selected: selectedCells,
      },
    });
  };

  const handleClick = (i: number, j: number) => {
    if (!selectedCells) return;

    const updated = selectedCells.map((row, rowIndex) =>
      rowIndex === i
        ? row.map((cell, colIndex) =>
            colIndex === j ? (cell === 1 ? 0 : 1) : cell
          )
        : [...row]
    );

    setSelectedCells(updated);
  };

  const resetSelection = () => {
    if (!sheetJSON) return;

    const newSelected = sheetJSON.map((row) =>
      row.map(() => 1)
    );

    setSelectedCells(newSelected);
  };

  if (!sheetJSON) {
    return <div className="text-red-400">Brak danych arkusza</div>;
  }

 return (
  <div className="flex flex-col gap-6 p-6">
    <div className="flex gap-6">
      {/* Panel boczny */}
      <div className="w-1/5 min-w-[200px] border border-gray-700 rounded p-4 bg-[#23232d] text-white/80 shadow-sm">
        <h4 className="font-semibold mb-4 text-white">Panel przycisków</h4>

        <button
          onClick={resetSelection}
          className="w-full px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
        >
          Resetuj zaznaczenia
        </button>

        <button
          onClick={handleConfirm}
          className="w-full px-4 py-2 mt-4 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
        >
          Zatwierdź trójkąt
        </button>
      </div>

      {/* Tabela */}
      <div className="flex-1">
        <h3 className="text-lg font-bold mb-4 text-white">Arkusz: {sheetName}</h3>
        <TableData
          data={sheetJSON}
          selected={selectedCells}
          onClick={(i, j) => handleClick(i, j)}
        />
      </div>
    </div>
  </div>
);
}