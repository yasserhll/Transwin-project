// Tracer81669.tsx — Traceur complet de tous les mouvements de la citerne 81669A55
// Remplace Verification81669 et SuiviRecharge81669
// Affiche : timeline chronologique, statut par jour, graphiques, totaux cumulatifs, export Excel

import { useMemo, useState } from "react";
import { stockData } from "@/data/stockData";
import {
  Activity, AlertTriangle, BarChart3, ChevronDown, ChevronUp,
  Download, Droplets, Eye, Filter, Info, MapPin, Search,
  ShieldCheck, TrendingUp, TrendingDown, Zap, Calendar, CheckCircle2, XCircle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend, LineChart, Line
} from "recharts";
import * as XLSX from "xlsx";

// ── Constantes ──────────────────────────────────────────────────────────────
const MOYENNE   = 2452;   // L/jour — moyenne calculée
const SEUIL     = 3679;   // 1.5× la moyenne → alerte
const SEUIL_RATIO = 60;   // % max de 81669 sur total journalier

// ── Types ───────────────────────────────────────────────────────────────────
type Statut = "CRITIQUE" | "SUSPECT" | "ATTENTION" | "NORMAL" | "INACTIF";

interface LigneTrace {
  n:          number;
  date:       string;
  ts:         number;
  beng1:      number;
  beng2:      number;
  c81669:     number;
  total:      number;
  ratio:      number;
  ecart:      number;
  cumul:      number;      // total cumulatif 81669 jusqu'à ce jour
  statut:     Statut;
  raisons:    string[];
  seul:       boolean;     // 81669 seule sans beng1 ni beng2
  surVolume:  boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const parseTs = (d: string) => {
  const [dd, mm, yyyy] = d.split("/");
  return new Date(+yyyy, +mm - 1, +dd).getTime();
};

const STATUT_CFG: Record<Statut, {
  label: string; dot: string; bg: string; text: string; border: string;
  icon: React.FC<{ className?: string }>;
}> = {
  CRITIQUE:  { label: "CRITIQUE",  dot: "bg-red-500",     bg: "bg-red-950/35",     text: "text-red-400",     border: "border-red-500/40",    icon: XCircle },
  SUSPECT:   { label: "SUSPECT",   dot: "bg-orange-500",  bg: "bg-orange-950/30",  text: "text-orange-400",  border: "border-orange-500/40", icon: AlertTriangle },
  ATTENTION: { label: "ATTENTION", dot: "bg-yellow-500",  bg: "bg-yellow-950/25",  text: "text-yellow-400",  border: "border-yellow-500/40", icon: Eye },
  NORMAL:    { label: "NORMAL",    dot: "bg-emerald-500", bg: "bg-emerald-950/15", text: "text-emerald-400", border: "border-emerald-500/30", icon: CheckCircle2 },
  INACTIF:   { label: "INACTIF",   dot: "bg-slate-600",   bg: "bg-slate-900/20",   text: "text-slate-500",   border: "border-slate-700/30",  icon: Activity },
};

function calcStatut(c81: number, b1: number, b2: number): { statut: Statut; raisons: string[]; seul: boolean; surVol: boolean } {
  const raisons: string[] = [];
  if (c81 === 0) return { statut: "INACTIF", raisons: [], seul: false, surVol: false };

  const total = b1 + b2 + c81;
  const ratio = total > 0 ? (c81 / total) * 100 : 100;
  const seul  = c81 > 0 && b1 === 0 && b2 === 0;
  const surVol = c81 > SEUIL;

  if (seul && c81 > 1500) raisons.push(`Active seule sans Beng 1 ni Beng 2 (${c81.toLocaleString("fr-FR")} L)`);
  if (surVol)             raisons.push(`Volume dépasse le seuil : ${c81.toLocaleString("fr-FR")} L (+${(c81 - SEUIL).toLocaleString("fr-FR")} L)`);
  if (ratio > SEUIL_RATIO && c81 > 1000) raisons.push(`Ratio anormal : ${ratio.toFixed(1)}% du total journalier`);
  if (seul && c81 <= 1500 && c81 > 0)   raisons.push(`Seule active (volume limité : ${c81.toLocaleString("fr-FR")} L)`);
  if (!seul && b1 === 0 && c81 > 0 && ratio > 50) raisons.push("Beng 1 inactive — rechargement partiel");
  if (!seul && b2 === 0 && c81 > 0 && ratio > 50) raisons.push("Beng 2 inactive — rechargement partiel");

  let statut: Statut = "NORMAL";
  if ((seul && c81 > 1500) || (surVol && raisons.length >= 2)) statut = "CRITIQUE";
  else if (surVol || (seul && c81 > 500))                       statut = "SUSPECT";
  else if (raisons.length >= 1)                                  statut = "ATTENTION";

  return { statut, raisons, seul, surVol };
}

// ── Composant principal ─────────────────────────────────────────────────────
const Tracer81669 = () => {
  const [filtreStatut, setFiltreStatut] = useState<Statut | "TOUS">("TOUS");
  const [recherche,    setRecherche]    = useState("");
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [vue,          setVue]          = useState<"timeline" | "graphique">("timeline");

  // ── Construire les lignes de traçage ────────────────────────────────────
  const lignes = useMemo((): LigneTrace[] => {
    let cumul = 0;
    return stockData
      .sort((a, b) => parseTs(a.date) - parseTs(b.date))
      .map((d, i) => {
        const c81   = d.citerne81669 || 0;
        const b1    = d.citerne1;
        const b2    = d.citerne2;
        const total = b1 + b2 + c81;
        const ratio = total > 0 ? (c81 / total) * 100 : 0;
        const ecart = c81 - MOYENNE;
        cumul += c81;

        const { statut, raisons, seul, surVol } = calcStatut(c81, b1, b2);

        return {
          n: i + 1,
          date: d.date,
          ts: parseTs(d.date),
          beng1: b1,
          beng2: b2,
          c81669: c81,
          total,
          ratio,
          ecart,
          cumul,
          statut,
          raisons,
          seul,
          surVolume: surVol,
        };
      })
      .reverse(); // plus récent en premier
  }, []);

  // ── Stats globales ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const actifs = lignes.filter(l => l.c81669 > 0);
    return {
      total:         lignes.reduce((s, l) => s + l.c81669, 0),
      joursActifs:   actifs.length,
      joursCritique: lignes.filter(l => l.statut === "CRITIQUE").length,
      joursSuspect:  lignes.filter(l => l.statut === "SUSPECT").length,
      joursAttention:lignes.filter(l => l.statut === "ATTENTION").length,
      joursNormal:   lignes.filter(l => l.statut === "NORMAL").length,
      maxVolume:     Math.max(...actifs.map(l => l.c81669), 0),
      dateMax:       actifs.sort((a, b) => b.c81669 - a.c81669)[0]?.date ?? "—",
      seulActif:     lignes.filter(l => l.seul && l.c81669 > 0).length,
      anomalies:     lignes.filter(l => l.raisons.length > 0).length,
    };
  }, [lignes]);

  // ── Filtrage ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = lignes;
    if (filtreStatut !== "TOUS") res = res.filter(l => l.statut === filtreStatut);
    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase();
      res = res.filter(l => l.date.includes(q) || l.raisons.some(r => r.toLowerCase().includes(q)));
    }
    return res;
  }, [lignes, filtreStatut, recherche]);

  // ── Données graphiques (ordre chrono, 30 derniers actifs) ───────────────
  const chartData = useMemo(() =>
    [...lignes]
      .sort((a, b) => a.ts - b.ts)
      .filter(l => l.c81669 > 0 || l.beng1 + l.beng2 > 0)
      .slice(-35)
      .map(l => ({
        date:    l.date.substring(0, 5),
        "81669A55": l.c81669,
        "Beng 1":   l.beng1,
        "Beng 2":   l.beng2,
        ratio:      Math.round(l.ratio),
        cumul:      Math.round(l.cumul / 1000),
        seuil:      SEUIL,
        statut:     l.statut,
      })),
    [lignes]
  );

  // ── Export Excel ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    const now = new Date().toLocaleDateString("fr-FR");
    const rows = [
      ["TRACEUR COMPLET — CITERNE 81669A55 — BENGUERIR 2026"],
      [`Généré le : ${now} | Seuil alerte : ${SEUIL.toLocaleString("fr-FR")} L | Moyenne : ${MOYENNE.toLocaleString("fr-FR")} L/j`],
      [],
      ["#", "Date", "Beng 1 (L)", "Beng 2 (L)", "81669A55 (L)", "Total Jour (L)", "Ratio 81669 (%)", "Écart vs Moy. (L)", "Cumul 81669 (L)", "Statut", "Observations"],
      ...filtered.map((l, i) => [
        i + 1, l.date, l.beng1, l.beng2, l.c81669, l.total,
        `${l.ratio.toFixed(1)}%`,
        l.ecart > 0 ? `+${l.ecart}` : l.ecart,
        l.cumul,
        l.statut,
        l.raisons.join(" | ") || "—",
      ]),
      [],
      ["TOTAUX", "", filtered.reduce((s,l)=>s+l.beng1,0), filtered.reduce((s,l)=>s+l.beng2,0), filtered.reduce((s,l)=>s+l.c81669,0), filtered.reduce((s,l)=>s+l.total,0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [5,12,12,12,14,14,14,16,14,12,50].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Traceur 81669A55");
    XLSX.writeFile(wb, `Traceur_81669A55_${now.replace(/\//g,"-")}.xlsx`);
  };

  const scoreRisque = stats.joursCritique * 30 + stats.joursSuspect * 15 + stats.joursAttention * 5;
  const niveauGlobal: Statut = scoreRisque >= 60 ? "CRITIQUE" : scoreRisque >= 30 ? "SUSPECT" : scoreRisque >= 10 ? "ATTENTION" : "NORMAL";
  const cfgG = STATUT_CFG[niveauGlobal];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── EN-TÊTE ──────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border-2 p-5 ${cfgG.bg} ${cfgG.border}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              niveauGlobal === "CRITIQUE" ? "bg-red-500/20 animate-pulse" :
              niveauGlobal === "SUSPECT"  ? "bg-orange-500/20" :
              niveauGlobal === "ATTENTION"? "bg-yellow-500/20" : "bg-emerald-500/20"
            }`}>
              <MapPin className={`w-8 h-8 ${cfgG.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`font-display text-xl font-black uppercase tracking-wider ${cfgG.text}`}>
                  Traceur Citerne 81669A55
                </h2>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${cfgG.border} ${cfgG.text}`}>
                  {cfgG.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-body">
                Traçage complet de tous les mouvements · Benguerir 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle vue */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button onClick={() => setVue("timeline")}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${vue === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                Timeline
              </button>
              <button onClick={() => setVue("graphique")}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${vue === "graphique" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                Graphique
              </button>
            </div>
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        {/* Score risque */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Score de risque global</span>
            <span className={`text-xs font-black ${cfgG.text}`}>{scoreRisque} pts</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${
              niveauGlobal === "CRITIQUE" ? "bg-red-500" :
              niveauGlobal === "SUSPECT"  ? "bg-orange-500" :
              niveauGlobal === "ATTENTION"? "bg-yellow-500" : "bg-emerald-500"
            }`} style={{ width: `${Math.min(100, scoreRisque)}%` }} />
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total 81669A55",    value: `${(stats.total/1000).toFixed(1)}K L`,    sub: `${stats.joursActifs} jours actifs`, color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    icon: Droplets },
          { label: "Alertes critiques", value: stats.joursCritique,                        sub: "Jours CRITIQUE",                    color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     icon: XCircle },
          { label: "Jours suspects",    value: stats.joursSuspect,                         sub: "Volume anormal",                    color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  icon: AlertTriangle },
          { label: "Seule active",      value: stats.seulActif,                            sub: "Sans Beng 1 & 2",                   color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  icon: Eye },
          { label: "Volume max/jour",   value: `${stats.maxVolume.toLocaleString("fr-FR")} L`, sub: stats.dateMax,                   color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20",  icon: TrendingUp },
        ].map(({ label, value, sub, color, bg, border, icon: Icon }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{label}</span>
            </div>
            <div className={`font-display text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── GRAPHIQUE ────────────────────────────────────────────────────── */}
      {vue === "graphique" && (
        <div className="space-y-4">
          {/* Volume journalier */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h3 className="font-display font-bold text-foreground uppercase tracking-wide text-sm">
                Volume journalier — 81669A55 vs Citernes fixes
              </h3>
              <span className="ml-auto text-xs text-muted-foreground">35 derniers jours actifs</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 85% / 0.2)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, background: "#0f172a", border: "1px solid #1e293b" }}
                  formatter={(v: number, n: string) => [`${v.toLocaleString("fr-FR")} L`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={SEUIL} stroke="#ef4444" strokeDasharray="6 3"
                  label={{ value: `Seuil ${SEUIL.toLocaleString("fr-FR")} L`, fill: "#ef4444", fontSize: 9, position: "right" }} />
                <ReferenceLine y={MOYENNE} stroke="#6366f1" strokeDasharray="4 4"
                  label={{ value: `Moy. ${MOYENNE.toLocaleString("fr-FR")} L`, fill: "#6366f1", fontSize: 9, position: "right" }} />
                <Bar dataKey="Beng 1"    fill="hsl(200 80% 45%)"  radius={[3,3,0,0]} opacity={0.75} />
                <Bar dataKey="Beng 2"    fill="hsl(35 95% 50%)"   radius={[3,3,0,0]} opacity={0.75} />
                <Bar dataKey="81669A55"  fill="#22d3ee"            radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cumul et ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h3 className="font-display font-bold text-foreground uppercase tracking-wide text-xs">Volume cumulatif 81669A55 (m³)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 85% / 0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} unit="m³" />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, background: "#0f172a", border: "1px solid #1e293b" }}
                    formatter={(v: number) => [`${v} m³ cumulés`, "81669A55"]}
                  />
                  <Area dataKey="cumul" stroke="#a855f7" fill="url(#cumulGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="font-display font-bold text-foreground uppercase tracking-wide text-xs">Ratio 81669A55 (% du total journalier)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 85% / 0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, background: "#0f172a", border: "1px solid #1e293b" }}
                    formatter={(v: number) => [`${v}%`, "Ratio 81669"]}
                  />
                  <ReferenceLine y={SEUIL_RATIO} stroke="#f97316" strokeDasharray="6 3"
                    label={{ value: `${SEUIL_RATIO}% seuil`, fill: "#f97316", fontSize: 9, position: "right" }} />
                  <Line dataKey="ratio" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3, fill: "#22d3ee" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTRES + RECHERCHE ──────────────────────────────────────────── */}
      {vue === "timeline" && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Recherche */}
            <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-1.5 flex-1 min-w-48">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Rechercher une date ou anomalie..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
              />
              {recherche && (
                <button onClick={() => setRecherche("")} className="text-muted-foreground hover:text-foreground">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Boutons filtre statut */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {(["TOUS", "CRITIQUE", "SUSPECT", "ATTENTION", "NORMAL", "INACTIF"] as const).map(s => {
                const count = s === "TOUS" ? lignes.length : lignes.filter(l => l.statut === s).length;
                const cfg = s === "TOUS"
                  ? { dot: "bg-slate-400", text: "text-slate-300", border: "border-slate-500/30" }
                  : STATUT_CFG[s];
                return (
                  <button key={s} onClick={() => setFiltreStatut(s)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      filtreStatut === s
                        ? `bg-white/10 ${cfg.text} ${cfg.border} scale-105`
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-white/5"
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {s === "TOUS" ? "Tous" : STATUT_CFG[s as Statut].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── TIMELINE ──────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header table */}
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-display font-bold text-sm text-foreground uppercase tracking-wide">
                  Journal de traçage — {filtered.length} entrées
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Cumul total : <strong className="text-cyan-400">{lignes.reduce((s,l)=>s+l.c81669,0).toLocaleString("fr-FR")} L</strong>
              </span>
            </div>

            {/* Tableau sticky header */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-border">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-display font-black uppercase tracking-wide text-slate-400 w-8">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-display font-black uppercase tracking-wide text-slate-400">Date</th>
                    <th className="px-3 py-2.5 text-center text-xs font-display font-black uppercase tracking-wide text-sky-400">Beng 1</th>
                    <th className="px-3 py-2.5 text-center text-xs font-display font-black uppercase tracking-wide text-amber-400">Beng 2</th>
                    <th className="px-3 py-2.5 text-center text-xs font-display font-black uppercase tracking-wide text-cyan-300 bg-cyan-950/30">81669A55</th>
                    <th className="px-3 py-2.5 text-center text-xs font-display font-black uppercase tracking-wide text-slate-400">Total</th>
                    <th className="px-3 py-2.5 text-center text-xs font-display font-black uppercase tracking-wide text-slate-400">Ratio</th>
                    <th className="px-3 py-2.5 text-center text-xs font-display font-black uppercase tracking-wide text-slate-400">Écart</th>
                    <th className="px-3 py-2.5 text-center text-xs font-display font-black uppercase tracking-wide text-purple-400">Cumul</th>
                    <th className="px-3 py-2.5 text-center text-xs font-display font-black uppercase tracking-wide text-slate-400">Statut</th>
                    <th className="px-3 py-2.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={11} className="p-8 text-center text-muted-foreground text-sm">Aucune entrée trouvée</td></tr>
                  ) : filtered.map((l, idx) => {
                    const cfg = STATUT_CFG[l.statut];
                    const isExp = expanded === l.date;
                    const isEven = idx % 2 === 0;

                    return (
                      <>
                        <tr key={l.date}
                          className={`border-b border-border/30 transition-colors cursor-pointer ${
                            l.raisons.length > 0 ? cfg.bg : isEven ? "bg-transparent" : "bg-muted/10"
                          } hover:bg-white/5`}
                          onClick={() => setExpanded(isExp ? null : l.date)}>

                          {/* # */}
                          <td className="px-3 py-2 text-xs text-slate-600 font-mono">{l.n}</td>

                          {/* Date */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot} ${l.statut === "CRITIQUE" ? "animate-pulse" : ""}`} />
                              <span className="font-bold text-sm text-foreground">{l.date}</span>
                            </div>
                          </td>

                          {/* Beng 1 */}
                          <td className="px-3 py-2 text-center">
                            {l.beng1 > 0
                              ? <span className="text-sky-400 font-semibold text-xs">{l.beng1.toLocaleString("fr-FR")}</span>
                              : <span className="text-slate-600 text-xs font-bold">—</span>}
                          </td>

                          {/* Beng 2 */}
                          <td className="px-3 py-2 text-center">
                            {l.beng2 > 0
                              ? <span className="text-amber-400 font-semibold text-xs">{l.beng2.toLocaleString("fr-FR")}</span>
                              : <span className="text-slate-600 text-xs font-bold">—</span>}
                          </td>

                          {/* 81669 — colonne principale */}
                          <td className="px-3 py-2 text-center bg-cyan-950/15 border-x border-cyan-800/20">
                            {l.c81669 > 0 ? (
                              <span className={`font-black text-base ${
                                l.statut === "CRITIQUE" ? "text-red-400" :
                                l.statut === "SUSPECT"  ? "text-orange-400" :
                                l.statut === "ATTENTION"? "text-yellow-400" :
                                "text-cyan-400"
                              }`}>{l.c81669.toLocaleString("fr-FR")}</span>
                            ) : <span className="text-slate-600">—</span>}
                          </td>

                          {/* Total */}
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs text-slate-300 font-semibold">
                              {l.total > 0 ? l.total.toLocaleString("fr-FR") : "—"}
                            </span>
                          </td>

                          {/* Ratio */}
                          <td className="px-3 py-2 text-center">
                            {l.c81669 > 0 ? (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                l.ratio > SEUIL_RATIO ? "bg-orange-900/40 text-orange-400" :
                                l.ratio > 40           ? "bg-yellow-900/30 text-yellow-400" :
                                "bg-emerald-900/20 text-emerald-400"
                              }`}>{l.ratio.toFixed(1)}%</span>
                            ) : <span className="text-slate-600 text-xs">—</span>}
                          </td>

                          {/* Écart vs moyenne */}
                          <td className="px-3 py-2 text-center">
                            {l.c81669 > 0 ? (
                              <div className="flex items-center justify-center gap-0.5">
                                {l.ecart > 0
                                  ? <TrendingUp className="w-3 h-3 text-red-400" />
                                  : <TrendingDown className="w-3 h-3 text-emerald-400" />}
                                <span className={`text-xs font-bold ${l.ecart > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                  {l.ecart > 0 ? "+" : ""}{l.ecart.toLocaleString("fr-FR")}
                                </span>
                              </div>
                            ) : <span className="text-slate-600 text-xs">—</span>}
                          </td>

                          {/* Cumul */}
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs text-purple-400 font-bold">
                              {(l.cumul / 1000).toFixed(1)}K L
                            </span>
                          </td>

                          {/* Statut */}
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border ${cfg.border} ${cfg.text} bg-black/20`}>
                              {l.statut}
                            </span>
                          </td>

                          {/* Expand */}
                          <td className="px-2 py-2 text-center">
                            {l.raisons.length > 0 ? (
                              isExp ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : null}
                          </td>
                        </tr>

                        {/* ── DÉTAILS EXPANDABLE ─────────────────────────── */}
                        {isExp && l.raisons.length > 0 && (
                          <tr key={`${l.date}-detail`}>
                            <td colSpan={11} className={`px-5 py-4 border-b border-border/50 ${cfg.bg}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <Zap className={`w-4 h-4 ${cfg.text}`} />
                                <span className={`text-xs font-black uppercase tracking-wide ${cfg.text}`}>
                                  Détails de traçage — {l.date}
                                </span>
                              </div>

                              {/* Anomalies */}
                              <div className="space-y-1.5 mb-4">
                                {l.raisons.map((r, i) => (
                                  <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cfg.border} bg-black/25`}>
                                    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.text}`} />
                                    <span className="text-foreground">{r}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Tableau comparatif détaillé */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
                                <div className="bg-black/25 rounded-lg p-2.5">
                                  <div className="text-muted-foreground mb-1">Volume 81669A55</div>
                                  <div className={`font-black text-base ${cfg.text}`}>{l.c81669.toLocaleString("fr-FR")} L</div>
                                </div>
                                <div className="bg-black/25 rounded-lg p-2.5">
                                  <div className="text-muted-foreground mb-1">vs Moyenne normale</div>
                                  <div className={`font-black text-base ${l.ecart > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                    {l.ecart > 0 ? "+" : ""}{l.ecart.toLocaleString("fr-FR")} L
                                  </div>
                                </div>
                                <div className="bg-black/25 rounded-lg p-2.5">
                                  <div className="text-muted-foreground mb-1">vs Seuil alerte</div>
                                  <div className={`font-black text-base ${l.surVolume ? "text-red-400" : "text-emerald-400"}`}>
                                    {l.c81669 > SEUIL ? "+" : ""}{(l.c81669 - SEUIL).toLocaleString("fr-FR")} L
                                  </div>
                                </div>
                                <div className="bg-black/25 rounded-lg p-2.5">
                                  <div className="text-muted-foreground mb-1">Part du total</div>
                                  <div className={`font-black text-base ${l.ratio > SEUIL_RATIO ? "text-orange-400" : "text-cyan-400"}`}>
                                    {l.ratio.toFixed(1)}%
                                  </div>
                                </div>
                              </div>

                              {/* Contexte Beng1/Beng2 */}
                              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                <div className={`rounded-lg p-2.5 border ${l.beng1 === 0 ? "bg-red-950/30 border-red-500/30" : "bg-sky-950/20 border-sky-500/20"}`}>
                                  <div className="text-muted-foreground">Beng 1</div>
                                  <div className={`font-black mt-0.5 ${l.beng1 === 0 ? "text-red-400" : "text-sky-400"}`}>
                                    {l.beng1 > 0 ? `${l.beng1.toLocaleString("fr-FR")} L` : "⛔ INACTIVE"}
                                  </div>
                                </div>
                                <div className={`rounded-lg p-2.5 border ${l.beng2 === 0 ? "bg-red-950/30 border-red-500/30" : "bg-amber-950/20 border-amber-500/20"}`}>
                                  <div className="text-muted-foreground">Beng 2</div>
                                  <div className={`font-black mt-0.5 ${l.beng2 === 0 ? "text-red-400" : "text-amber-400"}`}>
                                    {l.beng2 > 0 ? `${l.beng2.toLocaleString("fr-FR")} L` : "⛔ INACTIVE"}
                                  </div>
                                </div>
                                <div className="rounded-lg p-2.5 border border-purple-500/20 bg-purple-950/15">
                                  <div className="text-muted-foreground">Cumul jusqu'ici</div>
                                  <div className="font-black mt-0.5 text-purple-400">{(l.cumul/1000).toFixed(2)}K L</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>

                {/* Ligne totaux */}
                <tfoot className="sticky bottom-0 border-t-2 border-primary bg-slate-900/95 backdrop-blur-sm">
                  <tr>
                    <td className="px-3 py-2.5 text-xs font-display font-black text-slate-400 uppercase" colSpan={2}>
                      TOTAL ({filtered.length} jours)
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-sky-400">
                      {filtered.reduce((s,l)=>s+l.beng1,0).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-amber-400">
                      {filtered.reduce((s,l)=>s+l.beng2,0).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black text-cyan-400 text-base bg-cyan-950/20 border-x border-cyan-800/20">
                      {filtered.reduce((s,l)=>s+l.c81669,0).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-300">
                      {filtered.reduce((s,l)=>s+l.total,0).toLocaleString("fr-FR")}
                    </td>
                    <td colSpan={5} className="px-3 py-2.5 text-xs text-muted-foreground text-center">
                      🔴 {stats.joursCritique} critique · 🟠 {stats.joursSuspect} suspect · 🟡 {stats.joursAttention} attention · Seuil : {SEUIL.toLocaleString("fr-FR")} L/j
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── NOTE LÉGALE ──────────────────────────────────────────────────── */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-400 mb-1">Résumé du traçage — 81669A55</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sur la période tracée, la citerne 81669A55 totalise{" "}
              <strong className="text-cyan-400">{stats.total.toLocaleString("fr-FR")} L</strong> répartis sur{" "}
              <strong className="text-cyan-400">{stats.joursActifs} jours actifs</strong>.
              On relève <strong className="text-red-400">{stats.joursCritique} alerte(s) critique(s)</strong>,{" "}
              <strong className="text-orange-400">{stats.joursSuspect} jour(s) suspects</strong>,
              et <strong className="text-yellow-400">{stats.seulActif} jour(s) d'activité isolée</strong> (sans Beng 1 ni Beng 2).
              Ces données constituent un tracé complet exploitable pour enquête interne ou rapport officiel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracer81669;
