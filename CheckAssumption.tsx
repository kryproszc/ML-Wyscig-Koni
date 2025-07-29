import React, { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableDataCor } from "@/components/TableDataCor";
import type { CorRowData } from "@/components/TableDataCor";
type RowData = (string | number | null)[];

interface ObsRow {
  origin_period: number;
  dev_period: number;
  cal_period: number;
  residuals: number;
  standard_residuals: number;
  fitted_value: number;
}

interface LowessRow {
  x: number;
  lowess: number;
}

interface LowessResults {
  fitted_value: LowessRow[];
  origin_period: LowessRow[];
  cal_period: LowessRow[];
  dev_period: LowessRow[];
}

interface ResidualsResp {
  obs_vs_fitted: ObsRow[];
  lowess_results: LowessResults;
}

interface DependenceSummary {
  results: { [key: string]: number | null };
  range: { Lower: number | null; Upper: number | null };
}

interface DensityPlot {
  curve: [number, number][];
  ci_area: [number, number][];
  T_stat: number;
  T_y: number;
}

interface DependenceResp {
  T_stat: number | null;
  Var: number | null;
  Range: [number | null, number | null];
  ci: number;
  summary: DependenceSummary;
  density_plot?: DensityPlot;
}

const triangle = [
  [5012, 8269, 10907, 11805, 13539, 16181, 18009, 18608, 18662, 18834],
  [106, 4285, 5396, 10666, 13782, 15599, 15496, 16169, 16704, null],
  [3410, 8992, 13873, 16141, 18735, 22214, 22863, 23466, null, null],
  [5655, 11555, 15766, 21266, 23425, 26083, 27067, null, null, null],
  [1092, 9565, 15836, 22169, 25955, 26180, null, null, null, null],
  [1513, 6445, 11072, 12935, 15852, null, null, null, null, null],
  [557, 4020, 10946, 12314, null, null, null, null, null, null],
  [1351, 6947, 13112, null, null, null, null, null, null, null],
  [3133, 5395, null, null, null, null, null, null, null, null],
  [2063, null, null, null, null, null, null, null, null, null],
];

const CHARTS = [
  {
    key: "fitted_value",
    title: "Reszty vs. Dopasowane",
    xLabel: "Fitted",
    xAccessor: (d: ObsRow) => d.fitted_value,
  },
  {
    key: "origin_period",
    title: "Reszty vs. Origin period",
    xLabel: "Origin period",
    xAccessor: (d: ObsRow) => d.origin_period,
  },
  {
    key: "cal_period",
    title: "Reszty vs. Calendar period",
    xLabel: "Calendar period",
    xAccessor: (d: ObsRow) => d.cal_period,
  },
  {
    key: "dev_period",
    title: "Reszty vs. Development period",
    xLabel: "Development period",
    xAccessor: (d: ObsRow) => d.dev_period,
  },
] as const;

export default function CheckAssumption() {
  const [activeTab, setActiveTab] = useState<"model" | "assumptions" | "analysis">("model");
  const [residualsData, setResidualsData] = useState<ResidualsResp | null>(null);
  const [dependenceData, setDependenceData] = useState<DependenceResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alpha, setAlpha] = useState(1.0);
  const [ci, setCi] = useState(0.5);
  // 🔁 residuals
  useEffect(() => {
    if (activeTab !== "assumptions" || residualsData) return;

fetch("http://localhost:8000/analyze-residuals", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ triangle, alpha }),
})

      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: ResidualsResp) => setResidualsData(json))
      .catch(() => setError("Błąd pobierania danych z /analyze-residuals"));
  }, [activeTab]);

  // 🔁 dependence
  useEffect(() => {
    if (activeTab !== "analysis" || dependenceData) return;

fetch("http://localhost:8000/analyze-dependence", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ triangle, ci }),
})

      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: DependenceResp) => setDependenceData(json))
      .catch(() => setError("Błąd pobierania danych z /analyze-dependence"));
  }, [activeTab]);

  const chartData = useMemo(() => {
    if (!residualsData) return [];
    return CHARTS.map((cfg) => ({
      ...cfg,
      scatter: residualsData.obs_vs_fitted.map((d) => ({
        x: cfg.xAccessor(d),
        y: d.standard_residuals,
      })),
      lowess: residualsData.lowess_results[cfg.key].map((d) => ({
        x: d.x,
        y: d.lowess,
      })),
    }));
  }, [residualsData]);

const formattedSummary: CorRowData[] = useMemo(() => {
  if (!dependenceData) return [];

  return [
    ["T", dependenceData.summary.results["T"] ?? null],
    ["E[T]", dependenceData.summary.results["E[T]"] ?? null],
    ["Var[T]", dependenceData.summary.results["Var[T]"] ?? null],
    ["Lower", dependenceData.summary.range.Lower ?? null],
    ["Upper", dependenceData.summary.range.Upper ?? null],
  ];
}, [dependenceData]);


return (
  <div>
    {/* 🔘 Zakładki */}
    <div className="flex gap-4 mb-6">
      <button onClick={() => setActiveTab("model")} className={activeTab === "model" ? "font-bold underline" : ""}>Model</button>
      <button onClick={() => setActiveTab("assumptions")} className={activeTab === "assumptions" ? "font-bold underline" : ""}>Assumptions</button>
      <button onClick={() => setActiveTab("analysis")} className={activeTab === "analysis" ? "font-bold underline" : ""}>Analiza zależności</button>
    </div>

    {/* 🎚️ Suwak alpha */}
    {activeTab === "assumptions" && (
      <div className="mb-4 text-white">
        <label className="mr-2 font-medium">Alpha (dla wag):</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.01"
          value={alpha}
          onChange={(e) => setAlpha(parseFloat(e.target.value))}
          className="w-64"
        />
        <span className="ml-3">{alpha.toFixed(2)}</span>
      </div>
    )}

    {/* 🎚️ Suwak ci */}
    {activeTab === "analysis" && (
      <div className="mb-4 text-white">
        <label className="mr-2 font-medium">Przedział ufności (ci):</label>
        <input
          type="range"
          min="0.01"
          max="0.99"
          step="0.01"
          value={ci}
          onChange={(e) => setCi(parseFloat(e.target.value))}
          className="w-64"
        />
        <span className="ml-3">{(ci * 100).toFixed(0)}%</span>
      </div>
    )}

    {/* 🖼️ Wykresy – assumptions */}
    {activeTab === "assumptions" && (
      <>
        {error && <p className="text-destructive">{error}</p>}
        {!residualsData && <p className="italic">Ładowanie…</p>}
        {residualsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {chartData.map(({ title, xLabel, scatter, lowess }, idx) => (
              <Card key={idx} className="bg-gray-500">
                <CardHeader className="text-base font-medium">{title}</CardHeader>
                <CardContent className="p-6 bg-gray-300">
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={scatter} margin={{ top: 20, right: 20, bottom: 30, left: 50 }}>
                      <CartesianGrid stroke="#666" strokeOpacity={0.5} strokeDasharray="3 3" />
                      <XAxis dataKey="x" label={{ value: xLabel, position: "insideBottom", offset: -10, fill: "#333" }} type="number" axisLine={{ stroke: "#666" }} tick={{ fill: "#333" }} />
                      <YAxis dataKey="y" label={{ value: "Standardised residuals", angle: -90, position: "insideLeft", offset: 10, fill: "#333" }} type="number" domain={[-2, 2]} ticks={[-2, -1, 0, 1, 2]} tickFormatter={(v: number) => v.toFixed(2)} axisLine={{ stroke: "#666" }} tick={{ fill: "#333" }} />
                      <Tooltip formatter={(v: number) => v.toFixed(3)} contentStyle={{ background: "#e5e7eb", borderColor: "#999" }} labelStyle={{ color: "#222" }} itemStyle={{ color: "#222" }} />
                      <Scatter name="Residuals" data={scatter} fill="black" fillOpacity={0.9} shape="circle" />
                      <Line name="LOWESS" type="monotone" data={lowess} dataKey="y" dot={false} stroke="#ff5252" strokeWidth={2} />
                      <ReferenceLine y={0} strokeDasharray="4 4" stroke="#555" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>
    )}

    {/* 📊 Tabela + wykres – analysis */}
    {activeTab === "analysis" && (
      <>
        {error && <p className="text-destructive">{error}</p>}
        {!dependenceData && <p className="italic">Ładowanie…</p>}
        {dependenceData && (
          <div className="max-w-2xl space-y-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Analiza zależności w trójkącie</h3>
            <TableDataCor data={formattedSummary} />

            {dependenceData.density_plot && (
              <div className="bg-white border border-gray-300 rounded shadow p-4 text-gray-800 mt-6">
                <h4 className="text-sm font-medium mb-2">Gęstość rozkładu testu</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={dependenceData.density_plot.curve.map(([x, y]) => ({ x, y }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" domain={[-1, 1]} />
                    <YAxis />
                    <Tooltip formatter={(v: number) => v.toFixed(3)} />
                    <Line type="monotone" dataKey="y" stroke="#000" dot={false} strokeWidth={1.5} />
                    <Area
                      type="monotone"
                      dataKey="y"
                      data={dependenceData.density_plot.ci_area.map(([x, y]) => ({ x, y }))}
                      fill="#999"
                      fillOpacity={0.4}
                      isAnimationActive={false}
                    />
                    <ReferenceLine
                      x={dependenceData.density_plot.T_stat}
                      stroke="red"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </>
    )}
  </div>
);
}