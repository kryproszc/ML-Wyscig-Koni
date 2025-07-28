/* ------------------------------------------------------------------ */
/*                        IncurredWyniki.tsx                          */
/* ------------------------------------------------------------------ */
'use client'

import { useCallback, useState, useMemo } from 'react'
import {
  useTrainDevideStoreDetIncurred,
 // type DevJResultIncurred,          // <- jeśli masz osobny typ
} from '@/stores/trainDevideStoreDeterministycznyIncurred'
import Modal from '@/components/Modal'
import { ComparisonTable } from './ComparisonTable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function IncurredWyniki() {
  /* ─── modal brak‑danych ─────────────────────────────────────────── */
  const [showModal, setShowModal] = useState(false)

  /* ─── reactive dane ze store’a ──────────────────────────────────── */
  const selectedA            = useTrainDevideStoreDetIncurred(s => s.selectedDataA)
  const selectedB            = useTrainDevideStoreDetIncurred(s => s.selectedDataB)
  const setSelectedA         = useTrainDevideStoreDetIncurred(s => s.setSelectedDataA)
  const setSelectedB         = useTrainDevideStoreDetIncurred(s => s.setSelectedDataB)

  const simResults           = useTrainDevideStoreDetIncurred(s => s.simResults)          ?? {}
  const devJResults          = useTrainDevideStoreDetIncurred(s => s.devJResults)         ?? []
  const finalDevVector       = useTrainDevideStoreDetIncurred(s => s.finalDevVector)      ?? []
  const combinedDevJSummary  = useTrainDevideStoreDetIncurred(s => s.combinedDevJSummary) ?? []

  const comparisonTables     = useTrainDevideStoreDetIncurred(s => s.comparisonTables)
  const addComparisonTable   = useTrainDevideStoreDetIncurred(s => s.addComparisonTable)
  const clearComparisonTables= useTrainDevideStoreDetIncurred(s => s.clearComparisonTables)
  const removeComparisonTable= useTrainDevideStoreDetIncurred(s => s.removeComparisonTable)

  /* ─── opcje selecta (memo) ──────────────────────────────────────── */
  const allOptions = useMemo(() => [
    ...Object.keys(simResults).map(curve => ({
      type : 'curve',
      label: `Krzywa: ${curve}`,
      key  : `curve-${curve}`,
    })),
    ...devJResults.map(d => ({
      type : 'volume',
      label: `Volume ${d.volume}${d.subIndex !== undefined ? ` (v${d.subIndex + 1})` : ''}`,
      key  : `volume-${d.volume}-${d.subIndex ?? 0}`,
    })),
    ...(combinedDevJSummary.length
      ? [{ type: 'devj', label: 'Pozostawione dev_j (combined)', key: 'final-dev-j' }]
      : []),
    ...(finalDevVector.length
      ? [{ type: 'devj_raw', label: 'Raw finalDevVector', key: 'final-dev-raw' }]
      : []),
  ], [simResults, devJResults, combinedDevJSummary, finalDevVector])

  /** map <key> → <etykieta> (też zmienny, więc useMemo) */
  const keyToLabel = useMemo(
    () => Object.fromEntries(allOptions.map(o => [o.key, o.label])),
    [allOptions],
  )

  /* ─── budujemy payload zależnie od klucza ───────────────────────── */
  const buildPayload = (key: string | null) => {
    if (!key) return null

    // 1. krzywa CL
    if (key.startsWith('curve-')) {
      const curve = key.replace('curve-', '')
      const raw   = simResults[curve]
      if (!raw) return null
      const coeffs = Object.values(raw)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      return { curve_name: curve, coeffs }
    }

    // 2. dev_j z volume
    if (key.startsWith('volume-')) {
      const [_, volStr] = key.split('-')
      const vol = parseInt(volStr ?? '', 10)
      const found = devJResults.find(v => v.volume === vol)
      return found ? { volume: found.volume, values: found.values } : null
    }

    // 3. wektor combined lub raw
    if (key === 'final-dev-j') {
      const cleaned = combinedDevJSummary
        .map(v => Number(v))
        .filter(v => Number.isFinite(v))
      return { final_dev_vector: cleaned }
    }
    if (key === 'final-dev-raw') {
      return { final_dev_vector: finalDevVector }
    }

    return null
  }

  /* ─── wysyłka na backend ────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    if (!selectedA || !selectedB) {
      setShowModal(true)
      return
    }

    const triangle   = useTrainDevideStoreDetIncurred.getState().incurredTriangle ?? []
    const coeff_sets = [selectedA, selectedB].map(buildPayload).filter(Boolean)

    const payload = { incurred_data_det: triangle, coeff_sets }

    try {
      const res = await fetch(`${API}/calc/incurred/save_vector`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(`server status ${res.status}`)
      const json = await res.json()

      if (json.comparison) {
        addComparisonTable({
          data  : json.comparison,
          labelA: keyToLabel[selectedA] ?? 'Projection A',
          labelB: keyToLabel[selectedB] ?? 'Projection B',
        })
      }
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error('❌ Błąd wysyłki:', e)
    }
  }, [
    selectedA,
    selectedB,
    simResults,
    devJResults,
    combinedDevJSummary,
    finalDevVector,
    keyToLabel,
    addComparisonTable,
  ])

  /* ─── eksport do xlsx ───────────────────────────────────────────── */
  const handleExport = () => {
    if (!comparisonTables.length) return
    const wb = XLSX.utils.book_new()

    comparisonTables.forEach((t, idx) => {
      const sheetData = t.data.map(row => {
        const obj: Record<string, unknown> = {}
        Object.entries(row).forEach(([k, v]) => {
          let newKey = k
          if (k === 'Projection A') newKey = t.labelA
          if (k === 'Projection B') newKey = t.labelB
          obj[newKey] =
            typeof v === 'string' && /^-?\d+([,.]\d+)?$/.test(v)
              ? parseFloat(v.replace(',', '.'))
              : v
        })
        return obj
      })

      const sheet    = XLSX.utils.json_to_sheet(sheetData)
      const baseName = `${t.labelA} vs ${t.labelB}`.replace(/[:\/\\?*\[\]]/g, '-').slice(0, 25)
      let safe = baseName
      let n    = 1
      while (wb.SheetNames.includes(safe)) safe = `${baseName}-${n++}`
      XLSX.utils.book_append_sheet(wb, sheet, safe || `Porównanie ${idx + 1}`)
    })

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(
      new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'porownania_incurred.xlsx',
    )
  }

  /* ─── UI ─────────────────────────────────────────────────────────── */
  return (
    <div className="grid grid-cols-[300px_1fr] gap-10 p-6 text-white">
      {/* lewa kolumna */}
      <div className="flex flex-col gap-6 w-full max-w-md">
        <h2 className="text-lg font-semibold">Wybierz dane do wysłania</h2>

        <select
          className="bg-gray-700 rounded p-2"
          value={selectedA ?? ''}
          onChange={e => setSelectedA(e.target.value || null)}
        >
          <option value="">-- Wybierz dane A --</option>
          {allOptions.map(o => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className="bg-gray-700 rounded p-2"
          value={selectedB ?? ''}
          onChange={e => setSelectedB(e.target.value || null)}
        >
          <option value="">-- Wybierz dane B --</option>
          {allOptions.map(o => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
        >
          📤 Wyślij dane
        </button>

        <button
          onClick={clearComparisonTables}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold transition"
        >
          🧹 Wyczyść porównania
        </button>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition"
        >
          📁 Eksportuj do Excela
        </button>

        <Modal
          isOpen={showModal}
          title="Wymagane dane"
          message="Wybierz dwa zestawy współczynników (A i B), aby wysłać dane."
          onCancel={() => setShowModal(false)}
          onlyOk
        />

        <div className="text-sm text-gray-300 pt-6">
          Widok: <strong>Metoda Incurred</strong>, krok: <strong>Wyniki</strong>
        </div>
      </div>

      {/* prawa kolumna – porównania */}
      <div className="flex-1 flex flex-col gap-10 overflow-auto">
        {comparisonTables.map((t, idx) => (
          <div key={idx} className="relative">
            <button
              className="absolute top-0 right-0 p-2 text-xl text-red-500 hover:text-red-700"
              title="Usuń porównanie"
              onClick={() => removeComparisonTable(idx)}
            >
              ❌
            </button>

            <ComparisonTable data={t.data} labelA={t.labelA} labelB={t.labelB} />
          </div>
        ))}
      </div>
    </div>
  )
}
