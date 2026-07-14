import Link from "next/link";

const navItems = [
  { href: "/admin/newsletter", label: "Nieuwsbrieven" },
  { href: "/admin/subscribers", label: "Abonnees" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[#1a1a1a]/20 bg-[#fffef9]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#666]">
              Redactie
            </p>
            <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold">
              De Voetbalgazet
            </h1>
          </div>
          <nav className="flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[#444] hover:text-[#1a1a1a] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
