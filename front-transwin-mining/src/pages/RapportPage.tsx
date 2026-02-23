// pages/RapportPage.tsx — v4 INLINE EDIT
// UX: clic sur cellule = edit inline, bouton X = suppression directe, bouton + = ajout

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Printer, Download, FileImage, ChevronLeft, ChevronRight,
  Calendar, FileSpreadsheet, Pencil, Eye, Plus,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

import { useAffectationData }                                        from "@/hooks/useLocalData";
import { useBeng1Data, useBeng2Data, use81669Data, buildGlobalData } from "@/hooks/useStockSections";
import { reportSite, reportDate, consommationChauffeurs, consommationEngins } from "@/data/stockData";

// ─── TYPES ────────────────────────────────────────────────────────

interface ChRow { id: string; equipe1: string; equipe2: string; code: string; litres: number; pct: number; activite: string; }
interface EnRow { id: string; equipe1: string; equipe2: string; engin: string; litres: number; pct: number; heure: string; aff: string; }
interface DateData { ch: ChRow[]; en: EnRow[]; }

// ─── PERSISTANCE ──────────────────────────────────────────────────

const STORE_KEY = "rapport_v4_store";
const loadStore = (): Record<string, DateData> => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; } };
const saveStore = (s: Record<string, DateData>) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} };

// ─── HELPERS ──────────────────────────────────────────────────────

const parseDateTs = (d: string) => { const [dd,mm,yyyy] = d.split("/"); return new Date(+yyyy,+mm-1,+dd).getTime(); };
const todayStr = () => { const n = new Date(); return `${String(n.getDate()).padStart(2,"0")}/${String(n.getMonth()+1).padStart(2,"0")}/${n.getFullYear()}`; };
const normalizeCode = (c: string) => String(c).trim().toUpperCase();
const extractEnginKey = (label: string) => { const m = label.toUpperCase().match(/\bE(\d+)\b/); return m ? `E${m[1]}` : null; };
const pctBg = (p: number): string | undefined => p > 85 ? "#ff6b6b" : p >= 60 ? "#74b9ff" : undefined;

const TH_BLUE: React.CSSProperties = { backgroundColor: "#2c5282", color: "#fff", padding: "7px 8px", textAlign: "center", border: "1px solid #a0aec0", fontSize: "12px", fontWeight: "bold" };
const TH_DARK: React.CSSProperties = { backgroundColor: "#1e3a5f", color: "#fff", padding: "6px 8px", textAlign: "center", border: "1px solid #a0aec0", fontSize: "11px", fontWeight: "bold" };
const TD = (extra?: React.CSSProperties): React.CSSProperties => ({ padding: "5px 8px", border: "1px solid #e2e8f0", fontSize: "11px", verticalAlign: "middle", ...extra });

const ACTIVITES   = ["PHOSPHATE","STERILE","PHOSPHATE/STERILE","DECHARGE/STERILE","PISTE/STERILE"];
const AFF_OPTIONS = ["PHOSPHATE","STERILE","STERILE/PHOSPHATE","DECHARGE/STERILE","PISTE/STERILE"];

// ─── CELLULE ÉDITABLE INLINE ──────────────────────────────────────

interface CellProps {
  value: string | number;
  onSave: (v: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  canEdit: boolean;
  type?: "text" | "number" | "select";
  options?: string[];
  style?: React.CSSProperties;
  placeholder?: string;
}

const Cell = ({ value, onSave, isEditing, onStartEdit, onEndEdit, canEdit, type="text", options=[], style, placeholder }: CellProps) => {
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(String(value ?? ""));
      setTimeout(() => { inputRef.current?.focus(); selectRef.current?.focus(); }, 20);
    }
  }, [isEditing]); // eslint-disable-line

  const commit = () => { onSave(draft); onEndEdit(); };

  if (isEditing) {
    if (type === "select") return (
      <td style={{ ...TD(style), padding: "2px 3px" }}>
        <select ref={selectRef} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
          style={{ width: "100%", fontSize: "11px", padding: "3px 4px", border: "2px solid #3b82f6", borderRadius: "4px", background: "#fff", outline: "none" }}>
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </td>
    );
    return (
      <td style={{ ...TD(style), padding: "2px 3px" }}>
        <input ref={inputRef} type={type} value={draft} placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") onEndEdit(); }}
          style={{ width: "100%", fontSize: "11px", padding: "3px 6px", border: "2px solid #3b82f6", borderRadius: "4px", background: "#fff", outline: "none" }} />
      </td>
    );
  }

  // Noms de personnes (equipe1/equipe2) → cellule vide si pas de valeur
  const isNameField = placeholder?.toLowerCase().includes("nom") ||
    placeholder?.toLowerCase().includes("équipe") ||
    placeholder?.toLowerCase().includes("equipe") ||
    placeholder?.toLowerCase().includes("conducteur");

  return (
    <td style={{ ...TD(style), cursor: canEdit ? "pointer" : "default", position: "relative" }}
      onClick={() => canEdit && onStartEdit()}
      title={canEdit ? "Cliquer pour modifier" : undefined}>
      {canEdit && <span style={{ position: "absolute", top: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "#3b82f6", opacity: 0.45, pointerEvents: "none" }} />}
      <span style={{ display: "block" }}>
        {(value === "" || value === 0)
          ? (isNameField
              ? (canEdit
                  ? <span style={{ color: "#ccc", fontSize: "10px" }}>{placeholder}</span>  // visible seulement en mode édition
                  : null)  // cellule vraiment vide en mode lecture
              : (canEdit
                  ? <span style={{ color: "#ccc" }}>{placeholder || "—"}</span>
                  : <span style={{ color: "#bbb" }}>—</span>))
          : String(value)}
      </span>
    </td>
  );
};

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────

const RapportPage = () => {
  const affectation = useAffectationData();
  const beng1  = useBeng1Data();
  const beng2  = useBeng2Data();
  const c81669 = use81669Data();

  const globalData = useMemo(() => buildGlobalData(beng1.data, beng2.data, c81669.data), [beng1.data, beng2.data, c81669.data]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    // Toujours inclure la date de référence du rapport Excel
    set.add(reportDate);
    globalData.forEach(g => { if (g.date) set.add(g.date); });
    [...beng1.data, ...beng2.data, ...c81669.data].forEach(e => { if (e.date) set.add(e.date); });
    return Array.from(set).sort((a, b) => parseDateTs(a) - parseDateTs(b));
  }, [globalData, beng1.data, beng2.data, c81669.data]);

  const [currentDate,  setCurrentDate] = useState<string>(reportDate);
  const [showEdit,     setShowEdit]    = useState(false);
  const [editingCell,  setEditingCell] = useState<string | null>(null);
  const [store,        setStore]       = useState<Record<string, DateData>>(loadStore);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(currentDate))
      setCurrentDate(availableDates[availableDates.length - 1]);
  }, [availableDates]); // eslint-disable-line

  const ci    = availableDates.indexOf(currentDate);
  const prevD = ci > 0 ? availableDates[ci - 1] : null;
  const nextD = ci < availableDates.length - 1 ? availableDates[ci + 1] : null;

  // Calcul des lignes par défaut depuis affectation + citernes
  const defaultData = useMemo((): DateData => {

    // ── Si c'est la date de référence du rapport Excel → utiliser les vraies données ──
    if (currentDate === reportDate) {
      const ch: ChRow[] = consommationChauffeurs.map((c, i) => ({
        id: `ref_ch_${i}_${c.code}`,
        equipe1: c.equipe1,
        equipe2: c.equipe2,
        code: c.code,
        litres: c.litres,
        pct: c.pourcentage,
        activite: c.activite,
      }));
      const en: EnRow[] = consommationEngins.map((e, i) => ({
        id: `ref_en_${i}_${e.engin}`,
        equipe1: e.equipe1,
        equipe2: e.equipe2,
        engin: e.engin,
        litres: e.litres,
        pct: e.pourcentage,
        heure: e.heure === "-" ? "" : e.heure,
        aff: e.affectation,
      }));
      return { ch, en };
    }

    // ── Autres dates : calculer depuis citernes + affectations ────────────────────────
    const dayGlobal = globalData.filter(g => g.date === currentDate);

    // ── Clé de correspondance universelle ────────────────────────
    // Extrait tous les nombres du code et les concatène → clé unique stable
    // Exemples :
    //   "350 E71"       → "35071"
    //   "480 E49"       → "48049"
    //   "CH 966 E48"    → "96648"
    //   "CH 760 E22"    → "76022"
    //   "NIVELEUSE E50" → "50"
    //   "E71"           → "71"
    //   "E48"           → "48"
    // Règle: si le code contient "E" suivi d'un numéro, le numéro E est la clé principale
    function enginNumKey(code: string): string {
      const s = String(code).trim().toUpperCase();
      // Priorité 1 : numéro après E (ex: E48 → "48", 480 E49 → "49")
      const eMatch = s.match(/E(\d+)/);
      if (eMatch) return eMatch[1];
      // Priorité 2 : tous les chiffres concaténés
      const nums = s.match(/\d+/g);
      return nums ? nums.join("") : s;
    }

    // Indexer globalData par clé numérique
    const litresMap   = new Map<string, number>();
    const consoMap    = new Map<string, number>();
    const parcoursMap = new Map<string, number>();

    for (const g of dayGlobal) {
      const k = enginNumKey(String(g.code));
      litresMap.set(k,   (litresMap.get(k)   ?? 0) + g.litres);
      parcoursMap.set(k, (parcoursMap.get(k) ?? 0) + g.parcours);
      if (g.consommation > 0) consoMap.set(k, g.consommation);
    }

    // Lookup par clé numérique
    function findByKey(map: Map<string, number>, camion: string): number {
      return map.get(enginNumKey(camion)) ?? 0;
    }

    // ── Camions ──────────────────────────────────────────────────
    // Pour les camions (codes D...) on garde le normalizeCode exact
    const camionLitresMap   = new Map<string, number>();
    const camionConsoMap    = new Map<string, number>();
    for (const g of dayGlobal) {
      const k = normalizeCode(String(g.code));
      camionLitresMap.set(k, (camionLitresMap.get(k) ?? 0) + g.litres);
      if (g.consommation > 0) camionConsoMap.set(k, g.consommation);
    }

    const ch: ChRow[] = affectation.data.filter(a => a.type === "camion").map(a => ({
      id: `aff_ch_${a.camion}`, equipe1: a.equipe1, equipe2: a.equipe2, code: a.camion,
      litres: camionLitresMap.get(normalizeCode(a.camion)) ?? 0,
      pct: (camionConsoMap.get(normalizeCode(a.camion)) ?? 0) * 100, activite: "",
    }));

    // ── Engins ───────────────────────────────────────────────────
    const en: EnRow[] = affectation.data.filter(a => a.type === "engin").map(a => {
      const litres   = findByKey(litresMap,   a.camion);
      const conso    = findByKey(consoMap,    a.camion);
      const parcours = findByKey(parcoursMap, a.camion);
      // Heure = parcours de l'engin (en heures de fonctionnement)
      // Formule validée sur Excel : heure = round(litres / pct) = parcours
      // car pct = litres/parcours → parcours = litres/pct
      const heureVal = parcours > 0
        ? `${Math.round(parcours)}H`
        : (litres > 0 && conso > 0)
          ? `${Math.round(litres / (conso * 100))}H`
          : "";
      return {
        id: `aff_en_${a.camion}`, equipe1: a.equipe1, equipe2: a.equipe2, engin: a.camion,
        litres,
        pct: conso * 100,
        heure: heureVal,
        aff: "",
      };
    });
    return { ch, en };
  }, [globalData, affectation.data, currentDate]);

  // Données finales: fusionner store + defaultData
  // - si store existe: garder les champs saisis manuellement (aff, equipe1, equipe2)
  //   MAIS mettre à jour les champs calculés (litres, pct, heure) depuis defaultData
  // - si store n'existe pas: utiliser defaultData directement
  const dateData: DateData = useMemo(() => {
    const stored = store[currentDate];
    if (!stored) return defaultData;

    // Fusionner : pour chaque ligne du default, chercher la ligne correspondante dans store
    const mergeRows = <T extends { id: string }>(
      defaultRows: T[],
      storedRows: T[],
      calcFields: (keyof T)[]
    ): T[] => {
      return defaultRows.map(defRow => {
        const stRow = storedRows.find(r => r.id === defRow.id);
        if (!stRow) return defRow; // nouvelle ligne → tout depuis default
        // Garder les champs manuels du store, mais écraser les champs calculés
        const merged = { ...stRow };
        for (const field of calcFields) {
          (merged as Record<string, unknown>)[field as string] =
            (defRow as Record<string, unknown>)[field as string];
        }
        return merged;
      });
    };

    return {
      ch: mergeRows(defaultData.ch, stored.ch, ["litres", "pct"] as (keyof ChRow)[]),
      en: mergeRows(defaultData.en, stored.en, ["litres", "pct", "heure"] as (keyof EnRow)[]),
    };
  }, [store, currentDate, defaultData]);
  const chRows = dateData.ch;
  const enRows = dateData.en;

  const totalCh    = chRows.reduce((s, r) => s + (r.litres || 0), 0);
  const totalEn    = enRows.reduce((s, r) => s + (r.litres || 0), 0);
  const grandTotal = totalCh + totalEn;
  const printCh    = chRows.filter(r => r.litres > 0);
  const printEn    = enRows.filter(r => r.litres > 0);

  const persist = (next: Record<string, DateData>) => { setStore(next); saveStore(next); };

  const ensureStored = (): DateData => {
    // Toujours utiliser dateData (version fusionnée avec calculs à jour)
    if (!store[currentDate]) {
      const next = { ...store, [currentDate]: dateData };
      persist(next);
    }
    return dateData;
  };

  const updateCell = (section: "ch"|"en", rowId: string, field: string, rawVal: string) => {
    const base = ensureStored();
    const isNum = ["litres","pct"].includes(field);
    const val: string | number = isNum ? (parseFloat(rawVal) || 0) : rawVal;
    if (section === "ch") {
      persist({ ...store, [currentDate]: { ...base, ch: base.ch.map(r => r.id===rowId ? {...r,[field]:val} : r) } });
    } else {
      persist({ ...store, [currentDate]: { ...base, en: base.en.map(r => r.id===rowId ? {...r,[field]:val} : r) } });
    }
  };

  const deleteRow = (section: "ch"|"en", rowId: string) => {
    setEditingCell(null);
    const base = ensureStored();
    if (section === "ch") persist({ ...store, [currentDate]: { ...base, ch: base.ch.filter(r => r.id!==rowId) } });
    else persist({ ...store, [currentDate]: { ...base, en: base.en.filter(r => r.id!==rowId) } });
  };

  const addChRow = () => {
    const base = ensureStored();
    persist({ ...store, [currentDate]: { ...base, ch: [...base.ch, { id:`man_ch_${Date.now()}`, equipe1:"", equipe2:"", code:"", litres:0, pct:0, activite:"" }] } });
  };

  const addEnRow = () => {
    const base = ensureStored();
    persist({ ...store, [currentDate]: { ...base, en: [...base.en, { id:`man_en_${Date.now()}`, equipe1:"", equipe2:"", engin:"", litres:0, pct:0, heure:"", aff:"" }] } });
  };

  const resetDate = () => { const next={...store}; delete next[currentDate]; persist(next); setEditingCell(null); };

  const isEditing = (rowId: string, field: string) => editingCell === `${rowId}:${field}`;
  const startEdit = (rowId: string, field: string) => { if (!showEdit) return; ensureStored(); setEditingCell(`${rowId}:${field}`); };
  const endEdit   = () => setEditingCell(null);
  const toggleEdit= () => { if (!showEdit) ensureStored(); setShowEdit(p=>!p); setEditingCell(null); };

  const doExportImage = async () => {
    if (!reportRef.current) return;
    const prev = showEdit; setShowEdit(false); await new Promise(r=>setTimeout(r,120));
    const canvas = await html2canvas(reportRef.current,{scale:2,backgroundColor:"#fff"});
    setShowEdit(prev);
    const a = document.createElement("a"); a.download=`Rapport_${currentDate.replace(/\//g,"-")}.png`; a.href=canvas.toDataURL("image/png"); a.click();
  };

  const doExportPDF = async () => {
    if (!reportRef.current) return;
    const prev = showEdit; setShowEdit(false); await new Promise(r=>setTimeout(r,120));
    const canvas = await html2canvas(reportRef.current,{scale:2,backgroundColor:"#fff"});
    setShowEdit(prev);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
    const ih=(canvas.height*pw)/canvas.width;
    pdf.addImage(img,"PNG",0,ih>ph?0:(ph-ih)/2,pw,Math.min(ih,ph));
    pdf.save(`Rapport_${currentDate.replace(/\//g,"-")}.pdf`);
  };

  const doExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows: unknown[][] = [
      [`CONSOMMATION JOURNALIERE ${currentDate} DE GASOIL -${reportSite}-`],[],
      ["Equipe 1","Equipe 2","Code","Litres","%","Activité"],
      ...chRows.filter(r=>r.litres>0).map(r=>[r.equipe1,r.equipe2,r.code,r.litres,r.pct>0?`${r.pct.toFixed(2)}%`:"-",r.activite]),
      ["TOTAL","","",totalCh,"",""],[],
      ["Equipe 1","Equipe 2","Engins","Litres","%","Heure","Affectation"],
      ...enRows.filter(r=>r.litres>0).map(r=>[r.equipe1,r.equipe2,r.engin,r.litres,r.pct>0?`${r.pct.toFixed(2)}%`:"-",r.heure,r.aff]),
      ["TOTAL","","",totalEn,"","",""],[],["GRAND TOTAL","","",grandTotal,"","",""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [28,28,14,8,10,8,22].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb,ws,"Rapport");
    XLSX.writeFile(wb,`Rapport_${currentDate.replace(/\//g,"-")}.xlsx`);
  };

  const displayCh = showEdit ? chRows : printCh;
  const displayEn = showEdit ? enRows : printEn;

  // Bouton X réutilisable
  const DelBtn = ({ section, rowId }: { section: "ch"|"en"; rowId: string }) => (
    <td style={TD({ textAlign:"center", padding:"2px", backgroundColor:"#fef2f2" })}>
      <button onClick={() => deleteRow(section, rowId)}
        style={{ width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",margin:"auto",background:"#ef4444",color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontSize:14,fontWeight:"bold" }}>
        ✕
      </button>
    </td>
  );

  return (
    <div className="space-y-4 animate-fade-in">

      {/* BARRE CONTRÔLE */}
      <div className="no-print bg-card border border-border rounded-xl p-4 shadow-mining">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-xl font-bold text-primary uppercase tracking-wide">Rapport Journalier — Consommation Gasoil</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{reportSite} — {availableDates.length} date(s) disponible(s)</p>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <button onClick={() => prevD && setCurrentDate(prevD)} disabled={!prevD} className="p-1.5 rounded-lg hover:bg-primary/10 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4 text-primary" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg min-w-[155px] justify-center">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <select value={currentDate} onChange={e=>{setCurrentDate(e.target.value);setEditingCell(null);}}
                  className="font-display font-bold text-primary bg-transparent border-none outline-none text-sm cursor-pointer">
                  {!availableDates.includes(currentDate) && <option value={currentDate}>{currentDate}</option>}
                  {availableDates.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button onClick={() => nextD && setCurrentDate(nextD)} disabled={!nextD} className="p-1.5 rounded-lg hover:bg-primary/10 disabled:opacity-30">
                <ChevronRight className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={toggleEdit}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${showEdit ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}>
              {showEdit ? <><Eye className="w-4 h-4"/>Vue lecture</> : <><Pencil className="w-4 h-4"/>Éditer</>}
            </button>
            {showEdit && store[currentDate] && (
              <button onClick={resetDate} className="flex items-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200" title="Revenir aux données calculées">
                ↺ Réinitialiser
              </button>
            )}
            <button onClick={doExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90"><FileSpreadsheet className="w-4 h-4"/>Excel</button>
            <button onClick={doExportImage} className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90"><FileImage className="w-4 h-4"/>Image</button>
            <button onClick={doExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:opacity-90"><Download className="w-4 h-4"/>PDF</button>
            <button onClick={window.print} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-dark"><Printer className="w-4 h-4"/>Imprimer</button>
          </div>
        </div>

        {showEdit && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-primary">
              ✏ Mode édition — <span className="font-normal text-muted-foreground">Cliquez sur une cellule pour modifier · Bouton ✕ pour supprimer · Bouton + pour ajouter une ligne</span>
            </p>
          </div>
        )}
      </div>

      {/* RAPPORT IMPRIMABLE */}
      <div ref={reportRef} className="bg-white rounded-xl overflow-hidden print-full border border-gray-200 shadow-sm" style={{fontFamily:"Arial, sans-serif"}}>
        <div style={{backgroundColor:"#1a3a6b",color:"white",textAlign:"center",padding:"12px 16px",fontSize:"14px",fontWeight:"bold",letterSpacing:"0.5px",textTransform:"uppercase"}}>
          CONSOMMATION JOURNALIERE {currentDate} DE GASOIL -{reportSite}-
        </div>

        {/* TABLE CHAUFFEURS */}
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th colSpan={2} style={{...TH_BLUE,fontSize:"12px"}}>Chauffeurs</th>
              <th rowSpan={2} style={{...TH_BLUE,width:"80px"}}>Code</th>
              <th rowSpan={2} style={{...TH_BLUE,width:"70px"}}>Litres</th>
              <th rowSpan={2} style={{...TH_BLUE,width:"80px"}}>%</th>
              <th rowSpan={2} style={TH_BLUE}>Activité</th>
              {showEdit && <th rowSpan={2} style={{...TH_BLUE,backgroundColor:"#374151",width:"36px"}}>✕</th>}
            </tr>
            <tr>
              <th style={{...TH_DARK,width:"23%"}}>Equipe 1</th>
              <th style={{...TH_DARK,width:"23%"}}>Equipe 2</th>
            </tr>
          </thead>
          <tbody>
            {displayCh.length === 0 ? (
              <tr><td colSpan={showEdit?7:6} style={{padding:"20px",textAlign:"center",color:"#aaa",fontSize:"12px"}}>— Aucune consommation pour ce jour —</td></tr>
            ) : displayCh.map((row,idx) => (
              <tr key={row.id} style={{backgroundColor:idx%2===0?"#fff":"#f8fafc"}}>
                <Cell value={row.equipe1} isEditing={isEditing(row.id,"equipe1")} onStartEdit={()=>startEdit(row.id,"equipe1")} onEndEdit={endEdit} onSave={v=>updateCell("ch",row.id,"equipe1",v)} canEdit={showEdit} style={{fontWeight:600,textTransform:"uppercase",width:"23%"}} placeholder="Nom équipe 1"/>
                <Cell value={row.equipe2} isEditing={isEditing(row.id,"equipe2")} onStartEdit={()=>startEdit(row.id,"equipe2")} onEndEdit={endEdit} onSave={v=>updateCell("ch",row.id,"equipe2",v)} canEdit={showEdit} style={{textTransform:"uppercase",width:"23%"}} placeholder="Nom équipe 2"/>
                <Cell value={row.code} isEditing={isEditing(row.id,"code")} onStartEdit={()=>startEdit(row.id,"code")} onEndEdit={endEdit} onSave={v=>updateCell("ch",row.id,"code",v)} canEdit={showEdit} style={{textAlign:"center",fontWeight:"bold",backgroundColor:"#edf2f7"}} placeholder="D183"/>
                <Cell value={row.litres||""} isEditing={isEditing(row.id,"litres")} onStartEdit={()=>startEdit(row.id,"litres")} onEndEdit={endEdit} onSave={v=>updateCell("ch",row.id,"litres",v)} canEdit={showEdit} type="number" style={{textAlign:"center",fontWeight:"bold"}} placeholder="0"/>
                <td style={{...TD({textAlign:"center",fontWeight:"bold",backgroundColor:pctBg(row.pct)}), cursor:showEdit?"pointer":"default", position:"relative"}}
                  onClick={()=>showEdit&&startEdit(row.id,"pct")}>
                  {showEdit && <span style={{position:"absolute",top:2,right:2,width:5,height:5,borderRadius:"50%",background:"#3b82f6",opacity:0.45,pointerEvents:"none"}}/>}
                  {isEditing(row.id,"pct") ? (
                    <input type="number" defaultValue={row.pct} autoFocus
                      onBlur={e=>{updateCell("ch",row.id,"pct",e.target.value);endEdit();}}
                      onKeyDown={e=>{if(e.key==="Enter"){updateCell("ch",row.id,"pct",(e.target as HTMLInputElement).value);endEdit();}if(e.key==="Escape")endEdit();}}
                      style={{width:"100%",fontSize:"11px",padding:"3px 6px",border:"2px solid #3b82f6",borderRadius:"4px",background:"#fff",outline:"none"}}/>
                  ) : (
                    <span>{row.pct > 0 ? `${row.pct.toFixed(2)}%` : <span style={{color:"#666"}}>-</span>}</span>
                  )}
                </td>
                <Cell value={row.activite} isEditing={isEditing(row.id,"activite")} onStartEdit={()=>startEdit(row.id,"activite")} onEndEdit={endEdit} onSave={v=>updateCell("ch",row.id,"activite",v)} canEdit={showEdit} type="select" options={ACTIVITES} style={{textAlign:"center",textTransform:"uppercase"}} placeholder="Activité"/>
                {showEdit && <DelBtn section="ch" rowId={row.id}/>}
              </tr>
            ))}

            {showEdit && (
              <tr>
                <td colSpan={7} style={{padding:"5px 8px",borderTop:"2px dashed #bee3f8",backgroundColor:"#ebf8ff"}}>
                  <button onClick={addChRow} style={{display:"flex",alignItems:"center",gap:6,margin:"0 auto",padding:"5px 18px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:"bold",cursor:"pointer"}}>
                    <Plus style={{width:14,height:14}}/>Ajouter une ligne chauffeur
                  </button>
                </td>
              </tr>
            )}

            <tr style={{backgroundColor:"#90ee90"}}>
              <td colSpan={showEdit?5:4} style={{padding:"8px 12px",border:"1px solid #a0aec0",textAlign:"center",fontWeight:"bold",fontSize:13,textTransform:"uppercase",letterSpacing:"1px"}}>TOTAL</td>
              <td colSpan={showEdit?3:2} style={{padding:"8px 12px",border:"1px solid #a0aec0",textAlign:"center",fontWeight:"bold",fontSize:16}}>{totalCh.toLocaleString("fr-FR")}</td>
            </tr>
          </tbody>
        </table>

        <div style={{height:14,backgroundColor:"#fff"}}/>

        {/* TABLE ENGINS */}
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th colSpan={2} style={{...TH_BLUE,fontSize:"12px"}}>Conducteurs</th>
              <th rowSpan={2} style={{...TH_BLUE,width:"105px"}}>Engins</th>
              <th rowSpan={2} style={{...TH_BLUE,width:"65px"}}>Litres</th>
              <th rowSpan={2} style={{...TH_BLUE,width:"75px"}}>%</th>
              <th rowSpan={2} style={{...TH_BLUE,width:"65px"}}>Heure</th>
              <th rowSpan={2} style={TH_BLUE}>AFF</th>
              {showEdit && <th rowSpan={2} style={{...TH_BLUE,backgroundColor:"#374151",width:"36px"}}>✕</th>}
            </tr>
            <tr>
              <th style={{...TH_DARK,width:"21%"}}>Equipe 1</th>
              <th style={{...TH_DARK,width:"21%"}}>Equipe 2</th>
            </tr>
          </thead>
          <tbody>
            {displayEn.length === 0 ? (
              <tr><td colSpan={showEdit?8:7} style={{padding:"20px",textAlign:"center",color:"#aaa",fontSize:"12px"}}>— Aucune donnée engins —</td></tr>
            ) : displayEn.map((row,idx) => (
              <tr key={row.id} style={{backgroundColor:idx%2===0?"#fff":"#f8fafc"}}>
                <Cell value={row.equipe1} isEditing={isEditing(row.id,"equipe1")} onStartEdit={()=>startEdit(row.id,"equipe1")} onEndEdit={endEdit} onSave={v=>updateCell("en",row.id,"equipe1",v)} canEdit={showEdit} style={{fontWeight:600,textTransform:"uppercase",width:"21%"}} placeholder="Nom conducteur 1"/>
                <Cell value={row.equipe2} isEditing={isEditing(row.id,"equipe2")} onStartEdit={()=>startEdit(row.id,"equipe2")} onEndEdit={endEdit} onSave={v=>updateCell("en",row.id,"equipe2",v)} canEdit={showEdit} style={{textTransform:"uppercase",width:"21%"}} placeholder="Nom conducteur 2"/>
                <Cell value={row.engin} isEditing={isEditing(row.id,"engin")} onStartEdit={()=>startEdit(row.id,"engin")} onEndEdit={endEdit} onSave={v=>updateCell("en",row.id,"engin",v)} canEdit={showEdit} style={{textAlign:"center",fontWeight:"bold",backgroundColor:"#edf2f7"}} placeholder="350 E71"/>
                <Cell value={row.litres||""} isEditing={isEditing(row.id,"litres")} onStartEdit={()=>startEdit(row.id,"litres")} onEndEdit={endEdit} onSave={v=>updateCell("en",row.id,"litres",v)} canEdit={showEdit} type="number" style={{textAlign:"center",fontWeight:"bold"}} placeholder="0"/>
                <td style={{...TD({textAlign:"center",fontWeight:"bold",backgroundColor:pctBg(row.pct)}), cursor:showEdit?"pointer":"default", position:"relative"}}
                  onClick={()=>showEdit&&startEdit(row.id,"pct")}>
                  {showEdit && <span style={{position:"absolute",top:2,right:2,width:5,height:5,borderRadius:"50%",background:"#3b82f6",opacity:0.45,pointerEvents:"none"}}/>}
                  {isEditing(row.id,"pct") ? (
                    <input type="number" defaultValue={row.pct} autoFocus
                      onBlur={e=>{updateCell("en",row.id,"pct",e.target.value);endEdit();}}
                      onKeyDown={e=>{if(e.key==="Enter"){updateCell("en",row.id,"pct",(e.target as HTMLInputElement).value);endEdit();}if(e.key==="Escape")endEdit();}}
                      style={{width:"100%",fontSize:"11px",padding:"3px 6px",border:"2px solid #3b82f6",borderRadius:"4px",background:"#fff",outline:"none"}}/>
                  ) : (
                    <span>{row.pct > 0 ? `${row.pct.toFixed(2)}%` : <span style={{color:"#999"}}>-</span>}</span>
                  )}
                </td>
                <Cell value={row.heure} isEditing={isEditing(row.id,"heure")} onStartEdit={()=>startEdit(row.id,"heure")} onEndEdit={endEdit} onSave={v=>updateCell("en",row.id,"heure",v)} canEdit={showEdit} style={{textAlign:"center"}} placeholder="13H"/>
                <Cell value={row.aff} isEditing={isEditing(row.id,"aff")} onStartEdit={()=>startEdit(row.id,"aff")} onEndEdit={endEdit} onSave={v=>updateCell("en",row.id,"aff",v)} canEdit={showEdit} type="select" options={AFF_OPTIONS} style={{textAlign:"center",textTransform:"uppercase"}} placeholder="Affectation"/>
                {showEdit && <DelBtn section="en" rowId={row.id}/>}
              </tr>
            ))}

            {showEdit && (
              <tr>
                <td colSpan={8} style={{padding:"5px 8px",borderTop:"2px dashed #e9d5ff",backgroundColor:"#f5f3ff"}}>
                  <button onClick={addEnRow} style={{display:"flex",alignItems:"center",gap:6,margin:"0 auto",padding:"5px 18px",background:"#6366f1",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:"bold",cursor:"pointer"}}>
                    <Plus style={{width:14,height:14}}/>Ajouter une ligne engin
                  </button>
                </td>
              </tr>
            )}

            <tr style={{backgroundColor:"#6b7280",color:"white"}}>
              <td colSpan={showEdit?5:4} style={{padding:"8px 12px",border:"1px solid #555",textAlign:"center",fontWeight:"bold",fontSize:13,textTransform:"uppercase",letterSpacing:"1px"}}>TOTAL</td>
              <td colSpan={showEdit?4:3} style={{padding:"8px 12px",border:"1px solid #555",textAlign:"center",fontWeight:"bold",fontSize:16}}>{totalEn.toLocaleString("fr-FR")}</td>
            </tr>
          </tbody>
        </table>

        {/* GRAND TOTAL */}
        <table style={{width:"100%",borderCollapse:"collapse",marginTop:4}}>
          <tbody>
            <tr>
              <td style={{backgroundColor:"#1a202c",color:"white",padding:"16px 24px",textAlign:"center",fontWeight:"bold",fontSize:20,textTransform:"uppercase",width:"50%",border:"2px solid #0d1117",letterSpacing:"2px"}}>TOTAL</td>
              <td style={{backgroundColor:"#e53e3e",color:"white",padding:"16px 24px",textAlign:"center",fontWeight:"bold",fontSize:28,border:"2px solid #0d1117",letterSpacing:"1px"}}>{grandTotal.toLocaleString("fr-FR")}</td>
            </tr>
          </tbody>
        </table>

        {/* LÉGENDE */}
        <div style={{padding:"7px 14px",backgroundColor:"#f7fafc",borderTop:"1px solid #e2e8f0",display:"flex",gap:16,fontSize:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontWeight:"bold"}}>Légende :</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:12,height:12,backgroundColor:"#ff6b6b",borderRadius:2}}/>Surconsommation (&gt;85%)</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:12,height:12,backgroundColor:"#74b9ff",borderRadius:2}}/>Élevée (60–85%)</span>
        </div>
      </div>
    </div>
  );
};

export default RapportPage;
