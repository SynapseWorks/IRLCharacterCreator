import { calculateStats, formatMoney } from "@/lib/stats";
import type { Equipment } from "@/lib/types";

type Props = { equipment: Equipment };

export function CharacterStats({ equipment }: Props) {
  const stats = calculateStats(equipment);

  return (
    <section className="stats-card">
      <div className="section-eyebrow">Character stats</div>
      <div className="stats-grid">
        <div><strong>{stats.equippedCount}</strong><span>equipped</span></div>
        <div><strong>{stats.pricedCount}</strong><span>priced</span></div>
        <div><strong>{formatMoney(stats.total, stats.currency)}</strong><span>look total</span></div>
        <div><strong>{formatMoney(stats.average, stats.currency)}</strong><span>avg. item</span></div>
      </div>
      {stats.mostExpensive && (
        <p className="stat-note">Highest-cost item: <b>{stats.mostExpensive.name}</b> at {formatMoney(stats.mostExpensive.price ?? 0, stats.mostExpensive.currency)}</p>
      )}
      {stats.currency === "MIXED" && <p className="warning-text">Mixed currencies are displayed without conversion in V0.</p>}
    </section>
  );
}
