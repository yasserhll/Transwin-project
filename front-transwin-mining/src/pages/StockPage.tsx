// Page Stock — 6 onglets
// MODIFIÉ : SortieSection reçoit les données des 3 citernes pour calculer automatiquement
import { useState } from "react";
import { Droplets, ListOrdered, Globe, Truck } from "lucide-react";
import { useBeng1Data, useBeng2Data, use81669Data, useSortieData, useMatriculeData } from "@/hooks/useStockSections";
import CiterneSection from "@/components/stock/CiterneSection";
import SortieSection from "@/components/stock/SortieSection";
import MatriculeSection from "@/components/stock/MatriculeSection";
import GlobalSection from "@/components/stock/GlobalSection";

const tabs = [
  { id: "beng1",     label: "Beng 1",    icon: Droplets, color: "text-mining-info" },
  { id: "beng2",     label: "Beng 2",    icon: Droplets, color: "text-accent" },
  { id: "81669",     label: "81669A55",  icon: Droplets, color: "text-mining-success" },
  { id: "sortie",    label: "Sortie",    icon: ListOrdered, color: "text-primary" },
  { id: "matricule", label: "Matricule", icon: Truck,    color: "text-primary" },
  { id: "global",    label: "Global",    icon: Globe,    color: "text-primary" },
] as const;

type TabId = typeof tabs[number]["id"];

const StockPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>("beng1");

  const beng1     = useBeng1Data();
  const beng2     = useBeng2Data();
  const c81669    = use81669Data();
  const sortie    = useSortieData();
  const matricule = useMatriculeData();

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-mining">
        <h2 className="font-display text-2xl font-bold text-primary uppercase tracking-wide">
          Gestion de Stock — Gasoil / Diesel
        </h2>
        <p className="text-muted-foreground text-sm mt-1 font-body">
          Benguerir 2026 — Chaque section détaillée séparément
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className={`w-4 h-4 ${activeTab === id ? color : ""}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === "beng1" && (
        <CiterneSection title="Citerne Beng 1" colorClass="text-mining-info" bgClass="bg-mining-info/10" {...beng1} />
      )}
      {activeTab === "beng2" && (
        <CiterneSection title="Citerne Beng 2" colorClass="text-accent" bgClass="bg-accent/10" {...beng2} />
      )}
      {activeTab === "81669" && (
        <CiterneSection title="Citerne 81669A55" colorClass="text-mining-success" bgClass="bg-mining-success/10" {...c81669} />
      )}
      {activeTab === "sortie" && (
        // On passe les 3 citernes pour calculer automatiquement les totaux par jour
        <SortieSection
          {...sortie}
          beng1Data={beng1.data}
          beng2Data={beng2.data}
          c81669Data={c81669.data}
        />
      )}
      {activeTab === "matricule" && <MatriculeSection {...matricule} />}
      {activeTab === "global" && (
        <GlobalSection
          beng1={beng1.data}
          beng2={beng2.data}
          citerne81669={c81669.data}
          addBeng1={beng1.add}
          addBeng2={beng2.add}
          add81669={c81669.add}
          updateBeng1={beng1.update}
          updateBeng2={beng2.update}
          update81669={c81669.update}
          removeBeng1={beng1.remove}
          removeBeng2={beng2.remove}
          remove81669={c81669.remove}
          resetAll={() => { beng1.reset(); beng2.reset(); c81669.reset(); }}
        />
      )}
    </div>
  );
};

export default StockPage;
