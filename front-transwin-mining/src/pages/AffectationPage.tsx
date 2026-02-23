import { useState, useMemo, useRef } from "react";
import { Truck, Wrench, Users, Calendar, Plus, Pencil, Trash2, Upload, Download, Search, X, RotateCcw } from "lucide-react";
import { TruckAssignment } from "@/data/parkData";
import { useAffectationData } from "@/hooks/useLocalData";
import { parseAffectationExcel, exportAffectationExcel } from "@/lib/excelUtils";
import { assignmentDate, site } from "@/data/parkData";

// ============================================================
// MODAL FORMULAIRE
// ============================================================
interface FormModalProps {
  initial?: TruckAssignment;
  onSave: (item: TruckAssignment) => void;
  onClose: () => void;
}
const FormModal = ({ initial, onSave, onClose }: FormModalProps) => {
  const [form, setForm] = useState<TruckAssignment>(
    initial || { equipe1: "", camion: "", equipe2: "", type: "camion" }
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-mining w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-primary uppercase">
            {initial ? "Modifier" : "Ajouter"} une ligne
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-body uppercase tracking-wide">Type</label>
            <div className="flex gap-2 mt-1">
              {(["camion", "engin"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold font-body capitalize transition-all ${
                    form.type === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-body uppercase tracking-wide">
              {form.type === "camion" ? "Camion / Code" : "Engin / Code"}
            </label>
            <input
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
              value={form.camion}
              onChange={e => setForm(f => ({ ...f, camion: e.target.value }))}
              placeholder="ex: D183"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-body uppercase tracking-wide">Équipe 1 (1er Shift)</label>
            <input
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
              value={form.equipe1}
              onChange={e => setForm(f => ({ ...f, equipe1: e.target.value.toUpperCase() }))}
              placeholder="NOM PRÉNOM"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-body uppercase tracking-wide">Équipe 2 (2ème Shift)</label>
            <input
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
              value={form.equipe2}
              onChange={e => setForm(f => ({ ...f, equipe2: e.target.value.toUpperCase() }))}
              placeholder="NOM PRÉNOM"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-body hover:bg-muted/70">Annuler</button>
          <button
            onClick={() => { if (form.camion.trim()) { onSave(form); onClose(); } }}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold font-body hover:bg-primary-dark transition-colors"
          >
            {initial ? "Modifier" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PAGE PRINCIPALE
// ============================================================
const AffectationPage = () => {
  const { data, add, update, remove, importData, reset } = useAffectationData();
  const [modal, setModal] = useState<{ open: boolean; index?: number }>({ open: false });
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "camion" | "engin">("all");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let d = data;
    if (filterType !== "all") d = d.filter(r => r.type === filterType);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      d = d.filter(r =>
        r.camion.toUpperCase().includes(q) ||
        r.equipe1.toUpperCase().includes(q) ||
        r.equipe2.toUpperCase().includes(q)
      );
    }
    return d;
  }, [data, search, filterType]);

  const camions = filtered.filter(d => d.type === "camion");
  const engins = filtered.filter(d => d.type === "engin");

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const items = await parseAffectationExcel(file);
      if (items.length > 0) { importData(items); alert(`${items.length} lignes importées avec succès !`); }
      else alert("Aucune donnée trouvée dans le fichier.");
    } catch { alert("Erreur lors de la lecture du fichier Excel."); }
    e.target.value = "";
  };

  const editingItem = modal.index !== undefined ? data[modal.index] : undefined;
  // find original index in data array for filtered items
  const getDataIndex = (item: TruckAssignment) => data.findIndex(d => d === item);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-mining">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-primary uppercase tracking-wide">
              Liste d'Affectation — {site}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              <span>Du {assignmentDate}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal({ open: true })}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors shadow-accent"
            >
              <Upload className="w-4 h-4" /> Importer Excel
            </button>
            <button
              onClick={() => exportAffectationExcel(data)}
              className="flex items-center gap-1.5 px-3 py-2 bg-mining-success text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" /> Exporter
            </button>
            <button
              onClick={() => { if (confirm("Réinitialiser toutes les données ?")) reset(); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/70 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
              placeholder="Rechercher par code, nom chauffeur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
          <div className="flex gap-1">
            {(["all", "camion", "engin"] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                  filterType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
                }`}
              >
                {t === "all" ? "Tous" : t === "camion" ? "Camions" : "Engins"}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="bg-primary/10 rounded-lg px-4 py-2 text-center">
              <div className="font-display text-xl font-bold text-primary">{camions.length}</div>
              <div className="text-xs text-muted-foreground font-body">Camions</div>
            </div>
            <div className="bg-accent/10 rounded-lg px-4 py-2 text-center">
              <div className="font-display text-xl font-bold text-accent">{engins.length}</div>
              <div className="text-xs text-muted-foreground font-body">Engins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Camions Table */}
      {(filterType === "all" || filterType === "camion") && (
        <TableSection
          title="Camions — Chauffeurs"
          icon={<Truck className="w-5 h-5 text-accent" />}
          rows={camions}
          onEdit={(item) => setModal({ open: true, index: getDataIndex(item) })}
          onDelete={(item) => setConfirmDelete(getDataIndex(item))}
          codeLabel="Camion / Code"
          col1="Équipe 1 (1er Shift)"
          col2="Équipe 2 (2ème Shift)"
          codeColor="bg-primary text-primary-foreground"
          hoverColor="hover:bg-primary/5"
        />
      )}

      {/* Engins Table */}
      {(filterType === "all" || filterType === "engin") && (
        <TableSection
          title="Engins — Conducteurs"
          icon={<Wrench className="w-5 h-5 text-accent" />}
          rows={engins}
          onEdit={(item) => setModal({ open: true, index: getDataIndex(item) })}
          onDelete={(item) => setConfirmDelete(getDataIndex(item))}
          codeLabel="Engin / Code"
          col1="Conducteur 1 (1er Shift)"
          col2="Conducteur 2 (2ème Shift)"
          codeColor="bg-accent text-accent-foreground"
          hoverColor="hover:bg-accent/5"
        />
      )}

      {/* Modal */}
      {modal.open && (
        <FormModal
          initial={editingItem}
          onSave={(item) => {
            if (modal.index !== undefined) update(modal.index, item);
            else add(item);
          }}
          onClose={() => setModal({ open: false })}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-mining p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg font-bold text-mining-danger">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground mt-2">Cette action est irréversible. Voulez-vous supprimer cette ligne ?</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">Annuler</button>
              <button
                onClick={() => { remove(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 py-2 rounded-lg bg-mining-danger text-white text-sm font-semibold"
              >Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPOSANT TABLE RÉUTILISABLE
// ============================================================
interface TableSectionProps {
  title: string;
  icon: React.ReactNode;
  rows: TruckAssignment[];
  onEdit: (item: TruckAssignment) => void;
  onDelete: (item: TruckAssignment) => void;
  codeLabel: string;
  col1: string;
  col2: string;
  codeColor: string;
  hoverColor: string;
}
const TableSection = ({ title, icon, rows, onEdit, onDelete, codeLabel, col1, col2, codeColor, hoverColor }: TableSectionProps) => (
  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-mining">
    <div className="gradient-header px-5 py-3 flex items-center gap-2">
      {icon}
      <h3 className="font-display text-lg font-semibold text-primary-foreground uppercase tracking-wide">{title}</h3>
      <span className="ml-auto bg-accent/20 text-accent-foreground text-xs font-medium px-2.5 py-1 rounded-full">
        {rows.length} unités
      </span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary/5 border-b border-border">
            <th className="text-left px-4 py-3 font-display font-semibold text-primary uppercase tracking-wide text-xs">
              <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{col1}</div>
            </th>
            <th className="text-center px-4 py-3 font-display font-semibold text-accent uppercase tracking-wide text-xs">{codeLabel}</th>
            <th className="text-right px-4 py-3 font-display font-semibold text-primary uppercase tracking-wide text-xs">
              <div className="flex items-center justify-end gap-1.5">{col2}<Users className="w-3.5 h-3.5" /></div>
            </th>
            <th className="px-4 py-3 text-center text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucune donnée trouvée</td></tr>
          ) : rows.map((row, idx) => (
            <tr key={idx} className={`border-b border-border/60 transition-colors ${hoverColor} ${idx % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
              <td className="px-4 py-2.5 font-body font-medium text-foreground">
                {row.equipe1 || <span className="text-muted-foreground italic text-xs">—</span>}
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className={`inline-flex items-center justify-center ${codeColor} font-display font-bold text-sm px-3 py-1 rounded-lg min-w-[70px]`}>
                  {row.camion}
                </span>
              </td>
              <td className="px-4 py-2.5 font-body font-medium text-foreground text-right">
                {row.equipe2 || <span className="text-muted-foreground italic text-xs">—</span>}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(row)} className="p-1.5 rounded-lg hover:bg-mining-danger/10 text-mining-danger transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default AffectationPage;
