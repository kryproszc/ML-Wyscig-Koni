import { useState } from "react";
import { PaidTabs, MultStoch, BootParam } from "./PaidTabs";

export function DeterministicTabs() {
  const [activeTab, setActiveTab] = useState<"bootstrap" | "multiplikatywna" | "parametryczny">("bootstrap");

  return (
    <div className="w-full text-white">
      {/* Zakładki na górze */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("bootstrap")}
          className={`px-4 py-2 transition-all ${
            activeTab === "bootstrap"
              ? "border-b-2 border-blue-400 text-blue-400 font-semibold"
              : "hover:text-blue-300"
          }`}
        >
          Bootstrap nieparametryczny
        </button>
        <button
          onClick={() => setActiveTab("multiplikatywna")}
          className={`px-4 py-2 transition-all ${
            activeTab === "multiplikatywna"
              ? "border-b-2 border-blue-400 text-blue-400 font-semibold"
              : "hover:text-blue-300"
          }`}
        >
          Multiplikatywna stochastyczna
        </button>
        <button
          onClick={() => setActiveTab("parametryczny")}
          className={`px-4 py-2 transition-all ${
            activeTab === "parametryczny"
              ? "border-b-2 border-blue-400 text-blue-400 font-semibold"
              : "hover:text-blue-300"
          }`}
        >
          Bootstrap parametryczny
        </button>
      </div>

      {/* Treść aktywnej zakładki */}
      {activeTab === "bootstrap" && <PaidTabs />}
      {activeTab === "multiplikatywna" && <MultStoch />}
      {activeTab === "parametryczny" && <BootParam />}
    </div>
  );
}
