// Section Sortie — Résumé journalier par citerne
// Import depuis sortie.xlsx OU depuis les 3 fichiers citernes directement
// (Beng 2 col G = #VALUE! dans sortie.xlsx → utiliser les citernes comme source)

import { useState, useMemo, useRef } from "react";
import { SortieEntry } from "@/data/stockTypes";
import { parseSortieExcel, parseSortieFromCiternes, exportSortieExcel } from "@/lib/stockExcelUtils";
import { Plus, Pencil, Trash2, Upload, Download, Search, X, RotateCcw, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  data: SortieEntry[];
  add: (item: SortieEntry) => void;
  update: (index: number, item: SortieEntry) => void;
  remove: (index: number) => void;
  importData: (items: SortieEntry[]) => void;
  reset: () => void;
}

const emptySortie = (): SortieEntry => ({ date: "", beng1: 0, beng2: 0, citerne81669: 0 });

const SortieSection = ({ data, add, update, remove, importData, reset }: Props) => {
  const [modal, setModal]       = useState<{ open: boolean; index?: number }>({ open: false });
  const [form, setForm]         = useState<SortieEntry>(emptySortie());
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [search, setSearch]     = useState("");
  const [importing, setImporting] = useState(false);

  // Refs pour les 2 modes d'import
  const fileSortieRef = useRef<HTMLInputElement>(null);   // sortie.xlsx
  const fileB1Ref     = useRef<HTMLInputElement>(null);   // beng_1.xlsx
  const fileB2Ref     = useRef<HTMLInputElement>(null);   // beng_2.xlsx
  const file81Ref     = useRef<HTMLInputElement>(null);   // 81669A55.xlsx

  // Fichiers sélectionnés pour import 3 citernes
  const [files3, setFiles3]     = useState<{ b1?: File; b2?: File; c81?: File }>({});
  const [showMode, setShowMode] = useState<"sortie" | "citernes" | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    return data.filter(r => r.date.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const totals = useMemo(() => ({
    beng1:  filtered.reduce((s, d) => s + d.beng1, 0),
    beng2:  filtered.reduce((s, d) => s + d.beng2, 0),
    c81669: filtered.reduce((s, d) => s + d.citerne81669, 0),
  }), [filtered]);
  const grandTotal = totals.beng1 + totals.beng2 + totals.c81669;

  const chartData = filtered
    .filter(d => d.beng1 + d.beng2 + d.citerne81669 > 0)
    .map(d => ({
      date: d.date.substring(0, 5),
      "Beng 1": d.beng1, "Beng 2": d.beng2, "81669A55": d.citerne81669,
    }));

  const openAdd  = () => { setForm(emptySortie()); setModal({ open: true }); };
  const openEdit = (idx: number) => { setForm({ ...data[idx] }); setModal({ open: true, index: idx }); };
  const saveForm = () => {
    if (!form.date.trim()) return;
    if (modal.index !== undefined) update(modal.index, form);
    else add(form);
    setModal({ open: false });
  };

  // ── Import depuis sortie.xlsx ──────────────────────────────
  const handleImportSortie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const items = await parseSortieExcel(file);
      if (items.length > 0) {
        importData(items);
        alert(`${items.length} entrées importées depuis sortie.xlsx.\n⚠️ Note : Beng 2 peut afficher 0 si le fichier contient des formules #VALUE!.\nUtilisez "Importer 3 citernes" pour avoir les vraies valeurs Beng 2.`);
      } else {
        alert("Aucune donnée trouvée dans ce fichier.");
      }
    } catch { alert("Erreur lecture fichier."); }
    setImporting(false);
    e.target.value = "";
    setShowMode(null);
  };

  // ── Import depuis les 3 fichiers citernes ─────────────────
  const handleImport3Citernes = async () => {
    if (!files3.b1 || !files3.b2 || !files3.c81) {
      alert("Veuillez sélectionner les 3 fichiers : Beng 1, Beng 2 et 81669A55.");
      return;
    }
    setImporting(true);
    try {
      const items = await parseSortieFromCiternes(files3.b1, files3.b2, files3.c81);
      if (items.length > 0) {
        importData(items);
        alert(`${items.length} jours importés avec les vraies valeurs des 3 citernes !`);
        setFiles3({});
        setShowMode(null);
      } else {
        alert("Aucune donnée trouvée.");
      }
    } catch (err) { alert("Erreur : " + String(err)); }
    setImporting(false);
  };

  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-primary uppercase tracking-wide">
            Sortie — Quantité sortie par jour
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Résumé journalier des 3 citernes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>

          {/* Bouton import avec menu déroulant */}
          <div className="relative">
            <button onClick={() => setShowMode(m => m ? null : "sortie")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:opacity-90">
              <Upload className="w-3.5 h-3.5" /> Importer ▾
            </button>
            {showMode && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-mining p-3 w-72 space-y-2">
                {/* Option 1 : sortie.xlsx */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Option 1 — Fichier sortie.xlsx</p>
                  <p className="text-xs text-muted-foreground mb-2 flex gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Beng 2 peut afficher 0 (formules #VALUE!)
                  </p>
                  <button onClick={() => fileSortieRef.current?.click()}
                    className="w-full py-1.5 bg-accent/20 text-accent rounded-lg text-xs font-semibold hover:bg-accent/30">
                    Choisir sortie.xlsx
                  </button>
                  <input ref={fileSortieRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportSortie} />
                </div>

                <hr className="border-border" />

                {/* Option 2 : 3 citernes */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Option 2 — Importer les 3 citernes ✓</p>
                  <p className="text-xs text-muted-foreground mb-2">Calcule les vrais totaux journaliers</p>
                  <div className="space-y-1.5">
                    {[
                      { label: "Beng 1", key: "b1" as const, ref: fileB1Ref },
                      { label: "Beng 2", key: "b2" as const, ref: fileB2Ref },
                      { label: "81669A55", key: "c81" as const, ref: file81Ref },
                    ].map(({ label, key, ref }) => (
                      <div key={key} className="flex items-center gap-2">
                        <button onClick={() => ref.current?.click()}
                          className={`flex-1 py-1 rounded-lg text-xs font-semibold border ${
                            files3[key] ? "bg-mining-success/20 text-mining-success border-mining-success/30" : "bg-muted text-muted-foreground border-border hover:bg-primary/10"
                          }`}>
                          {files3[key] ? `✓ ${files3[key]!.name.substring(0, 18)}` : `Choisir ${label}`}
                        </button>
                        <input ref={ref} type="file" accept=".xlsx,.xls" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) setFiles3(p => ({ ...p, [key]: f })); e.target.value = ""; }} />
                      </div>
                    ))}
                    <button
                      onClick={handleImport3Citernes}
                      disabled={importing || !files3.b1 || !files3.b2 || !files3.c81}
                      className="w-full py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-40 hover:opacity-90 mt-1">
                      {importing ? "Calcul en cours…" : "Importer et calculer"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => exportSortieExcel(data)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-mining-success text-white rounded-lg text-xs font-semibold hover:opacity-90">
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
          <button onClick={() => { if (confirm("Réinitialiser ?")) reset(); }}
            className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/70">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Citerne Beng 1",   value: totals.beng1,  color: "text-mining-info",    bg: "bg-mining-info/10" },
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

      {/* Chart */}
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="w-full pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
          placeholder="Filtrer par date..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-primary/5 border-b border-border">
                {["Date", "Citerne Beng 1", "Citerne Beng 2", "Citerne 81669A55", "Total Journalier", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-xs text-center first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Aucune donnée — utilisez "Importer" pour charger les données
                  </td>
                </tr>
              ) : filtered.map((row, idx) => {
                const total = row.beng1 + row.beng2 + row.citerne81669;
                const realIdx = data.indexOf(row);
                return (
                  <tr key={idx} className={`border-b border-border/60 hover:bg-primary/5 ${
                    total === 0 ? "opacity-40" : idx % 2 === 0 ? "bg-card" : "bg-muted/30"
                  }`}>
                    <td className="px-4 py-2 font-medium text-foreground">{row.date}</td>
                    <td className="px-4 py-2 text-center">
                      {row.beng1 > 0
                        ? <span className="text-mining-info font-semibold">{row.beng1.toLocaleString("fr-FR")}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {row.beng2 > 0
                        ? <span className="text-accent font-semibold">{row.beng2.toLocaleString("fr-FR")}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {row.citerne81669 > 0
                        ? <span className="text-mining-success font-semibold">{row.citerne81669.toLocaleString("fr-FR")}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {total > 0
                        ? <span className="inline-block bg-primary text-primary-foreground font-display font-bold px-3 py-0.5 rounded-lg text-xs">{total.toLocaleString("fr-FR")} L</span>
                        : <span className="text-muted-foreground text-xs">Repos</span>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(realIdx)} className="p-1 rounded hover:bg-primary/10 text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDel(realIdx)} className="p-1 rounded hover:bg-mining-danger/10 text-mining-danger">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-primary text-primary-foreground font-bold">
                <td className="px-4 py-2.5 font-display uppercase">TOTAL</td>
                <td className="px-4 py-2.5 text-center font-display">{totals.beng1.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5 text-center font-display">{totals.beng2.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5 text-center font-display">{totals.c81669.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="bg-accent text-accent-foreground font-display px-2 py-0.5 rounded">
                    {grandTotal.toLocaleString("fr-FR")} L
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Ajout/Édition */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card rounded-2xl shadow-mining w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-primary uppercase">
                {modal.index !== undefined ? "Modifier" : "Ajouter"} — Sortie
              </h3>
              <button onClick={() => setModal({ open: false })}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase">Date</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} placeholder="JJ/MM/AAAA" />
              </div>
              <div>
                <label className="text-xs text-mining-info uppercase">Citerne Beng 1 (L)</label>
                <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.beng1} onChange={e => setForm(f => ({ ...f, beng1: num(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-accent uppercase">Citerne Beng 2 (L)</label>
                <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.beng2} onChange={e => setForm(f => ({ ...f, beng2: num(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-mining-success uppercase">Citerne 81669A55 (L)</label>
                <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.citerne81669} onChange={e => setForm(f => ({ ...f, citerne81669: num(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal({ open: false })} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">Annuler</button>
              <button onClick={saveForm} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                {modal.index !== undefined ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {confirmDel !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-mining p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg font-bold text-mining-danger">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground mt-2">Supprimer l'entrée du {data[confirmDel]?.date} ?</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">Annuler</button>
              <button onClick={() => { remove(confirmDel); setConfirmDel(null); }} className="flex-1 py-2 rounded-lg bg-mining-danger text-white text-sm font-semibold">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SortieSection;
