// Section réutilisable pour Beng 1, Beng 2, 81669A55
import { useState, useMemo, useRef } from "react";
import { CiterneEntry } from "@/data/stockTypes";
import { parseCiterneExcel, exportCiterneExcel } from "@/lib/stockExcelUtils";
import { Plus, Pencil, Trash2, Upload, Download, Search, X, RotateCcw } from "lucide-react";

interface Props {
  title: string;
  colorClass: string;
  bgClass: string;
  data: CiterneEntry[];
  add: (item: CiterneEntry) => void;
  update: (index: number, item: CiterneEntry) => void;
  remove: (index: number) => void;
  importData: (items: CiterneEntry[]) => void;
  reset: () => void;
}

const emptyCiterne = (): CiterneEntry => ({
  date: "", qteEntree: 0, fournisseur: "", numBon: "", heure: "",
  code: "", immatriculation: "", kilometrage: 0, qteSortie: 0,
  remarque: "", serieDepart: 0, serieFin: 0,
});

const CiterneSection = ({ title, colorClass, bgClass, data, add, update, remove, importData, reset }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; index?: number }>({ open: false });
  const [form, setForm] = useState<CiterneEntry>(emptyCiterne());
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(r =>
      r.date.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.immatriculation.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalEntree = useMemo(() => filtered.reduce((s, d) => s + d.qteEntree, 0), [filtered]);
  const totalSortie = useMemo(() => filtered.reduce((s, d) => s + d.qteSortie, 0), [filtered]);

  const openAdd = () => { setForm(emptyCiterne()); setModal({ open: true }); };
  const openEdit = (idx: number) => { setForm({ ...data[idx] }); setModal({ open: true, index: idx }); };
  const saveForm = () => {
    if (!form.date.trim() && !form.numBon.trim()) return;
    if (modal.index !== undefined) update(modal.index, form);
    else add(form);
    setModal({ open: false });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const items = await parseCiterneExcel(file);
      if (items.length > 0) { importData(items); alert(`${items.length} entrées importées !`); }
      else alert("Aucune donnée trouvée.");
    } catch { alert("Erreur lecture fichier."); }
    e.target.value = "";
  };

  const numVal = (v: string) => Math.max(0, Number(v) || 0);
  const setF = (key: keyof CiterneEntry, val: any) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className={`font-display text-lg font-bold uppercase tracking-wide ${colorClass}`}>{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Entrées / Sorties détaillées</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:bg-accent-dark transition-colors">
            <Upload className="w-3.5 h-3.5" /> Importer
          </button>
          <button onClick={() => exportCiterneExcel(data, title.replace(/\s/g, "_"))} className="flex items-center gap-1.5 px-3 py-1.5 bg-mining-success text-white rounded-lg text-xs font-semibold hover:opacity-90">
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
          <button onClick={() => { if (confirm("Réinitialiser ?")) reset(); }} className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/70">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Search + KPI */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
            placeholder="Filtrer par date, code, immatriculation..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
        </div>
        <div className={`${bgClass} rounded-lg px-4 py-2 flex items-center gap-3`}>
          <span className="text-xs text-muted-foreground">{filtered.length} entrées</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-mining-success font-semibold">Entrée: {totalEntree.toLocaleString("fr-FR")} L</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className={`font-display font-bold text-sm ${colorClass}`}>Sortie: {totalSortie.toLocaleString("fr-FR")} L</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              {/* Group header row matching Excel */}
              <tr className="bg-primary/10 border-b border-border">
                <th className="px-3 py-1.5" rowSpan={1}></th>
                <th className="px-3 py-1.5 font-display font-bold text-mining-success uppercase tracking-wider text-center border-l border-border" colSpan={2}>ENTRÉE</th>
                <th className="px-3 py-1.5 font-display font-bold text-primary uppercase tracking-wider text-center border-l border-border" colSpan={7}>SORTIES</th>
                <th className="px-3 py-1.5 font-display font-bold text-muted-foreground uppercase tracking-wider text-center border-l border-border" colSpan={2}>SÉRIE</th>
                <th className="px-3 py-1.5" rowSpan={1}></th>
              </tr>
              {/* Column header row */}
              <tr className="bg-primary/5 border-b border-border">
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-left whitespace-nowrap">Date</th>
                <th className="px-3 py-2.5 font-display font-semibold text-mining-success uppercase tracking-wide text-center whitespace-nowrap border-l border-border">Qte</th>
                <th className="px-3 py-2.5 font-display font-semibold text-mining-success uppercase tracking-wide text-center whitespace-nowrap">Fournisseur</th>
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center whitespace-nowrap border-l border-border">N° Bon</th>
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center whitespace-nowrap">Heure</th>
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center whitespace-nowrap">Code</th>
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center whitespace-nowrap">Immatriculation</th>
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center whitespace-nowrap">Km</th>
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center whitespace-nowrap">Qte</th>
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center whitespace-nowrap">Remarque</th>
                <th className="px-3 py-2.5 font-display font-semibold text-muted-foreground uppercase tracking-wide text-center whitespace-nowrap border-l border-border">Départ</th>
                <th className="px-3 py-2.5 font-display font-semibold text-muted-foreground uppercase tracking-wide text-center whitespace-nowrap">Fin</th>
                <th className="px-3 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-center whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucune donnée</td></tr>
              ) : filtered.map((row, idx) => {
                const realIdx = data.indexOf(row);
                return (
                  <tr key={idx} className={`border-b border-border/60 hover:bg-primary/5 transition-colors ${idx % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                    <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{row.date}</td>
                    <td className="px-3 py-2 text-center border-l border-border/40">{row.qteEntree > 0 ? <span className="text-mining-success font-semibold">{row.qteEntree.toLocaleString("fr-FR")}</span> : ""}</td>
                    <td className="px-3 py-2 text-center">{row.fournisseur}</td>
                    <td className="px-3 py-2 text-center font-mono border-l border-border/40">{row.numBon}</td>
                    <td className="px-3 py-2 text-center">{row.heure}</td>
                    <td className="px-3 py-2 text-center font-semibold">{row.code}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{row.immatriculation}</td>
                    <td className="px-3 py-2 text-center">{row.kilometrage > 0 ? row.kilometrage.toLocaleString("fr-FR") : ""}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${colorClass}`}>{row.qteSortie.toLocaleString("fr-FR")}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{row.remarque}</td>
                    <td className="px-3 py-2 text-center font-mono text-muted-foreground border-l border-border/40">{row.serieDepart > 0 ? row.serieDepart : ""}</td>
                    <td className="px-3 py-2 text-center font-mono text-muted-foreground">{row.serieFin > 0 ? row.serieFin : ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(realIdx)} className="p-1 rounded hover:bg-primary/10 text-primary"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => setConfirmDel(realIdx)} className="p-1 rounded hover:bg-mining-danger/10 text-mining-danger"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-10">
              <tr className="bg-primary text-primary-foreground font-bold">
                <td className="px-3 py-2.5 font-display uppercase">TOTAL</td>
                <td className="px-3 py-2.5 text-center font-display border-l border-primary-foreground/20">{totalEntree > 0 ? totalEntree.toLocaleString("fr-FR") + " L" : ""}</td>
                <td className="px-3 py-2.5" colSpan={6}></td>
                <td className="px-3 py-2.5 text-center font-display">{totalSortie.toLocaleString("fr-FR")} L</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card rounded-2xl shadow-mining w-full max-w-lg mx-4 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-display text-lg font-bold uppercase ${colorClass}`}>
                {modal.index !== undefined ? "Modifier" : "Ajouter"} — {title}
              </h3>
              <button onClick={() => setModal({ open: false })}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "date" as const, label: "Date", placeholder: "JJ/MM/AAAA" },
                { key: "heure" as const, label: "Heure", placeholder: "HH:MM" },
                { key: "numBon" as const, label: "N° de Bon", placeholder: "" },
                { key: "code" as const, label: "Code", placeholder: "" },
                { key: "immatriculation" as const, label: "Immatriculation", placeholder: "" },
                { key: "fournisseur" as const, label: "Fournisseur", placeholder: "" },
              ]).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</label>
                  <input type="text" placeholder={placeholder}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                    value={form[key]} onChange={e => setF(key, e.target.value)}
                  />
                </div>
              ))}
              {([
                { key: "qteEntree" as const, label: "Qté Entrée (L)" },
                { key: "qteSortie" as const, label: "Qté Sortie (L)" },
                { key: "kilometrage" as const, label: "Kilométrage" },
                { key: "serieDepart" as const, label: "Série Départ" },
                { key: "serieFin" as const, label: "Série Fin" },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</label>
                  <input type="number" min="0"
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                    value={form[key]} onChange={e => setF(key, numVal(e.target.value))}
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Remarque</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.remarque} onChange={e => setF("remarque", e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal({ open: false })} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">Annuler</button>
              <button onClick={saveForm} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-dark transition-colors">
                {modal.index !== undefined ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDel !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-mining p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg font-bold text-mining-danger">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground mt-2">Supprimer l'entrée {data[confirmDel]?.code} du {data[confirmDel]?.date} ?</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">Annuler</button>
              <button onClick={() => { remove(confirmDel); setConfirmDel(null); }} className="flex-1 py-2 rounded-lg bg-mining-danger text-white text-sm font-semibold">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CiterneSection;
