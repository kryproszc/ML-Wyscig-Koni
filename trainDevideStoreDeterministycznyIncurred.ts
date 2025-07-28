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

export type TrainDevideStoreDetIncurred = {
  /* ————— Loader PaidTriangleDetIncurred ————— */
  workbookDetIncurred?: XLSX.WorkBook;
  setWorkbookDetIncurred: (wb: XLSX.WorkBook) => void;

  uploadedFileNameDetIncurred?: string;
  setUploadedFileNameDetIncurred: (n: string) => void;

  selectedSheetNameDetIncurred?: string;
  setSelectedSheetNameDetIncurred: (n: string) => void;

  /* zakres */
  startRowDetIncurred: number;
  endRowDetIncurred: number;
  startColDetIncurred: number;
  endColDetIncurred: number;
  setRangeAndUpdateDetIncurred: (r: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }) => void;
  getDefaultRangeDetIncurred: () =>
    | { startRow: number; endRow: number; startCol: number; endCol: number }
    | undefined;

  /* JSON + walidacja */
  selectedSheetDetIncurred?: (string | number)[][];
  previousSheetDetIncurred?: (string | number)[][];
  isValidDetIncurred: boolean;
  validationErrorReasonDetIncurred?: string;

  /* ————— Pozostałe pola aplikacji ————— */
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
  incurredTriangle?: (number | null)[][];
  setIncurredTriangle: (d: (number | null)[][]) => void;


  combinedDevJSummary: (number | string)[];
  setCombinedDevJSummary: (v: (number | string)[]) => void;

  leftCountSummary: number;
  setLeftCountSummary: (n: number) => void;

  selectedCurveSummary: string | null;
  setSelectedCurveSummary: (c: string | null) => void;

  manualOverridesSummary: Record<number, { curve: string; value: number }>;
  setManualOverridesSummary: (
    o: Record<number, { curve: string; value: number }>
  ) => void;

  updateDevJAt: (idx: number, value: number) => void;

  selectedDevJVolume?: number;
  setSelectedDevJVolume: (v: number) => void;

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
  trainDevideDetIncurred?: number[][];
  selectedWeightsDetIncurred?: number[][];
  volume: number;
  selectedCellsDetIncurred: [number, number][];

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
  setTrainDevideDetIncurred: (d: number[][] | undefined) => void;
  setSelectedWeightsDetIncurred: (w: number[][]) => void;
  toggleCellDetIncurred: (r: number, c: number) => void;
  toggleWeightCellDetIncurred: (r: number, c: number) => void;
  clearAllWeightsDetIncurred: () => void;
  resetSelectionDetIncurred: () => void;
  resetDetIncurred: () => void;

  selectedDevJIndexes: number[];
  setSelectedDevJIndexes: (i: number[]) => void;

  simResults?: Record<string, Record<string, number>>;
  setSimResults: (r: Record<string, Record<string, number>>) => void;
  clearSimResults: () => void;
};

/* ───────────────────────  STORE  ─────────────────────── */

export const useTrainDevideStoreDetIncurred = create(
  persist<TrainDevideStoreDetIncurred>(
    (set, get) => ({
      /* ——— INITIAL STATE ——— */
      workbookDetIncurred: undefined,
      uploadedFileNameDetIncurred: undefined,
      selectedSheetNameDetIncurred: undefined,

      startRowDetIncurred: 1,
      endRowDetIncurred: 1,
      startColDetIncurred: 1,
      endColDetIncurred: 1,

      selectedSheetDetIncurred: undefined,
      previousSheetDetIncurred: undefined,
      isValidDetIncurred: false,
      validationErrorReasonDetIncurred: undefined,

      comparisonTables: [],
      comparisonLabels: { labelA: 'Projection A', labelB: 'Projection B' },
      comparisonTable: [],

      selectedDataA: null,
      selectedDataB: null,

incurredTriangle: undefined,

      combinedDevJSummary: [],
      leftCountSummary: 0,
      selectedCurveSummary: null,
      manualOverridesSummary: {},

      selectedDevJVolume: undefined,

      devPreviewCandidate: undefined,
      retainedCoeffCount: 0,
      selectedCurve: '',

      finalDevVector: [],
      devFinalCustom: {},

      trainDevideDetIncurred: undefined,
      selectedWeightsDetIncurred: undefined,
      volume: 4,
      selectedCellsDetIncurred: [],

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

      /* ——— SETTERS & ACTIONS ——— */

      /* Loader PaidTriangleDetIncurred */
      setWorkbookDetIncurred: (wb) => {
        set({ workbookDetIncurred: wb });

        const first = wb.SheetNames[0];
        if (first && get().selectedSheetNameDetIncurred !== first) {
          get().setSelectedSheetNameDetIncurred(first);
        }
      },

      setUploadedFileNameDetIncurred: (n) =>
        set({ uploadedFileNameDetIncurred: n }),

      setSelectedSheetNameDetIncurred: (name) => {
        if (get().selectedSheetNameDetIncurred === name) return;

        const wb = get().workbookDetIncurred;
        if (!wb || !wb.Sheets[name]) return;

        const json = XLSX.utils.sheet_to_json(
          wb.Sheets[name] as XLSX.WorkSheet,
          { header: 1, raw: false }
        ) as (string | number)[][];

        set({
          selectedSheetNameDetIncurred: name,
          previousSheetDetIncurred: get().selectedSheetDetIncurred,
          selectedSheetDetIncurred: json,
          isValidDetIncurred: json.length > 0,
          validationErrorReasonDetIncurred:
            json.length > 0 ? undefined : 'Pusty arkusz',
          startRowDetIncurred: 1,
          endRowDetIncurred: json.length,
          startColDetIncurred: 1,
          endColDetIncurred: json[0]?.length ?? 1,
        });
      },

      getDefaultRangeDetIncurred: () => {
        const sheet = get().selectedSheetDetIncurred;
        if (!sheet || sheet.length === 0) return undefined;

        const firstRow = sheet[0] ?? [];

        return {
          startRow: 1,
          endRow: sheet.length,
          startCol: 1,
          endCol: firstRow.length,
        };
      },

      setRangeAndUpdateDetIncurred: ({
        startRow,
        endRow,
        startCol,
        endCol,
      }) => {
        const wb = get().workbookDetIncurred;
        const sheetName = get().selectedSheetNameDetIncurred;
        if (!wb || !sheetName) return;

        const ws = wb.Sheets[sheetName];
        if (!ws) return;

        const json: (string | number)[][] = XLSX.utils.sheet_to_json(
          ws as XLSX.WorkSheet,
          {
            header: 1,
            raw: false,
          }
        );

        const sliced = json
          .slice(startRow - 1, endRow)
          .map((r) => r.slice(startCol - 1, endCol));

        const isValid = sliced.length > 0;

        set({
          startRowDetIncurred: startRow,
          endRowDetIncurred: endRow,
          startColDetIncurred: startCol,
          endColDetIncurred: endCol,
          previousSheetDetIncurred: get().selectedSheetDetIncurred,
          selectedSheetDetIncurred: sliced,
          isValidDetIncurred: isValid,
          validationErrorReasonDetIncurred: isValid
            ? undefined
            : 'Niepoprawny format',
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

setIncurredTriangle: (d) => set({ incurredTriangle: d }),

      /* Summaries */
      setCombinedDevJSummary: (v) =>
        set({ combinedDevJSummary: [...v] }),
      setLeftCountSummary: (n) => set({ leftCountSummary: n }),
      setSelectedCurveSummary: (c) => set({ selectedCurveSummary: c }),
      setManualOverridesSummary: (o) =>
        set({ manualOverridesSummary: { ...o } }),

      /* Preview candidate */
      setDevPreviewCandidate: (v) =>
        set({ devPreviewCandidate: [...v] }),
      clearDevPreviewCandidate: () =>
        set({ devPreviewCandidate: undefined }),

      /* UI / config */
      setRetainedCoeffCount: (v) => set({ retainedCoeffCount: v }),
      setSelectedCurve: (n) => set({ selectedCurve: n }),

      /* Final vectors & overrides */
      setFinalDevVector: (v) => set({ finalDevVector: [...v] }),
      setDevFinalValue: (idx, curve, value) =>
        set((s) => {
          const upd = {
            ...s.devFinalCustom,
            [idx]: { curve, value },
          };
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
          finalDevVector: s.devJPreview
            ? [...s.devJPreview]
            : [...s.finalDevVector],
        })),

      /* Dev_J dane */
      setTrainDevideDetIncurred: (d) =>
        set({ trainDevideDetIncurred: d }),
      setSelectedWeightsDetIncurred: (w) =>
        set({ selectedWeightsDetIncurred: w }),

      setVolume: (v) => {
        set({ volume: v });
        const matrix = get().trainDevideDetIncurred;
        if (!matrix || matrix.length === 0 || !matrix[0]) return;

        const numRows = matrix.length;
        const numCols = matrix[0].length;
        const weights: number[][] = Array.from({ length: numRows }, () =>
          new Array(numCols).fill(0)
        );

        for (let col = 0; col < numCols; col++) {
          let filled = 0;
          for (
            let row = numRows - 1;
            row >= 0 && filled < v;
            row--
          ) {
            const val = matrix[row]?.[col];
            if (typeof val === 'number' && val !== 0) {
              weights[row]![col] = 1;
              filled++;
            }
          }
        }
        set({ selectedWeightsDetIncurred: weights });
      },

      toggleCellDetIncurred: (r, c) => {
        const sel = get().selectedCellsDetIncurred;
        const idx = sel.findIndex(
          ([row, col]) => row === r && col === c
        );
        if (idx >= 0)
          set({
            selectedCellsDetIncurred: sel.filter(
              ([row, col]) => !(row === r && col === c)
            ),
          });
        else
          set({
            selectedCellsDetIncurred: [...sel, [r, c]],
          });
      },

      toggleWeightCellDetIncurred: (r, c) => {
        const cur = get().selectedWeightsDetIncurred;
        if (!cur) return;

        const allOnes = cur.every((row) =>
          row.every((cell) => cell === 1)
        );
        if (allOnes) {
          set({
            selectedWeightsDetIncurred: cur.map((row) =>
              row.map(() => 0)
            ),
          });
          return;
        }
        const upd = cur.map((row, i) =>
          row.map((cell, j) =>
            i === r && j === c ? (cell === 1 ? 0 : 1) : cell
          )
        );
        set({ selectedWeightsDetIncurred: upd });
      },

      clearAllWeightsDetIncurred: () => {
        const cur = get().selectedWeightsDetIncurred;
        if (cur)
          set({
            selectedWeightsDetIncurred: cur.map((r) =>
              r.map(() => 0)
            ),
          });
      },

      resetSelectionDetIncurred: () => {
        const matrix = get().trainDevideDetIncurred;
        if (!matrix) return;
        set({
          selectedWeightsDetIncurred: matrix.map((row) =>
            row.map(() => 1)
          ),
        });
      },

      /* Dev_J & preview */
      setDevJ: (d) => set({ devJ: d }),
      setDevJPending: (d) =>
        set({ devJPending: [...d] }),
      setDevJPreview: (v) =>
        set(() => ({
          devJPreview: [...v],
          finalDevVector: [...v],
        })),
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
            devFinalCustom: {
              ...s.devFinalCustom,
              [idx]: { curve: 'manual', value },
            },
          };
        }),

      /* Modal handlers */
      openConfirmModal: (pending) =>
        set({
          isConfirmModalOpen: true,
          pendingFinalDevJ: pending,
        }),
      closeConfirmModal: () =>
        set({
          isConfirmModalOpen: false,
          pendingFinalDevJ: undefined,
        }),
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

      openMissingFinalModal: () =>
        set({ isMissingFinalModalOpen: true }),
      closeMissingFinalModal: () =>
        set({ isMissingFinalModalOpen: false }),

      /* Simulations / R2 */
      setR2Scores: (r) => set({ r2Scores: r }),
      clearR2Scores: () => set({ r2Scores: undefined }),
      setSimResults: (r) => set({ simResults: r }),
      clearSimResults: () => set({ simResults: undefined }),

      /* Dev_J index selection */
      setSelectedDevJIndexes: (i) =>
        set({ selectedDevJIndexes: i }),

      /* Comparison volume */
      setSelectedDevJVolume: (v) =>
        set({ selectedDevJVolume: v }),

      /* Tail count */
      setTailCountGlobal: (n) => set({ tailCount: n }),

      /* RESET ALL */
      resetDetIncurred: () =>
        set({
          workbookDetIncurred: undefined,
          uploadedFileNameDetIncurred: undefined,
          selectedSheetNameDetIncurred: undefined,
          startRowDetIncurred: 1,
          endRowDetIncurred: 1,
          startColDetIncurred: 1,
          endColDetIncurred: 1,
          selectedSheetDetIncurred: undefined,
          previousSheetDetIncurred: undefined,
          isValidDetIncurred: false,
          validationErrorReasonDetIncurred: undefined,

          trainDevideDetIncurred: undefined,
          selectedWeightsDetIncurred: undefined,
          selectedCellsDetIncurred: [],
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
      name: 'train-devide-det-incurred',
      storage: {
        getItem: (n) => {
          const i = sessionStorage.getItem(n);
          return i ? JSON.parse(i) : null;
        },
        setItem: (n, v) =>
          sessionStorage.setItem(n, JSON.stringify(v)),
        removeItem: (n) => sessionStorage.removeItem(n),
      },
    }
  )
);
