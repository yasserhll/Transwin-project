// components/stock/GlobalSection.tsx
// Reçoit directement beng1[], beng2[], citerne81669[]
// et génère le Global en temps réel — IDENTIQUE au fichier Excel
//
// Règles de consommation validées sur Global.xlsx :
//   D183+ (gros camions) → litres / parcours          (L/km)
//   Tout le reste        → litres / parcours / 100    (L/100km ou L/100h)
//   Affichage            → valeur × 100  →  en %  (format Excel 0.00%)

import { useState, useMemo, useRef } from "react";
import { CiterneEntry, GlobalEntry } from "@/data/stockTypes";
import { exportGlobalExcel } from "@/lib/stockExcelUtils";
import { Plus, Pencil, Trash2, Upload, Download, Search, X, RotateCcw, Info } from "lucide-react";

interface Props {
  beng1: CiterneEntry[];
  beng2: CiterneEntry[];
  citerne81669: CiterneEntry[];
  // fonctions de mutation (transmises depuis StockPage)
  addBeng1:    (e: CiterneEntry) => void;
  addBeng2:    (e: CiterneEntry) => void;
  add81669:    (e: CiterneEntry) => void;
  updateBeng1: (i: number, e: CiterneEntry) => void;
  updateBeng2: (i: number, e: CiterneEntry) => void;
  update81669: (i: number, e: CiterneEntry) => void;
  removeBeng1: (i: number) => void;
  removeBeng2: (i: number) => void;
  remove81669: (i: number) => void;
  resetAll:    () => void;
}

// ── Consommation identique à Excel ───────────────────────────
function calcConso(code: string, litres: number, parcours: number): number {
  if (parcours <= 0) return 0;
  const m = code.match(/^D(\d+)/i);
  if (m && parseInt(m[1], 10) >= 183) return litres / parcours;
  return litres / parcours / 100;
}

function calcParcours(cptKm: number, kmPrec: number): number {
  const p = (cptKm || 0) - (kmPrec || 0);
  return p > 0 ? p : 0;
}

// ── Tri date "JJ/MM/AAAA" + heure "HH:MM" ───────────────────
function sortKey(date: string, heure: string): number {
  try {
    const [d, m, y] = date.split("/");
    const [h = "0", mn = "0"] = (heure || "00:00").split(":");
    return new Date(+y, +m - 1, +d, +h, +mn).getTime();
  } catch { return 0; }
}

// ── Type enrichi pour la table ───────────────────────────────
interface GlobalRow extends GlobalEntry {
  _aff:      string;   // affectation source
  _srcIdx:   number;   // index dans le tableau source
  _consoPct: number;   // consommation × 100  (pour affichage %)
}

// ── buildGlobal : génère toutes les lignes depuis les 3 citernes ──
function buildGlobal(
  beng1: CiterneEntry[],
  beng2: CiterneEntry[],
  c81669: CiterneEntry[]
): GlobalRow[] {
  type Item = { e: CiterneEntry; aff: string; idx: number };
  const all: Item[] = [];
  beng1.forEach( (e, i) => { if (e.code) all.push({ e, aff: "Beng 1",   idx: i }); });
  beng2.forEach( (e, i) => { if (e.code) all.push({ e, aff: "Beng 2",   idx: i }); });
  c81669.forEach((e, i) => { if (e.code) all.push({ e, aff: "81669A55", idx: i }); });

  all.sort((a, b) => sortKey(a.e.date, a.e.heure) - sortKey(b.e.date, b.e.heure));

  const prevKm: Record<string, number> = {};
  return all.map(({ e, aff, idx }) => {
    const code      = String(e.code ?? "");
    const compteurKm = e.kilometrage > 0 ? e.kilometrage : 0;
    const kmPrec    = prevKm[code];
    const parcours  = (compteurKm > 0 && kmPrec !== undefined && compteurKm >= kmPrec)
      ? compteurKm - kmPrec : 0;
    const litres    = e.qteSortie;
    const conso     = calcConso(code, litres, parcours);
    if (compteurKm > 0) prevKm[code] = compteurKm;
    return {
      _aff: aff, _srcIdx: idx, _consoPct: conso * 100,
      date: e.date, heure: e.heure, code,
      immatriculation: e.immatriculation,
      compteurKm, kilometrage: kmPrec ?? 0, parcours,
      litres, consommation: conso, remarque: e.remarque, affectation: aff,
    };
  });
}

// ── Couleurs ─────────────────────────────────────────────────
const consoColor = (pct: number) =>
  pct > 100 ? "text-red-600 font-bold" :
  pct > 85  ? "text-amber-500 font-bold" :
  pct > 60  ? "text-blue-500 font-semibold" : "text-foreground";

const consoBg = (pct: number) =>
  pct > 85 ? "bg-red-50" : pct > 60 ? "bg-blue-50" : "";

const affBadge = (aff: string) =>
  aff.includes("Beng 1") ? "bg-blue-100 text-blue-700" :
  aff.includes("Beng 2") ? "bg-amber-100 text-amber-700" :
  "bg-green-100 text-green-700";

// ── Modal form empty ─────────────────────────────────────────
const emptyForm = () => ({
  date: "", heure: "", code: "", immatriculation: "",
  compteurKm: 0, kilometrage: 0, litres: 0, remarque: "", affectation: "Beng 1",
});

// ═══════════════════════════════════════════════════════════════
const GlobalSection = ({
  beng1, beng2, citerne81669,
  addBeng1, addBeng2, add81669,
  updateBeng1, updateBeng2, update81669,
  removeBeng1, removeBeng2, remove81669,
  resetAll,
}: Props) => {

  const [modal, setModal]     = useState<{ open: boolean; row?: GlobalRow }>({ open: false });
  const [form, setForm]       = useState(emptyForm());
  const [confirmDel, setConfirmDel] = useState<GlobalRow | null>(null);
  const [search, setSearch]   = useState("");
  const [filterAff, setFilterAff] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Générer toutes les lignes ─────────────────────────────
  const allRows = useMemo(
    () => buildGlobal(beng1, beng2, citerne81669),
    [beng1, beng2, citerne81669]
  );

  const affectations = useMemo(
    () => Array.from(new Set(allRows.map(r => r._aff))).sort(),
    [allRows]
  );

  // ── Filtrer ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = allRows;
    if (filterAff !== "all") d = d.filter(r => r._aff === filterAff);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(r =>
        r.date.includes(q) ||
        String(r.code).toLowerCase().includes(q) ||
        r.immatriculation.toLowerCase().includes(q) ||
        r._aff.toLowerCase().includes(q)
      );
    }
    return d;
  }, [allRows, search, filterAff]);

  const totalLitres   = useMemo(() => filtered.reduce((s, r) => s + r.litres, 0), [filtered]);
  const totalParcours = useMemo(() => filtered.reduce((s, r) => s + r.parcours, 0), [filtered]);
  const moyPct = totalParcours > 0 ? ((totalLitres / totalParcours) * 100).toFixed(2) : "—";

  // CORRECTION : Entrées = nombre de véhicules UNIQUES (chaque code = 1 seul véhicule)
  const uniqueVehicules = useMemo(
    () => new Set(filtered.map(r => String(r.code).trim().toUpperCase())).size,
    [filtered]
  );

  // ── Live preview formulaire ───────────────────────────────
  const liveParcours = calcParcours(form.compteurKm, form.kilometrage);
  const liveConso    = calcConso(form.code, form.litres, liveParcours);
  const livePct      = liveConso * 100;

  // ── Helpers mutation ──────────────────────────────────────
  const addToAff = (aff: string, entry: CiterneEntry) => {
    if (aff === "Beng 1")   addBeng1(entry);
    else if (aff === "Beng 2") addBeng2(entry);
    else add81669(entry);
  };

  const toCiterneEntry = (f: typeof form, original?: CiterneEntry): CiterneEntry => ({
    ...(original ?? {
      qteEntree: 0, fournisseur: "", numBon: "",
      serieDepart: 0, serieFin: 0,
    }),
    date: f.date, heure: f.heure, code: f.code,
    immatriculation: f.immatriculation,
    kilometrage: f.compteurKm,   // compteurKm → Kilometrage citerne
    qteSortie: f.litres,
    remarque: f.remarque,
  } as CiterneEntry);

  // ── Ouvrir modal ajout ────────────────────────────────────
  const openAdd = () => { setForm(emptyForm()); setModal({ open: true }); };

  // ── Ouvrir modal édition ──────────────────────────────────
  const openEdit = (row: GlobalRow) => {
    setForm({
      date: row.date, heure: row.heure, code: row.code,
      immatriculation: row.immatriculation,
      compteurKm: row.compteurKm, kilometrage: row.kilometrage,
      litres: row.litres, remarque: row.remarque, affectation: row._aff,
    });
    setModal({ open: true, row });
  };

  // ── Sauvegarder ──────────────────────────────────────────
  const saveForm = () => {
    if (!form.date && !form.code) return;
    const entry = toCiterneEntry(form);
    if (modal.row) {
      // Édition
      const { _aff, _srcIdx } = modal.row;
      const newAff = form.affectation;
      if (newAff !== _aff) {
        // Changer d'affectation : supprimer de l'ancienne, ajouter dans la nouvelle
        if (_aff === "Beng 1")   removeBeng1(_srcIdx);
        else if (_aff === "Beng 2") removeBeng2(_srcIdx);
        else remove81669(_srcIdx);
        addToAff(newAff, entry);
      } else {
        if (_aff === "Beng 1")   updateBeng1(_srcIdx, entry);
        else if (_aff === "Beng 2") updateBeng2(_srcIdx, entry);
        else update81669(_srcIdx, entry);
      }
    } else {
      addToAff(form.affectation, entry);
    }
    setModal({ open: false });
  };

  // ── Supprimer ─────────────────────────────────────────────
  const doDelete = (row: GlobalRow) => {
    if (row._aff === "Beng 1")   removeBeng1(row._srcIdx);
    else if (row._aff === "Beng 2") removeBeng2(row._srcIdx);
    else remove81669(row._srcIdx);
    setConfirmDel(null);
  };

  // ── Import : non géré ici — importer depuis les onglets citerne
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = "";
    alert("Pour importer, utilisez le bouton Importer dans chaque onglet citerne (Beng 1, Beng 2, 81669A55).");
  };

  const n = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-primary uppercase tracking-wide">
            Global — Toutes les sorties
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Généré automatiquement depuis Beng 1 + Beng 2 + 81669A55 &nbsp;|&nbsp;
            Conso : D183+ = L/km · Autres = L/Parcours/100
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:opacity-90">
            <Upload className="w-3.5 h-3.5" /> Importer
          </button>
          <button onClick={() => exportGlobalExcel(allRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-mining-success text-white rounded-lg text-xs font-semibold hover:opacity-90">
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
          <button onClick={() => { if (confirm("Réinitialiser toutes les citernes ?")) resetAll(); }}
            className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/70">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Véhicules",      value: uniqueVehicules,                       unit: "codes uniques", color: "text-primary" },
          { label: "Total Litres",   value: totalLitres.toLocaleString("fr-FR"),   unit: "L",         color: "text-accent" },
          { label: "Total Parcours", value: totalParcours.toLocaleString("fr-FR"), unit: "km",        color: "text-mining-info" },
          { label: "Moy. Conso",     value: moyPct,                                unit: "%",         color: "text-mining-warning" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-xl font-display font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.unit}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
            placeholder="Date, code, immatriculation…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", ...affectations].map(a => (
            <button key={a} onClick={() => setFilterAff(a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterAff === a ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
              }`}>
              {a === "all" ? "Tout" : a}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-primary/5 border-b border-border">
              <tr>
                {["Date","Heure","Code","Immatriculation","Compteur Km","Km Précédent","Parcours (km)","Litres","Conso %","Remarque","Affectation",""].map(h => (
                  <th key={h} className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center first:text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">
                    Importez les fichiers dans Beng 1, Beng 2 et 81669A55
                  </td>
                </tr>
              ) : filtered.map((row, idx) => (
                <tr key={idx} className={`border-b border-border/50 hover:bg-primary/5 transition-colors ${consoBg(row._consoPct)}`}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.heure}</td>
                  <td className="px-3 py-2 text-center font-bold text-primary">{row.code}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground whitespace-nowrap">{row.immatriculation}</td>
                  <td className="px-3 py-2 text-center">{row.compteurKm > 0 ? row.compteurKm.toLocaleString("fr-FR") : "—"}</td>
                  <td className="px-3 py-2 text-center">{row.kilometrage > 0 ? row.kilometrage.toLocaleString("fr-FR") : "—"}</td>
                  <td className="px-3 py-2 text-center font-semibold text-mining-info">
                    {row.parcours > 0 ? row.parcours.toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-primary">{row.litres.toLocaleString("fr-FR")}</td>
                  <td className={`px-3 py-2 text-center ${consoColor(row._consoPct)}`}>
                    {row.parcours > 0 ? `${row._consoPct.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.remarque}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${affBadge(row._aff)}`}>
                      {row._aff}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(row)} className="p-1 rounded hover:bg-primary/10 text-primary">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => setConfirmDel(row)} className="p-1 rounded hover:bg-red-100 text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary text-primary-foreground font-bold">
                <td className="px-3 py-2.5 font-display uppercase" colSpan={6}>
                  TOTAL ({filtered.length} entrées)
                </td>
                <td className="px-3 py-2.5 text-center">{totalParcours.toLocaleString("fr-FR")} km</td>
                <td className="px-3 py-2.5 text-center">{totalLitres.toLocaleString("fr-FR")} L</td>
                <td className="px-3 py-2.5 text-center">{moyPct !== "—" ? `${moyPct}%` : "—"}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Légende */}
      <div className="flex gap-4 text-xs text-muted-foreground items-center flex-wrap">
        <span className="font-semibold text-foreground">Légende conso :</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" />&gt;100% Critique</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" />85–100% Surconso</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block" />60–85% Élevée</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border inline-block" />&lt;60% Normale</span>
      </div>

      {/* ── Modal Ajout / Édition ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-mining w-full max-w-lg mx-4 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-primary uppercase">
                {modal.row ? "Modifier" : "Ajouter"} — Global
              </h3>
              <button onClick={() => setModal({ open: false })}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase">Date</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} placeholder="JJ/MM/AAAA" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Heure</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} placeholder="HH:MM" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Code</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ex: D185, E22" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Immatriculation</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Compteur Km (actuel)</label>
                <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.compteurKm || ""} onChange={e => setForm(f => ({ ...f, compteurKm: n(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Km Précédent</label>
                <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.kilometrage || ""} onChange={e => setForm(f => ({ ...f, kilometrage: n(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Litres</label>
                <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.litres || ""} onChange={e => setForm(f => ({ ...f, litres: n(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Affectation</label>
                <select className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.affectation} onChange={e => setForm(f => ({ ...f, affectation: e.target.value }))}>
                  <option value="Beng 1">Beng 1</option>
                  <option value="Beng 2">Beng 2</option>
                  <option value="81669A55">81669A55</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase">Remarque</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.remarque} onChange={e => setForm(f => ({ ...f, remarque: e.target.value }))} />
              </div>
              {/* Preview live */}
              <div className="col-span-2 bg-primary/5 rounded-xl p-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Parcours = Compteur − Km Précédent</p>
                  <p className="text-lg font-display font-bold text-mining-info mt-0.5">
                    {liveParcours > 0 ? `${liveParcours.toLocaleString("fr-FR")} km` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Conso {/^D(\d+)/i.test(form.code) && parseInt(form.code.match(/^D(\d+)/i)![1]) >= 183
                      ? "= L/Parcours" : "= L/Parcours/100"}
                  </p>
                  <p className={`text-lg font-display font-bold mt-0.5 ${consoColor(livePct)}`}>
                    {liveParcours > 0 ? `${livePct.toFixed(2)}%` : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal({ open: false })} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
                Annuler
              </button>
              <button onClick={saveForm} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                {modal.row ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-mining p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg font-bold text-red-500">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Supprimer <strong>{confirmDel.code}</strong> du {confirmDel.date} ({confirmDel._aff}) ?
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
                Annuler
              </button>
              <button onClick={() => doDelete(confirmDel)} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSection;
