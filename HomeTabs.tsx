'use client';

import { useState } from "react";
import { InputDataTab } from "./InputDataTab";
import { DeterministicTabs } from "./DeterministicTabs";
import { DeterministicMethodsTab } from "./DeterministicMethodsTab";
import { Folder, Calculator, Home, BarChart } from "lucide-react";
import { DataTabs } from "./DataTabs";

export function HomeTabs() {
  const [selectedTab, setSelectedTab] = useState<"start" | "input" | "stoch" | "deterministic">("start");

  const renderContent = () => {
    switch (selectedTab) {
      case "start":
        return <StartPage />;
      case "input":
        return <DataTabs />;

      case "stoch":
        return <DeterministicTabs />;
      case "deterministic":
        return <DeterministicMethodsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e293b] text-gray-100 flex flex-col py-6 px-4 border-r border-gray-700 sticky top-0 h-screen">
        {/* Logo / nagłówek */}
        <div className="flex flex-col justify-center items-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-wider text-blue-400">
            UPZ
          </h1>
          <p className="text-xs text-gray-400 mt-1 text-center leading-tight">
            Uniwersytet Pomocy<br />Zagubionym
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          <SidebarItem 
            icon={<Home size={20} />} 
            label="Start" 
            isActive={selectedTab === "start"} 
            onClick={() => setSelectedTab("start")} 
          />
          <SidebarItem 
            icon={<Folder size={20} />} 
            label="Wprowadź dane" 
            isActive={selectedTab === "input"} 
            onClick={() => setSelectedTab("input")} 
          />
          <SidebarItem 
            icon={<Calculator size={20} />} 
            label="Stochastyczne" 
            isActive={selectedTab === "stoch"} 
            onClick={() => setSelectedTab("stoch")} 
          />
          <SidebarItem 
            icon={<BarChart size={20} />} 
            label="Metody deterministyczne" 
            isActive={selectedTab === "deterministic"} 
            onClick={() => setSelectedTab("deterministic")} 
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#0f172a] p-8 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, isActive, onClick }: { 
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all text-left
        ${isActive 
          ? "bg-gray-700 text-blue-400 font-semibold shadow-inner"
          : "hover:bg-gray-700 hover:text-blue-300"}`}
    >
      {icon}
      <span className="text-base">{label}</span>
    </button>
  );
}

function StartPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-100 animate-fade-in">
      <div className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] p-12 rounded-xl shadow-2xl flex flex-col items-center w-full max-w-4xl">
        <img 
          src="/Grafika_powitalna.png" 
          alt="Grafika powitalna"
          className="w-full max-w-2xl mb-4 rounded-lg shadow-lg"
        />
        
        <p className="text-xs text-gray-500 mb-10">
          Źródło: <a href="https://www.insurtechexpress.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">
            www.insurtechexpress.com
          </a>
        </p>

        <h1 className="text-5xl font-bold mb-6 text-center">Witaj w aplikacji!</h1>
        <p className="text-xl text-gray-400 text-center max-w-2xl">
          Rozpocznij pracę z symulacjami stochastycznymi rezerw ubezpieczeniowych. Wprowadź dane i wyciągaj wnioski z przeprowadzonych analiz.
        </p>
      </div>
    </div>
  );
}
