import https from "https";
import http from "http";
import { URL } from "url";
import dns from "dns/promises";
import tls from "tls";

export interface CheckResult {
  status: "healthy" | "warning" | "critical";
  httpStatus: number | null;
  ttfb: number | null;
  responseTime: number | null;
  sslDaysLeft: number | null;
  dnsResolved: boolean;
  redirectCount: number;
  error: string | null;
}

async function checkSSL(hostname: string): Promise<number | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        if (!cert || !cert.valid_to) return resolve(null);
        const expires = new Date(cert.valid_to);
        const days = Math.floor(
          (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        resolve(days);
      }
    );
    socket.on("error", () => resolve(null));
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(null);
    });
  });
}

async function fetchWithRedirects(
  url: string,
  maxRedirects = 10
): Promise<{
  httpStatus: number;
  ttfb: number;
  responseTime: number;
  redirectCount: number;
}> {
  let currentUrl = url;
  let redirectCount = 0;
  const startAll = Date.now();

  while (redirectCount <= maxRedirects) {
    const parsed = new URL(currentUrl);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;

    const result = await new Promise<{
      status: number;
      ttfb: number;
      location?: string;
    }>((resolve, reject) => {
      const start = Date.now();
      let ttfb = 0;

      const req = lib.get(
        currentUrl,
        {
          headers: { "User-Agent": "WOMP-Monitor/1.0" },
          timeout: 10000,
        },
        (res) => {
          ttfb = Date.now() - start;
          res.resume();
          resolve({
            status: res.statusCode ?? 0,
            ttfb,
            location: res.headers.location,
          });
        }
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out"));
      });
    });

    if (
      [301, 302, 303, 307, 308].includes(result.status) &&
      result.location
    ) {
      redirectCount++;
      currentUrl = new URL(result.location, currentUrl).toString();
      continue;
    }

    return {
      httpStatus: result.status,
      ttfb: result.ttfb,
      responseTime: Date.now() - startAll,
      redirectCount,
    };
  }

  throw new Error("Too many redirects");
}

export async function checkSite(url: string): Promise<CheckResult> {
  let dnsResolved = false;
  let sslDaysLeft: number | null = null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // DNS check
    try {
      await dns.lookup(hostname);
      dnsResolved = true;
    } catch {
      return {
        status: "critical",
        httpStatus: null,
        ttfb: null,
        responseTime: null,
        sslDaysLeft: null,
        dnsResolved: false,
        redirectCount: 0,
        error: "DNS resolution failed",
      };
    }

    // SSL check (parallel with HTTP)
    const sslPromise =
      parsed.protocol === "https:" ? checkSSL(hostname) : Promise.resolve(null);

    const httpPromise = fetchWithRedirects(url);

    const [sslResult, httpResult] = await Promise.all([
      sslPromise,
      httpPromise,
    ]);

    sslDaysLeft = sslResult;

    const { httpStatus, ttfb, responseTime, redirectCount } = httpResult;

    // Determine status
    let status: "healthy" | "warning" | "critical" = "healthy";

    if (httpStatus >= 500 || httpStatus === 0) {
      status = "critical";
    } else if (httpStatus >= 400) {
      status = "warning";
    } else if (ttfb > 2000) {
      status = "warning";
    } else if (sslDaysLeft !== null && sslDaysLeft < 15) {
      status = "warning";
    }

    if (sslDaysLeft !== null && sslDaysLeft <= 0) {
      status = "critical";
    }

    return {
      status,
      httpStatus,
      ttfb,
      responseTime,
      sslDaysLeft,
      dnsResolved,
      redirectCount,
      error: null,
    };
  } catch (err) {
    return {
      status: "critical",
      httpStatus: null,
      ttfb: null,
      responseTime: null,
      sslDaysLeft,
      dnsResolved,
      redirectCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
