'use client';

import { useEffect, useState } from 'react';
import { useIncurredTableStore } from '@/stores/useIncurredTableStore';
import { useTrainDevideStoreDetIncurred } from '@/stores/trainDevideStoreDeterministycznyIncurred';
import { useLabelsStore } from '@/stores/useLabelsStore';
import { useDisplaySettingsStore } from '@/stores/useDisplaySettingsStore';
import { TriangleTableView } from '@/shared';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Plus, Minus } from 'lucide-react';
import dynamic from 'next/dynamic';

const IncurredTriangleDet = dynamic(() => import('../../../app/_components/IncurredTriangleDet'), { ssr: false });

export default function IncurredTriangleView() {
  /* ── 1. dane ze stanu loadera XLSX ─────────────────────────── */
  const isValid = useIncurredTableStore((s) => s.isValid);
  const json = useIncurredTableStore((s) => s.selectedSheetJSON);

  /* ── 2. trójkąt Incurred w głównym store ────── */
  const incurredTriangle = useTrainDevideStoreDetIncurred((s) => s.incurredTriangle);

  /* ── 3. labels dla Incurred ──── */
  const incurredRowLabels = useLabelsStore((s) => s.incurredRowLabels);
  const incurredColumnLabels = useLabelsStore((s) => s.incurredColumnLabels);
  
  /* ── 4. ustawienia wyświetlania ──── */
  const roundNumbers = useDisplaySettingsStore((s) => s.roundNumbers);
  const fullscreenMode = useDisplaySettingsStore((s) => s.fullscreenMode);
  const tableScale = useDisplaySettingsStore((s) => s.tableScale);
  const setRoundNumbers = useDisplaySettingsStore((s) => s.setRoundNumbers);
  const setFullscreenMode = useDisplaySettingsStore((s) => s.setFullscreenMode);
  const increaseScale = useDisplaySettingsStore((s) => s.increaseScale);
  const decreaseScale = useDisplaySettingsStore((s) => s.decreaseScale);

  // Stan dla animacji zamykania
  const [isClosing, setIsClosing] = useState(false);

  // Funkcja do zamykania z animacją
  const handleCloseFullscreen = () => {
    setIsClosing(true);
    // Opóźnienie zamknięcia o czas trwania animacji
    setTimeout(() => {
      setFullscreenMode(false);
      setIsClosing(false);
    }, 300); // 300ms - szybsze zamykanie
  };
  
  // Dodatkowe logi dla wszystkich labels ze store
  const globalRowLabels = useLabelsStore((s) => s.globalRowLabels);
  const globalColumnLabels = useLabelsStore((s) => s.globalColumnLabels);
  const lastLoadedFile = useLabelsStore((s) => s.lastLoadedFile);

  /* ── 4.1. logi dla debugowania ──── */
  useEffect(() => {
    console.log('[IncurredTriangleView] isValid:', isValid);
    console.log('[IncurredTriangleView] json:', json);
    console.log('[IncurredTriangleView] incurredTriangle:', incurredTriangle);
    console.log('[IncurredTriangleView] incurredTriangle structure:');
    if (incurredTriangle) {
      console.log('  - Number of rows:', incurredTriangle.length);
      console.log('  - First row length:', incurredTriangle[0]?.length);
      console.log('  - First row:', incurredTriangle[0]);
      console.log(
        '  - Max row length:',
        Math.max(...incurredTriangle.map((row) => row?.length || 0))
      );
    }
    console.log('[IncurredTriangleView] incurredRowLabels:', incurredRowLabels);
    console.log('[IncurredTriangleView] incurredColumnLabels:', incurredColumnLabels, 'length:', incurredColumnLabels.length);
    console.log('[IncurredTriangleView] globalRowLabels:', globalRowLabels);
    console.log('[IncurredTriangleView] globalColumnLabels:', globalColumnLabels, 'length:', globalColumnLabels.length);
    console.log('[IncurredTriangleView] lastLoadedFile:', lastLoadedFile);
  }, [isValid, json, incurredTriangle, incurredRowLabels, incurredColumnLabels, globalRowLabels, globalColumnLabels, lastLoadedFile]);

  // Skip first element from labels as it's typically 'AY' header
  const actualRowLabels = incurredRowLabels.length > 1 ? incurredRowLabels.slice(1) : [];
  const actualColumnLabels = incurredColumnLabels.length > 1 ? incurredColumnLabels.slice(1) : [];

  // Funkcja do formatowania liczb na podstawie ustawienia roundNumbers
  const formatTriangleData = (data: (number | null)[][] | null | undefined) => {
    if (!data) return data;
    
    return data.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) return cell;
        return roundNumbers ? Math.round(cell) : cell;
      })
    );
  };

  // Funkcja formatowania liczb z separatorami tysięcy
  const numberFormatter = (num: number | null): string => {
    if (num === null || num === undefined) return '';
    
    const processedNumber = roundNumbers ? Math.round(num) : num;
    
    // Formatowanie z separatorami tysięcy (spacja co 3 cyfry)
    return processedNumber.toLocaleString('pl-PL', {
      useGrouping: true,
      minimumFractionDigits: roundNumbers ? 0 : 2,
      maximumFractionDigits: roundNumbers ? 0 : 2
    }).replace(/\u00A0/g, ' '); // Zastępujemy non-breaking space zwykłą spacją
  };

  const formattedTriangle = formatTriangleData(incurredTriangle);

  // Komponent kontrolek rozmiaru - używany w obu miejscach
  const ScaleControls = () => (
    <div className="flex items-center gap-2">
      <Button
        onClick={decreaseScale}
        variant="outline"
        size="sm"
        className="w-8 h-8 p-0 text-white border-gray-600 hover:bg-gray-700"
        disabled={tableScale <= 0.5}
      >
        <Minus className="w-4 h-4" />
      </Button>
      
      <span className="text-white text-sm min-w-[3rem] text-center">
        {Math.round(tableScale * 100)}%
      </span>
      
      <Button
        onClick={increaseScale}
        variant="outline"
        size="sm"
        className="w-8 h-8 p-0 text-white border-gray-600 hover:bg-gray-700"
        disabled={tableScale >= 2.0}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <>
      {/* Normalny widok z panelem bocznym */}
      <div className="flex gap-6">
        {/* Lewy panel */}
        <div className="w-72 bg-gray-800 rounded-lg p-6">
          <div className="text-white text-lg font-medium mb-6">
            Ustawienia wyświetlania
          </div>
          
          <div className="space-y-4">
            <Checkbox
              checked={roundNumbers}
              onChange={(e) => setRoundNumbers(e.target.checked)}
              label="Zaokrąglij liczby"
              labelClassName="text-white"
            />
            
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Rozmiar tabeli
              </label>
              <ScaleControls />
            </div>
            
            <Button
              onClick={() => setFullscreenMode(true)}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Pełny ekran
            </Button>
          </div>
        </div>
        
        {/* Główna tabela */}
        <div className="flex-1">
          <div 
            style={{ 
              transform: `scale(${tableScale})`, 
              transformOrigin: 'top left',
              width: `${100 / tableScale}%`,
              height: `${100 / tableScale}%`
            }}
          >
            <TriangleTableView
              title="Wczytany trójkąt danych"
              triangle={formattedTriangle}
              noDataMessage="Brak danych – wczytaj plik i kliknij Wybierz w zakładce Incurred."
              fallbackComponent={IncurredTriangleDet}
              withNumericHeaders={false}
              rowLabels={actualRowLabels}
              columnLabels={actualColumnLabels}
              numberFormatter={numberFormatter}
            />
          </div>
        </div>
      </div>

      {/* Overlay pełnoekranowy - wyświetla się NAD wszystkim */}
      {fullscreenMode && (
        <div 
          className="fixed inset-0 bg-gray-900 z-50 flex flex-col transition-all duration-300 ease-out"
          style={{
            animation: isClosing ? 'fadeOut 0.2s ease-in forwards' : 'fadeIn 0.3s ease-out'
          }}
        >
          {/* Górny pasek z przyciskiem zamknięcia */}
          <div 
            className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700 transition-all duration-300 ease-out"
            style={{
              animation: isClosing 
                ? 'slideOutToTop 0.25s ease-in forwards' 
                : 'slideInFromTop 0.4s ease-out 0.1s both'
            }}
          >
            <h2 className="text-white text-lg font-medium">Wczytany trójkąt danych - Widok pełnoekranowy</h2>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Rozmiar:</span>
                <ScaleControls />
              </div>
              
              <Button
                onClick={handleCloseFullscreen}
                variant="outline"
                size="sm"
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <Minimize2 className="w-4 h-4 mr-2" />
                Zamknij pełny ekran
              </Button>
            </div>
          </div>
          
          {/* Tabela zajmująca całą dostępną przestrzeń */}
          <div 
            className="flex-1 p-6 overflow-auto bg-gray-900 transition-all duration-500 ease-out"
            style={{
              animation: isClosing 
                ? 'zoomOut 0.3s ease-in forwards'
                : 'zoomIn 0.5s ease-out 0.2s both'
            }}
          >
            <div 
              style={{ 
                transform: `scale(${tableScale})`, 
                transformOrigin: 'top left',
                width: `${100 / tableScale}%`,
                height: `${100 / tableScale}%`
              }}
            >
              <TriangleTableView
                title=""
                triangle={formattedTriangle}
                noDataMessage="Brak danych – wczytaj plik i kliknij Wybierz w zakładce Incurred."
                fallbackComponent={IncurredTriangleDet}
                withNumericHeaders={false}
                rowLabels={actualRowLabels}
                columnLabels={actualColumnLabels}
                numberFormatter={numberFormatter}
              />
            </div>
          </div>
          
          {/* Style animacji - otwieranie i zamykanie */}
          <style jsx>{`
            /* Animacje otwierania */
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            
            @keyframes slideInFromTop {
              from {
                transform: translateY(-20px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            
            @keyframes zoomIn {
              from {
                transform: scale(0.95);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
            
            /* Animacje zamykania */
            @keyframes fadeOut {
              from {
                opacity: 1;
              }
              to {
                opacity: 0;
              }
            }
            
            @keyframes slideOutToTop {
              from {
                transform: translateY(0);
                opacity: 1;
              }
              to {
                transform: translateY(-20px);
                opacity: 0;
              }
            }
            
            @keyframes zoomOut {
              from {
                transform: scale(1);
                opacity: 1;
              }
              to {
                transform: scale(0.95);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
