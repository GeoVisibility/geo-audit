"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { SiteReportModal } from "./SiteReportModal";

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

interface Props {
  site: Site;
  onDeleted: () => void;
  onChecked: () => void;
}

export function SiteCard({ site, onDeleted, onChecked }: Props) {
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const latest = site.checks[0];

  // Uptime hesapla (son 20 kontrole göre)
  const recentChecks = site.checks.slice(0, 20);
  const uptimePct =
    recentChecks.length > 0
      ? Math.round(
          (recentChecks.filter((c) => c.status === "healthy").length /
            recentChecks.length) *
            100
        )
      : null;

  async function runCheck() {
    setChecking(true);
    try {
      await fetch(`/api/sites/${site.id}/check`, { method: "POST" });
      onChecked();
    } finally {
      setChecking(false);
    }
  }

  async function deleteSite() {
    if (!confirm(`"${site.name}" silinsin mi?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-base truncate">{site.name}</h3>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-indigo-400 truncate block transition-colors"
          >
            {site.url}
          </a>
        </div>
        {latest ? (
          <StatusBadge status={latest.status} />
        ) : (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Henüz kontrol yok
          </span>
        )}
      </div>

      {latest && (
        <>
          {/* Ana metrikler — 3 sütun */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <Metric label="HTTP Durum" value={latest.httpStatus ?? "—"} />
            <Metric
              label="TTFB"
              value={latest.ttfb != null ? `${latest.ttfb} ms` : "—"}
              warn={latest.ttfb != null && latest.ttfb > 1000}
              critical={latest.ttfb != null && latest.ttfb > 2000}
            />
            <Metric
              label="Yanıt Süresi"
              value={
                latest.responseTime != null ? `${latest.responseTime} ms` : "—"
              }
              warn={latest.responseTime != null && latest.responseTime > 2000}
              critical={
                latest.responseTime != null && latest.responseTime > 5000
              }
            />
          </div>

          {/* İkinci satır — 3 sütun */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Metric
              label="SSL (gün)"
              value={latest.sslDaysLeft != null ? `${latest.sslDaysLeft} g` : "—"}
              warn={latest.sslDaysLeft != null && latest.sslDaysLeft < 30}
              critical={latest.sslDaysLeft != null && latest.sslDaysLeft < 15}
            />
            <Metric
              label="DNS"
              value={
                latest.dnsResolved == null
                  ? "—"
                  : latest.dnsResolved
                  ? "Çözümlendi"
                  : "Başarısız"
              }
              critical={latest.dnsResolved === false}
            />
            <Metric
              label="Yönlendirme"
              value={latest.redirectCount ?? 0}
              warn={(latest.redirectCount ?? 0) > 2}
            />
          </div>

          {/* Uptime bar */}
          {uptimePct !== null && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">
                  Uptime (son {recentChecks.length} kontrol)
                </span>
                <span
                  className={
                    uptimePct === 100
                      ? "text-emerald-400"
                      : uptimePct >= 90
                      ? "text-amber-400"
                      : "text-red-400"
                  }
                >
                  %{uptimePct}
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    uptimePct === 100
                      ? "bg-emerald-500"
                      : uptimePct >= 90
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${uptimePct}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Hata mesajı */}
      {latest?.error && (
        <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mb-4 font-mono break-all">
          {latest.error}
        </div>
      )}

      {/* Alt satır */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-slate-500">
          {latest
            ? `Son kontrol: ${new Date(latest.checkedAt).toLocaleString("tr-TR")}`
            : `Sıklık: ${site.checkFreq} dk`}
        </span>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={runCheck}
            disabled={checking}
            className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {checking ? "Kontrol ediliyor..." : "Kontrol Et"}
          </button>
          <button
            onClick={() => setReportOpen(true)}
            className="px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded-lg text-xs font-medium transition-colors"
          >
            Rapor (Hız + SEO + GEO)
          </button>
          <button
            onClick={deleteSite}
            disabled={deleting}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            Sil
          </button>
        </div>
      </div>

      {reportOpen && (
        <SiteReportModal siteId={site.id} siteName={site.name} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  warn,
  critical,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
  critical?: boolean;
}) {
  const color = critical
    ? "text-red-400"
    : warn
    ? "text-amber-400"
    : "text-slate-100";

  return (
    <div className="bg-slate-700/50 rounded-lg px-3 py-2">
      <div className="text-xs text-slate-500 mb-0.5 truncate">{label}</div>
      <div className={`text-sm font-semibold ${color} truncate`}>{value}</div>
    </div>
  );
}
