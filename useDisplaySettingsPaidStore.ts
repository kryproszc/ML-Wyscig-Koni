import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DisplaySettingsPaidStore {
  fullscreenMode: boolean;
  tableScale: number;
  setFullscreenMode: (enabled: boolean) => void;
  increaseScale: () => void;
  decreaseScale: () => void;
  setTableScale: (scale: number) => void;
}

export const useDisplaySettingsPaidStore = create<DisplaySettingsPaidStore>()(
  persist(
    (set, get) => ({
      fullscreenMode: false,
      tableScale: 1.0,
      
      setFullscreenMode: (enabled) => set({ fullscreenMode: enabled }),
      
      increaseScale: () => {
        const current = get().tableScale;
        if (current < 2.0) {
          set({ tableScale: Math.min(2.0, current + 0.1) });
        }
      },
      
      decreaseScale: () => {
        const current = get().tableScale;
        if (current > 0.5) {
          set({ tableScale: Math.max(0.5, current - 0.1) });
        }
      },
      
      setTableScale: (scale) => {
        set({ tableScale: Math.max(0.5, Math.min(2.0, scale)) });
      },
    }),
    {
      name: 'display-settings-paid',
      storage: {
        getItem: (name) => {
          const item = sessionStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);
