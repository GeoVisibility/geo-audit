"use client";

const config = {
  healthy: { label: "Sağlıklı", cls: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30" },
  warning: { label: "Uyarı", cls: "bg-amber-500/20 text-amber-400 ring-amber-500/30" },
  critical: { label: "Kritik", cls: "bg-red-500/20 text-red-400 ring-red-500/30" },
};

export function StatusBadge({ status }: { status: string }) {
  const c = config[status as keyof typeof config] ?? config.critical;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${c.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}
