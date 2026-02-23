// Audit81669.tsx — Module de surveillance et détection d'anomalies Citerne 81669A55
// Citerne mobile chargée depuis Beng 1 & Beng 2 — suivi anti-vol

import { useMemo, useState } from "react";
import { CiterneEntry } from "@/data/stockTypes";
import { stockData } from "@/data/stockData";
import {
  AlertTriangle, ShieldAlert, Eye, TrendingUp, TrendingDown,
  BarChart3, FileText, ChevronDown, ChevronUp, Info, Zap,
  Activity, Droplets, Calendar
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend, LineChart, Line
} from "recharts";

interface Props {
  c81669Data: CiterneEntry[];
  beng1Data:  CiterneEntry[];
  beng2Data:  CiterneEntry[];
}

// ── helpers ───────────────────────────────────────────────────────────────────
const parseDateTs = (d: string) => {
  const [dd, mm, yyyy] = d.split("/");
  return new Date(+yyyy, +mm - 1, +dd).getTime();
};

type NiveauRisque = "CRITIQUE" | "ELEVE" | "MODERE" | "NORMAL";

interface JourAnalyse {
  date: string;
  sortie81669: number;
  beng1:       number;
  beng2:       number;
  total:       number;
  ratio81669:  number;   // % de 81669 sur total
  seulActif:   boolean;  // 81669 active mais beng1=0 ET beng2=0
  surVolume:   boolean;  // volume > seuil
  risque:      NiveauRisque;
  anomalies:   string[];
}

const SEUIL_VOLUME   = 3679;  // 1.5x la moyenne (2452L)
const MOYENNE_NORMAL = 2452;  // L/jour
const SEUIL_RATIO    = 60;    // % max attendu de 81669 sur total

function analyserJour(date: string, b1: number, b2: number, c81: number): JourAnalyse {
  const total    = b1 + b2 + c81;
  const ratio    = total > 0 ? (c81 / total) * 100 : 0;
  const seul     = c81 > 0 && b1 === 0 && b2 === 0;
  const surVol   = c81 > SEUIL_VOLUME;
  const anomalies: string[] = [];

  if (seul && c81 > 500)
    anomalies.push("🔴 Active seule sans Beng 1 ni Beng 2");
  if (surVol)
    anomalies.push(`🔴 Volume anormal: ${c81.toLocaleString("fr-FR")} L (moy: ${MOYENNE_NORMAL.toLocaleString("fr-FR")} L)`);
  if (ratio > SEUIL_RATIO && c81 > 1000)
    anomalies.push(`🟠 Ratio anormalement élevé: ${ratio.toFixed(1)}% du total journalier`);
  if (c81 > 0 && b1 === 0 && b2 > 0 && ratio > 55)
    anomalies.push("🟡 Beng 1 inactive — rechargement partiel suspect");
  if (c81 > 0 && b2 === 0 && b1 > 0 && ratio > 55)
    anomalies.push("🟡 Beng 2 inactive — rechargement partiel suspect");

  let risque: NiveauRisque = "NORMAL";
  if (anomalies.length >= 2 || (seul && c81 > 2000)) risque = "CRITIQUE";
  else if (surVol || (seul && c81 > 500))             risque = "ELEVE";
  else if (anomalies.length === 1)                    risque = "MODERE";

  return { date, sortie81669: c81, beng1: b1, beng2: b2, total, ratio81669: ratio, seulActif: seul, surVolume: surVol, risque, anomalies };
}

const RISQUE_CONFIG: Record<NiveauRisque, { label: string; bg: string; text: string; border: string; dot: string }> = {
  CRITIQUE: { label: "CRITIQUE",  bg: "bg-red-950/40",    text: "text-red-400",    border: "border-red-500/50",  dot: "bg-red-500" },
  ELEVE:    { label: "ÉLEVÉ",     bg: "bg-orange-950/30", text: "text-orange-400", border: "border-orange-500/50", dot: "bg-orange-500" },
  MODERE:   { label: "MODÉRÉ",    bg: "bg-yellow-950/30", text: "text-yellow-400", border: "border-yellow-500/50", dot: "bg-yellow-500" },
  NORMAL:   { label: "NORMAL",    bg: "bg-emerald-950/20", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500" },
};

// ── Composant principal ───────────────────────────────────────────────────────
const Audit81669 = ({ c81669Data, beng1Data, beng2Data }: Props) => {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [filtreRisque, setFiltreRisque] = useState<NiveauRisque | "TOUS">("TOUS");

  // Utiliser stockData comme source principale (données complètes)
  const analyse = useMemo((): JourAnalyse[] => {
    return stockData
      .filter(d => d.citerne1 + d.citerne2 + (d.citerne81669 || 0) > 0 || (d.citerne81669 || 0) > 0)
      .map(d => analyserJour(d.date, d.citerne1, d.citerne2, d.citerne81669 || 0))
      .sort((a, b) => parseDateTs(b.date) - parseDateTs(a.date)); // plus récent en premier
  }, []);

  const stats = useMemo(() => {
    const actifs = analyse.filter(j => j.sortie81669 > 0);
    return {
      total81669:    actifs.reduce((s, j) => s + j.sortie81669, 0),
      nbCritique:    analyse.filter(j => j.risque === "CRITIQUE").length,
      nbEleve:       analyse.filter(j => j.risque === "ELEVE").length,
      nbModere:      analyse.filter(j => j.risque === "MODERE").length,
      nbAnomalie:    analyse.filter(j => j.anomalies.length > 0).length,
      joursSolitude: analyse.filter(j => j.seulActif && j.sortie81669 > 500).length,
      maxVolume:     Math.max(...actifs.map(j => j.sortie81669)),
      dateMax:       actifs.sort((a, b) => b.sortie81669 - a.sortie81669)[0]?.date,
    };
  }, [analyse]);

  const filtered = useMemo(() =>
    filtreRisque === "TOUS" ? analyse : analyse.filter(j => j.risque === filtreRisque),
    [analyse, filtreRisque]
  );

  // Données graphique — 30 derniers jours dans l'ordre chronologique
  const chartData = useMemo(() =>
    [...analyse]
      .sort((a, b) => parseDateTs(a.date) - parseDateTs(b.date))
      .filter(j => j.sortie81669 > 0 || j.beng1 + j.beng2 > 0)
      .slice(-30)
      .map(j => ({
        date:    j.date.substring(0, 5),
        "81669": j.sortie81669,
        "Beng 1": j.beng1,
        "Beng 2": j.beng2,
        seuil:   SEUIL_VOLUME,
        risque:  j.risque,
      })),
    [analyse]
  );

  // Score de risque global
  const scoreRisque = stats.nbCritique * 30 + stats.nbEleve * 15 + stats.nbModere * 5;
  const niveauGlobal: NiveauRisque =
    scoreRisque >= 60 ? "CRITIQUE" :
    scoreRisque >= 30 ? "ELEVE" :
    scoreRisque >= 10 ? "MODERE" : "NORMAL";

  const cfg = RISQUE_CONFIG[niveauGlobal];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── BANNIÈRE ALERTE ────────────────────────────────────────────── */}
      <div className={`rounded-2xl border-2 p-5 ${cfg.bg} ${cfg.border}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              niveauGlobal === "CRITIQUE" ? "bg-red-500/20 animate-pulse" :
              niveauGlobal === "ELEVE"   ? "bg-orange-500/20" :
              niveauGlobal === "MODERE"  ? "bg-yellow-500/20" : "bg-emerald-500/20"
            }`}>
              <ShieldAlert className={`w-8 h-8 ${cfg.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-display text-xl font-black uppercase tracking-wider ${cfg.text}`}>
                  Audit Citerne 81669A55
                </h2>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-body">
                Citerne mobile — Analyse des mouvements suspects
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className={`px-4 py-2 rounded-xl border ${cfg.border} ${cfg.bg}`}>
              <div className={`font-display text-2xl font-black ${cfg.text}`}>{stats.nbAnomalie}</div>
              <div className="text-xs text-muted-foreground">Jours suspects</div>
            </div>
            <div className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-950/20">
              <div className="font-display text-2xl font-black text-red-400">{stats.nbCritique}</div>
              <div className="text-xs text-muted-foreground">Alertes critiques</div>
            </div>
          </div>
        </div>

        {/* Score risque global */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Score de risque global</span>
            <span className={`text-xs font-black ${cfg.text}`}>{scoreRisque} pts</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                niveauGlobal === "CRITIQUE" ? "bg-red-500" :
                niveauGlobal === "ELEVE"   ? "bg-orange-500" :
                niveauGlobal === "MODERE"  ? "bg-yellow-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, scoreRisque)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: Droplets, label: "Total distribué 81669",
            value: `${(stats.total81669 / 1000).toFixed(1)}K L`,
            sub: "Période complète",
            color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20",
          },
          {
            icon: AlertTriangle, label: "Jours seule active",
            value: stats.joursSolitude,
            sub: "Sans Beng 1 & Beng 2",
            color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20",
          },
          {
            icon: TrendingUp, label: "Volume max 1 jour",
            value: `${stats.maxVolume.toLocaleString("fr-FR")} L`,
            sub: stats.dateMax,
            color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20",
          },
          {
            icon: Activity, label: "Seuil normal",
            value: `${MOYENNE_NORMAL.toLocaleString("fr-FR")} L`,
            sub: "Moyenne journalière",
            color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
          },
        ].map(({ icon: Icon, label, value, sub, color, bg, border }) => (
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

      {/* ── GRAPHIQUE COMPARATIF ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-display font-bold text-foreground uppercase tracking-wide text-sm">
            Évolution Volume 81669A55 vs Citernes fixes
          </h3>
          <span className="ml-auto text-xs text-muted-foreground">30 derniers jours actifs</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 85% / 0.3)" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "1px solid #334155" }}
              formatter={(v: number, n: string) => [`${v.toLocaleString("fr-FR")} L`, n]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={SEUIL_VOLUME} stroke="#ef4444" strokeDasharray="6 3"
              label={{ value: `Seuil ${SEUIL_VOLUME.toLocaleString("fr-FR")} L`, fill: "#ef4444", fontSize: 10, position: "right" }} />
            <Bar dataKey="Beng 1" fill="hsl(200 80% 45%)" radius={[3,3,0,0]} opacity={0.7} />
            <Bar dataKey="Beng 2" fill="hsl(35 95% 50%)" radius={[3,3,0,0]} opacity={0.7} />
            <Bar dataKey="81669" fill="#22d3ee" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── FILTRES ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Filtrer :</span>
        {(["TOUS", "CRITIQUE", "ELEVE", "MODERE", "NORMAL"] as const).map(r => {
          const c = r === "TOUS" ? { dot: "bg-slate-400", text: "text-slate-300", border: "border-slate-500/30" } : RISQUE_CONFIG[r];
          const count = r === "TOUS" ? analyse.length : analyse.filter(j => j.risque === r).length;
          return (
            <button key={r} onClick={() => setFiltreRisque(r)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                filtreRisque === r
                  ? `bg-white/10 ${c.text} ${c.border} scale-105`
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-white/5"
              }`}>
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              {r === "TOUS" ? "Tous" : RISQUE_CONFIG[r].label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── TABLEAU DES JOURS ANALYSÉS ─────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="font-display font-bold text-sm text-foreground uppercase tracking-wide">
            Journal d'audit — {filtered.length} entrées
          </span>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Aucune entrée pour ce filtre</div>
          ) : filtered.map((jour) => {
            const cfg = RISQUE_CONFIG[jour.risque];
            const isExpanded = expandedDate === jour.date;
            const hasAnomaly = jour.anomalies.length > 0;

            return (
              <div key={jour.date}
                className={`border-b border-border/50 transition-colors ${hasAnomaly ? cfg.bg : ""}`}>

                {/* Ligne principale */}
                <button
                  onClick={() => setExpandedDate(isExpanded ? null : jour.date)}
                  className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors">

                  {/* Date + badge risque */}
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot} ${jour.risque === "CRITIQUE" ? "animate-pulse" : ""}`} />
                    <span className="font-display font-bold text-sm text-foreground">{jour.date}</span>
                  </div>

                  {/* Volumes */}
                  <div className="flex-1 grid grid-cols-4 gap-3 text-center text-xs">
                    <div>
                      <div className="text-muted-foreground mb-0.5">Beng 1</div>
                      <div className={`font-bold ${jour.beng1 > 0 ? "text-sky-400" : "text-muted-foreground"}`}>
                        {jour.beng1 > 0 ? `${jour.beng1.toLocaleString("fr-FR")} L` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">Beng 2</div>
                      <div className={`font-bold ${jour.beng2 > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {jour.beng2 > 0 ? `${jour.beng2.toLocaleString("fr-FR")} L` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">81669A55</div>
                      <div className={`font-black ${
                        jour.surVolume  ? "text-red-400" :
                        jour.seulActif  ? "text-orange-400" :
                        jour.sortie81669 > 0 ? "text-cyan-400" : "text-muted-foreground"
                      }`}>
                        {jour.sortie81669 > 0 ? `${jour.sortie81669.toLocaleString("fr-FR")} L` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">Ratio</div>
                      <div className={`font-bold ${jour.ratio81669 > SEUIL_RATIO ? "text-red-400" : "text-foreground"}`}>
                        {jour.sortie81669 > 0 ? `${jour.ratio81669.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Badge risque */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasAnomaly && (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    )}
                    {hasAnomaly
                      ? (isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)
                      : <span className="w-4" />
                    }
                  </div>
                </button>

                {/* Détails anomalies (expandable) */}
                {isExpanded && hasAnomaly && (
                  <div className={`px-5 pb-4 pt-1 border-t border-white/5 ${cfg.bg}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className={`w-4 h-4 ${cfg.text}`} />
                      <span className={`text-xs font-black uppercase tracking-wide ${cfg.text}`}>
                        Anomalies détectées — {jour.date}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {jour.anomalies.map((a, i) => (
                        <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cfg.border} bg-black/20`}>
                          <span className="mt-0.5 shrink-0">⚠</span>
                          <span className="text-foreground">{a}</span>
                        </div>
                      ))}
                    </div>

                    {/* Comparatif */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="bg-black/20 rounded-lg p-2">
                        <div className="text-muted-foreground">vs Moyenne normale</div>
                        <div className={`font-black mt-0.5 ${jour.sortie81669 > MOYENNE_NORMAL ? "text-red-400" : "text-emerald-400"}`}>
                          {jour.sortie81669 > 0
                            ? `${jour.sortie81669 > MOYENNE_NORMAL ? "+" : ""}${(jour.sortie81669 - MOYENNE_NORMAL).toLocaleString("fr-FR")} L`
                            : "—"}
                        </div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2">
                        <div className="text-muted-foreground">Part sur total</div>
                        <div className={`font-black mt-0.5 ${jour.ratio81669 > SEUIL_RATIO ? "text-red-400" : "text-cyan-400"}`}>
                          {jour.ratio81669.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2">
                        <div className="text-muted-foreground">Écart vs seuil</div>
                        <div className={`font-black mt-0.5 ${jour.sortie81669 > SEUIL_VOLUME ? "text-red-400" : "text-emerald-400"}`}>
                          {jour.sortie81669 > 0
                            ? `${jour.sortie81669 > SEUIL_VOLUME ? "+" : ""}${(jour.sortie81669 - SEUIL_VOLUME).toLocaleString("fr-FR")} L`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RÉSUMÉ LÉGAL / RAPPORT ─────────────────────────────────────── */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-400 mb-1">Résumé des observations</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sur la période analysée, la citerne 81669A55 présente <strong className="text-amber-300">{stats.nbAnomalie} jour(s) avec des mouvements anormaux</strong>,
              dont <strong className="text-red-400">{stats.nbCritique} alerte(s) critique(s)</strong> et <strong className="text-orange-400">{stats.joursSolitude} jour(s) d'activité isolée</strong> (sans Beng 1 ni Beng 2 actives).
              Le volume total distribué est de <strong className="text-cyan-400">{stats.total81669.toLocaleString("fr-FR")} L</strong> pour une moyenne attendue de {MOYENNE_NORMAL.toLocaleString("fr-FR")} L/jour.
              Ces données peuvent être utilisées pour une enquête interne ou un rapport officiel.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Audit81669;
