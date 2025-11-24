'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/Modal';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';
import { useLabelsStore } from '@/stores/useLabelsStore';

// 🎨 Funkcja formatowania liczb z separatorami tysięcy (spacje)
const formatNumber = (value: number | null): string => {
  if (value === null || value === undefined) return '';
  if (!Number.isFinite(value)) return '';
  
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// 🔢 Funkcja parsowania sformatowanej liczby
const parseFormattedNumber = (formattedValue: string): number | null => {
  if (!formattedValue || formattedValue.trim() === '') return null;
  
  const numericValue = formattedValue.replace(/\s/g, '');
  const parsed = Number(numericValue);
  
  return Number.isFinite(parsed) ? parsed : null;
};

type EditablePaidTriangleProps = {
  onSave?: (editedData: (number | null)[][]) => void;
  onCancel?: () => void;
  onFinalSave?: (editedData: (number | null)[][]) => void; // Zapis do store przy zamknięciu
  hasExistingCalculations?: () => boolean; // Sprawdzanie obliczeń
};

export const EditablePaidTriangle = forwardRef<
  { handleClose: () => void },
  EditablePaidTriangleProps
>(({ onSave, onCancel, onFinalSave, hasExistingCalculations }, ref) => {
  // Store data
  const paidTriangle = useTrainDevideStoreDet((s) => s.paidTriangle);
  const detRowLabels = useLabelsStore((s) => s.detRowLabels);
  const detColumnLabels = useLabelsStore((s) => s.detColumnLabels);

  // Local state
  const [editableData, setEditableData] = useState<(number | null)[][]>([]);
  const [originalData, setOriginalData] = useState<(number | null)[][]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [showCalculationsWarning, setShowCalculationsWarning] = useState(false);

  // Initialize data from store
  useEffect(() => {
    if (paidTriangle && paidTriangle.length > 0) {
      console.log('🔄 [EditablePaidTriangle] Inicjalizuję dane z paidTriangle:', paidTriangle.length, 'wierszy');
      
      const dataCopy = paidTriangle.map(row => [...row]);
      setEditableData(dataCopy);
      setOriginalData(dataCopy.map(row => [...row])); // Deep copy for comparison
      setHasChanges(false);
    }
  }, [paidTriangle]);



  // Handle cell value change
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    // Check if cell is below diagonal (shouldn't be editable)
    const isBelowDiagonal = rowIndex + colIndex >= editableData.length;
    if (isBelowDiagonal) {
      console.log('⚠️ Próba edycji komórki pod przekątną - zablokowana');
      return;
    }

    // Parse the value
    const parsedValue = value === '' ? null : parseFormattedNumber(value);
    
    // Validate
    if (value !== '' && parsedValue === null) {
      console.log('❌ Nieprawidłowa wartość:', value);
      return; // Invalid value, don't update
    }

    console.log(`🔄 Zmieniam komórkę [${rowIndex},${colIndex}] na:`, parsedValue);

    // Update the data
    const newData = [...editableData];
    if (newData[rowIndex]) {
      newData[rowIndex] = [...newData[rowIndex]];
      newData[rowIndex][colIndex] = parsedValue;
    }
    
    setEditableData(newData);
    
    // Check if there are changes
    const hasAnyChanges = newData.some((row, rIdx) => 
      row.some((cell, cIdx) => {
        const isBelowDiag = rIdx + cIdx >= newData.length;
        if (isBelowDiag) return false;
        return cell !== originalData[rIdx]?.[cIdx];
      })
    );
    
    setHasChanges(hasAnyChanges);
  };

  // Save changes locally (not to store yet)
  const handleSave = () => {
    console.log('💾 [EditablePaidTriangle] Zapisuję zmiany LOKALNIE (nie do store jeszcze):', editableData);
    
    // Reset change tracking - zmiany są "zapisane" lokalnie
    setOriginalData(editableData.map(row => [...row]));
    setHasChanges(false);
  };



  // Handle close attempt
  const handleClose = () => {
    if (hasChanges) {
      // Są niezapisane zmiany lokalnie
      console.log('⚠️ [EditablePaidTriangle] Użytkownik próbuje zamknąć z niezapisanymi zmianami lokalnie');
      setShowCloseWarning(true);
    } else {
      // Brak niezapisanych zmian - sprawdź czy są obliczenia w systemie
      const hasCalculations = hasExistingCalculations ? hasExistingCalculations() : false;
      
      if (hasCalculations) {
        console.log('⚠️ [EditablePaidTriangle] Są obliczenia w systemie - pokazuję ostrzeżenie o utracie obliczeń');
        setShowCalculationsWarning(true);
      } else {
        console.log('✅ [EditablePaidTriangle] Zamykanie - brak zmian i obliczeń');
        if (onCancel) {
          onCancel();
        }
      }
    }
  };

  // Expose handleClose to parent
  useImperativeHandle(ref, () => ({
    handleClose
  }));

  // Confirm close without saving
  const handleConfirmClose = () => {
    console.log('🚫 [EditablePaidTriangle] Potwierdzono zamknięcie bez zapisywania');
    setShowCloseWarning(false);
    
    // Restore original data before closing
    setEditableData(originalData.map(row => [...row]));
    setHasChanges(false);
    
    if (onCancel) {
      onCancel();
    }
  };

  // Cancel close warning
  const handleCancelClose = () => {
    console.log('🔄 [EditablePaidTriangle] Anulowano zamknięcie - kontynuowanie edycji');
    setShowCloseWarning(false);
  };

  // Confirm close and save to store (this will trigger calculations warning in parent)
  const handleConfirmCloseAndSave = () => {
    console.log('✅ [EditablePaidTriangle] Potwierdzono zamknięcie - zapisuję do store');
    setShowCalculationsWarning(false);
    
    // Zapisz dane do store (do analizy)
    if (onFinalSave) {
      onFinalSave(editableData);
    }
    
    // Zamknij modal
    if (onCancel) {
      onCancel();
    }
  };

  // Cancel calculations warning
  const handleCancelCalculationsWarning = () => {
    console.log('🔄 [EditablePaidTriangle] Anulowano - pozostają przy obecnych danych');
    setShowCalculationsWarning(false);
  };

  // Count modified cells
  const modifiedCellsCount = editableData.reduce((count, row, rowIndex) => {
    if (!row) return count;
    return count + row.reduce((rowCount: number, cell, colIndex) => {
      const isBelowDiagonal = rowIndex + colIndex >= editableData.length;
      if (isBelowDiagonal) return rowCount;
      
      const originalValue = originalData[rowIndex]?.[colIndex];
      return originalValue !== cell ? rowCount + 1 : rowCount;
    }, 0);
  }, 0);

  // If no data, show message
  if (!editableData || editableData.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-gray-400">Brak danych trójkąta paid do edycji. Najpierw wczytaj dane.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>✏️ Edycja trójkąta danych paid</span>
          <div className="flex gap-2">
            {hasChanges && (
              <Button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                ✅ Zapisz zmiany
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {hasChanges && (
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-600/30 rounded text-yellow-200 text-sm">
            ⚠️ <strong>Masz {modifiedCellsCount} niezapisanych zmian.</strong> 
            Zmodyfikowane komórki są podświetlone na pomarańczowo. 
            Kliknij "✅ Zapisz zmiany" aby je zachować.
          </div>
        )}
        
        <div className="overflow-auto border border-white/10 rounded max-h-[calc(100vh-200px)]">
          <table className="min-w-full text-sm text-white/90 border-collapse">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="bg-[#1e1e2f] px-3 py-2 font-semibold text-left border border-white/10 sticky left-0 z-30">
                  AY
                </th>
                {detColumnLabels.map((colLabel, colIndex) => (
                  <th 
                    key={colIndex} 
                    className="bg-[#1e1e2f] px-3 py-2 font-semibold text-center border border-white/10 min-w-[120px]"
                  >
                    {colLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="bg-[#1e1e2f] px-3 py-2 text-left text-white/80 font-medium border border-white/10 sticky left-0 z-10">
                    {detRowLabels[rowIndex] || `${1981 + rowIndex}`}
                  </td>
                  {row.map((cell, colIndex) => {
                    const isBelowDiagonal = rowIndex + colIndex >= editableData.length;
                    
                    return (
                      <td key={colIndex} className={`border border-white/10 p-0 ${isBelowDiagonal ? 'bg-slate-800' : 'bg-slate-800'}`}>
                        {isBelowDiagonal ? (
                          <div className="px-3 py-2 text-center text-white/40">-</div>
                        ) : (() => {
                          // Check if cell is modified
                          const originalValue = originalData[rowIndex]?.[colIndex];
                          const currentValue = cell;
                          const isModified = originalValue !== currentValue;
                          
                          return (
                            <input
                              type="text"
                              value={formatNumber(cell)}
                              onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                              className={`w-full px-3 py-2 text-center text-sm border-0 outline-0 focus:text-white transition-colors ${
                                isModified 
                                  ? 'bg-orange-900/40 text-orange-200 focus:bg-orange-800/30' 
                                  : 'bg-transparent text-white/90 focus:bg-blue-900/20'
                              }`}
                              placeholder=""
                              onFocus={(e) => e.target.select()}
                            />
                          );
                        })()}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <p>💡 Wskazówka: Możesz edytować wartości w trójkącie. Puste komórki oznaczają brak danych.</p>
          <p>Pamiętaj o kliknięciu "✅ Zapisz zmiany" aby zastosować modyfikacje w analizie.</p>
        </div>
      </CardContent>

      {/* Modal ostrzeżenia o niezapisanych zmianach */}
      <Modal
        title="Ostrzeżenie"
        message={`Masz ${modifiedCellsCount} niezapisanych zmian w trójkącie. Czy na pewno chcesz wyjść bez zapisywania? Wszystkie zmiany zostaną utracone.`}
        isOpen={showCloseWarning}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />

      {/* Modal ostrzeżenia o utracie obliczeń */}
      <Modal
        title="Ostrzeżenie"
        message="Aplikowanie edytowanych danych spowoduje utratę wszystkich obecnych obliczeń i wyników analizy. Czy na pewno chcesz kontynuować?"
        isOpen={showCalculationsWarning}
        onConfirm={handleConfirmCloseAndSave}
        onCancel={handleCancelCalculationsWarning}
      />
    </Card>
  );
});