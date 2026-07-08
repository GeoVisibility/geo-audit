# SEO & GEO Kuralları — Next.js Projeleri İçin

Bu dosya bir Next.js projesine eklendiğinde Claude bu kurallara göre kod yazar.  
Kaynak: WOMP (Web Operations Monitoring Platform) projesinde geliştirilen analiz motoru.

---

## 1. METADATA — Her Sayfa İçin Zorunlu

```tsx
// app/[sayfa]/page.tsx
export const metadata: Metadata = {
  title: "Başlık | Marka",          // 50–60 karakter
  description: "Açıklama metni.",   // 120–160 karakter
  openGraph: {
    title: "...",
    description: "...",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  // AI snippet izni — hiçbir zaman kaldırma
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,        // sınırsız snippet
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};
```

**Kurallar:**
- `title` 50–60 karakter arası. Daha kısa veya uzun yazma.
- `description` 120–160 karakter arası.
- Her sayfada OG title, OG description, OG image ekle.
- `nosnippet`, `noindex`, `max-snippet:0` kullanma — AI sistemleri snippet üretemez.

---

## 2. CANONICAL & HREFLANG

```tsx
// Her sayfada canonical ekle
alternates: {
  canonical: "https://site.com/sayfa",
  languages: {
    "tr": "https://site.com/tr/sayfa",
    "en": "https://site.com/en/sayfa",
  },
},
```

---

## 3. STRUCTURED DATA (JSON-LD) — Zorunlu Schema Listesi

Her projede en az şunlar olmalı:

### Organization (site geneli — layout.tsx)
```tsx
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",           // veya LocalBusiness
  "name": "Marka Adı",
  "url": "https://site.com",
  "logo": "https://site.com/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+90-xxx-xxx-xxxx",
    "contactType": "customer service"
  },
  "address": {                       // varsa
    "@type": "PostalAddress",
    "addressLocality": "İstanbul",
    "addressCountry": "TR"
  }
};
```

### Article (blog/içerik sayfaları)
```tsx
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",                // veya BlogPosting
  "headline": "Başlık",
  "datePublished": "2025-01-01",
  "dateModified": "2025-01-15",      // güncelleme tarihi kritik
  "author": { "@type": "Person", "name": "Yazar Adı" },
  "publisher": { "@type": "Organization", "name": "Marka" },
};
```

### FAQPage (SSS içeren sayfalar)
```tsx
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Soru?",
      "acceptedAnswer": { "@type": "Answer", "text": "Cevap." }
    }
  ]
};
```

### BreadcrumbList (iç sayfalar)
```tsx
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "https://site.com" },
    { "@type": "ListItem", "position": 2, "name": "Kategori", "item": "https://site.com/kategori" },
  ]
};
```

**Schema ekleme:**
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

---

## 4. HEADING HİYERARŞİSİ

```
H1 → Sayfada tam olarak 1 tane. Sayfa başlığı.
H2 → En az 2 tane. Ana bölümler.
H3 → H2 altında alt başlıklar.
```

- H1'den H3'e **atlama yapma**. H1 → H3 yanlış, H1 → H2 → H3 doğru.
- Her sayfada minimum: 1x H1, 2x H2.

---

## 5. İÇERİK KURALLARI

| Kural | Değer | Açıklama |
|-------|-------|----------|
| Kelime sayısı | 500–2000 | Az: AI alıntılamıyor. Çok: 5000+ daha az atıf alıyor |
| Paragraf uzunluğu | 50–100 kelime | AI chunk olarak işliyor |
| İç bağlantı | ≥ 3 | Her sayfada en az 3 iç link |
| Tarih sinyali | Zorunlu | `<time datetime="...">` veya Article schema |
| Liste formatı | Önerilir | `<ul>/<ol>` AI tarafından daha iyi işlenir |
| Tablo | Önerilir | Karşılaştırmalarda `<table>` kullan |
| Alt text | Zorunlu | Tüm `<img>` elemanlarında `alt` olmalı |

```tsx
// Tarih sinyali örneği
<time dateTime="2025-01-15">15 Ocak 2025</time>
```

---

## 6. SEMANTİK HTML

```tsx
// Doğru yapı
<header>...</header>
<main>
  <article>
    <section>...</section>
  </article>
  <aside>...</aside>
</main>
<footer>...</footer>
```

- `<div>` yerine anlamlı tag kullan: `<article>`, `<section>`, `<main>`, `<nav>`, `<aside>`.
- En az 2 semantik HTML elementi kullan.
- Kritik içerik JavaScript olmadan HTML'de görünmeli — `"use client"` sadece etkileşim için.

---

## 7. AI BOT ERİŞİMİ — robots.txt

```
User-agent: *
Disallow: /api/
Disallow: /admin/

# AI botlarına açıkça izin ver
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://site.com/sitemap.xml
```

**Asla şunu yapma:**
```
User-agent: GPTBot
Disallow: /        # ChatGPT siteyi göremez
```

---

## 8. llms.txt — AI Ajanlar İçin Site Haritası

`/public/llms.txt` dosyası oluştur:

```
# [Marka Adı]

> [Tek cümle açıklama]

## Hakkımızda
[Şirket/ürün açıklaması]

## Ana Sayfalar
- [Ana Sayfa](https://site.com/): [Açıklama]
- [Hizmetler](https://site.com/hizmetler): [Açıklama]
- [Hakkımızda](https://site.com/hakkimizda): [Açıklama]
- [İletişim](https://site.com/iletisim): [Açıklama]

## Ürün / Hizmetler
[Sunulan hizmetlerin kısa açıklaması]

## İletişim
- E-posta: info@site.com
- Telefon: +90 xxx xxx xxxx
- Adres: İstanbul, Türkiye
```

---

## 9. ai.txt — AI Eğitim Tercihleri

`/public/ai.txt` dosyası oluştur:

```
# AI Training Preferences
# https://site.com/ai.txt

Publisher: [Marka Adı]
Website: https://site.com

# Eğitim için izin
Allow-Training: yes

# Atıf zorunluluğu
Require-Attribution: yes
Attribution-URL: https://site.com

# Tercihler
Preferred-Language: tr
```

---

## 10. sitemap.xml — Next.js Otomatik

```tsx
// app/sitemap.ts
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://site.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://site.com/hizmetler", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    // dinamik sayfalar için prisma/db'den çek
  ];
}
```

---

## 11. IndexNow Desteği

```tsx
// app/api/indexnow/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // IndexNow key dosyası — Bing/Yandex anlık bildirim
  return new NextResponse(process.env.INDEXNOW_KEY ?? "", {
    headers: { "Content-Type": "text/plain" },
  });
}
```

---

## 12. İÇERİK YAPISI — BLUF Prensibi

Her içerik sayfasını şu yapıya göre yaz:

```
1. SONUÇ / ÖZET (ilk paragraf)    ← Tüm AI alıntılarının %44'ü ilk %30'dan
2. SSS bölümü (H3 ile soru formatı)
3. Detay bölümleri (H2 ile)
4. Kaynaklar / dış bağlantılar
5. Güncelleme tarihi
```

---

## 13. ENTITY COVERAGE — Kontrol Listesi

Sayfada şunların bulunduğundan emin ol:

- [ ] Organizasyon adı (schema ile işaretli)
- [ ] Ürün veya hizmet adı
- [ ] Konum / şehir bilgisi (varsa)
- [ ] İletişim: `<a href="tel:...">` veya `<a href="mailto:...">`
- [ ] Hakkımızda, İletişim, Gizlilik sayfalarına link

---

## 14. PUANLAMA REFERANSI (WOMP'tan)

| Kontrol | Ağırlık | Kritik mi? |
|---------|---------|-----------|
| Organization schema | 15 puan | Evet |
| Structured data (herhangi) | 15 puan | Evet |
| llms.txt | 20 puan | Hayır |
| AI bot erişimi (4 bot) | 50 puan | Evet |
| Sitemap | 10 puan | Hayır |
| FAQPage schema | 25 puan | Hayır |
| Kelime sayısı 500–2000 | 20 puan | Hayır |
| Tarih sinyali | 15 puan | Hayır |
| İçerik JS'siz erişilebilir | 25 puan | Evet |

---

## Kullanım

Bu dosyayı projenin köküne `CLAUDE.md` olarak kopyala.  
Claude, projeye her dokunduğunda bu kuralları otomatik uygular.

Kaynak proje: WOMP — Web Operations Monitoring Platform
