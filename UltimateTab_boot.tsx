'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { ControlPanelBoot } from '@/components/Simulation/ControlPanelBoot';
import { ChartsBoot } from '@/components/Simulation/ChartsBoot';
import { StatsTablesBoot } from '@/components/Simulation/StatsTablesBoot';
import { getPercentileStoch } from '@/services/simulationApi';
import { useBootStore } from '@/stores/useBootStore';
import { useBootParamResultsStore } from '@/stores/useBootParamResultsStore';
import { OverlayLoaderWithProgress } from '@/components/ui/OverlayLoaderWithProgress';
import { useUserStore } from '@/app/_components/useUserStore';
import { useBootSimulationRunner } from '@/hooks/useBootSimulationRunner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

export default function UltimateTab_boot() {
  const userId = useUserStore((s) => s.userId);
  const simulation = useBootSimulationRunner(); // <-- Zaraz poprawimy typowanie

  const {
    percentileInputSim,
    percentileInputDiff,
    percentileMatch,
    setPercentileMatch,
    requestId,
    quantileResult,
    stats,
  } = useBootStore();

  const [showNoDataDialog, setShowNoDataDialog] = useState(false);
  const [showServerErrorDialog, setShowServerErrorDialog] = useState(false);

  const [isSigmaReestimated, setIsSigmaReestimated] = useState(false);
  const [valueSigma, setValueSigma] = useState(1.0);

  const dev = useBootParamResultsStore((s) => s.dev);
  const sd = useBootParamResultsStore((s) => s.sd);
  const sigma = useBootParamResultsStore((s) => s.sigma);

  const handleQuantileClick = async () => {
    if (!requestId) return;
    await simulation.refetchQuantiles(requestId);
  };

  useEffect(() => {
    if (requestId) {
      handleQuantileClick();
    }
  }, [requestId]);

  useEffect(() => {
    const runPercentileSync = async () => {
      if (!requestId || !userId) return;

      const { percentileInputSim, percentileInputDiff } = useBootStore.getState();
      const updates: { sim: number | null; diff: number | null } = { sim: null, diff: null };

      if (percentileInputSim.trim()) {
        const simVal = parseFloat(percentileInputSim);
        if (!isNaN(simVal)) {
          const simRes = await getPercentileStoch(userId, requestId, simVal, 'sim');
          updates.sim = simRes.percentile;
        }
      }

      if (percentileInputDiff.trim()) {
        const diffVal = parseFloat(percentileInputDiff);
        if (!isNaN(diffVal)) {
          const diffRes = await getPercentileStoch(userId, requestId, diffVal, 'diff');
          updates.diff = diffRes.percentile;
        }
      }

      useBootStore.getState().setPercentileMatch(updates);
    };

    runPercentileSync();
  }, [requestId, userId]);

  const handlePercentileClick = async (source: 'sim' | 'diff') => {
    if (!requestId || !userId) return;

    const val = source === 'sim'
      ? parseFloat(percentileInputSim)
      : parseFloat(percentileInputDiff);

    if (isNaN(val)) return;

    const result = await getPercentileStoch(userId, requestId, val, source);
    setPercentileMatch({
      sim: source === 'sim' ? result.percentile : percentileMatch?.sim ?? null,
      diff: source === 'diff' ? result.percentile : percentileMatch?.diff ?? null,
    });
  };

  const handleRunAll = async () => {
    try {
      if (!userId) throw new Error('Brak userId');

      if (!dev.length || !sd.length || !sigma.length) {
        setShowNoDataDialog(true);
        return;
      }

      const { setDev, setSd, setSigma } = useBootStore.getState();
      setDev(dev || []);
      setSd(sd || []);
      setSigma(sigma || []);

      // 🔥 Mutacja z dodatkowymi parametrami
      await simulation.mutateAsync({
        is_sigma_reestimated: isSigmaReestimated,
        value_sigma: valueSigma,
      });

      const waitForRequestId = async (): Promise<string> => {
        return new Promise((resolve, reject) => {
          const interval = setInterval(() => {
            const id = useBootStore.getState().requestId;
            if (id) {
              clearInterval(interval);
              resolve(id);
            }
          }, 100);

          setTimeout(() => {
            clearInterval(interval);
            reject(new Error('Timeout: requestId not set'));
          }, 5000);
        });
      };

      const id = await waitForRequestId();
      await simulation.refetchQuantiles(id);
    } catch (err) {
      console.error('❌ Błąd podczas symulacji:', err);
      setShowServerErrorDialog(true);
    }
  };

  const handleExportToExcel = () => {
    const {
      stats,
      quantileResult,
      percentileMatch,
      percentileInputSim,
      percentileInputDiff,
    } = useBootStore.getState();

    if (!stats || !quantileResult) {
      alert('Brak danych do eksportu.');
      return;
    }

    const rows: any[] = [];

    const allKeys = Array.from(new Set([...Object.keys(stats), ...Object.keys(quantileResult)]));

    for (const key of allKeys) {
      const stat = stats[key];
      const quant = quantileResult[key];

      rows.push({
        Statystyka: key,
        'Wartość (sim_results)': stat?.value ?? quant?.value ?? '',
        Metryka: key,
        'Wartość (sim_diff)': stat?.value_minus_latest ?? quant?.value_minus_latest ?? '',
      });
    }

    rows.push({});
    rows.push({
      Statystyka: 'Percentyl',
      'Wartość (sim_results)': percentileMatch?.sim != null
        ? `${(percentileMatch.sim * 100).toFixed(2)}%`
        : '',
      Metryka: 'Percentyl',
      'Wartość (sim_diff)': percentileMatch?.diff != null
        ? `${(percentileMatch.diff * 100).toFixed(2)}%`
        : '',
    });

    rows.push({
      Statystyka: 'Dla wartości',
      'Wartość (sim_results)': percentileInputSim || '',
      Metryka: 'Dla wartości',
      'Wartość (sim_diff)': percentileInputDiff || '',
    });

    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Symulacja');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'symulacja_boot.xlsx');
  };

  return (
    <div className="flex flex-col gap-6 p-6 text-white">
      <div className="flex gap-6">
        <ControlPanelBoot
          onRun={handleRunAll}
          onQuantileClick={handleQuantileClick}
          onPercentileClick={handlePercentileClick}
          onExport={handleExportToExcel}
          isLoading={simulation.isPending}
          isSigmaReestimated={isSigmaReestimated}
          setIsSigmaReestimated={setIsSigmaReestimated}
          valueSigma={valueSigma}
          setValueSigma={setValueSigma}
        />

        <div className="flex-1 flex flex-col gap-6">
          <ChartsBoot.OnlyHistogram />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-6">
              <StatsTablesBoot.SimResults />
              <div className="h-[350px]">
                <ChartsBoot.SimChart />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <StatsTablesBoot.SimDiff />
              <div className="h-[350px]">
                <ChartsBoot.DiffChart />
              </div>
            </div>
          </div>
        </div>
      </div>

      {simulation.isPending && <OverlayLoaderWithProgress />}

      {/* AlertDialog brak danych */}
      <AlertDialog open={showNoDataDialog} onOpenChange={setShowNoDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader className="flex flex-col items-center">
            <VisuallyHidden>
              <AlertDialogTitle>Brak danych</AlertDialogTitle>
            </VisuallyHidden>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <AlertDialogDescription className="text-center text-red-600 font-medium">
              Uwaga! Brak wymaganych danych: <strong>dev</strong>, <strong>sd</strong>, <strong>sigma</strong>.
              <br />
              Wróć do zakładki 2. Parametry i wyznacz wymagane współczynniki.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zamknij</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog błąd serwera */}
      <AlertDialog open={showServerErrorDialog} onOpenChange={setShowServerErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader className="flex flex-col items-center">
            <VisuallyHidden>
              <AlertDialogTitle>Błąd serwera</AlertDialogTitle>
            </VisuallyHidden>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <AlertDialogDescription className="text-center text-red-600 font-medium">
              Nie udało się wykonać symulacji.
              <br />
              Sprawdź czy wczytany trójkąt jest odpowiedni dla tej metody lub czy wybrane przez Ciebie współczynniki są poprawne.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zamknij</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
