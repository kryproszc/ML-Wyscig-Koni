import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as XLSX from 'xlsx';

/* ──────────────────────────── TYPY ──────────────────────────── */

export type SourceType = 'base' | 'curve' | 'custom';

export type DevJResult = {
  volume: number;
  subIndex?: number;
  values: number[];
};

export interface CustomCell {
  curve: string;
  value: number;
}

export type ComparisonEntry = {
  data: any[];
  labelA: string;
  labelB: string;
};

/* ─────────────────── INTERFEJS STANU (pełny) ─────────────────── */

export type TrainDevideStoreDet = {
  /* ————— Loader PaidTriangleDet ————— */
  workbookDet?: XLSX.WorkBook;
  setWorkbookDet: (wb: XLSX.WorkBook) => void;

  uploadedFileNameDet?: string;
  setUploadedFileNameDet: (n: string) => void;

  selectedSheetNameDet?: string;
  setSelectedSheetNameDet: (n: string) => void;

  /* zakres */
  startRowDet: number;
  endRowDet: number;
  startColDet: number;
  endColDet: number;
  setRangeAndUpdateDet: (r: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }) => void;
  getDefaultRangeDet: () =>
    | { startRow: number; endRow: number; startCol: number; endCol: number }
    | undefined;

  /* JSON + walidacja */
  selectedSheetDet?: (string | number)[][];
  previousSheetDet?: (string | number)[][];
  isValidDet: boolean;
  validationErrorReasonDet?: string;

  /* ————— Pozostałe pola aplikacji (jak dotąd) ————— */
  removeComparisonTable: (index: number) => void;

  comparisonTables: ComparisonEntry[];
  addComparisonTable: (entry: ComparisonEntry) => void;
  clearComparisonTables: () => void;

  comparisonLabels: { labelA: string; labelB: string };
  setComparisonLabels: (l: { labelA: string; labelB: string }) => void;

  comparisonTable: any[];
  setComparisonTable: (d: any[]) => void;

  selectedDataA: string | null;
  selectedDataB: string | null;
  setSelectedDataA: (k: string | null) => void;
  setSelectedDataB: (k: string | null) => void;

  paidTriangle?: (number | null)[][];
  setPaidTriangle: (d: (number | null)[][]) => void;

  combinedDevJSummary: (number | string)[];
  setCombinedDevJSummary: (v: (number | string)[]) => void;

  remainingDevJHeaders: string[];
  setRemainingDevJHeaders: (headers: string[]) => void;

  leftCountSummary: number;
  setLeftCountSummary: (n: number) => void;

  selectedCurveSummary: string | null;
  setSelectedCurveSummary: (c: string | null) => void;

  manualOverridesSummary: Record<number, { curve: string; value: number }>;
  setManualOverridesSummary: (
    o: Record<number, { curve: string; value: number }>
  ) => void;

  // Nowy stan dla przełączania źródła współczynników
  sourceSwitchesSummary: Record<number, { curve: string; value: number }>;
  setSourceSwitchesSummary: (switches: Record<number, { curve: string; value: number }>) => void;

  updateDevJAt: (idx: number, value: number) => void;

  selectedDevJVolume?: number;
  selectedDevJSubIndex?: number;
  setSelectedDevJVolume: (v: number, subIndex?: number) => void;

  /* ===== PREVIEW ===== */
  devPreviewCandidate?: number[];
  setDevPreviewCandidate: (v: number[]) => void;
  clearDevPreviewCandidate: () => void;

  /* ===== UI / CONFIG ===== */
  retainedCoeffCount: number;
  setRetainedCoeffCount: (val: number) => void;

  selectedCurve: string;
  setSelectedCurve: (name: string) => void;

  /* ===== Final vectors & custom overrides ===== */
  finalDevVector: number[];
  setFinalDevVector: (v: number[]) => void;

  devFinalCustom: Record<number, CustomCell>;
  setDevFinalValue: (idx: number, curve: string, value: number) => void;
  clearDevFinalValue: (idx: number) => void;
  clearAllDevFinalValues: () => void;

  /* ===== Dane do obliczeń dev_j ===== */
  trainDevideDet?: number[][];
  selectedWeightsDet?: number[][];
  volume: number;
  selectedCellsDet: [number, number][];

  r2Scores?: Record<string, number>;
  setR2Scores: (r: Record<string, number>) => void;
  clearR2Scores: () => void;

  tailCount?: number | '';
  setTailCountGlobal: (n: number | '') => void;

  devJ?: number[];
  devJPending?: number[];
  setDevJ: (d: number[]) => void;
  setDevJPending: (d: number[]) => void;

  devJResults: DevJResult[];
  addDevJResult: (vol: number, values: number[]) => void;
  clearDevJResults: () => void;

  finalDevJ?: DevJResult;
  setFinalDevJ: (d: DevJResult | undefined) => void;

  devJPreview?: number[];
  setDevJPreview: (v: number[]) => void;
  clearDevJPreview: () => void;

  /* ===== MODALE ===== */
  isConfirmModalOpen: boolean;
  pendingFinalDevJ?: DevJResult;
  openConfirmModal: (d: DevJResult) => void;
  closeConfirmModal: () => void;
  confirmFinalDevJ: () => void;

  isMissingFinalModalOpen: boolean;
  openMissingFinalModal: () => void;
  closeMissingFinalModal: () => void;

  /* ===== HELPERY / UI ===== */
  setVolume: (v: number) => void;
  setTrainDevideDet: (d: number[][] | undefined) => void;
  setSelectedWeightsDet: (w: number[][]) => void;
  toggleCellDet: (r: number, c: number) => void;
  toggleWeightCellDet: (r: number, c: number) => void;
  toggleRowDet: (r: number) => void;
  clearAllWeightsDet: () => void;
  resetSelectionDet: () => void;
  resetDet: () => void;

  selectedDevJIndexes: number[];
  setSelectedDevJIndexes: (i: number[]) => void;

  simResults?: Record<string, Record<string, number>>;
  setSimResults: (r: Record<string, Record<string, number>>) => void;
  clearSimResults: () => void;

  /* ===== CLEAR FIT CURVE ===== */
  clearFitCurveData: () => void;

  /* ===== CLEAR DEVELOPMENT END SUMMARY ===== */
  clearDevSummaryData: () => void;

  /* ===== MIN/MAX HIGHLIGHTING ===== */
  minMaxHighlighting: boolean;
  minMaxCells: [number, number][];
  minCells: [number, number][];
  maxCells: [number, number][];
  setMinMaxHighlighting: (enabled: boolean) => void;
  calculateMinMaxCells: () => void;

  /* ===== NUMBER FORMATTING ===== */
  decimalPlaces: number;
  setDecimalPlaces: (places: number) => void;
};

/* ───────────────────────  STORE  ─────────────────────── */

export const useTrainDevideStoreDet = create(
  persist<TrainDevideStoreDet>(
    (set, get) => ({
      /* ——— INITIAL STATE ——— */
      workbookDet: undefined,
      uploadedFileNameDet: undefined,
      selectedSheetNameDet: undefined,

      startRowDet: 1,
      endRowDet: 1,
      startColDet: 1,
      endColDet: 1,

      selectedSheetDet: undefined,
      previousSheetDet: undefined,
      isValidDet: false,
      validationErrorReasonDet: undefined,

      comparisonTables: [],
      comparisonLabels: { labelA: 'Projection A', labelB: 'Projection B' },
      comparisonTable: [],

      selectedDataA: null,
      selectedDataB: null,

      paidTriangle: undefined,

      combinedDevJSummary: [],
      remainingDevJHeaders: [],
      leftCountSummary: 0,
      selectedCurveSummary: null,
      manualOverridesSummary: {},
      sourceSwitchesSummary: {},

      selectedDevJVolume: undefined,
      selectedDevJSubIndex: undefined,

      devPreviewCandidate: undefined,
      retainedCoeffCount: 0,
      selectedCurve: '',

      finalDevVector: [],
      devFinalCustom: {},

      trainDevideDet: undefined,
      selectedWeightsDet: undefined,
      volume: -1,
      selectedCellsDet: [],

      r2Scores: undefined,
      tailCount: '',

      devJ: undefined,
      devJPending: undefined,
      devJResults: [],
      finalDevJ: undefined,
      devJPreview: undefined,

      isConfirmModalOpen: false,
      pendingFinalDevJ: undefined,
      isMissingFinalModalOpen: false,

      selectedDevJIndexes: [],

      simResults: undefined,

      minMaxHighlighting: false,
      minMaxCells: [],
      minCells: [],
      maxCells: [],

      decimalPlaces: 6, // domyślnie 6 miejsc po przecinku

      /* ——— SETTERS & ACTIONS ——— */

      /* Loader PaidTriangleDet */
setWorkbookDet: (wb) => {
  set({ workbookDet: wb });

  const first = wb.SheetNames[0];
  if (first && get().selectedSheetNameDet !== first) {
    get().setSelectedSheetNameDet(first);
  }
},



      setUploadedFileNameDet: (n) => set({ uploadedFileNameDet: n }),
setSelectedSheetNameDet: (name) => {
  /* 1 ▸ jeżeli kliknięto ten sam arkusz – nic nie rób   */
  if (get().selectedSheetNameDet === name) return;

  const wb = get().workbookDet;
  if (!wb || !wb.Sheets[name]) return;   // brak workbooka lub arkusza

  /* 2 ▸ odczytamy dane wybranego arkusza */
  const json = XLSX.utils.sheet_to_json(
    wb.Sheets[name] as XLSX.WorkSheet,
    { header: 1, raw: false }
  ) as (string | number)[][];

  /* 3 ▸ zapisujemy w store  (jedno set!) */
  set({
    selectedSheetNameDet: name,
    previousSheetDet: get().selectedSheetDet,
    selectedSheetDet: json,
    isValidDet: json.length > 0,
    validationErrorReasonDet: json.length > 0 ? undefined : 'Pusty arkusz',
    /* aktualizujemy też domyślny zakres */
    startRowDet: 1,
    endRowDet: json.length,
    startColDet: 1,
    endColDet: json[0]?.length ?? 1,
  });
},

      getDefaultRangeDet: () => {
const sheet = get().selectedSheetDet;
  if (!sheet || sheet.length === 0) return undefined;

  const firstRow = sheet[0] ?? [];          // ← pewne istnienie

  return {
    startRow: 1,
    endRow: sheet.length,
    startCol: 1,
    endCol: firstRow.length,
  };
},

      setRangeAndUpdateDet: ({ startRow, endRow, startCol, endCol }) => {
        const wb = get().workbookDet;
        const sheetName = get().selectedSheetNameDet;
        if (!wb || !sheetName) return;

const ws = wb.Sheets[sheetName];
if (!ws) return;                       // ← ochrona przed undefined

const json: (string | number)[][] = XLSX.utils.sheet_to_json(ws as XLSX.WorkSheet, {
   header: 1,
   raw: false,
});

        const sliced = json
          .slice(startRow - 1, endRow)
          .map((r) => r.slice(startCol - 1, endCol));

        const isValid = sliced.length > 0;

        set({
          startRowDet: startRow,
          endRowDet: endRow,
          startColDet: startCol,
          endColDet: endCol,
          previousSheetDet: get().selectedSheetDet,
          selectedSheetDet: sliced,
          isValidDet: isValid,
          validationErrorReasonDet: isValid ? undefined : 'Niepoprawny format',
        });
      },

      /* Comparison tables */
      removeComparisonTable: (idx) =>
        set((s) => ({
          comparisonTables: s.comparisonTables.filter((_, i) => i !== idx),
        })),
      addComparisonTable: (e) =>
        set((s) => ({ comparisonTables: [...s.comparisonTables, e] })),
      clearComparisonTables: () => set({ comparisonTables: [] }),

      setComparisonLabels: (l) => set({ comparisonLabels: l }),
      setComparisonTable: (d) => set({ comparisonTable: d }),

      setSelectedDataA: (k) => set({ selectedDataA: k }),
      setSelectedDataB: (k) => set({ selectedDataB: k }),

      setPaidTriangle: (d) => set({ paidTriangle: d }),

      /* Summaries */
      setCombinedDevJSummary: (v) => set({ combinedDevJSummary: [...v] }),
      setRemainingDevJHeaders: (headers) => set({ remainingDevJHeaders: [...headers] }),
      setLeftCountSummary: (n) => set({ leftCountSummary: n }),
      setSelectedCurveSummary: (c) => set({ selectedCurveSummary: c }),
      setManualOverridesSummary: (o) =>
        set({ manualOverridesSummary: { ...o } }),
      setSourceSwitchesSummary: (switches) =>
        set({ sourceSwitchesSummary: { ...switches } }),

      /* Preview candidate */
      setDevPreviewCandidate: (v) => set({ devPreviewCandidate: [...v] }),
      clearDevPreviewCandidate: () => set({ devPreviewCandidate: undefined }),

      /* UI / config */
      setRetainedCoeffCount: (v) => set({ retainedCoeffCount: v }),
      setSelectedCurve: (n) => set({ selectedCurve: n }),

      /* Final vectors & overrides */
      setFinalDevVector: (v) => set({ finalDevVector: [...v] }),
      setDevFinalValue: (idx, curve, value) =>
        set((s) => {
          const upd = { ...s.devFinalCustom, [idx]: { curve, value } };
          const vec = [...s.finalDevVector];
          vec[idx] = value;
          return { devFinalCustom: upd, finalDevVector: vec };
        }),
      clearDevFinalValue: (idx) =>
        set((s) => {
          const copy = { ...s.devFinalCustom };
          delete copy[idx];
          const vec = [...s.finalDevVector];
          if (s.devJPreview && s.devJPreview[idx] !== undefined)
            vec[idx] = s.devJPreview[idx]!;
          return { devFinalCustom: copy, finalDevVector: vec };
        }),
      clearAllDevFinalValues: () =>
        set((s) => ({
          devFinalCustom: {},
          finalDevVector: s.devJPreview ? [...s.devJPreview] : [...s.finalDevVector],
        })),

      /* Dev_J dane */
      setTrainDevideDet: (d) => set({ trainDevideDet: d }),
      setSelectedWeightsDet: (w) => set({ selectedWeightsDet: w }),

      setVolume: (v) => {
        set({ volume: v });
        const matrix = get().trainDevideDet;
        if (!matrix || matrix.length === 0 || !matrix[0]) return;

        const numRows = matrix.length;
        const numCols = matrix[0].length;
        const weights: number[][] = Array.from({ length: numRows }, () =>
          new Array(numCols).fill(0)
        );

        for (let col = 0; col < numCols; col++) {
          let filled = 0;
          for (let row = numRows - 1; row >= 0 && filled < v; row--) {
            const val = matrix[row]?.[col];
            if (typeof val === 'number' && val !== 0) {
              weights[row]![col] = 1;
              filled++;
            }
          }
        }
        set({ selectedWeightsDet: weights });
        
        // 🎯 Przelicz Min/Max po zmianie volume jeśli jest włączone
        if (get().minMaxHighlighting) {
          get().calculateMinMaxCells();
        }
      },

      toggleCellDet: (r, c) => {
        const sel = get().selectedCellsDet;
        const idx = sel.findIndex(([row, col]) => row === r && col === c);
        if (idx >= 0)
          set({ selectedCellsDet: sel.filter(([row, col]) => !(row === r && col === c)) });
        else set({ selectedCellsDet: [...sel, [r, c]] });
      },

      toggleWeightCellDet: (r, c) => {
        const cur = get().selectedWeightsDet;
        if (!cur) return;

        // Przełącz tylko konkretną komórkę
        const upd = cur.map((row, i) =>
          row.map((cell, j) => (i === r && j === c ? (cell === 1 ? 0 : 1) : cell))
        );
        set({ selectedWeightsDet: upd });
        
        // Jeśli min/max highlighting jest włączone, przelicz ponownie
        if (get().minMaxHighlighting) {
          get().calculateMinMaxCells();
        }
      },

      toggleRowDet: (r) => {
        const cur = get().selectedWeightsDet;
        const trainData = get().trainDevideDet;
        if (!cur || !trainData) return;

        // Sprawdzamy czy cały wiersz jest zaznaczony
        const dataRow = trainData[r];
        if (!dataRow) return;

        let hasAnyData = false;
        let allSelected = true;
        
        // Sprawdzamy stan aktualny wiersza
        for (let j = 0; j < dataRow.length; j++) {
          const cell = dataRow[j];
          const hasData = cell !== null && cell !== undefined && typeof cell === 'number';
          
          if (hasData) {
            hasAnyData = true;
            if (cur[r]?.[j] !== 1) {
              allSelected = false;
              break;
            }
          }
        }

        // Jeśli nie ma danych, nie rób nic
        if (!hasAnyData) return;

        // Przełącz stan całego wiersza
        const upd = cur.map((row, i) => {
          if (i !== r) return row;
          return row.map((cell, j) => {
            const cellData = dataRow[j];
            const hasData = cellData !== null && cellData !== undefined && typeof cellData === 'number';
            // Jeśli komórka ma dane, ustaw przeciwny stan do aktualnego stanu wiersza
            if (hasData) {
              return allSelected ? 0 : 1;
            }
            // Jeśli komórka nie ma danych, zostaw bez zmian
            return cell;
          });
        });

        set({ selectedWeightsDet: upd });
        
        // Jeśli min/max highlighting jest włączone, przelicz ponownie
        if (get().minMaxHighlighting) {
          get().calculateMinMaxCells();
        }
      },

      clearAllWeightsDet: () => {
        const cur = get().selectedWeightsDet;
        if (cur) set({ selectedWeightsDet: cur.map((r) => r.map(() => 0)) });
      },

      resetSelectionDet: () => {
        const matrix = get().trainDevideDet;
        if (!matrix) return;
        set({ selectedWeightsDet: matrix.map((row) => row.map(() => 1)) });
      },

      /* Dev_J & preview */
      setDevJ: (d) => set({ devJ: d }),
      setDevJPending: (d) => set({ devJPending: [...d] }),
      setDevJPreview: (v) =>
        set(() => ({ devJPreview: [...v], finalDevVector: [...v] })),
      clearDevJPreview: () => set({ devJPreview: undefined }),

      addDevJResult: (volume, values) => {
        const curr = get().devJResults;
        const same = curr.filter((e) => e.volume === volume);
        const subIndex = same.length ? same.length : undefined;
        const entry: DevJResult = {
          volume,
          values: [...values],
          ...(subIndex !== undefined && { subIndex }),
        };
        set({ devJResults: [...curr, entry] });
      },
      clearDevJResults: () => set({ devJResults: [] }),

      setFinalDevJ: (d) =>
        set({
          finalDevJ: d,
          devFinalCustom: {},
          finalDevVector: d ? [...d.values] : [],
        }),

      updateDevJAt: (idx, value) =>
        set((s) => {
          if (!Array.isArray(s.devJPreview)) return {};
          const prev = [...s.devJPreview];
          prev[idx] = value;
          const vec = [...s.finalDevVector];
          vec[idx] = value;
          return {
            devJPreview: prev,
            finalDevVector: vec,
            devFinalCustom: { ...s.devFinalCustom, [idx]: { curve: 'manual', value } },
          };
        }),

      /* Modal handlers */
      openConfirmModal: (pending) =>
        set({ isConfirmModalOpen: true, pendingFinalDevJ: pending }),
      closeConfirmModal: () =>
        set({ isConfirmModalOpen: false, pendingFinalDevJ: undefined }),
      confirmFinalDevJ: () => {
        const pending = get().pendingFinalDevJ;
        if (!pending) return;
        set({
          finalDevJ: pending,
          devFinalCustom: {},
          finalDevVector: [...pending.values],
          isConfirmModalOpen: false,
          pendingFinalDevJ: undefined,
        });
      },

      openMissingFinalModal: () => set({ isMissingFinalModalOpen: true }),
      closeMissingFinalModal: () => set({ isMissingFinalModalOpen: false }),

      /* Simulations / R2 */
      setR2Scores: (r) => set({ r2Scores: r }),
      clearR2Scores: () => set({ r2Scores: undefined }),
      setSimResults: (r) => set({ simResults: r }),
      clearSimResults: () => set({ simResults: undefined }),

      /* Clear FitCurve data */
      clearFitCurveData: () => set({
        devPreviewCandidate: undefined,
        devJPreview: undefined,
        selectedDevJIndexes: [],
        r2Scores: undefined,
        simResults: undefined,
      }),

      /* Clear Development End Summary data */
      clearDevSummaryData: () => set({
        leftCountSummary: 0,
        selectedCurveSummary: null,
        manualOverridesSummary: {},
        sourceSwitchesSummary: {},
        combinedDevJSummary: [],
        remainingDevJHeaders: [],
        comparisonTables: [],
        selectedDataA: null,
        selectedDataB: null,
      }),

      /* Dev_J index selection */
      setSelectedDevJIndexes: (i) => set({ selectedDevJIndexes: i }),

      /* Comparison volume */
      setSelectedDevJVolume: (v, subIndex) => set({ selectedDevJVolume: v, selectedDevJSubIndex: subIndex }),

      /* Tail count */
      setTailCountGlobal: (n) => set({ tailCount: n }),

      /* Min/Max highlighting */
      setMinMaxHighlighting: (enabled) => {
        console.log('setMinMaxHighlighting:', enabled);
        set({ minMaxHighlighting: enabled });
        if (enabled) get().calculateMinMaxCells();
        else set({ minMaxCells: [], minCells: [], maxCells: [] });
      },

      /* Number formatting */
      setDecimalPlaces: (places) => {
        set({ decimalPlaces: Math.max(0, Math.min(10, places)) }); // ograniczenie 0-10 miejsc
      },

      calculateMinMaxCells: () => {
        const trainData = get().trainDevideDet;
        const weights = get().selectedWeightsDet;
        if (!trainData || !weights || trainData.length === 0) return;

        console.log('🔢 calculateMinMaxCells started', { 
          trainDataRows: trainData.length, 
          trainDataCols: trainData[0]?.length,
          weightsRows: weights.length, 
          weightsCols: weights[0]?.length 
        });

        const minMaxCells: [number, number][] = [];
        const minCells: [number, number][] = [];
        const maxCells: [number, number][] = [];
        
        // Dla każdej kolumny znajdź min/max spośród zaznaczonych komórek
        const numCols = trainData[0]?.length || 0;
        
        for (let col = 0; col < numCols; col++) {
          const selectedValues: { value: number; row: number }[] = [];
          
          for (let row = 0; row < trainData.length; row++) {
            const cellValue = trainData[row]?.[col];
            const isSelected = weights[row]?.[col] === 1;
            
            if (isSelected && cellValue != null && typeof cellValue === 'number') {
              selectedValues.push({ 
                value: cellValue, 
                row 
              });
            }
          }
          
          console.log(`📊 Kolumna ${col}:`, {
            selectedCount: selectedValues.length,
            values: selectedValues.map(v => `[${v.row}] = ${v.value}`)
          });
          
          if (selectedValues.length > 1) {
            const minItem = selectedValues.reduce((min, curr) => 
              curr.value < min.value ? curr : min
            );
            const maxItem = selectedValues.reduce((max, curr) => 
              curr.value > max.value ? curr : max
            );
            
            // +1 bo w TableDataDet mamy nagłówki!
            minCells.push([minItem.row + 1, col + 1]);
            maxCells.push([maxItem.row + 1, col + 1]);
            minMaxCells.push([minItem.row + 1, col + 1]);
            if (minItem.row !== maxItem.row) {
              minMaxCells.push([maxItem.row + 1, col + 1]);
            }
            
            console.log(`✅ Kolumna ${col} - Min: [${minItem.row}]=${minItem.value}, Max: [${maxItem.row}]=${maxItem.value}`);
          } else {
            console.log(`⚠️ Kolumna ${col} - za mało wybranych wartości (${selectedValues.length})`);
          }
        }
        
        console.log('🎯 calculateMinMaxCells RESULT:', { 
          minCells: minCells.length, 
          maxCells: maxCells.length,
          minCellsData: minCells,
          maxCellsData: maxCells
        });
        set({ minMaxCells, minCells, maxCells });
      },

      /* Combined summary */

      /* RESET ALL */
      resetDet: () =>
        set({
          workbookDet: undefined,
          uploadedFileNameDet: undefined,
          selectedSheetNameDet: undefined,
          startRowDet: 1,
          endRowDet: 1,
          startColDet: 1,
          endColDet: 1,
          selectedSheetDet: undefined,
          previousSheetDet: undefined,
          isValidDet: false,
          validationErrorReasonDet: undefined,

          trainDevideDet: undefined,
          selectedWeightsDet: undefined,
          selectedCellsDet: [],
          devJ: undefined,
          devJPending: undefined,
          devJResults: [],
          finalDevJ: undefined,
          devFinalCustom: {},
          devJPreview: undefined,
          isConfirmModalOpen: false,
          pendingFinalDevJ: undefined,
          isMissingFinalModalOpen: false,
        }),
    }),
    {
      name: 'train-devide-det',
      storage: {
        getItem: (n) => {
          const i = sessionStorage.getItem(n);
          return i ? JSON.parse(i) : null;
        },
        setItem: (n, v) => sessionStorage.setItem(n, JSON.stringify(v)),
        removeItem: (n) => sessionStorage.removeItem(n),
      },
    }
  )
);
