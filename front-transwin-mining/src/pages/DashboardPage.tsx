import { useMemo } from "react";
import { parkData } from "@/data/parkData";
import { stockData, consommationChauffeurs, consommationEngins } from "@/data/stockData";
import {
  Truck, Wrench, Droplets, TrendingUp, TrendingDown, AlertTriangle,
  BarChart3, Calendar, Building2, Activity
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";

const DashboardPage = () => {
  const camions = parkData.filter(d => d.type === "camion");
  const engins = parkData.filter(d => d.type === "engin");

  // Derniers 14 jours de stock non-nuls
  const recentStock = useMemo(() =>
    stockData.filter(d => (d.total || 0) > 0).slice(-14), []);

  const chartData = recentStock.map(d => ({
    date: d.date.substring(0, 5),
    "Beng 1": d.citerne1,
    "Beng 2": d.citerne2,
    "81669": d.citerne81669,
    Total: d.total || 0,
  }));

  // Stats générales
  const totalLitres = stockData.reduce((s, d) => s + (d.total || 0), 0);
  const joursTravailles = stockData.filter(d => (d.total || 0) > 0).length;
  const moyenneJour = joursTravailles > 0 ? Math.round(totalLitres / joursTravailles) : 0;
  const dernierJour = stockData.filter(d => (d.total || 0) > 0).slice(-1)[0];
  const avantDernierJour = stockData.filter(d => (d.total || 0) > 0).slice(-2)[0];
  const tendance = dernierJour && avantDernierJour
    ? (dernierJour.total || 0) - (avantDernierJour.total || 0)
    : 0;

  // Alertes surconsommation (% > 85)
  const alertesChauffeurs = consommationChauffeurs.filter(c => c.pourcentage > 85);
  const alertesEngins = consommationEngins.filter(e => e.pourcentage > 85);
  const totalAlertes = alertesChauffeurs.length + alertesEngins.length;

  // Consommation par camion (rapport)
  const topConsommateurs = [...consommationChauffeurs]
    .sort((a, b) => b.litres - a.litres)
    .slice(0, 6);

  const barData = topConsommateurs.map(c => ({
    code: c.code,
    litres: c.litres,
    pct: c.pourcentage,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="gradient-header rounded-2xl p-6 shadow-mining">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center shadow-accent animate-pulse-glow">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-primary-foreground tracking-wide uppercase">
                Tableau de Bord
              </h1>
              <p className="text-primary-foreground/70 font-body text-sm">
                Transwin Mining — Site Benguerir — Vue globale
              </p>
            </div>
          </div>
          <div className="text-primary-foreground/80 text-sm font-body bg-primary-foreground/10 px-4 py-2 rounded-xl">
            <Calendar className="w-4 h-4 inline mr-2" />
            Données au {dernierJour?.date || "—"}
          </div>
        </div>
      </div>

      {/* KPI Cards - Parc */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-mining">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-body uppercase tracking-wide">Total Camions</span>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-primary">{camions.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Véhicules affectés</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-mining">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-body uppercase tracking-wide">Total Engins</span>
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-accent">{engins.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Engins affectés</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-mining">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-body uppercase tracking-wide">Consommation totale</span>
            <div className="w-8 h-8 bg-mining-info/10 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-mining-info" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-mining-info">
            {(totalLitres / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-muted-foreground mt-1">Litres ({joursTravailles} jours)</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-mining">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-body uppercase tracking-wide">Alertes actives</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${totalAlertes > 0 ? "bg-mining-danger/10" : "bg-mining-success/10"}`}>
              <AlertTriangle className={`w-4 h-4 ${totalAlertes > 0 ? "text-mining-danger" : "text-mining-success"}`} />
            </div>
          </div>
          <div className={`font-display text-3xl font-bold ${totalAlertes > 0 ? "text-mining-danger" : "text-mining-success"}`}>
            {totalAlertes}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Surconsommation &gt;85%</div>
        </div>
      </div>

      {/* Dernière journée + tendance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-mining">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-accent" />
            <span className="font-display text-sm font-semibold text-primary uppercase tracking-wide">
              Dernière Journée
            </span>
          </div>
          {dernierJour && (
            <>
              <div className="text-muted-foreground text-xs mb-2">{dernierJour.date}</div>
              <div className="space-y-2">
                {[
                  { label: "Beng 1", val: dernierJour.citerne1, color: "bg-mining-info" },
                  { label: "Beng 2", val: dernierJour.citerne2, color: "bg-accent" },
                  { label: "81669A55", val: dernierJour.citerne81669, color: "bg-mining-success" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-muted-foreground w-20">{label}</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${color}`}
                        style={{ width: `${Math.min(100, (val / (dernierJour.total || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-16 text-right">
                      {val.toLocaleString("fr-FR")} L
                    </span>
                  </div>
                ))}
                <div className="border-t border-border mt-2 pt-2 flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground">Total</span>
                  <span className="font-display font-bold text-primary">
                    {(dernierJour.total || 0).toLocaleString("fr-FR")} L
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-mining">
          <div className="flex items-center gap-2 mb-3">
            {tendance >= 0 ? (
              <TrendingUp className="w-4 h-4 text-mining-danger" />
            ) : (
              <TrendingDown className="w-4 h-4 text-mining-success" />
            )}
            <span className="font-display text-sm font-semibold text-primary uppercase tracking-wide">
              Tendance
            </span>
          </div>
          <div className={`font-display text-3xl font-bold ${tendance >= 0 ? "text-mining-danger" : "text-mining-success"}`}>
            {tendance >= 0 ? "+" : ""}{tendance.toLocaleString("fr-FR")} L
          </div>
          <div className="text-xs text-muted-foreground mt-1">vs. veille</div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Moyenne/jour</div>
            <div className="font-display font-bold text-foreground">{moyenneJour.toLocaleString("fr-FR")} L</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-mining">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-mining-danger" />
            <span className="font-display text-sm font-semibold text-primary uppercase tracking-wide">
              Alertes Surconsommation
            </span>
          </div>
          {totalAlertes === 0 ? (
            <div className="text-center py-4">
              <div className="text-mining-success font-semibold text-sm">✓ Aucune alerte</div>
              <div className="text-xs text-muted-foreground mt-1">Tous les véhicules sont dans les normes</div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {[...alertesChauffeurs.map(c => ({ code: c.code, pct: c.pourcentage, nom: c.equipe1 })),
                ...alertesEngins.map(e => ({ code: e.engin, pct: e.pourcentage, nom: e.equipe1 }))
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-mining-danger/10 rounded-lg px-2 py-1">
                  <span className="text-xs font-semibold text-mining-danger">{a.code}</span>
                  <span className="text-xs text-foreground truncate mx-2">{a.nom || "—"}</span>
                  <span className="text-xs font-bold text-mining-danger">{a.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution stock */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-mining">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h3 className="font-display text-base font-semibold text-primary uppercase tracking-wide">
              Évolution Stock (14 derniers jours)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="db1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(200 80% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(200 80% 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="db2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(35 95% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(35 95% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 85%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString("fr-FR")} L`]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Beng 1" stroke="hsl(200 80% 45%)" fill="url(#db1)" strokeWidth={2} />
              <Area type="monotone" dataKey="Beng 2" stroke="hsl(35 95% 50%)" fill="url(#db2)" strokeWidth={2} />
              <Area type="monotone" dataKey="81669" stroke="hsl(142 70% 38%)" fill="none" strokeWidth={2} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top consommateurs */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-mining">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-accent" />
            <h3 className="font-display text-base font-semibold text-primary uppercase tracking-wide">
              Top Consommateurs Camions
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 85%)" />
              <XAxis dataKey="code" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number, name: string) => [`${v}${name === "pct" ? "%" : " L"}`, name === "pct" ? "%" : "Litres"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="litres" fill="hsl(215 68% 22%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pct" fill="hsl(35 95% 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Répartition par activité */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-mining">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-accent" />
          <h3 className="font-display text-base font-semibold text-primary uppercase tracking-wide">
            Répartition par Activité (Rapport Journalier)
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["PHOSPHATE", "STERILE", "PHOSPHATE/STERILE", "DECHARGE/STERILE"].map(act => {
            const count = consommationChauffeurs.filter(c => c.activite === act).length;
            const litres = consommationChauffeurs.filter(c => c.activite === act).reduce((s, c) => s + c.litres, 0);
            return (
              <div key={act} className="bg-muted/50 rounded-xl p-4 text-center">
                <div className="font-display text-lg font-bold text-primary">{count}</div>
                <div className="text-xs text-muted-foreground font-body mt-0.5">{act}</div>
                <div className="text-xs font-semibold text-accent mt-1">{litres.toLocaleString("fr-FR")} L</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
