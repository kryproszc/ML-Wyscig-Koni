/* ------------------------------------------------------------------ */
/*            DevJSelectorIncurredSummaryTab.tsx ( ~340 linii )       */
/* ------------------------------------------------------------------ */
'use client'

import React, { useMemo, useState, useEffect } from 'react'

/* ▼ STORE – INCURRED */
import {
  useTrainDevideStoreDetIncurred,
  type TrainDevideStoreDetIncurred,
} from '@/stores/trainDevideStoreDeterministycznyIncurred'

/* Typ rekordu override’ów w store (zgodny z Paid) */
type OverrideMap = Record<number, { curve: string; value: number }>

export default function DevJSelectorIncurredSummaryTab() {
  /* ───── pola & akcje ze store’a ─────────────────────────────────────────── */
  const leftCount            = useTrainDevideStoreDetIncurred((s) => s.leftCountSummary)
  const setLeftCount         = useTrainDevideStoreDetIncurred((s) => s.setLeftCountSummary)

  const selectedCurve        = useTrainDevideStoreDetIncurred((s) => s.selectedCurveSummary)
  const setSelectedCurve     = useTrainDevideStoreDetIncurred((s) => s.setSelectedCurveSummary)

  const manualOverrides      = useTrainDevideStoreDetIncurred((s) => s.manualOverridesSummary)
  const setManualOverrides   = useTrainDevideStoreDetIncurred((s) => s.setManualOverridesSummary)

  const devJPreview          = useTrainDevideStoreDetIncurred((s) => s.devJPreview)
  const simResults           = useTrainDevideStoreDetIncurred((s) => s.simResults)

  const setCombinedDevJ      = useTrainDevideStoreDetIncurred((s) => s.setCombinedDevJSummary)

  /* ───── stan lokalny (ręczna edycja w tabeli „Pozostawione dev_j”) ──────── */
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue,    setEditValue]    = useState<string>('')

  /* ───── gdy zmieniamy leftCount → czyścimy override’y, które wpadają pod blokadę */
  useEffect(() => {
    const filtered = Object.fromEntries(
      Object.entries(manualOverrides).filter(
        ([idx, cell]) => Number(idx) >= leftCount || cell.curve === 'manual',
      ),
    ) as OverrideMap

    if (Object.keys(filtered).length !== Object.keys(manualOverrides).length) {
      setManualOverrides(filtered)
    }
  }, [leftCount]) // jedyna zależność

  /* ───── nagłówki „dp: n” ────────────────────────────────────────────────── */
  const dpHeaders = useMemo(() => {
    if (!simResults) return []
    const set = new Set<string>()
    Object.values(simResults).forEach((curve) =>
      Object.keys(curve).forEach((k) => set.add(k)),
    )
    return Array.from(set).sort((a, b) => {
      const num = (s: string) => parseInt((s.split(':')[1] ?? '0').trim(), 10)
      return num(a) - num(b)
    })
  }, [simResults])

  /* ───── łączymy: devJPreview | wybrana krzywa | overrides ───────────────── */
  const combinedDevJ = useMemo<(number | string)[]>(() => {
    if (!devJPreview) return []

    const maxLen = Math.max(devJPreview.length, dpHeaders.length)
    const arr: (number | string)[] = Array(maxLen).fill('-')

    /* 1. lewa „pozostawiona” część z devJPreview */
    for (let i = 0; i < Math.min(leftCount, maxLen); i++) {
      const v = devJPreview[i]
      arr[i] = v !== undefined ? v.toFixed(6) : '-'
    }

    /* 2. prawa część z wybranej krzywej */
    if (selectedCurve && simResults?.[selectedCurve]) {
      for (let i = leftCount; i < maxLen; i++) {
        const dpKey = `dp: ${i + 1}`
        const v = simResults[selectedCurve]?.[dpKey]
        if (Number.isFinite(v)) arr[i] = (v as number).toFixed(6)
      }
    }

    /* 3. overrides – najwyższy priorytet */
    Object.entries(manualOverrides).forEach(([idxStr, cell]) => {
      const idx = Number(idxStr)
      if (idx < maxLen && Number.isFinite(cell.value)) {
        arr[idx] = cell.value.toFixed(6)
      }
    })

    return arr
  }, [devJPreview, dpHeaders, leftCount, selectedCurve, simResults, manualOverrides])

  /* udostępniamy podsumowanie innym zakładkom */
  useEffect(() => {
    setCombinedDevJ(combinedDevJ)
  }, [combinedDevJ, setCombinedDevJ])

  /* ───── brak danych? ───────────────────────────────────────────────────── */
  if (!devJPreview?.length || !simResults) {
    return (
      <p className="text-gray-400 text-center">
        Brak danych do podsumowania.
      </p>
    )
  }

  const maxLen = Math.max(devJPreview.length, dpHeaders.length)

  /* ───────────────────────────── RENDER ─────────────────────────────────── */
  return (
    <div className="flex w-full h-full">
      {/* ---------- SIDEBAR ---------- */}
      <aside className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-6">
        <h3 className="text-lg font-semibold">Ustawienia</h3>

        <label className="flex flex-col gap-2 text-sm font-medium">
          <span>Ilość pozostawionych</span>
          <input
            type="number"
            min={0}
            value={leftCount}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!Number.isNaN(n) && n >= 0) setLeftCount(n)
            }}
            className="bg-gray-600 border border-gray-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
          />
        </label>
      </aside>

      {/* ---------- MAIN ---------- */}
      <div className="flex-1 flex flex-col gap-10 w-full p-6 overflow-x-auto">
        {/* 1. Dev podstawowe */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-center">1. Dev podstawowe</h2>
          <div className="relative overflow-x-auto rounded-xl">
            <table className="min-w-max border-collapse bg-gray-900 rounded-xl shadow-md text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800">‑</th>
                  {devJPreview.map((_, i) => (
                    <th key={i} className="border border-gray-700 px-3 py-2 bg-gray-800">
                      j={i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 bg-gray-800">dev_j</td>
                  {devJPreview.map((v, i) => (
                    <td
                      key={i}
                      className={`border border-gray-700 px-3 py-2 text-center ${
                        i < leftCount ? 'bg-green-700/70' : ''
                      }`}
                    >
                      {v !== undefined ? v.toFixed(6) : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Symulacja krzywych CL */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-center">Symulacja krzywych CL</h2>
          <div className="relative overflow-x-auto rounded-xl">
            <table className="min-w-max table-fixed border-collapse bg-gray-900 shadow-md text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800 sticky left-0 z-20">
                    Wybór
                  </th>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800 sticky left-[62px] z-20">
                    Krzywa
                  </th>
                  {dpHeaders.map((dp) => (
                    <th key={dp} className="border border-gray-700 px-3 py-2 bg-gray-800 w-[80px]">
                      {dp}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Object.entries(simResults).map(([curve, vals]) => (
                  <tr key={curve} className="hover:bg-gray-800/40">
                    {/* radio */}
                    <td className="border border-gray-700 px-3 py-2 text-center sticky left-0 bg-gray-900 z-10">
                      <input
                        type="radio"
                        name="curve-select"
                        checked={selectedCurve === curve}
                        onChange={() => {
                          /* 1) ustaw nową krzywą */
                          setSelectedCurve(curve)

                          /* 2) usuń kliknięcia tej starej krzywej (ale zostaw manual + lewą część) */
                          const cleaned: OverrideMap = {}
                          Object.entries(manualOverrides).forEach(([k, cell]) => {
                            const idxNum = Number(k)
                            if (idxNum < leftCount || cell.curve === 'manual') {
                              cleaned[idxNum] = cell
                            }
                          })
                          if (
                            Object.keys(cleaned).length !==
                            Object.keys(manualOverrides).length
                          ) {
                            setManualOverrides(cleaned)
                          }
                        }}
                        className="form-radio text-blue-600 bg-gray-700 border-gray-600"
                      />
                    </td>

                    {/* nazwa */}
                    <td className="border border-gray-700 px-3 py-2 bg-gray-800 font-semibold sticky left-[62px] z-10">
                      {curve}
                    </td>

                    {/* wartości dp */}
                    {dpHeaders.map((dpKey, idx) => {
                      const val = (vals as Record<string, number | undefined>)[dpKey]
                      const blocked   = idx < leftCount
                      const isManual  = manualOverrides[idx]?.curve === curve
                      const rowSel    = selectedCurve === curve

                      /* tło */
                      const bg =
                        blocked
                          ? isManual
                            ? 'bg-green-500/40'
                            : rowSel
                            ? 'bg-green-700/40'
                            : 'bg-gray-800/60'
                          : isManual
                          ? 'bg-green-500/70'
                          : rowSel && !manualOverrides[idx]
                          ? 'bg-green-700/70'
                          : ''

                      return (
                        <td
                          key={dpKey}
                          className={`border border-gray-700 px-3 py-2 w-[80px] text-center transition-colors ${
                            blocked ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'
                          } ${bg}`}
                          title={
                            blocked
                              ? 'Ta kolumna jest zablokowana (pozostawiona z lewej)'
                              : isManual
                              ? 'Ręcznie wybrana wartość – kliknij, aby usunąć'
                              : 'Kliknij, aby ustawić ręcznie'
                          }
                          onClick={() => {
                            if (blocked || !Number.isFinite(val)) return
                            const copy: OverrideMap = { ...manualOverrides }
                            if (isManual) delete copy[idx]
                            else copy[idx] = { curve, value: val as number }
                            setManualOverrides(copy)
                          }}
                        >
                          {Number.isFinite(val) ? (val as number).toFixed(6) : '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {!selectedCurve && (
              <p className="text-yellow-400 mt-4 text-center">
                Wybierz krzywą, aby uzupełnić współczynniki po pozycji {leftCount}.
              </p>
            )}
          </div>
        </section>

        {/* 3. Pozostawione dev_j */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-center">Pozostawione dev_j</h2>
          <div className="relative overflow-x-auto rounded-xl">
            <table className="min-w-max border-collapse bg-gray-900 rounded-xl shadow-md text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-800">‑</th>
                  {Array.from({ length: maxLen }).map((_, i) => (
                    <th key={i} className="border border-gray-700 px-3 py-2 bg-gray-800">
                      j={i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 bg-gray-800">
                    Dev_final_krzywa
                  </td>
                  {combinedDevJ.map((val, idx) => {
                    const editing = editingIndex === idx
                    return (
                      <td
                        key={idx}
                        className={`border border-gray-700 px-3 py-2 text-center ${
                          editing
                            ? 'bg-blue-900/50'
                            : 'hover:bg-gray-700/40 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (typeof val === 'string') return
                          setEditingIndex(idx)
                          setEditValue(val.toString())
                        }}
                      >
                        {editing ? (
                          <input
                            type="number"
                            step="any"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                              const num = parseFloat(editValue)
                              if (!Number.isNaN(num)) {
                                const cur = manualOverrides[idx]?.value
                                if (cur !== num) {
                                  setManualOverrides({
                                    ...manualOverrides,
                                    [idx]: { curve: 'manual', value: num },
                                  })
                                }
                              }
                              setEditingIndex(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Escape')
                                (e.target as HTMLInputElement).blur()
                            }}
                            className="w-full px-2 py-1 rounded bg-white text-black border border-blue-400 text-sm text-center shadow"
                          />
                        ) : (
                          val
                        )}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
