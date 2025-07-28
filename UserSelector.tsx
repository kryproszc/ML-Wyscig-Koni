'use client';

import { useState } from 'react';
import { useUserStore } from '@/app/_components/useUserStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function UserSelector() {
  const setUserId = useUserStore((s) => s.setUserId);
  const [input, setInput] = useState('');

  const handleLogin = () => {
    if (input.trim()) setUserId(input.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0f172a] to-[#1e293b] px-4">
      <div className="w-full max-w-md bg-[#1f2937] p-10 rounded-2xl shadow-2xl space-y-8 animate-fade-in">
        {/* Grafika powitalna */}
        <div className="flex justify-center">
          <img
            src="/Grafika_powitalna.png"
            alt="Grafika powitalna"
            className="h-20 w-20 object-cover rounded-full shadow-lg border-2 border-white"
          />
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Witaj ponownie</h2>
          <p className="text-sm text-gray-400">Zaloguj się, aby kontynuować</p>
        </div>

        {/* Login Form */}
        <div className="space-y-6">
          <Input
            placeholder="np. user123"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-[#111827] text-white border-gray-600 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 rounded-lg"
          />
          <Button 
            onClick={handleLogin} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-lg transition-transform hover:scale-105"
          >
            Zaloguj
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500">
          Źródło grafiki: <a href="https://www.insurtechexpress.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">insurtechexpress.com</a>
        </p>
      </div>
    </div>
  );
}
