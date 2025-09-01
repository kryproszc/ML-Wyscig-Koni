'use client';

import { useMemo } from 'react';
import { useTrainDevideStoreDetIncurred } from '@/stores/trainDevideStoreDeterministycznyIncurred';

interface Props {
  data: (string | number)[][];
  weights?: number[][];
  selectedCells?: [number, number][];
  minMaxCells?: [number, number][];
  minCells?: [number, number][];
  maxCells?: [number, number][];
  onClick?: (i: number, j: number) => void;
  onToggleRow?: (rowIndex: number) => void;
  showRowToggle?: boolean;
}

export function TableDataDetIncurred({ 
  data, 
  weights, 
  selectedCells = [], 
  minMaxCells = [], 
  minCells = [], 
  maxCells = [], 
  onClick,
  onToggleRow,
  showRowToggle = false 
}: Props) {
  const toggleWeight = useTrainDevideStoreDetIncurred((s) => s.toggleWeightCellDetIncurred);
  const decimalPlaces = useTrainDevideStoreDetIncurred((s) => s.decimalPlaces);

  // Funkcja formatowania liczb
  const formatNumber = (cell: string | number): string => {
    if (typeof cell === 'number') {
      return cell.toFixed(decimalPlaces);
    }
    if (typeof cell === 'string' && !isNaN(Number(cell)) && cell !== '') {
      return Number(cell).toFixed(decimalPlaces);
    }
    return String(cell);
  };

  // Debug - sprawdźmy co otrzymujemy
  console.log('🎯 TableDataDetIncurred received:', { 
    minCells: minCells.length, 
    maxCells: maxCells.length,
    minCellsData: minCells,
    maxCellsData: maxCells,
    weightsLength: weights?.length || 0,
    dataLength: data?.length || 0
  });

  const handleCellClick = (i: number, j: number) => {
    if (i === 0 || j === 0) return; // Nie pozwalamy kliknąć w nagłówki
    
    // Sprawdzamy czy komórka ma liczbową wartość (nie pustą)
    const cell = data[i]?.[j];
    if (cell === null || cell === undefined || cell === '' || cell === '-') return;
    
    console.log(`Kliknięto komórkę Incurred [${i}, ${j}]`);
    toggleWeight(i - 1, j - 1); // Odejmujemy 1 bo nagłówki dodają offset
    
    if (onClick) {
      onClick(i, j);
    }
  };

  const handleRowToggle = (rowIndex: number) => {
    if (rowIndex === 0 || !onToggleRow) return; // Nie pozwalamy na nagłówek
    onToggleRow(rowIndex - 1); // Odejmujemy 1 bo nagłówki dodają offset
  };

  // Memoizujemy stany zaznaczenia wierszy aby React wiedział o zmianach
  const rowSelectionStates = useMemo(() => {
    if (!weights || !data) return new Map<number, boolean>();
    
    const states = new Map<number, boolean>();
    
    for (let i = 1; i < data.length; i++) { // Zaczynamy od 1 bo 0 to nagłówek
      const weightRow = weights[i - 1];
      const dataRow = data[i];
      
      if (!weightRow || !dataRow) {
        states.set(i, false);
        continue;
      }
      
      let hasAnyData = false;
      let allSelected = true;
      
      for (let j = 1; j < dataRow.length; j++) { // Zaczynamy od 1 bo 0 to nagłówek
        const cell = dataRow[j];
        const hasData = cell !== null && cell !== undefined && cell !== '' && cell !== '-' && typeof cell !== 'undefined';
        
        if (hasData) {
          hasAnyData = true;
          if (weightRow[j - 1] !== 1) { // j-1 bo weights nie ma kolumny nagłówka
            allSelected = false;
            break;
          }
        }
      }
      
      states.set(i, hasAnyData && allSelected);
    }
    
    return states;
  }, [weights, data]);

  // Sprawdzamy czy cały wiersz jest zaznaczony - teraz używa memoizowanego stanu
  const isRowSelected = (rowIndex: number): boolean => {
    if (rowIndex === 0) return false;
    return rowSelectionStates.get(rowIndex) || false;
  };

  return (
    <div className="overflow-x-auto bg-gray-900 rounded-lg">
      <table className="min-w-full text-sm border-collapse">
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {/* Kolumna z checkbox dla wierszy (tylko jeśli showRowToggle jest true) */}
              {showRowToggle && (
                <td className="p-2 text-center bg-gray-700 border border-white/20">
                  {i === 0 ? (
                    <span className="text-white font-semibold text-xs">Cały wiersz</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={isRowSelected(i)}
                      onChange={() => handleRowToggle(i)}
                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    />
                  )}
                </td>
              )}
              
              {row.map((cell, j) => {
                const isHeaderRow = i === 0;
                const isHeaderCol = j === 0;
                const isHeader = isHeaderRow || isHeaderCol;
                
                // Sprawdzamy czy komórka ma dane liczbowe (nie pusta)
                const hasData = !isHeader && cell !== null && cell !== undefined && cell !== '' && cell !== '-';
                
                // Sprawdzamy czy komórka jest minimum lub maksimum
                const isMin = minCells?.some(([minI, minJ]) => minI === i && minJ === j);
                const isMax = maxCells?.some(([maxI, maxJ]) => maxI === i && maxJ === j);

                // Debug tylko dla min/max
                if (isMin || isMax) {
                  console.log(`🔍 Min/Max komórka Incurred [${i}, ${j}]:`, { isMin, isMax, cell, hasData });
                }

                const cellStyle = isHeader
                  ? 'bg-gray-700 text-white font-semibold'
                  : hasData
                  ? weights?.[i - 1]?.[j - 1] === 1
                    ? isMin
                      ? 'bg-[#3b228f] text-white shadow-lg shadow-green-500/50' // 🟢 bez border tutaj
                      : isMax
                      ? 'bg-[#3b228f] text-white shadow-lg shadow-red-500/50' // 🔴 bez border tutaj
                      : 'bg-[#3b228f] text-white' // 🟣 fioletowe podświetlenie dla aktywnych wag
                    : 'bg-gray-800 text-slate-500' // ❌ nieaktywna lub niekliknięta
                  : 'bg-gray-900 text-gray-600'; // 🚫 pusta komórka - ciemniejsza

                // Dynamiczne obramowanie - priorytet dla min/max
                const borderStyle = isMin
                  ? 'border-4 border-green-500' // 🟢 zielone obramowanie dla minimum
                  : isMax
                  ? 'border-4 border-red-500' // 🔴 czerwone obramowanie dla maksimum
                  : 'border border-white/20'; // ⚪ standardowe białe obramowanie

                return (
                  <td
                    key={j}
                    className={`
                      p-2 text-center transition-all duration-200
                      ${cellStyle}
                      ${borderStyle}
                      ${hasData ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                    `}
                    onClick={hasData ? () => handleCellClick(i, j) : undefined}
                  >
                    {isHeader ? cell : formatNumber(cell)}
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
