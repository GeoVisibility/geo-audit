import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WOMP — Web Operations Monitoring",
  description: "Web sitelerini tek panelden izle",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className="h-full">
      <body className="min-h-full bg-slate-900 text-slate-100 antialiased">
        <header className="border-b border-slate-700 bg-slate-800/60 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-sm select-none">
              W
            </div>
            <span className="font-semibold text-lg tracking-tight">WOMP</span>
            <span className="text-slate-400 text-sm hidden sm:block">
              Web Operations Monitoring
            </span>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
