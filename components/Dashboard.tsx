"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteCard } from "./SiteCard";
import { AddSiteModal } from "./AddSiteModal";

interface Check {
  id: string;
  status: string;
  httpStatus: number | null;
  ttfb: number | null;
  responseTime: number | null;
  sslDaysLeft: number | null;
  dnsResolved: boolean | null;
  redirectCount: number | null;
  error: string | null;
  checkedAt: string;
}

interface Site {
  id: string;
  name: string;
  url: string;
  checkFreq: number;
  createdAt: string;
  checks: Check[];
}

export function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/sites");
    const data = await res.json();
    setSites(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function checkAll() {
    setCheckingAll(true);
    try {
      await fetch("/api/check-all", { method: "POST" });
      await load();
    } finally {
      setCheckingAll(false);
    }
  }

  const total = sites.length;
  const healthy = sites.filter((s) => s.checks[0]?.status === "healthy").length;
  const warning = sites.filter((s) => s.checks[0]?.status === "warning").length;
  const critical = sites.filter((s) => s.checks[0]?.status === "critical").length;
  const unchecked = sites.filter((s) => s.checks.length === 0).length;

  return (
    <div className="space-y-8">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <StatChip label="Toplam" value={total} color="text-slate-300" />
          <StatChip label="Sağlıklı" value={healthy} color="text-emerald-400" />
          <StatChip label="Uyarı" value={warning} color="text-amber-400" />
          <StatChip label="Kritik" value={critical} color="text-red-400" />
          {unchecked > 0 && (
            <StatChip label="Bekliyor" value={unchecked} color="text-slate-500" />
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={checkAll}
            disabled={checkingAll || total === 0}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
          >
            {checkingAll ? "Kontrol ediliyor..." : "Tümünü Kontrol Et"}
          </button>
          <AddSiteModal onAdded={load} />
        </div>
      </div>

      {/* Site grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Yükleniyor...</div>
      ) : sites.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg mb-2">Henüz site eklenmedi</p>
          <p className="text-sm">Başlamak için "Site Ekle" butonuna tıkla</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onDeleted={load}
              onChecked={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}
