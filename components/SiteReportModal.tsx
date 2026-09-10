"use client";

import { useCallback, useEffect, useState } from "react";

interface SeoIssue { type: string; message: string; severity: "error" | "warning" | "info"; }
interface GeoFinding { category: string; message: string; severity: "good" | "warning" | "error"; }

interface UptimeData {
  checkedAt: string;
  status: string;
  httpStatus: number | null;
  ttfb: number | null;
  responseTime: number | null;
  sslDaysLeft: number | null;
  dnsResolved: boolean | null;
  redirectCount: number | null;
  error: string | null;
}

interface SeoData {
  checkedAt: string;
  score: number;
  robotsTxtFound: boolean;
  robotsBlocked: boolean;
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
  hasBreadcrumbSchema: boolean;
  hasHowToSchema: boolean;
  hasProductSchema: boolean;
  internalLinks: number;
  hasIndexNow: boolean;
  issues: SeoIssue[];
}

interface GeoData {
  checkedAt: string;
  totalScore: number;
  discoverScore: number;
  answerScore: number;
  citationScore: number;
  entityScore: number;
  readabilityScore: number;
  llmsTxtFound: boolean;
  aiTxtFound: boolean;
  gptBotAllowed: boolean;
  claudeBotAllowed: boolean;
  perplexityAllowed: boolean;
  googleExtAllowed: boolean;
  sitemapFound: boolean;
  sitemapUrlCount: number | null;
  hasStructuredData: boolean;
  hasCanonical: boolean;
  hasFaq: boolean;
  wordCount: number;
  wordCountOk: boolean;
  avgParaWords: number;
  hasLists: boolean;
  headingCount: number;
  hasAuthor: boolean;
  hasDateInfo: boolean;
  hasExtLinks: boolean;
  isHttps: boolean;
  hasOrgSchema: boolean;
  hasArticleSchema: boolean;
  hasTrustLinks: boolean;
  hasOrgName: boolean;
  hasProductMention: boolean;
  hasLocation: boolean;
  hasContactInfo: boolean;
  hasSemanticHtml: boolean;
  jsIndependent: boolean;
  hasTables: boolean;
  hasListsAi: boolean;
  hasAltTexts: boolean;
  imgWithoutAltCount: number;
  paraLengthOk: boolean;
  headingStructOk: boolean;
  findings: GeoFinding[];
}

interface FullReport {
  overallScore: number;
  speedScore: number;
  seoScore: number;
  geoScore: number;
  uptime: UptimeData;
  seo: SeoData;
  geo: GeoData;
}

const categoryLabels: Record<string, string> = {
  discoverability: "Discoverability",
  answerability: "Answerability",
  citation: "Citation Readiness",
  entity: "Entity Coverage",
  readability: "AI Readability",
};

function scoreColor(s: number) {
  return s >= 80 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";
}
function scoreRing(s: number) {
  return s >= 80 ? "stroke-emerald-500" : s >= 50 ? "stroke-amber-500" : "stroke-red-500";
}

function ScoreRing({ score, size = 96, label }: { score: number; size?: number; label: string }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth="8" className="stroke-slate-700" />
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth="8" className={scoreRing(score)}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize={size / 4.2} fontWeight="bold" className={`fill-current ${scoreColor(score)}`}>{score}</text>
      </svg>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

function MiniBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={`font-semibold ${color}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function Check({ label, ok, detail }: { label: string; ok: boolean | null; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
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

const issueSeverityCls: Record<string, string> = {
  error: "bg-red-500/15 text-red-400 border-red-500/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};
const issueSeverityIcon: Record<string, string> = { error: "✕", warning: "⚠", info: "ℹ" };

const findingSeverityCls: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};
const findingSeverityIcon: Record<string, string> = { good: "✓", warning: "⚠", error: "✕" };

export function SiteReportModal({
  siteId,
  siteName,
  onClose,
}: {
  siteId: string;
  siteName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [geoFilter, setGeoFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/full-check`);
      if (res.ok) {
        const j = await res.json();
        setData(j);
      }
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { load(); }, [load]);

  async function runFull() {
    setRunning(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/full-check`, { method: "POST" });
      if (res.ok) setData(await res.json());
    } finally {
      setRunning(false);
    }
  }

  const geoCategories = ["all", "discoverability", "answerability", "citation", "entity", "readability"];
  const filteredFindings = data?.geo.findings.filter((f) => geoFilter === "all" || f.category === geoFilter) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between gap-4 z-10">
          <div className="min-w-0">
            <h2 className="font-semibold text-lg truncate">{siteName}</h2>
            <p className="text-xs text-slate-500">Tek Rapor — Hız, SEO ve GEO bir arada</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={runFull}
              disabled={running}
              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {running ? "Çalışıyor..." : "Tam Kontrol Çalıştır"}
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none px-1">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="text-center py-16 text-slate-500">Yükleniyor...</div>
          ) : !data ? (
            <div className="text-center py-16">
              <p className="text-slate-400 mb-4">Bu site için henüz tam rapor yok.</p>
              <button
                onClick={runFull}
                disabled={running}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {running ? "Çalışıyor..." : "Tam Kontrol Çalıştır"}
              </button>
            </div>
          ) : (
            <>
              {/* Tek genel skor */}
              <div className="bg-slate-700/30 rounded-xl p-5 flex items-center gap-6 flex-wrap">
                <ScoreRing score={data.overallScore} size={104} label="Genel Skor" />
                <div className="flex-1 min-w-[220px] space-y-2.5">
                  <MiniBar label="Hız" score={data.speedScore} />
                  <MiniBar label="SEO" score={data.seoScore} />
                  <MiniBar label="GEO (AI Görünürlüğü)" score={data.geoScore} />
                </div>
              </div>

              {/* Sıra: GEO → SEO → Hız — tüm sonuçlar tek ekranda */}
              <SectionHeader label="GEO" emphasize />
              <GeoTab
                geo={data.geo}
                filter={geoFilter}
                setFilter={setGeoFilter}
                categories={geoCategories}
                filteredFindings={filteredFindings}
              />
              <p className="text-xs text-slate-600 text-right">
                Son güncelleme: {new Date(data.geo.checkedAt).toLocaleString("tr-TR")}
              </p>

              <SectionHeader label="SEO" />
              <SeoTab seo={data.seo} />
              <p className="text-xs text-slate-600 text-right">
                Son güncelleme: {new Date(data.seo.checkedAt).toLocaleString("tr-TR")}
              </p>

              <SectionHeader label="Hız" />
              <SpeedTab uptime={data.uptime} />
              <p className="text-xs text-slate-600 text-right">
                Son güncelleme: {new Date(data.uptime.checkedAt).toLocaleString("tr-TR")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, emphasize }: { label: string; emphasize?: boolean }) {
  return (
    <div className={`flex items-center gap-2 pt-1 pb-2 border-b-2 ${emphasize ? "border-cyan-400" : "border-slate-700"}`}>
      <h3 className={`text-base font-bold ${emphasize ? "text-cyan-300" : "text-slate-200"}`}>{label}</h3>
      {emphasize && <span className="text-[10px] text-cyan-400" title="Öncelikli odak">★</span>}
    </div>
  );
}

function SpeedTab({ uptime }: { uptime: UptimeData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-slate-700/20 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Performans</h4>
        <Check label="HTTP Durum" ok={uptime.httpStatus != null && uptime.httpStatus < 400} detail={uptime.httpStatus?.toString() ?? "—"} />
        <Check label="TTFB" ok={uptime.ttfb != null ? uptime.ttfb < 1000 : null} detail={uptime.ttfb != null ? `${uptime.ttfb} ms` : "—"} />
        <Check label="Yanıt süresi" ok={uptime.responseTime != null ? uptime.responseTime < 2000 : null} detail={uptime.responseTime != null ? `${uptime.responseTime} ms` : "—"} />
        <Check label="Yönlendirme sayısı" ok={(uptime.redirectCount ?? 0) <= 2} detail={`${uptime.redirectCount ?? 0}`} />
      </div>
      <div className="bg-slate-700/20 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Erişilebilirlik</h4>
        <Check label="DNS çözümlendi" ok={uptime.dnsResolved} />
        <Check label="SSL geçerlilik" ok={uptime.sslDaysLeft != null ? uptime.sslDaysLeft > 15 : null} detail={uptime.sslDaysLeft != null ? `${uptime.sslDaysLeft} gün` : "—"} />
        <Check label="Durum" ok={uptime.status === "healthy"} detail={uptime.status} />
      </div>
      {uptime.error && (
        <div className="sm:col-span-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 font-mono break-all">
          {uptime.error}
        </div>
      )}
    </div>
  );
}

function SeoTab({ seo }: { seo: SeoData }) {
  const snippetLabel = () => {
    if (seo.hasNosnippet) return "Kapalı (nosnippet)";
    if (seo.maxSnippet === 0) return "0 (kapalı)";
    if (seo.maxSnippet === -1) return "Sınırsız";
    if (seo.maxSnippet != null) return `max ${seo.maxSnippet} kr`;
    return "Varsayılan";
  };

  return (
    <div className="space-y-4">
      {seo.issues.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sorunlar</h4>
          {seo.issues.map((issue, i) => (
            <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${issueSeverityCls[issue.severity]}`}>
              <span className="mt-0.5 shrink-0 font-bold">{issueSeverityIcon[issue.severity]}</span>
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-700/20 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Crawlability & Index</h4>
          <Check label="robots.txt" ok={seo.robotsTxtFound} />
          <Check label="Botlar engellenmiş" ok={!seo.robotsBlocked} />
          <Check label="Hreflang" ok={seo.hasHreflang || null} />
          <Check label="noindex yok" ok={!seo.noindex} />
          <Check label="Snippet izni" ok={!seo.hasNosnippet} detail={snippetLabel()} />
          <Check label="IndexNow" ok={seo.hasIndexNow} />
        </div>

        <div className="bg-slate-700/20 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Metadata</h4>
          <Check label="Title" ok={!!seo.title} detail={seo.titleLength ? `${seo.titleLength} kr` : undefined} />
          <Check label="Description" ok={!!seo.description} detail={seo.descLength ? `${seo.descLength} kr` : undefined} />
          <Check label="OG Title" ok={seo.hasOgTitle} />
          <Check label="OG Description" ok={seo.hasOgDesc} />
          <Check label="OG Image" ok={seo.hasOgImage} />
        </div>

        <div className="bg-slate-700/20 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ek Schema Türleri</h4>
          <Check label="BreadcrumbList" ok={seo.hasBreadcrumbSchema} />
          <Check label="HowTo" ok={seo.hasHowToSchema || null} />
          <Check label="Product" ok={seo.hasProductSchema || null} />
          <p className="text-[11px] text-slate-600 mt-2">
            Organization / Article / FAQ şeması ve genel structured data → yukarıdaki GEO bölümünde.
          </p>
        </div>

        <div className="bg-slate-700/20 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Site Mimarisi</h4>
          <Check label="İç bağlantılar (≥3)" ok={seo.internalLinks >= 3} detail={`${seo.internalLinks}`} />
          <p className="text-[11px] text-slate-600 mt-2">
            Kelime sayısı, başlık yapısı, dış link ve alt text → yukarıdaki GEO bölümünde.
          </p>
        </div>
      </div>
    </div>
  );
}

function GeoTab({
  geo,
  filter,
  setFilter,
  categories,
  filteredFindings,
}: {
  geo: GeoData;
  filter: string;
  setFilter: (c: string) => void;
  categories: string[];
  filteredFindings: GeoFinding[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MiniBar label="Discoverability" score={geo.discoverScore} />
        <MiniBar label="Answerability" score={geo.answerScore} />
        <MiniBar label="Citation Readiness" score={geo.citationScore} />
        <MiniBar label="Entity Coverage" score={geo.entityScore} />
        <MiniBar label="AI Readability" score={geo.readabilityScore} />
      </div>

      <div>
        <div className="flex gap-1 flex-wrap mb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                filter === cat ? "bg-cyan-600/40 text-cyan-300" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {cat === "all" ? "Tümü" : categoryLabels[cat]}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {filteredFindings.length === 0 && <p className="text-xs text-slate-500 py-2">Bulgu yok.</p>}
          {filteredFindings.map((f, i) => (
            <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${findingSeverityCls[f.severity]}`}>
              <span className="mt-0.5 shrink-0 font-bold">{findingSeverityIcon[f.severity]}</span>
              <div>
                <span className="opacity-60 mr-1">[{categoryLabels[f.category]}]</span>
                {f.message}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-700/20 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Discoverability</h4>
          <Check label="llms.txt" ok={geo.llmsTxtFound} />
          <Check label="ai.txt" ok={geo.aiTxtFound} />
          <Check label="GPTBot erişimi" ok={geo.gptBotAllowed} />
          <Check label="ClaudeBot erişimi" ok={geo.claudeBotAllowed} />
          <Check label="PerplexityBot erişimi" ok={geo.perplexityAllowed} />
          <Check label="Google-Extended erişimi" ok={geo.googleExtAllowed} />
          <Check label="Sitemap" ok={geo.sitemapFound} detail={geo.sitemapUrlCount ? `${geo.sitemapUrlCount} URL` : undefined} />
          <Check label="Structured Data" ok={geo.hasStructuredData} />
          <Check label="Canonical" ok={geo.hasCanonical} />
        </div>

        <div className="bg-slate-700/20 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Answerability</h4>
          <Check label="FAQ içeriği" ok={geo.hasFaq} />
          <Check label="Kelime sayısı (500–2000)" ok={geo.wordCountOk} detail={`${geo.wordCount}`} />
          <Check label="Paragraf uzunluğu" ok={geo.paraLengthOk} detail={geo.avgParaWords > 0 ? `ort. ${geo.avgParaWords} kelime` : undefined} />
          <Check label="Liste kullanımı" ok={geo.hasLists} />
          <Check label="Başlık sayısı (≥3)" ok={geo.headingCount >= 3} detail={`${geo.headingCount}`} />
          <Check label="Heading hiyerarşisi" ok={geo.headingStructOk} />
        </div>

        <div className="bg-slate-700/20 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Citation Readiness</h4>
          <Check label="Yazar/kuruluş bilgisi" ok={geo.hasAuthor} />
          <Check label="Tarih / güncelleme sinyali" ok={geo.hasDateInfo} />
          <Check label="Dış kaynak bağlantısı" ok={geo.hasExtLinks} />
          <Check label="HTTPS" ok={geo.isHttps} />
          <Check label="Organization schema" ok={geo.hasOrgSchema} />
          <Check label="Article schema" ok={geo.hasArticleSchema} />
          <Check label="Güven sayfaları (about/contact)" ok={geo.hasTrustLinks} />
        </div>

        <div className="bg-slate-700/20 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Entity & AI Readability</h4>
          <Check label="Organizasyon entity" ok={geo.hasOrgName} />
          <Check label="Ürün/hizmet entity" ok={geo.hasProductMention} />
          <Check label="Konum bilgisi" ok={geo.hasLocation} />
          <Check label="İletişim bilgisi" ok={geo.hasContactInfo} />
          <Check label="İçerik statik HTML'de" ok={geo.jsIndependent} />
          <Check label="Semantik HTML" ok={geo.hasSemanticHtml} />
          <Check label="Tablo / liste" ok={geo.hasTables || geo.hasListsAi} />
          <Check label="Alt text (görseller)" ok={geo.hasAltTexts} detail={geo.imgWithoutAltCount > 0 ? `${geo.imgWithoutAltCount} eksik` : "hepsi var"} />
        </div>
      </div>
    </div>
  );
}
