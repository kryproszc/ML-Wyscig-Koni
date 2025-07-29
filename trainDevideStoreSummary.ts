// stores/trainDevideStoreSummary.ts
import { create } from "zustand";

/**
 * Central store odpowiadający za zakładkę „Podsumowanie Paid + Incurred”.
 * Zapamiętuje nie tylko aktualnie wybrane zestawy współczynników,
 * ale też wygenerowaną tabelę porównawczą, żeby nie znikała przy
 * przechodzeniu między stronami.
 */

export interface ComparisonRow {
  paid: number;
  incurred: number;
}

interface SummaryState {
  /** klucz z Paid (np. 'curve-CL-TL') */
  selectedPaid: string | null;
  setSelectedPaid: (k: string | null) => void;

  /** klucz z Incurred (np. 'volume-12-0') */
  selectedIncurred: string | null;
  setSelectedIncurred: (k: string | null) => void;

  /** Dwukolumnowa tabela: Paid / Incurred (bez wag) */
  comparisonRows: ComparisonRow[];
  setComparisonRows: (rows: ComparisonRow[]) => void;
}

export const useTrainDevideStoreSummary = create<SummaryState>()((set) => ({
  // ─── wybory w dropdownach ───
  selectedPaid: null,
  selectedIncurred: null,
  setSelectedPaid: (k) => set({ selectedPaid: k }),
  setSelectedIncurred: (k) => set({ selectedIncurred: k }),

  // ─── wynikowa tabela ───
  comparisonRows: [],
  setComparisonRows: (rows) => set({ comparisonRows: rows }),
}));
