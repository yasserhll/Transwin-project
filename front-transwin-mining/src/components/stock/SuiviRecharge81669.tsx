// SuiviRecharge81669.tsx
// Suivi précis de chaque rechargement de la citerne mobile 81669A55
// Croise : ce que Beng1/Beng2 ont sorti VS ce que 81669 déclare avoir reçu → écart réel

import { useMemo, useState } from "react";
import { CiterneEntry } from "@/data/stockTypes";
import { Download, Search, X, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  beng1Data:  CiterneEntry[];
  beng2Data:  CiterneEntry[];
  c81669Data: CiterneEntry[];
}

// ── Parsing date+heure → timestamp ────────────────────────────
const toTs = (date: string, heure = "00:00") => {
  const [d, m, y] = (date || "01/01/2000").split("/");
  const [h = "0", mn = "0"] = (heure || "00:00").split(":");
  return new Date(+y, +m - 1, +d, +h, +mn).getTime();
};

// ── Types ──────────────────────────────────────────────────────
type Alerte = "ok" | "faible" | "moyen" | "critique";

interface LigneRecharge {
  n:              number;
  date:           string;
  heure:          string;
  numBon:         string;
  // Source (Beng 1 ou Beng 2)
  source:         "Beng 1" | "Beng 2" | "Inconnu";
  sortiBeng:      number;   // ce que Beng1/2 déclare avoir sorti vers 81669
  // 81669 côté entrée
  resteAvant:     number;   // stock 81669 avant rechargement
  recuDeclare:    number;   // qteEntree enregistrée dans 81669
  // Écart direct
  ecartEntree:    number;   // sortiBeng - recuDeclare (manque à l'entrée)
  // Série débitmètre (Beng1/2)
  serieDepBeng:   number;
  serieFinBeng:   number;
  mesureBeng:     number;   // serieFinBeng - serieDepBeng
  ecartSerie:     number;   // recuDeclare - mesureBeng (manque sur débitmètre)
  // Stock après
  stockApres:     number;   // resteAvant + recuDeclare
  // Distributions ce jour
  distribueJour:  number;
  stockFinJour:   number;
  // Remarques
  remarqueBeng:   string;
  remarque81669:  string;
  // Niveau alerte global
  alerte:         Alerte;
  manqueTotal:    number;   // écart le plus significatif
}

// ── Détecter niveau alerte ─────────────────────────────────────
const niveauAlerte = (manque: number): Alerte => {
  const a = Math.abs(manque);
  if (a >= 10) return "critique";
  if (a >= 5)  return "moyen";
  if (a >= 2)  return "faible";
  return "ok";
};

// ── Composant principal ────────────────────────────────────────
const SuiviRecharge81669 = ({ beng1Data, beng2Data, c81669Data }: Props) => {
  const [search,       setSearch]       = useState("");
  const [filtreAlerte, setFiltreAlerte] = useState<"TOUS" | "ECARTS">("TOUS");

  // ── Construction des lignes de rechargement ──────────────────
  const lignes = useMemo((): LigneRecharge[] => {

    // Toutes les sorties Beng1 et Beng2 vers 81669A55
    // → une sortie Beng vers 81669 : immatriculation contient "81669"
    const sortiesBengVers81669: {
      source: "Beng 1" | "Beng 2";
      date: string; heure: string; numBon: string;
      qte: number; serieD: number; serieF: number; remarque: string;
    }[] = [];

    [...beng1Data].forEach(e => {
      const immat = (e.immatriculation || e.code || "").toUpperCase();
      if (immat.includes("81669") && e.qteSortie > 0) {
        sortiesBengVers81669.push({
          source: "Beng 1", date: e.date, heure: e.heure, numBon: e.numBon,
          qte: e.qteSortie, serieD: e.serieDepart, serieF: e.serieFin,
          remarque: e.remarque,
        });
      }
    });

    [...beng2Data].forEach(e => {
      const immat = (e.immatriculation || e.code || "").toUpperCase();
      if (immat.includes("81669") && e.qteSortie > 0) {
        sortiesBengVers81669.push({
          source: "Beng 2", date: e.date, heure: e.heure, numBon: e.numBon,
          qte: e.qteSortie, serieD: e.serieDepart, serieF: e.serieFin,
          remarque: e.remarque,
        });
      }
    });

    // Trier chronologiquement
    sortiesBengVers81669.sort((a, b) => toTs(a.date, a.heure) - toTs(b.date, b.heure));

    // Index des entrées 81669 (rechargements reçus)
    const entrees81669 = c81669Data
      .filter(e => e.qteEntree > 0)
      .sort((a, b) => toTs(a.date, a.heure) - toTs(b.date, b.heure));

    // Index des sorties 81669 (distributions aux véhicules) par date
    const distribParDate = new Map<string, number>();
    c81669Data.forEach(e => {
      if (e.qteSortie > 0)
        distribParDate.set(e.date, (distribParDate.get(e.date) || 0) + e.qteSortie);
    });

    // Reconstruire le stock 81669 chronologiquement
    // pour calculer le "reste avant" à chaque rechargement
    let stock81669 = 0;

    // On fusionne les événements (sorties Beng → 81669 ET distributions 81669 → véhicules)
    // pour reconstituer le stock dans l'ordre
    type Evt =
      | { t: number; type: "recharge"; idx: number }
      | { t: number; type: "distribution"; qte: number };

    const evts: Evt[] = [];

    // Rechargements reçus par 81669
    entrees81669.forEach((e, idx) => {
      evts.push({ t: toTs(e.date, e.heure), type: "recharge", idx });
    });

    // Distributions journalières (on les met en fin de journée — heure 23:59)
    const distribDatesTraitees = new Set<string>();
    c81669Data.filter(e => e.qteSortie > 0).forEach(e => {
      if (!distribDatesTraitees.has(e.date)) {
        distribDatesTraitees.add(e.date);
        const qte = distribParDate.get(e.date) || 0;
        evts.push({ t: toTs(e.date, "23:59"), type: "distribution", qte });
      }
    });

    evts.sort((a, b) => a.t - b.t);

    // Pour chaque rechargement → retrouver le reste avant
    const resteAvantParIdx = new Map<number, number>();
    let stockCourant = 0;

    evts.forEach(evt => {
      if (evt.type === "recharge") {
        resteAvantParIdx.set(evt.idx, stockCourant);
        stockCourant += entrees81669[evt.idx].qteEntree;
      } else {
        stockCourant = Math.max(0, stockCourant - evt.qte);
      }
    });

    // Construire les lignes finales
    const result: LigneRecharge[] = [];
    let num = 1;

    sortiesBengVers81669.forEach(sortie => {
      // Trouver la ligne d'entrée correspondante dans 81669 (même date ± même bon)
      const entreeMatch = entrees81669.find(e =>
        e.date === sortie.date &&
        (e.numBon === sortie.numBon || Math.abs(toTs(e.date, e.heure) - toTs(sortie.date, sortie.heure)) < 4 * 3600 * 1000)
      );

      const recuDeclare = entreeMatch?.qteEntree ?? 0;
      const idxEntree   = entreeMatch ? entrees81669.indexOf(entreeMatch) : -1;
      const resteAvant  = idxEntree >= 0 ? (resteAvantParIdx.get(idxEntree) ?? 0) : 0;
      const stockApres  = resteAvant + recuDeclare;
      const distribJour = distribParDate.get(sortie.date) || 0;
      const stockFin    = stockApres - distribJour;

      // Écart Beng → 81669 (ce que Beng a sorti vs ce que 81669 déclare avoir reçu)
      const ecartEntree = sortie.qte - recuDeclare;

      // Écart débitmètre (ce que le compteur Beng a mesuré vs ce qui est sorti)
      const mesureBeng  = (sortie.serieD > 0 && sortie.serieF > 0) ? sortie.serieF - sortie.serieD : 0;
      const ecartSerie  = mesureBeng > 0 ? sortie.qte - mesureBeng : 0;

      // Manque le plus significatif pour le niveau d'alerte
      const manqueTotal = Math.max(Math.abs(ecartEntree), Math.abs(ecartSerie));

      result.push({
        n: num++,
        date: sortie.date,
        heure: sortie.heure,
        numBon: sortie.numBon,
        source: sortie.source,
        sortiBeng: sortie.qte,
        resteAvant,
        recuDeclare,
        ecartEntree,
        serieDepBeng: sortie.serieD,
        serieFinBeng: sortie.serieF,
        mesureBeng,
        ecartSerie,
        stockApres,
        distribueJour: distribJour,
        stockFinJour: stockFin,
        remarqueBeng: sortie.remarque,
        remarque81669: entreeMatch?.remarque ?? "",
        alerte: niveauAlerte(manqueTotal),
        manqueTotal,
      });
    });

    // Si aucune sortie Beng vers 81669 trouvée, chercher dans les entrées 81669 directement
    if (result.length === 0 && entrees81669.length > 0) {
      entrees81669.forEach((e, i) => {
        const resteAvant  = resteAvantParIdx.get(i) ?? 0;
        const stockApres  = resteAvant + e.qteEntree;
        const distribJour = distribParDate.get(e.date) || 0;
        const stockFin    = stockApres - distribJour;
        const mesure      = (e.serieDepart > 0 && e.serieFin > 0) ? e.serieFin - e.serieDepart : 0;
        const ecartSerie  = mesure > 0 ? e.qteEntree - mesure : 0;

        result.push({
          n: i + 1,
          date: e.date,
          heure: e.heure,
          numBon: e.numBon,
          source: "Inconnu",
          sortiBeng: 0,
          resteAvant,
          recuDeclare: e.qteEntree,
          ecartEntree: 0,
          serieDepBeng: e.serieDepart,
          serieFinBeng: e.serieFin,
          mesureBeng: mesure,
          ecartSerie,
          stockApres,
          distribueJour: distribJour,
          stockFinJour: stockFin,
          remarqueBeng: "",
          remarque81669: e.remarque,
          alerte: niveauAlerte(Math.abs(ecartSerie)),
          manqueTotal: Math.abs(ecartSerie),
        });
      });
    }

    return result;
  }, [beng1Data, beng2Data, c81669Data]);

  // ── Filtres ──────────────────────────────────────────────────
  const vues = useMemo(() => {
    let r = lignes;
    if (filtreAlerte === "ECARTS") r = r.filter(l => l.alerte !== "ok");
    if (search.trim()) r = r.filter(l =>
      l.date.includes(search) ||
      l.numBon?.toLowerCase().includes(search.toLowerCase()) ||
      l.source.toLowerCase().includes(search.toLowerCase())
    );
    return r;
  }, [lignes, filtreAlerte, search]);

  // ── Stats globales ───────────────────────────────────────────
  const stats = useMemo(() => ({
    nb:           lignes.length,
    nbEcarts:     lignes.filter(l => l.alerte !== "ok").length,
    nbCritique:   lignes.filter(l => l.alerte === "critique").length,
    totalRecu:    lignes.reduce((s, l) => s + l.recuDeclare, 0),
    totalSortiBeng: lignes.reduce((s, l) => s + l.sortiBeng, 0),
    totalEcartEntree: lignes.reduce((s, l) => s + l.ecartEntree, 0),
    totalEcartSerie:  lignes.reduce((s, l) => s + l.ecartSerie, 0),
    maxManque:    lignes.length ? Math.max(...lignes.map(l => l.manqueTotal)) : 0,
  }), [lignes]);

  // ── Export Excel ─────────────────────────────────────────────
  const exportExcel = () => {
    const rows = [
      ["SUIVI RECHARGEMENTS — CITERNE MOBILE 81669A55 — BENGUERIR"],
      [`Généré le ${new Date().toLocaleDateString("fr-FR")}`],
      [],
      [
        "N°","Date","Heure","N° Bon","Source",
        "Sorti Beng (L)","Reste avant (L)","Reçu déclaré (L)",
        "Écart entrée (L)",
        "Série départ Beng","Série fin Beng","Lu débitmètre (L)","Écart série (L)",
        "Stock après (L)","Distribué jour (L)","Stock fin journée (L)",
        "Alerte","Remarque Beng","Remarque 81669"
      ],
      ...vues.map(l => [
        l.n, l.date, l.heure, l.numBon, l.source,
        l.sortiBeng, l.resteAvant, l.recuDeclare,
        l.ecartEntree,
        l.serieDepBeng || "—", l.serieFinBeng || "—",
        l.mesureBeng || "—", l.ecartSerie,
        l.stockApres, l.distribueJour, l.stockFinJour,
        l.alerte.toUpperCase(), l.remarqueBeng, l.remarque81669
      ]),
      [],
      ["","","","","TOTAL",
        stats.totalSortiBeng,"",stats.totalRecu,
        stats.totalEcartEntree,"","","",stats.totalEcartSerie],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [4,10,7,10,10,12,14,14,12,13,13,13,12,13,14,15,10,25,25].map(w=>({wch:w}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suivi 81669");
    XLSX.writeFile(wb, "Suivi_Rechargements_81669A55.xlsx");
  };

  // ── Couleurs par niveau ──────────────────────────────────────
  const cfgAlerte = {
    ok:       { row: "",                                              badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", txt: "✅ OK",       val: "text-emerald-600 dark:text-emerald-400" },
    faible:   { row: "bg-yellow-50 dark:bg-yellow-950/10",           badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",   txt: "🟡 2–4 L",    val: "text-yellow-600 dark:text-yellow-500" },
    moyen:    { row: "bg-orange-50 dark:bg-orange-950/15",           badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",   txt: "🟠 5–9 L",    val: "text-orange-600 dark:text-orange-400" },
    critique: { row: "bg-red-50 dark:bg-red-950/20",                 badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",               txt: "🔴 ≥10 L",    val: "text-red-600 dark:text-red-400" },
  };

  // ── Cas sans données ─────────────────────────────────────────
  if (lignes.length === 0) {
    return (
      <div className="bg-card border border-amber-300 dark:border-amber-700/50 rounded-xl p-10 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <p className="font-bold text-foreground text-lg">Aucun rechargement détecté</p>
        <div className="text-sm text-muted-foreground max-w-lg mx-auto space-y-2">
          <p>Pour que ce module fonctionne, il faut saisir les données de deux façons :</p>
          <p>
            <strong className="text-foreground">1. Dans Beng 1 ou Beng 2</strong> → ajouter une sortie
            avec l'immatriculation <strong className="text-foreground">81669A55</strong> (quantité sortie + séries débitmètre)
          </p>
          <p>
            <strong className="text-foreground">2. Dans 81669A55</strong> → ajouter une entrée avec
            <strong className="text-foreground"> Qté Entrée &gt; 0</strong> à la même date
          </p>
          <p>L'écart entre les deux révèle les litres manquants.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── TITRE ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-xl p-4">
        <div>
          <h3 className="font-display text-lg font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Suivi Rechargements — Citerne Mobile 81669A55
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Croise ce que <strong>Beng 1/2 déclare avoir sorti</strong> vers 81669 avec ce que
            <strong> 81669 déclare avoir reçu</strong> → l'écart = les litres manquants
          </p>
        </div>
        <button onClick={exportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 whitespace-nowrap shrink-0">
          <Download className="w-4 h-4" /> Exporter Excel
        </button>
      </div>

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Rechargements</p>
          <p className="font-display text-3xl font-black text-primary mt-1">{stats.nb}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.totalRecu.toLocaleString("fr-FR")} L reçus au total</p>
        </div>

        <div className={`rounded-xl p-4 border ${stats.nbEcarts > 0
            ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700/50"
            : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/50"}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avec écart</p>
          <p className={`font-display text-3xl font-black mt-1 ${stats.nbEcarts > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {stats.nbEcarts}
          </p>
          <p className="text-xs text-muted-foreground mt-1">dont 🔴 {stats.nbCritique} critiques</p>
        </div>

        <div className={`rounded-xl p-4 border ${Math.abs(stats.totalEcartEntree) > 0
            ? "bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700/50"
            : "bg-card border-border"}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Manque cumulé (entrée)</p>
          <p className={`font-display text-3xl font-black mt-1 ${stats.totalEcartEntree > 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600"}`}>
            {stats.totalEcartEntree > 0 ? `+${stats.totalEcartEntree}` : stats.totalEcartEntree} L
          </p>
          <p className="text-xs text-muted-foreground mt-1">Beng sorti vs 81669 reçu</p>
        </div>

        <div className={`rounded-xl p-4 border ${stats.maxManque >= 10 ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700/50"
            : stats.maxManque >= 3 ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700/50"
            : "bg-card border-border"}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Plus grand écart</p>
          <p className={`font-display text-3xl font-black mt-1 ${stats.maxManque >= 10 ? "text-red-600 dark:text-red-400" : stats.maxManque >= 3 ? "text-yellow-600" : "text-emerald-600"}`}>
            {stats.maxManque} L
          </p>
          <p className="text-xs text-muted-foreground mt-1">sur un seul rechargement</p>
        </div>

      </div>

      {/* ── FILTRES ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setFiltreAlerte("TOUS")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filtreAlerte === "TOUS" ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent hover:border-border"}`}>
          Tous ({lignes.length})
        </button>
        <button onClick={() => setFiltreAlerte("ECARTS")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filtreAlerte === "ECARTS" ? "bg-red-600 text-white border-red-600" : "bg-muted text-muted-foreground border-transparent hover:border-border"}`}>
          ⚠ Avec écart seulement ({stats.nbEcarts})
        </button>
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Date ou N° bon..."
            className="pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-44" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
        </div>
      </div>

      {/* ── TABLEAU PRINCIPAL ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: 1200 }}>

            {/* En-tête groupé */}
            <thead className="sticky top-0 z-10">
              <tr className="text-xs font-black uppercase text-white">
                <th colSpan={5}  className="px-3 py-2 bg-slate-700 text-center border-r border-white/20">Rechargement</th>
                <th colSpan={4}  className="px-3 py-2 bg-sky-700 text-center border-r border-white/20">Ce que Beng a sorti → 81669</th>
                <th colSpan={3}  className="px-3 py-2 bg-purple-700 text-center border-r border-white/20">Débitmètre Beng</th>
                <th colSpan={3}  className="px-3 py-2 bg-teal-700 text-center border-r border-white/20">Stock 81669A55</th>
                <th colSpan={2}  className="px-3 py-2 bg-red-700 text-center">Écarts détectés</th>
              </tr>
              <tr className="text-xs font-bold bg-slate-800 text-white">
                <th className="px-3 py-2 text-center">N°</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-center">Heure</th>
                <th className="px-3 py-2 text-center">N° Bon</th>
                <th className="px-3 py-2 text-center border-r border-white/20">Source</th>
                {/* Beng → 81669 */}
                <th className="px-3 py-2 text-center bg-sky-800">Sorti (L)</th>
                <th className="px-3 py-2 text-center bg-sky-800">Reste avant (L)</th>
                <th className="px-3 py-2 text-center bg-sky-800">Reçu déclaré (L)</th>
                <th className="px-3 py-2 text-center bg-sky-900 border-r border-white/20">Manque entrée (L)</th>
                {/* Débitmètre */}
                <th className="px-3 py-2 text-center bg-purple-800">Série dép.</th>
                <th className="px-3 py-2 text-center bg-purple-800">Série fin</th>
                <th className="px-3 py-2 text-center bg-purple-800 border-r border-white/20">Lu (L)</th>
                {/* Stock */}
                <th className="px-3 py-2 text-center bg-teal-800">Stock après (L)</th>
                <th className="px-3 py-2 text-center bg-teal-800">Distribué (L)</th>
                <th className="px-3 py-2 text-center bg-teal-800 border-r border-white/20">Stock fin jour (L)</th>
                {/* Écarts */}
                <th className="px-3 py-2 text-center bg-red-800">Écart série (L)</th>
                <th className="px-3 py-2 text-center bg-red-900">Alerte</th>
              </tr>
            </thead>

            <tbody>
              {vues.length === 0
                ? <tr><td colSpan={17} className="px-4 py-10 text-center text-muted-foreground">Aucun résultat</td></tr>
                : vues.map((l, idx) => {
                const cfg = cfgAlerte[l.alerte];
                const rowBg = cfg.row || (idx % 2 === 0 ? "" : "bg-muted/20");

                return (
                  <tr key={l.n} className={`border-b border-border/40 hover:brightness-95 transition-all ${rowBg}`}>

                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{l.n}</td>
                    <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">{l.date}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs">{l.heure || "—"}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-muted-foreground">{l.numBon || "—"}</td>
                    <td className="px-3 py-2.5 text-center border-r border-border/40">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        l.source === "Beng 1" ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400" :
                        l.source === "Beng 2" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                        "bg-muted text-muted-foreground"
                      }`}>{l.source}</span>
                    </td>

                    {/* Beng → 81669 */}
                    <td className="px-3 py-2.5 text-center bg-sky-50/60 dark:bg-sky-950/10">
                      <span className="text-sky-700 dark:text-sky-400 font-black">
                        {l.sortiBeng > 0 ? `${l.sortiBeng.toLocaleString("fr-FR")} L` : <span className="text-muted-foreground italic text-xs">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center bg-sky-50/60 dark:bg-sky-950/10">
                      <span className="text-slate-600 dark:text-slate-400 font-semibold">
                        {l.resteAvant.toLocaleString("fr-FR")} L
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center bg-sky-50/60 dark:bg-sky-950/10">
                      <span className="text-sky-900 dark:text-sky-300 font-bold">
                        {l.recuDeclare > 0 ? `${l.recuDeclare.toLocaleString("fr-FR")} L` : <span className="text-muted-foreground italic text-xs">non saisi</span>}
                      </span>
                    </td>
                    {/* Manque entrée */}
                    <td className={`px-3 py-2.5 text-center border-r border-border/40 ${l.ecartEntree > 0 ? "bg-orange-100 dark:bg-orange-950/20" : "bg-sky-50/60 dark:bg-sky-950/10"}`}>
                      {l.sortiBeng > 0 && l.recuDeclare > 0 ? (
                        <span className={`font-black ${l.ecartEntree > 0 ? "text-orange-700 dark:text-orange-400" : l.ecartEntree < 0 ? "text-blue-600" : "text-emerald-600"}`}>
                          {l.ecartEntree > 0 ? `−${l.ecartEntree} L` : l.ecartEntree < 0 ? `+${Math.abs(l.ecartEntree)} L` : "OK"}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>

                    {/* Débitmètre */}
                    <td className="px-3 py-2.5 text-center bg-purple-50/60 dark:bg-purple-950/10">
                      <span className="font-mono text-xs text-purple-700 dark:text-purple-400">
                        {l.serieDepBeng > 0 ? l.serieDepBeng.toLocaleString("fr-FR") : <span className="text-muted-foreground italic">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center bg-purple-50/60 dark:bg-purple-950/10">
                      <span className="font-mono text-xs text-purple-700 dark:text-purple-400">
                        {l.serieFinBeng > 0 ? l.serieFinBeng.toLocaleString("fr-FR") : <span className="text-muted-foreground italic">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center bg-purple-50/60 dark:bg-purple-950/10 border-r border-border/40">
                      {l.mesureBeng > 0
                        ? <span className="font-bold text-purple-700 dark:text-purple-400">{l.mesureBeng.toLocaleString("fr-FR")} L</span>
                        : <span className="text-muted-foreground italic text-xs">—</span>}
                    </td>

                    {/* Stock */}
                    <td className="px-3 py-2.5 text-center bg-teal-50/60 dark:bg-teal-950/10">
                      <span className="text-teal-700 dark:text-teal-400 font-semibold">
                        {l.stockApres.toLocaleString("fr-FR")} L
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center bg-teal-50/60 dark:bg-teal-950/10">
                      {l.distribueJour > 0
                        ? <span className="text-red-500 font-semibold">−{l.distribueJour.toLocaleString("fr-FR")} L</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center bg-teal-50/60 dark:bg-teal-950/10 border-r border-border/40">
                      <span className={`font-bold ${l.stockFinJour < 0 ? "text-red-600" : "text-foreground"}`}>
                        {l.stockFinJour.toLocaleString("fr-FR")} L
                      </span>
                    </td>

                    {/* Écart série débitmètre */}
                    <td className={`px-3 py-2.5 text-center ${
                      l.alerte === "critique" ? "bg-red-100 dark:bg-red-950/30" :
                      l.alerte === "moyen"    ? "bg-orange-100 dark:bg-orange-950/20" :
                      l.alerte === "faible"   ? "bg-yellow-100 dark:bg-yellow-950/20" :
                      "bg-emerald-50 dark:bg-emerald-950/10"}`}>
                      {l.serieDepBeng > 0 && l.serieFinBeng > 0 ? (
                        <span className={`font-black text-base ${cfg.val}`}>
                          {l.ecartSerie > 0 ? `−${l.ecartSerie} L` : l.ecartSerie < 0 ? `+${Math.abs(l.ecartSerie)} L` : "0 L"}
                        </span>
                      ) : <span className="text-xs text-muted-foreground italic">pas de série</span>}
                    </td>

                    {/* Badge alerte */}
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-black px-2 py-1 rounded-full ${cfg.badge}`}>
                        {cfg.txt}
                      </span>
                    </td>

                  </tr>
                );
              })}
            </tbody>

            {/* TOTAUX */}
            <tfoot className="sticky bottom-0">
              <tr className="text-xs font-bold bg-slate-800 text-white">
                <td colSpan={5} className="px-3 py-2.5 font-display uppercase">TOTAL — {vues.length} rechargements</td>
                <td className="px-3 py-2.5 text-center bg-sky-700 font-black">
                  {vues.reduce((s, l) => s + l.sortiBeng, 0).toLocaleString("fr-FR")} L
                </td>
                <td className="px-3 py-2.5 text-center bg-sky-800">—</td>
                <td className="px-3 py-2.5 text-center bg-sky-700 font-black">
                  {vues.reduce((s, l) => s + l.recuDeclare, 0).toLocaleString("fr-FR")} L
                </td>
                <td className={`px-3 py-2.5 text-center font-black text-base ${vues.reduce((s,l)=>s+l.ecartEntree,0) > 0 ? "bg-orange-700" : "bg-emerald-700"}`}>
                  {(() => { const t = vues.reduce((s,l)=>s+l.ecartEntree,0); return t > 0 ? `−${t} L` : t < 0 ? `+${Math.abs(t)} L` : "OK"; })()}
                </td>
                <td colSpan={3} className="px-3 py-2.5 text-center bg-purple-900">—</td>
                <td colSpan={3} className="px-3 py-2.5 text-center bg-teal-900">—</td>
                <td className={`px-3 py-2.5 text-center font-black text-base ${vues.reduce((s,l)=>s+l.ecartSerie,0) > 0 ? "bg-red-700" : "bg-emerald-700"}`}>
                  {(() => { const t = vues.reduce((s,l)=>s+l.ecartSerie,0); return t > 0 ? `−${t} L` : t < 0 ? `+${Math.abs(t)} L` : "OK"; })()}
                </td>
                <td className="px-3 py-2.5 text-center bg-slate-700">
                  🔴 {stats.nbCritique}
                </td>
              </tr>
            </tfoot>

          </table>
        </div>
      </div>

      {/* ── LÉGENDE ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1.5">
          <p className="font-bold text-foreground text-sm mb-2">📖 Logique de détection</p>
          <p><span className="font-bold text-sky-600">Sorti Beng</span> = litres que Beng 1 ou 2 a sorti vers la 81669 (enregistré dans Beng1/2)</p>
          <p><span className="font-bold text-sky-800">Reçu déclaré</span> = litres que la 81669 déclare avoir reçu (enregistré dans 81669)</p>
          <p><span className="font-bold text-orange-600">Manque entrée</span> = Sorti − Reçu → si &gt; 0, des litres ont disparu entre Beng et la 81669</p>
          <p><span className="font-bold text-purple-600">Lu débitmètre</span> = Série fin − Série départ du compteur physique chez Beng</p>
          <p><span className="font-bold text-red-600">Écart série</span> = Sorti − Lu → si &gt; 0, le compteur ne correspond pas au bon</p>
        </div>
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1.5">
          <p className="font-bold text-foreground text-sm mb-2">🚨 Niveaux d'alerte</p>
          <p><span className="text-emerald-600 font-bold">✅ OK — 0 L</span> : Tout correspond parfaitement</p>
          <p><span className="text-yellow-600 font-bold">🟡 FAIBLE — 2 à 4 L</span> : Écart mineur, surveiller</p>
          <p><span className="text-orange-600 font-bold">🟠 MOYEN — 5 à 9 L</span> : Écart à enquêter</p>
          <p><span className="text-red-600 font-bold">🔴 CRITIQUE — ≥ 10 L</span> : Vol probable, action immédiate</p>
          <p className="pt-2 text-muted-foreground italic">
            💡 Pour activer la colonne débitmètre : renseigner <strong className="text-foreground">Série Départ</strong> et <strong className="text-foreground">Série Fin</strong> dans les sorties Beng vers 81669.
          </p>
        </div>
      </div>

    </div>
  );
};

export default SuiviRecharge81669;
