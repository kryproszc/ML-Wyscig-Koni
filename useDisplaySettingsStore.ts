import { create } from 'zustand';

interface DisplaySettingsStore {
  roundNumbers: boolean;
  fullscreenMode: boolean;
  tableScale: number; // skala tabeli (1.0 = normalny rozmiar)
  tableWidth: number; // szerokość tabeli (1.0 = normalna szerokość)
  setRoundNumbers: (value: boolean) => void;
  setFullscreenMode: (value: boolean) => void;
  setTableScale: (scale: number) => void;
  setTableWidth: (width: number) => void;
  increaseScale: () => void;
  decreaseScale: () => void;
  increaseWidth: () => void;
  decreaseWidth: () => void;
}

export const useDisplaySettingsStore = create<DisplaySettingsStore>((set, get) => ({
  roundNumbers: true, // domyślnie zaokrąglone
  fullscreenMode: false, // domyślnie normalny widok
  tableScale: 1.0, // normalny rozmiar
  tableWidth: 1.0, // normalna szerokość
  setRoundNumbers: (value: boolean) => set({ roundNumbers: value }),
  setFullscreenMode: (value: boolean) => set({ fullscreenMode: value }),
  setTableScale: (scale: number) => set({ tableScale: Math.max(0.5, Math.min(2.0, scale)) }), // ograniczenie 0.5x - 2.0x
  setTableWidth: (width: number) => set({ tableWidth: Math.max(0.5, Math.min(2.0, width)) }), // ograniczenie 0.5x - 2.0x
  increaseScale: () => {
    const currentScale = get().tableScale;
    set({ tableScale: Math.min(2.0, currentScale + 0.1) });
  },
  decreaseScale: () => {
    const currentScale = get().tableScale;
    set({ tableScale: Math.max(0.5, currentScale - 0.1) });
  },
  increaseWidth: () => {
    const currentWidth = get().tableWidth;
    set({ tableWidth: Math.min(2.0, currentWidth + 0.1) });
  },
  decreaseWidth: () => {
    const currentWidth = get().tableWidth;
    set({ tableWidth: Math.max(0.5, currentWidth - 0.1) });
  },
}));
