/* ------------------------------------------------------------------ */
/*                        DevSummaryLayout                           */
/* ------------------------------------------------------------------ */

import React, { useMemo, useEffect } from 'react'
import type { DevSummaryProps, OverrideMap } from '@/shared/types/developmentEnd'
import { DevSummarySidebar } from './DevSummarySidebar'
import { DevBasicTable } from './DevBasicTable'
import { SimulationTable } from './SimulationTable'
import { FinalTable } from './FinalTable'
import { 
  createDpHeaders, 
  createCombinedDevJ, 
  cleanBlockedOverrides 
} from '@/shared/utils/developmentEndUtils'

export function DevSummaryLayout({
  leftCount,
  setLeftCount,
  selectedCurve,
  setSelectedCurve,
  manualOverrides,
  setManualOverrides,
  sourceSwitches,
  setSourceSwitches,
  devJPreview,
  simResults,
  setCombinedDevJ,
  columnLabels,
  ultimateFromIndex,
  setUltimateFromIndex,
  onRemainingDevJHeaders
}: DevSummaryProps) {

  // Czyścimy ręczne nadpisania, jeśli wpadają do części zablokowanej
  useEffect(() => {
    const filteredOverrides = cleanBlockedOverrides(manualOverrides, leftCount)
    if (Object.keys(filteredOverrides).length !== Object.keys(manualOverrides).length) {
      setManualOverrides(filteredOverrides)
    }
  }, [leftCount, manualOverrides, setManualOverrides])

  // Czyścimy sourceSwitches, jeśli wpadają poza lewą część
  useEffect(() => {
    // Only filter if leftCount is properly set (> 0), otherwise preserve switches
    if (leftCount > 0) {
      const filteredSwitches: Record<number, { curve: string; value: number }> = {}
      Object.entries(sourceSwitches).forEach(([idxStr, switchData]) => {
        const idx = Number(idxStr)
        if (idx < leftCount) {
          filteredSwitches[idx] = switchData
        }
      })
      if (Object.keys(filteredSwitches).length !== Object.keys(sourceSwitches).length) {
        setSourceSwitches(filteredSwitches)
      }
    }
    // If leftCount is 0, don't filter - preserve existing switches
  }, [leftCount, sourceSwitches, setSourceSwitches])

  // Brak danych → nic nie wyświetlamy
  if (!simResults || !devJPreview?.length) {
    return <p className="text-gray-400 text-center">Brak danych do podsumowania.</p>
  }

  // Pomocnicze listy nagłówków dp
  const dpHeaders = useMemo(() => createDpHeaders(simResults), [simResults])

  // Kombinowany devJ
  const combinedDevJ = useMemo(() => 
    createCombinedDevJ(
      devJPreview,
      dpHeaders,
      leftCount,
      selectedCurve,
      simResults,
      manualOverrides,
      sourceSwitches
    ),
    [devJPreview, dpHeaders, leftCount, selectedCurve, simResults, manualOverrides, sourceSwitches]
  )

  // Udostępniamy podsumowanie innym zakładkom
  useEffect(() => {
    setCombinedDevJ(combinedDevJ)
  }, [combinedDevJ, setCombinedDevJ])

  const maxLen = Math.max(devJPreview.length, dpHeaders.length)

  // Callback do obsługi ręcznej edycji w FinalTable
  const handleManualEdit = (index: number) => {
    // Gdy użytkownik ręcznie edytuje wartość w FinalTable,
    // automatycznie odznacz wybór w sourceSwitches (tabela Initial Selection)
    if (sourceSwitches[index]) {
      const updated = { ...sourceSwitches }
      delete updated[index]
      setSourceSwitches(updated)
    }
  }

  // Handler dla ustawiania ultimate factors (współczynniki = 1.0)
  const handleSetUltimateFactors = (fromIndex: number) => {
    console.log(`🎯 Ustawianie ultimate factors od indeksu ${fromIndex} (pozycja ${fromIndex + 1})`)
    
    // Wyczyść wszystkie sourceSwitches od tego indeksu
    const filteredSwitches = { ...sourceSwitches }
    Object.keys(filteredSwitches).forEach(key => {
      const idx = Number(key)
      if (idx >= fromIndex) {
        delete filteredSwitches[idx]
      }
    })
    setSourceSwitches(filteredSwitches)
    
    // Utwórz ręczne nadpisania na 1.0 dla wszystkich pozycji od fromIndex
    const newOverrides = { ...manualOverrides }
    for (let i = fromIndex; i < maxLen; i++) {
      newOverrides[i] = {
        curve: 'manual',
        value: 1.0,
        previousState: {
          wasFromCurve: selectedCurve || 'Initial Selection',
          wasFromSourceSwitch: Boolean(sourceSwitches[i]),
          wasValue: sourceSwitches[i]?.value || (devJPreview?.[i]) || 1.0
        }
      }
    }
    setManualOverrides(newOverrides)
    
    console.log(`✅ Ustawiono ultimate factors dla ${maxLen - fromIndex} pozycji`)
  }

  // Handler dla resetowania ultimate factors
  const handleResetUltimateFactors = () => {
    console.log('🔄 Resetowanie ultimate factors')
    
    // Przywracamy poprzednie wartości z previousState
    const restoredOverrides = { ...manualOverrides }
    const restoredSwitches = { ...sourceSwitches }
    
    Object.entries(manualOverrides).forEach(([idx, override]) => {
      const index = Number(idx)
      if (override.previousState) {
        if (
          override.previousState.wasFromSourceSwitch &&
          override.previousState.wasFromCurve &&
          override.previousState.wasValue !== undefined
        ) {
          // Przywróć sourceSwitch
          restoredSwitches[index] = {
            curve: override.previousState.wasFromCurve,
            value: override.previousState.wasValue
          }
        }
        // Usuń ręczne nadpisanie
        delete restoredOverrides[index]
      }
    })
    
    setManualOverrides(restoredOverrides)
    setSourceSwitches(restoredSwitches)
    
    console.log('✅ Przywrócono poprzednie wartości')
  }

  // Statystyki nadpisań
  const sourceSwitchesCount = Object.keys(sourceSwitches).length

  return (
    <div className="flex w-full h-full gap-8 p-8">
      <DevSummarySidebar 
        leftCount={leftCount}
        setLeftCount={setLeftCount}
        sourceSwitchesCount={sourceSwitchesCount}
        onSetUltimateFactors={handleSetUltimateFactors}
        onResetUltimateFactors={handleResetUltimateFactors}
        ultimateFromIndex={ultimateFromIndex}
        setUltimateFromIndex={setUltimateFromIndex}
        maxLength={maxLen}
      />

      <div className="flex-1 flex flex-col gap-10 w-full overflow-x-auto">
        
        <DevBasicTable
          devJPreview={devJPreview}
          columnLabels={columnLabels}
          leftCount={leftCount}
          sourceSwitches={sourceSwitches}
          setSourceSwitches={setSourceSwitches}
          selectedCurve={selectedCurve}
          simResults={simResults}
          manualOverrides={manualOverrides}
          setManualOverrides={setManualOverrides}
        />

        <SimulationTable
          simResults={simResults}
          dpHeaders={dpHeaders}
          leftCount={leftCount}
          selectedCurve={selectedCurve}
          setSelectedCurve={setSelectedCurve}
          manualOverrides={manualOverrides}
          setManualOverrides={setManualOverrides}
          sourceSwitches={sourceSwitches}
          setSourceSwitches={setSourceSwitches}
        />

        <FinalTable
          combinedDevJ={combinedDevJ}
          maxLen={maxLen}
          leftCount={leftCount}
          columnLabels={columnLabels}
          manualOverrides={manualOverrides}
          setManualOverrides={setManualOverrides}
          sourceSwitches={sourceSwitches}
          setSourceSwitches={setSourceSwitches}
          selectedCurve={selectedCurve}
          devJPreview={devJPreview}
          simResults={simResults}
          onHeadersGenerated={onRemainingDevJHeaders}
          onManualEdit={handleManualEdit}
        />
      </div>
    </div>
  )
}
