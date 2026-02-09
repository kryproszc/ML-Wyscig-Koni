import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SheetSelect } from '@/components/SheetSelect';
import { DataTypeSelector, type DataType } from '@/components/DataTypeSelector';
import { TriangleTypeSelector, type TriangleType } from '@/components/TriangleTypeSelector';
import { HeadersSelector } from '@/components/HeadersSelector';
import type { UseFormRegister } from 'react-hook-form';
import type { FormField } from '@/features/data-input/InputDataTabRefactored';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
interface FileUploadSectionProps {
  register: UseFormRegister<FormField>;
  onFileLoad: () => void;
  hasFile: boolean;
  uploadedFileName?: string;
  sheetSelectComponent?: React.ReactNode;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  register,
  onFileLoad,
  hasFile,
  uploadedFileName,
  sheetSelectComponent,
}) => {
  return (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
      <Label className="text-white text-sm mb-3 block">Wybór pliku i arkusza</Label>
      
      <div className="flex items-center gap-4 mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          className="bg-slate-700 border border-slate-600 text-white p-2 rounded-lg file:bg-slate-600 file:border-none file:text-white file:rounded file:px-3 file:py-1 file:mr-2"
          {...register("file")}
        />
        <button
          type="button"
          onClick={onFileLoad}
          disabled={!hasFile}
          className="py-2 px-4 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Załaduj plik
        </button>
        {uploadedFileName && (
          <span className="text-sm text-green-400 ml-2">
            Wczytano: <strong>{uploadedFileName}</strong>
          </span>
        )}
      </div>
      
      <div>
        <Label className="text-white text-sm">Wybór arkusza</Label>
        {sheetSelectComponent || <SheetSelect />}
      </div>
    </div>
  );
};

interface RangeInputSectionProps {
  register: UseFormRegister<FormField>;
  onAutoRange: () => void;
  workbookExists: boolean;
  dataType: DataType;
  onDataTypeChange: (type: DataType) => void;
  triangleType: TriangleType;
  onTriangleTypeChange: (type: TriangleType) => void;
  hasHeaders: boolean;
  onHeadersChange: (hasHeaders: boolean) => void;
  rangeMode?: 'numeric' | 'excel';
  onRangeModeChange?: (mode: 'numeric' | 'excel') => void;
  setValue?: any;
  errors?: any;
}

export const RangeInputSection: React.FC<RangeInputSectionProps> = ({
  register,
  onAutoRange,
  workbookExists,
  dataType,
  onDataTypeChange,
  triangleType,
  onTriangleTypeChange,
  hasHeaders,
  onHeadersChange,
  rangeMode = 'numeric',
  onRangeModeChange,
  errors,
}) => {
  return (
    <>
      {/* SEKCJA 2: Wybór trybu zakresu */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
        <Label className="text-white text-sm mb-3 block">Sposób podawania zakresu</Label>
        <div className="flex gap-8 mb-4">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="numeric-mode"
              checked={rangeMode === 'numeric'}
              onChange={() => onRangeModeChange?.('numeric')}
              className="text-emerald-500 focus:ring-emerald-400 w-4 h-4"
            />
            <Label htmlFor="numeric-mode" className="text-white text-sm font-medium cursor-pointer">
              🔢 Numeryczny (wiersze/kolumny)
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="excel-mode"
              checked={rangeMode === 'excel'}
              onChange={() => onRangeModeChange?.('excel')}
              className="text-emerald-500 focus:ring-emerald-400 w-4 h-4"
            />
            <Label htmlFor="excel-mode" className="text-white text-sm font-medium cursor-pointer">
              📊 Excel (A1:Z99)
            </Label>
          </div>
        </div>

        {/* Pola zakresu - bezpośrednio pod wyborem trybu */}
        <div className="mt-6">
          {/* Tryb numeryczny */}
          {rangeMode === 'numeric' && (
            <div>
              <Label className="text-emerald-400 text-sm font-semibold mb-3 block">🔢 Zakres numeryczny</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white text-sm">Wiersz początkowy</Label>
                  <Input
                    type="number"
                    placeholder="np. 2"
                    disabled={!workbookExists}
                    {...register("rowStart")}
                    className="mt-1"
                  />
                  {errors?.rowStart && (
                    <p className="text-red-400 text-xs mt-1">{errors.rowStart.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-white text-sm">Wiersz końcowy</Label>
                  <Input
                    type="number"
                    placeholder="np. 11"
                    disabled={!workbookExists}
                    {...register("rowEnd")}
                    className="mt-1"
                  />
                  {errors?.rowEnd && (
                    <p className="text-red-400 text-xs mt-1">{errors.rowEnd.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-white text-sm">Kolumna początkowa</Label>
                  <Input
                    type="number"
                    placeholder="np. 2"
                    disabled={!workbookExists}
                    {...register("colStart")}
                    className="mt-1"
                  />
                  {errors?.colStart && (
                    <p className="text-red-400 text-xs mt-1">{errors.colStart.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-white text-sm">Kolumna końcowa</Label>
                  <Input
                    type="number"
                    placeholder="np. 11"
                    disabled={!workbookExists}
                    {...register("colEnd")}
                    className="mt-1"
                  />
                  {errors?.colEnd && (
                    <p className="text-red-400 text-xs mt-1">{errors.colEnd.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tryb Excel */}
          {rangeMode === 'excel' && (
            <div>
              <Label className="text-emerald-400 text-sm font-semibold mb-3 block">📊 Zakres Excel</Label>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label className="text-white text-sm">Od komórki</Label>
                  <Input
                    type="text"
                    placeholder="A1"
                    disabled={!workbookExists}
                    {...register("cellStart")}
                    className="uppercase mt-1 text-center font-mono"
                  />
                  {errors?.cellStart && (
                    <p className="text-red-400 text-xs mt-1">{errors.cellStart.message}</p>
                  )}
                </div>
                <div className="text-emerald-400 font-bold text-2xl pb-6">:</div>
                <div className="flex-1">
                  <Label className="text-white text-sm">Do komórki</Label>
                  <Input
                    type="text"
                    placeholder="Z99"
                    disabled={!workbookExists}
                    {...register("cellEnd")}
                    className="uppercase mt-1 text-center font-mono"
                  />
                  {errors?.cellEnd && (
                    <p className="text-red-400 text-xs mt-1">{errors.cellEnd.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Przycisk wykryj automatycznie */}
          <div className="mt-4">
            <Button
              type="button"
              onClick={onAutoRange}
              variant="outline"
              disabled={!workbookExists}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500"
            >
              Wykryj zakres automatycznie
            </Button>
          </div>
        </div>
      </div>

      {/* SEKCJA 3: Ustawienia danych */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
        <TriangleTypeSelector 
          triangleType={triangleType} 
          onTriangleTypeChange={onTriangleTypeChange} 
        />
        <HeadersSelector 
          hasHeaders={hasHeaders} 
          onHeadersChange={onHeadersChange} 
        />
        <DataTypeSelector dataType={dataType} onDataTypeChange={onDataTypeChange} />
      </div>
    </>
  );
};
