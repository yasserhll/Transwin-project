// Section Sortie — calcul automatique depuis les 3 citernes
// RÈGLE IMPORTANTE : les sorties Beng 1 / Beng 2 vers la citerne 81669A55
// sont exclues du calcul (ce sont des transferts citerne→citerne, pas de la consommation réelle)

import { useState, useMemo, useRef } from "react";
import { CiterneEntry, SortieEntry } from "@/data/stockTypes";
import { exportSortieExcel } from "@/lib/stockExcelUtils";
import { Download, Search, X, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  // Props anciennes (gardées pour compatibilité)
  data: SortieEntry[];
  add: (item: SortieEntry) => void;
  update: (index: number, item: SortieEntry) => void;
  remove: (index: number) => void;
  importData: (items: SortieEntry[]) => void;
  reset: () => void;
  // NOUVEAU : données des 3 citernes pour calcul automatique
  beng1Data?: CiterneEntry[];
  beng2Data?: CiterneEntry[];
  c81669Data?: CiterneEntry[];
}

// ── Détecte si une ligne est un rechargement de la citerne 81669A55 ──
// (transfert entre citernes → ne pas compter comme consommation réelle)
function estRechargement81669(e: CiterneEntry): boolean {
  const immat = (e.immatriculation || e.code || e.remarque || "").toUpperCase();
  return immat.includes("81669");
}

// ── Calcul automatique : total qteSortie par date et par citerne ──
// RÈGLE : exclure de Beng 1 et Beng 2 les sorties vers la 81669A55
//         (ce sont des transferts de citerne à citerne, pas une consommation)
function computeAutoSortie(
  beng1: CiterneEntry[],
  beng2: CiterneEntry[],
  c81669: CiterneEntry[]
): SortieEntry[] {

  // Sorties réelles Beng1 = tout sauf rechargement 81669
  const beng1Reelles = beng1.filter(e => !estRechargement81669(e));
  const beng2Reelles = beng2.filter(e => !estRechargement81669(e));

  // Collecter toutes les dates uniques (sorties réelles uniquement)
  const allDates = new Set<string>();
  beng1Reelles.forEach(e => { if (e.date && e.qteSortie > 0) allDates.add(e.date); });
  beng2Reelles.forEach(e => { if (e.date && e.qteSortie > 0) allDates.add(e.date); });
  c81669.forEach(e =>       { if (e.date && e.qteSortie > 0) allDates.add(e.date); });

  // Trier les dates
  const sorted = Array.from(allDates).sort((a, b) => {
    const parse = (s: string) => {
      const [d, m, y] = s.split("/");
      return new Date(+y, +m - 1, +d).getTime();
    };
    return parse(a) - parse(b);
  });

  // Pour chaque date → sommer qteSortie (hors rechargements 81669)
  return sorted.map(date => ({
    date,
    beng1:        beng1Reelles.filter(e => e.date === date).reduce((s, e) => s + (e.qteSortie || 0), 0),
    beng2:        beng2Reelles.filter(e => e.date === date).reduce((s, e) => s + (e.qteSortie || 0), 0),
    citerne81669: c81669.filter(e =>      e.date === date).reduce((s, e) => s + (e.qteSortie || 0), 0),
  }));
}

const SortieSection = ({
  data, add, update, remove, importData, reset,
  beng1Data = [], beng2Data = [], c81669Data = [],
}: Props) => {
  const [search, setSearch] = useState("");

  // ── Mode auto si les citernes ont des données, sinon mode manuel ──
  const hasAutoData = beng1Data.length > 0 || beng2Data.length > 0 || c81669Data.length > 0;

  // Calcul automatique depuis les 3 citernes
  const autoData = useMemo(
    () => computeAutoSortie(beng1Data, beng2Data, c81669Data),
    [beng1Data, beng2Data, c81669Data]
  );

  // Source de données : auto si disponible, sinon données manuelles
  const activeData = hasAutoData ? autoData : data;

  // ── Filtre ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return activeData;
    return activeData.filter(r => r.date.toLowerCase().includes(search.toLowerCase()));
  }, [activeData, search]);

  // ── Totaux ───────────────────────────────────────────────────
  const totals = useMemo(() => ({
    beng1:  filtered.reduce((s, d) => s + d.beng1, 0),
    beng2:  filtered.reduce((s, d) => s + d.beng2, 0),
    c81669: filtered.reduce((s, d) => s + d.citerne81669, 0),
  }), [filtered]);

  const grandTotal = totals.beng1 + totals.beng2 + totals.c81669;

  // ── Données graphique ─────────────────────────────────────────
  const chartData = filtered
    .filter(d => d.beng1 + d.beng2 + d.citerne81669 > 0)
    .map(d => ({
      date: d.date.substring(0, 5),
      "Beng 1": d.beng1,
      "Beng 2": d.beng2,
      "81669A55": d.citerne81669,
    }));

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-primary uppercase tracking-wide">
            Sortie — Quantité sortie par jour
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Résumé journalier des 3 citernes
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Badge mode auto */}
          {hasAutoData && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-mining-success/10 text-mining-success border border-mining-success/30 rounded-lg text-xs font-semibold">
              <Info className="w-3.5 h-3.5" />
              Calcul automatique depuis les citernes
            </div>
          )}
          {/* Note : rechargements 81669 exclus */}
          {hasAutoData && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/30 rounded-lg text-xs font-semibold">
              <Info className="w-3.5 h-3.5" />
              Transferts vers 81669A55 exclus
            </div>
          )}

          {/* Export */}
          <button onClick={() => exportSortieExcel(activeData)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-mining-success text-white rounded-lg text-xs font-semibold hover:opacity-90">
            <Download className="w-3.5 h-3.5" /> Exporter Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Citerne Beng 1",   value: totals.beng1,  color: "text-mining-info",   bg: "bg-mining-info/10" },
          { label: "Citerne Beng 2",   value: totals.beng2,  color: "text-accent",         bg: "bg-accent/10" },
          { label: "Citerne 81669A55", value: totals.c81669, color: "text-mining-success",  bg: "bg-mining-success/10" },
          { label: "Total Global",     value: grandTotal,    color: "text-primary",         bg: "bg-primary/10" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border border-border rounded-xl p-3`}>
            <span className="text-xs text-muted-foreground uppercase">{label}</span>
            <div className={`font-display text-xl font-bold ${color} mt-1`}>
              {value.toLocaleString("fr-FR")} L
            </div>
          </div>
        ))}
      </div>

      {/* Graphique */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="sb1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(200 80% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(200 80% 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sb2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(35 95% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(35 95% 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sb3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 70% 38%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 70% 38%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 85%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(val: number, name: string) => [`${val.toLocaleString("fr-FR")} L`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Beng 1"   stroke="hsl(200 80% 45%)" fill="url(#sb1)" strokeWidth={2} />
              <Area type="monotone" dataKey="Beng 2"   stroke="hsl(35 95% 50%)"  fill="url(#sb2)" strokeWidth={2} />
              <Area type="monotone" dataKey="81669A55" stroke="hsl(142 70% 38%)" fill="url(#sb3)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recherche */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
          placeholder="Filtrer par date..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-primary/5 border-b border-border">
                {["Date", "Citerne Beng 1 (L)", "Citerne Beng 2 (L)", "Citerne 81669A55 (L)", "Total Journalier"].map(h => (
                  <th key={h} className="px-4 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-xs text-center first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {hasAutoData
                      ? "Aucune donnée pour ce filtre"
                      : "Ajoutez des données dans Beng 1, Beng 2 ou 81669A55 pour voir les sorties automatiquement"
                    }
                  </td>
                </tr>
              ) : filtered.map((row, idx) => {
                const total = row.beng1 + row.beng2 + row.citerne81669;
                return (
                  <tr key={idx} className={`border-b border-border/60 hover:bg-primary/5 ${
                    total === 0 ? "opacity-40" : idx % 2 === 0 ? "bg-card" : "bg-muted/30"
                  }`}>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{row.date}</td>
                    <td className="px-4 py-2.5 text-center">
                      {row.beng1 > 0
                        ? <span className="text-mining-info font-bold">{row.beng1.toLocaleString("fr-FR")}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.beng2 > 0
                        ? <span className="text-accent font-bold">{row.beng2.toLocaleString("fr-FR")}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.citerne81669 > 0
                        ? <span className="text-mining-success font-bold">{row.citerne81669.toLocaleString("fr-FR")}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {total > 0
                        ? <span className="inline-block bg-primary text-primary-foreground font-display font-bold px-3 py-0.5 rounded-lg text-xs">{total.toLocaleString("fr-FR")} L</span>
                        : <span className="text-muted-foreground text-xs">Repos</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-primary text-primary-foreground font-bold">
                <td className="px-4 py-2.5 font-display uppercase">TOTAL ({filtered.length} jours)</td>
                <td className="px-4 py-2.5 text-center font-display">{totals.beng1.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5 text-center font-display">{totals.beng2.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5 text-center font-display">{totals.c81669.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="bg-accent text-accent-foreground font-display px-2 py-0.5 rounded">
                    {grandTotal.toLocaleString("fr-FR")} L
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SortieSection;
