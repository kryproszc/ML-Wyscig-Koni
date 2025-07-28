import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { PaidView } from "./PaidView"
import { CLTab } from "./CLTab"
import { PaidViewMultStoch } from "./PaidViewMultStoch"
import { PaidViewBootParam } from "./PaidViewBootParam"
import WspolczynnikiMultiplikatywna from "./WspolczynnikiMultiplikatywna";
import WspolczynnikiBootParam from "./WspolczynnikiBootParam";
import  {UltimateTab} from "./UltimateTab"
import UltimateTab_boot from './UltimateTab_boot';
import  UltimateTab_stoch from "./UltimateTab_stoch"


const tabClass = `
  flex-1 text-center px-4 py-2 text-sm font-medium rounded-md border 
  border-slate-600 bg-[#1e293b] text-blue-300 
  hover:bg-slate-700 hover:text-blue-200 
  data-[state=active]:bg-[#0f172a] 
  data-[state=active]:text-white 
  data-[state=active]:border-blue-400 
  data-[state=active]:shadow-inner
`;



export function PaidTabs() {
  return (
    <Tabs defaultValue="triangle" className="w-full">
      <TabsList className="flex w-full gap-2 mb-6">
        <TabsTrigger value="triangle" className={tabClass}>1. Trójkąt</TabsTrigger>
        <TabsTrigger value="cl" className={tabClass}>2. Reszty</TabsTrigger>
        <TabsTrigger value="ultimate" className={tabClass}>3. Wyniki symulacji</TabsTrigger>
      </TabsList>
      <TabsContent value="triangle">
        <PaidView />
      </TabsContent>
      <TabsContent value="cl">
        <CLTab />
      </TabsContent>
      <TabsContent value="ultimate">
        <UltimateTab />
      </TabsContent>
    </Tabs>
  );
}


export function MultStoch() {
  return (
    <Tabs defaultValue="triangle" className="w-full">
      <TabsList className="flex w-full gap-2 mb-6">
        <TabsTrigger value="triangle" className={tabClass}>1. Trójkąt</TabsTrigger>
        <TabsTrigger value="wspolczynniki_mult" className={tabClass}>2. Parametry modelu</TabsTrigger>
        <TabsTrigger value="ultimate_mult" className={tabClass}>3. Wyniki symulacji</TabsTrigger>
      </TabsList>
      <TabsContent value="triangle">
        <PaidViewMultStoch />
      </TabsContent>
      <TabsContent value="wspolczynniki_mult">
        <WspolczynnikiMultiplikatywna />
      </TabsContent>
      <TabsContent value="ultimate_mult">
        <UltimateTab_stoch />
      </TabsContent>
    </Tabs>
  );
}


export function BootParam() {
  return (
    <Tabs defaultValue="triangle" className="w-full">
      <TabsList className="flex w-full gap-2 mb-6">
        <TabsTrigger value="triangle" className={tabClass}>1. Trójkąt</TabsTrigger>
        <TabsTrigger value="wspolczynniki_boot" className={tabClass}>2. Parametry modelu</TabsTrigger>
        <TabsTrigger value="ultimate_boot" className={tabClass}>3. Wyniki symulacji</TabsTrigger>
      </TabsList>
      <TabsContent value="triangle">
        <PaidViewBootParam />
      </TabsContent>
      <TabsContent value="wspolczynniki_boot">
        <WspolczynnikiBootParam />
      </TabsContent>
      <TabsContent value="ultimate_boot">
        <UltimateTab_boot />
      </TabsContent>
    </Tabs>
  );
}
