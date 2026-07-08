"use client";

import { useEffect, useState } from "react";

interface GeoFinding {
  category: string;
  message: string;
  severity: "good" | "warning" | "error";
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
  paraLengthOk: boolean;
  headingStructOk: boolean;
  findings: GeoFinding[];
}

const categoryLabels: Record<string, string> = {
  discoverability: "Discoverability",
  answerability: "Answerability",
  citation: "Citation Readiness",
  entity: "Entity Coverage",
  readability: "AI Readability",
};

const severityStyle = {
  good: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};
const severityIcon = { good: "✓", warning: "⚠", error: "✕" };

function barColor(s: number) {
  return s >= 70 ? "text-emerald-400" : s >= 45 ? "text-amber-400" : "text-red-400";
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = barColor(score);
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

function TotalRing({ score }: { score: number }) {
  const color = barColor(score);
  const ring = color.replace("text-", "stroke-");
  const r = 34, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" className="stroke-slate-700" />
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" className={ring}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 44 44)" />
        <text x="44" y="50" textAnchor="middle" fontSize="20" fontWeight="bold" className={`fill-current ${color}`}>{score}</text>
      </svg>
      <span className="text-xs text-slate-500">GEO Skoru</span>
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

export function GeoPanel({ siteId }: { siteId: string }) {
  const [data, setData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => { if (open && !data) loadExisting(); }, [open]);

  async function loadExisting() {
    const res = await fetch(`/api/sites/${siteId}/geo`);
    if (res.ok) { const j = await res.json(); setData(j); }
  }

  async function runGeo() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/geo`, { method: "POST" });
      if (!res.ok) return;
      setData(await res.json());
      setOpen(true);
    } finally { setLoading(false); }
  }

  const categories = ["all", "discoverability", "answerability", "citation", "entity", "readability"];
  const filtered = data?.findings.filter(f => activeTab === "all" || f.category === activeTab) ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={runGeo} disabled={loading}
          className="px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
          {loading ? "GEO analiz..." : "GEO Analiz"}
        </button>
        {data && (
          <button onClick={() => setOpen(!open)}
            className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded-lg text-xs transition-colors">
            {open ? "Kapat" : `GEO Raporu (${data.totalScore}/100)`}
          </button>
        )}
      </div>

      {open && data && (
        <div className="mt-4 space-y-4">
          {/* Özet + barlar */}
          <div className="bg-slate-700/30 rounded-xl p-4 flex items-center gap-6">
            <TotalRing score={data.totalScore} />
            <div className="flex-1 space-y-2.5">
              <ScoreBar label="Discoverability" score={data.discoverScore} />
              <ScoreBar label="Answerability" score={data.answerScore} />
              <ScoreBar label="Citation Readiness" score={data.citationScore} />
              <ScoreBar label="Entity Coverage" score={data.entityScore} />
              <ScoreBar label="AI Readability" score={data.readabilityScore} />
            </div>
          </div>

          {/* Findings */}
          <div>
            <div className="flex gap-1 flex-wrap mb-3">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveTab(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${activeTab === cat ? "bg-cyan-600/40 text-cyan-300" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"}`}>
                  {cat === "all" ? "Tümü" : categoryLabels[cat]}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              {filtered.length === 0 && <p className="text-xs text-slate-500 py-2">Bulgu yok.</p>}
              {filtered.map((f, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${severityStyle[f.severity]}`}>
                  <span className="mt-0.5 shrink-0 font-bold">{severityIcon[f.severity]}</span>
                  <div>
                    <span className="opacity-60 mr-1">[{categoryLabels[f.category]}]</span>
                    {f.message}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detay grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-700/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Discoverability</h4>
              <Check label="llms.txt" ok={data.llmsTxtFound} />
              <Check label="ai.txt" ok={data.aiTxtFound} />
              <Check label="GPTBot erişimi" ok={data.gptBotAllowed} />
              <Check label="ClaudeBot erişimi" ok={data.claudeBotAllowed} />
              <Check label="PerplexityBot erişimi" ok={data.perplexityAllowed} />
              <Check label="Google-Extended erişimi" ok={data.googleExtAllowed} />
              <Check label="Sitemap" ok={data.sitemapFound} />
              <Check label="Structured Data" ok={data.hasStructuredData} />
              <Check label="Canonical" ok={data.hasCanonical} />
            </div>

            <div className="bg-slate-700/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Answerability</h4>
              <Check label="FAQ içeriği" ok={data.hasFaq} />
              <Check label="Kelime sayısı (500–2000)" ok={data.wordCountOk} detail={`${data.wordCount}`} />
              <Check label="Paragraf uzunluğu" ok={data.paraLengthOk} detail={data.avgParaWords > 0 ? `ort. ${data.avgParaWords} kelime` : undefined} />
              <Check label="Liste kullanımı" ok={data.hasLists} />
              <Check label="Başlık sayısı (≥3)" ok={data.headingCount >= 3} detail={`${data.headingCount}`} />
            </div>

            <div className="bg-slate-700/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Citation Readiness</h4>
              <Check label="Yazar bilgisi" ok={data.hasAuthor} />
              <Check label="Tarih / güncelleme sinyali" ok={data.hasDateInfo} />
              <Check label="Dış kaynak bağlantısı" ok={data.hasExtLinks} />
              <Check label="HTTPS" ok={data.isHttps} />
              <Check label="Organization schema" ok={data.hasOrgSchema} />
              <Check label="Article schema" ok={data.hasArticleSchema} />
              <Check label="Güven sayfaları (about/contact)" ok={data.hasTrustLinks} />
            </div>

            <div className="bg-slate-700/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Entity & AI Readability</h4>
              <Check label="Organizasyon entity" ok={data.hasOrgName} />
              <Check label="Ürün/hizmet entity" ok={data.hasProductMention} />
              <Check label="Konum bilgisi" ok={data.hasLocation} />
              <Check label="İletişim bilgisi" ok={data.hasContactInfo} />
              <Check label="İçerik statik HTML'de" ok={data.jsIndependent} />
              <Check label="Semantik HTML" ok={data.hasSemanticHtml} />
              <Check label="Tablo / liste" ok={data.hasTables || data.hasListsAi} />
              <Check label="Heading hiyerarşisi" ok={data.headingStructOk} />
              <Check label="Alt text (görseller)" ok={data.hasAltTexts} />
            </div>
          </div>

          <p className="text-xs text-slate-600 text-right">
            Son analiz: {new Date(data.checkedAt).toLocaleString("tr-TR")}
          </p>
        </div>
      )}
    </div>
  );
}
