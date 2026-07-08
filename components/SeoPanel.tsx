"use client";

import { useEffect, useState } from "react";

interface SeoIssue {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
}

interface SeoData {
  checkedAt: string;
  score: number;
  robotsTxtFound: boolean;
  robotsBlocked: boolean;
  sitemapFound: boolean;
  sitemapUrlCount: number | null;
  canonicalUrl: string | null;
  hasHreflang: boolean;
  noindex: boolean;
  hasNosnippet: boolean;
  maxSnippet: number | null;
  title: string | null;
  titleLength: number | null;
  description: string | null;
  descLength: number | null;
  hasOgTitle: boolean;
  hasOgDesc: boolean;
  hasOgImage: boolean;
  hasSchema: boolean;
  hasArticleSchema: boolean;
  hasBreadcrumbSchema: boolean;
  hasHowToSchema: boolean;
  hasProductSchema: boolean;
  hasFaqSchema: boolean;
  hasOrgSchema: boolean;
  wordCount: number;
  wordCountOk: boolean;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  headingHierarchyOk: boolean;
  internalLinks: number;
  externalLinks: number;
  imgWithoutAlt: number;
  hasDateSignal: boolean;
  hasIndexNow: boolean;
  issues: SeoIssue[];
}

const severityConfig = {
  error: { cls: "bg-red-500/15 text-red-400 border-red-500/20", icon: "✕" },
  warning: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: "⚠" },
  info: { cls: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: "ℹ" },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const ring = score >= 80 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-500";
  const r = 30, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-slate-700" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className={ring}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
        <text x="40" y="45" textAnchor="middle" fontSize="18" fontWeight="bold" className={`fill-current ${color}`}>{score}</text>
      </svg>
      <span className="text-xs text-slate-500">SEO Skoru</span>
    </div>
  );
}

function Check({ label, ok, detail }: { label: string; ok: boolean | null; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
      <span className="text-xs text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-slate-500">{detail}</span>}
        <span className={`text-xs font-bold ${ok === true ? "text-emerald-400" : ok === false ? "text-red-400" : "text-slate-600"}`}>
          {ok === true ? "✓" : ok === false ? "✕" : "—"}
        </span>
      </div>
    </div>
  );
}

export function SeoPanel({ siteId }: { siteId: string }) {
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { if (open && !data) loadExisting(); }, [open]);

  async function loadExisting() {
    const res = await fetch(`/api/sites/${siteId}/seo`);
    if (res.ok) { const j = await res.json(); setData(j); }
  }

  async function runSeo() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/seo`, { method: "POST" });
      if (!res.ok) return;
      setData(await res.json());
      setOpen(true);
    } finally { setLoading(false); }
  }

  const snippetLabel = () => {
    if (!data) return "—";
    if (data.hasNosnippet) return "Kapalı (nosnippet)";
    if (data.maxSnippet === 0) return "0 (kapalı)";
    if (data.maxSnippet === -1) return "Sınırsız";
    if (data.maxSnippet != null) return `max ${data.maxSnippet} kr`;
    return "Varsayılan";
  };

  return (
    <div>
      <button onClick={runSeo} disabled={loading}
        className="px-3 py-1.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
        {loading ? "SEO analiz..." : "SEO Analiz"}
      </button>
      {data && (
        <button onClick={() => setOpen(!open)}
          className="ml-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded-lg text-xs transition-colors">
          {open ? "Kapat" : `SEO Raporu (${data.score}/100)`}
        </button>
      )}

      {open && data && (
        <div className="mt-4 space-y-4">
          {/* Özet */}
          <div className="bg-slate-700/30 rounded-xl p-4 flex items-center gap-6">
            <ScoreRing score={data.score} />
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs flex-1">
              <span className="text-slate-500">Son analiz</span>
              <span className="text-slate-300">{new Date(data.checkedAt).toLocaleString("tr-TR")}</span>
              <span className="text-slate-500">Sorun sayısı</span>
              <span className="text-slate-300">{data.issues.length}</span>
              <span className="text-slate-500">Kelime sayısı</span>
              <span className={`font-medium ${data.wordCountOk ? "text-emerald-400" : "text-amber-400"}`}>{data.wordCount}</span>
              <span className="text-slate-500">Snippet izni</span>
              <span className="text-slate-300">{snippetLabel()}</span>
            </div>
          </div>

          {/* Issues */}
          {data.issues.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sorunlar</h4>
              {data.issues.map((issue, i) => {
                const c = severityConfig[issue.severity];
                return (
                  <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${c.cls}`}>
                    <span className="mt-0.5 shrink-0 font-bold">{c.icon}</span>
                    <span>{issue.message}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detay grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-700/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Crawlability & Index</h4>
              <Check label="robots.txt" ok={data.robotsTxtFound} />
              <Check label="Botlar engellenmiş" ok={!data.robotsBlocked} />
              <Check label="sitemap.xml" ok={data.sitemapFound} detail={data.sitemapUrlCount ? `${data.sitemapUrlCount} URL` : undefined} />
              <Check label="Canonical" ok={!!data.canonicalUrl} />
              <Check label="Hreflang" ok={data.hasHreflang || null} />
              <Check label="noindex yok" ok={!data.noindex} />
              <Check label="Snippet izni" ok={!data.hasNosnippet} detail={snippetLabel()} />
              <Check label="IndexNow" ok={data.hasIndexNow} />
            </div>

            <div className="bg-slate-700/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Metadata</h4>
              <Check label="Title" ok={!!data.title} detail={data.titleLength ? `${data.titleLength} kr` : undefined} />
              <Check label="Description" ok={!!data.description} detail={data.descLength ? `${data.descLength} kr` : undefined} />
              <Check label="OG Title" ok={data.hasOgTitle} />
              <Check label="OG Description" ok={data.hasOgDesc} />
              <Check label="OG Image" ok={data.hasOgImage} />
              <Check label="Tarih sinyali" ok={data.hasDateSignal} />
            </div>

            <div className="bg-slate-700/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Schema / Structured Data</h4>
              <Check label="Herhangi bir schema" ok={data.hasSchema} />
              <Check label="Organization" ok={data.hasOrgSchema} />
              <Check label="Article / BlogPosting" ok={data.hasArticleSchema} />
              <Check label="FAQPage" ok={data.hasFaqSchema} />
              <Check label="BreadcrumbList" ok={data.hasBreadcrumbSchema} />
              <Check label="HowTo" ok={data.hasHowToSchema || null} />
              <Check label="Product" ok={data.hasProductSchema || null} />
            </div>

            <div className="bg-slate-700/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">İçerik & Bağlantılar</h4>
              <Check label="Kelime sayısı (500–2000)" ok={data.wordCountOk} detail={`${data.wordCount}`} />
              <Check label="H1 başlık" ok={data.h1Count === 1} detail={`${data.h1Count} adet`} />
              <Check label="H2 başlık" ok={data.h2Count > 0} detail={`${data.h2Count} adet`} />
              <Check label="H3 başlık" ok={null} detail={`${data.h3Count} adet`} />
              <Check label="Başlık hiyerarşisi" ok={data.headingHierarchyOk} />
              <Check label="İç bağlantılar (≥3)" ok={data.internalLinks >= 3} detail={`${data.internalLinks}`} />
              <Check label="Alt text eksik görsel" ok={data.imgWithoutAlt === 0} detail={data.imgWithoutAlt > 0 ? `${data.imgWithoutAlt} eksik` : "hepsi var"} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
