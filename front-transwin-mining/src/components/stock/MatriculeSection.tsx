// Section Matricule — Registre des véhicules
import { useState, useMemo, useRef } from "react";
import { MatriculeEntry } from "@/data/stockTypes";
import { parseMatriculeExcel, exportMatriculeExcel } from "@/lib/stockExcelUtils";
import { Plus, Pencil, Trash2, Upload, Download, Search, X, RotateCcw } from "lucide-react";

interface Props {
  data: MatriculeEntry[];
  add: (item: MatriculeEntry) => void;
  update: (index: number, item: MatriculeEntry) => void;
  remove: (index: number) => void;
  importData: (items: MatriculeEntry[]) => void;
  reset: () => void;
}

const MatriculeSection = ({ data, add, update, remove, importData, reset }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; index?: number }>({ open: false });
  const [form, setForm] = useState<MatriculeEntry>({ code: "", matricule: "", type: "" });
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(r => r.code.toLowerCase().includes(q) || r.matricule.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  }, [data, search]);

  const openAdd = () => { setForm({ code: "", matricule: "", type: "" }); setModal({ open: true }); };
  const openEdit = (idx: number) => { setForm({ ...data[idx] }); setModal({ open: true, index: idx }); };
  const saveForm = () => {
    if (!form.code.trim()) return;
    if (modal.index !== undefined) update(modal.index, form);
    else add(form);
    setModal({ open: false });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const items = await parseMatriculeExcel(file);
      if (items.length > 0) { importData(items); alert(`${items.length} entrées importées !`); }
      else alert("Aucune donnée trouvée.");
    } catch { alert("Erreur lecture fichier."); }
    e.target.value = "";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-primary uppercase tracking-wide">Matricule — Registre Véhicules</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{data.length} véhicules enregistrés</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary-dark"><Plus className="w-3.5 h-3.5" /> Ajouter</button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:bg-accent-dark"><Upload className="w-3.5 h-3.5" /> Importer</button>
          <button onClick={() => exportMatriculeExcel(data)} className="flex items-center gap-1.5 px-3 py-1.5 bg-mining-success text-white rounded-lg text-xs font-semibold hover:opacity-90"><Download className="w-3.5 h-3.5" /> Exporter</button>
          <button onClick={() => { if (confirm("Réinitialiser ?")) reset(); }} className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/70"><RotateCcw className="w-3.5 h-3.5" /></button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="w-full pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
          placeholder="Filtrer par code, matricule, type..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-primary/5 border-b border-border">
                {["Code", "Matricule", "Type", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 font-display font-semibold text-primary uppercase tracking-wide text-xs text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucune donnée</td></tr>
              ) : filtered.map((row, idx) => {
                const realIdx = data.indexOf(row);
                return (
                  <tr key={idx} className={`border-b border-border/60 hover:bg-primary/5 ${idx % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                    <td className="px-4 py-2 font-semibold text-foreground">{row.code}</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">{row.matricule}</td>
                    <td className="px-4 py-2">
                      {row.type ? <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded">{row.type}</span> : ""}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(realIdx)} className="p-1 rounded hover:bg-primary/10 text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDel(realIdx)} className="p-1 rounded hover:bg-mining-danger/10 text-mining-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card rounded-2xl shadow-mining w-full max-w-sm mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-primary uppercase">{modal.index !== undefined ? "Modifier" : "Ajouter"}</h3>
              <button onClick={() => setModal({ open: false })}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground uppercase">Code</label><input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground uppercase">Matricule</label><input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none" value={form.matricule} onChange={e => setForm(f => ({ ...f, matricule: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground uppercase">Type</label><input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Camion, Citerne, Engin..." value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal({ open: false })} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">Annuler</button>
              <button onClick={saveForm} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">{modal.index !== undefined ? "Modifier" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-mining p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg font-bold text-mining-danger">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground mt-2">Supprimer {data[confirmDel]?.code} ?</p>
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

export default MatriculeSection;
