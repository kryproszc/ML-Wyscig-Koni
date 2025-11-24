import { Label } from "@/components/ui/label";

export type HeadersType = boolean;

interface HeadersSelectorProps {
  hasHeaders: boolean;
  onHeadersChange: (hasHeaders: boolean) => void;
}

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

export function HeadersSelector({ hasHeaders, onHeadersChange }: HeadersSelectorProps) {
  return (
    <div className="space-y-3">
      <CardHeader>
            <CardTitle> Czy dane zawierają podpisy kolumn i wierszy?</CardTitle>
        </CardHeader>
      <div className="flex flex-col space-y-2">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="headers"
            checked={hasHeaders === true}
            onChange={() => onHeadersChange(true)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">
            ✓ Zawierają podpisy kolumn i wierszy
          </span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="headers"
            checked={hasHeaders === false}
            onChange={() => onHeadersChange(false)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">
            ✗ Nie zawierają podpisów kolumn i wierszy
          </span>
        </label>
      </div>
    </div>
  );
}
