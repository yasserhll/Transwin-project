// Verification81669.tsx — Tableau simple et détaillé de vérification citerne 81669A55
import { useMemo, useState } from "react";
import { stockData } from "@/data/stockData";
import { AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";

const MOYENNE = 2452; // L/jour (calculée sur la période)
const SEUIL   = Math.round(MOYENNE * 1.5); // 3 678 L = seuil alerte

type Filtre = "TOUS" | "SUSPECT";

const Verification81669 = () => {
  const [filtre, setFiltre] = useState<Filtre>("TOUS");

  const lignes = useMemo(() => {
    return stockData
      .filter(d => d.citerne81669 > 0 || d.citerne1 > 0 || d.citerne2 > 0)
      .map(d => {
        const c = d.citerne81669 || 0;
        const total = d.citerne1 + d.citerne2 + c;
        const ratio = total > 0 ? Math.round((c / total) * 100) : 0;
        const ecart = c - MOYENNE;

        // Déterminer le statut
        let statut: "NORMAL" | "ATTENTION" | "SUSPECT" = "NORMAL";
        let raison = "";

        if (c > 0 && d.citerne1 === 0 && d.citerne2 === 0) {
          statut = "SUSPECT";
          raison = "Seule active (Beng 1 = 0 & Beng 2 = 0)";
        } else if (c > SEUIL) {
          statut = "SUSPECT";
          raison = `Volume dépasse le seuil (+${(c - SEUIL).toLocaleString("fr-FR")} L)`;
        } else if (ratio > 60 && c > 1500) {
          statut = "ATTENTION";
          raison = `Part trop élevée sur total (${ratio}%)`;
        } else if (c > 0 && (d.citerne1 === 0 || d.citerne2 === 0) && ratio > 50) {
          statut = "ATTENTION";
          raison = `Une citerne inactive, ratio ${ratio}%`;
        }

        return { date: d.date, beng1: d.citerne1, beng2: d.citerne2, c81669: c, total, ratio, ecart, statut, raison };
      });
  }, []);

  const affichees = filtre === "SUSPECT"
    ? lignes.filter(l => l.statut !== "NORMAL")
    : lignes;

  const totaux = {
    beng1:  lignes.reduce((s, l) => s + l.beng1, 0),
    beng2:  lignes.reduce((s, l) => s + l.beng2, 0),
    c81669: lignes.reduce((s, l) => s + l.c81669, 0),
    total:  lignes.reduce((s, l) => s + l.total,  0),
    suspects: lignes.filter(l => l.statut === "SUSPECT").length,
    attention: lignes.filter(l => l.statut === "ATTENTION").length,
  };

  const exportExcel = () => {
    const rows = [
      ["VERIFICATION CITERNE 81669A55 — BENGUERIR"],
      [`Seuil alerte: ${SEUIL.toLocaleString("fr-FR")} L/jour | Moyenne: ${MOYENNE.toLocaleString("fr-FR")} L/jour`],
      [],
      ["Date", "Beng 1 (L)", "Beng 2 (L)", "81669A55 (L)", "Total (L)", "Ratio 81669%", "Écart vs moy.", "Statut", "Raison"],
      ...affichees.map(l => [
        l.date, l.beng1, l.beng2, l.c81669, l.total,
        `${l.ratio}%`, l.ecart > 0 ? `+${l.ecart}` : l.ecart,
        l.statut, l.raison
      ]),
      [],
      ["TOTAL", totaux.beng1, totaux.beng2, totaux.c81669, totaux.total],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [12,12,12,14,12,12,14,12,40].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vérification 81669");
    XLSX.writeFile(wb, "Verification_81669A55.xlsx");
  };

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── EN-TÊTE ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-primary uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Vérification Citerne 81669A55
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Citerne mobile — Rechargée depuis Beng 1 & Beng 2 · Seuil alerte : <strong className="text-orange-500">{SEUIL.toLocaleString("fr-FR")} L/jour</strong> · Moyenne normale : <strong>{MOYENNE.toLocaleString("fr-FR")} L/jour</strong>
            </p>
          </div>
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 shrink-0">
            <Download className="w-4 h-4" /> Exporter Excel
          </button>
        </div>
      </div>

      {/* ── RÉSUMÉ RAPIDE ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total 81669A55</div>
          <div className="font-display text-2xl font-black text-cyan-500">{totaux.c81669.toLocaleString("fr-FR")} L</div>
          <div className="text-xs text-muted-foreground mt-1">{lignes.filter(l => l.c81669 > 0).length} jours actifs</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Beng 1</div>
          <div className="font-display text-2xl font-black text-sky-500">{totaux.beng1.toLocaleString("fr-FR")} L</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Beng 2</div>
          <div className="font-display text-2xl font-black text-amber-500">{totaux.beng2.toLocaleString("fr-FR")} L</div>
        </div>
        <div className={`rounded-xl p-4 text-center border ${totaux.suspects > 0 ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-500/30" : "bg-card border-border"}`}>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jours suspects</div>
          <div className={`font-display text-2xl font-black ${totaux.suspects > 0 ? "text-red-500" : "text-emerald-500"}`}>
            {totaux.suspects} 🔴 &nbsp; {totaux.attention} 🟡
          </div>
          <div className="text-xs text-muted-foreground mt-1">Critiques / Attention</div>
        </div>
      </div>

      {/* ── FILTRE ──────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {(["TOUS", "SUSPECT"] as Filtre[]).map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
              filtre === f
                ? f === "SUSPECT"
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-transparent hover:border-border"
            }`}>
            {f === "TOUS" ? `Tous les jours (${lignes.length})` : `⚠ Suspects & Attention (${totaux.suspects + totaux.attention})`}
          </button>
        ))}
      </div>

      {/* ── TABLEAU PRINCIPAL ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-display font-bold uppercase tracking-wide text-xs">Date</th>
                <th className="px-4 py-3 text-center font-display font-bold uppercase tracking-wide text-xs">Beng 1 (L)</th>
                <th className="px-4 py-3 text-center font-display font-bold uppercase tracking-wide text-xs">Beng 2 (L)</th>
                <th className="px-4 py-3 text-center font-display font-bold uppercase tracking-wide text-xs bg-cyan-700">81669A55 (L)</th>
                <th className="px-4 py-3 text-center font-display font-bold uppercase tracking-wide text-xs">Total (L)</th>
                <th className="px-4 py-3 text-center font-display font-bold uppercase tracking-wide text-xs">Ratio 81669</th>
                <th className="px-4 py-3 text-center font-display font-bold uppercase tracking-wide text-xs">Écart vs moy.</th>
                <th className="px-4 py-3 text-center font-display font-bold uppercase tracking-wide text-xs">Statut</th>
                <th className="px-4 py-3 text-left font-display font-bold uppercase tracking-wide text-xs">Observation</th>
              </tr>
            </thead>
            <tbody>
              {affichees.map((l, idx) => {
                const isEven = idx % 2 === 0;
                const rowBg =
                  l.statut === "SUSPECT"   ? "bg-red-50 dark:bg-red-950/25 hover:bg-red-100 dark:hover:bg-red-950/40" :
                  l.statut === "ATTENTION" ? "bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30" :
                  isEven ? "bg-white dark:bg-card hover:bg-primary/5" : "bg-slate-50 dark:bg-muted/30 hover:bg-primary/5";

                return (
                  <tr key={l.date} className={`border-b border-border/40 transition-colors ${rowBg}`}>
                    {/* Date */}
                    <td className="px-4 py-2.5 font-bold text-foreground">{l.date}</td>

                    {/* Beng 1 */}
                    <td className="px-4 py-2.5 text-center">
                      {l.beng1 > 0
                        ? <span className="text-sky-600 dark:text-sky-400 font-semibold">{l.beng1.toLocaleString("fr-FR")}</span>
                        : <span className="text-red-400 font-bold">0</span>}
                    </td>

                    {/* Beng 2 */}
                    <td className="px-4 py-2.5 text-center">
                      {l.beng2 > 0
                        ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{l.beng2.toLocaleString("fr-FR")}</span>
                        : <span className="text-red-400 font-bold">0</span>}
                    </td>

                    {/* 81669 — colonne mise en évidence */}
                    <td className="px-4 py-2.5 text-center bg-cyan-50 dark:bg-cyan-950/20 border-x border-cyan-200 dark:border-cyan-800/40">
                      {l.c81669 > 0 ? (
                        <span className={`font-black text-base ${
                          l.statut === "SUSPECT"   ? "text-red-600 dark:text-red-400" :
                          l.statut === "ATTENTION" ? "text-orange-600 dark:text-orange-400" :
                          "text-cyan-700 dark:text-cyan-400"
                        }`}>
                          {l.c81669.toLocaleString("fr-FR")}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-2.5 text-center font-semibold text-foreground">
                      {l.total.toLocaleString("fr-FR")}
                    </td>

                    {/* Ratio */}
                    <td className="px-4 py-2.5 text-center">
                      {l.c81669 > 0 ? (
                        <span className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                          l.ratio > 60 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                          l.ratio > 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}>{l.ratio}%</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Écart vs moyenne */}
                    <td className="px-4 py-2.5 text-center">
                      {l.c81669 > 0 ? (
                        <span className={`font-bold text-xs ${l.ecart > 0 ? "text-red-500" : "text-emerald-500"}`}>
                          {l.ecart > 0 ? `+${l.ecart.toLocaleString("fr-FR")}` : l.ecart.toLocaleString("fr-FR")} L
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-2.5 text-center">
                      {l.statut === "SUSPECT"   && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded-full text-xs font-black">🔴 SUSPECT</span>}
                      {l.statut === "ATTENTION" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-500 rounded-full text-xs font-black">🟡 ATTENTION</span>}
                      {l.statut === "NORMAL"    && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-full text-xs font-semibold">✅ NORMAL</span>}
                    </td>

                    {/* Observation */}
                    <td className="px-4 py-2.5 text-xs text-muted-foreground italic max-w-[220px]">
                      {l.raison || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Ligne totaux */}
            <tfoot className="sticky bottom-0">
              <tr className="bg-primary text-primary-foreground font-bold border-t-2 border-primary">
                <td className="px-4 py-3 font-display uppercase text-xs">TOTAL ({affichees.length} jours)</td>
                <td className="px-4 py-3 text-center">{affichees.reduce((s,l)=>s+l.beng1,0).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 text-center">{affichees.reduce((s,l)=>s+l.beng2,0).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 text-center bg-cyan-700 font-black text-lg">{affichees.reduce((s,l)=>s+l.c81669,0).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 text-center">{affichees.reduce((s,l)=>s+l.total,0).toLocaleString("fr-FR")}</td>
                <td colSpan={4} className="px-4 py-3 text-xs opacity-80 text-center">
                  🔴 {totaux.suspects} suspect(s) · 🟡 {totaux.attention} attention · Seuil: {SEUIL.toLocaleString("fr-FR")} L/j
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Verification81669;
