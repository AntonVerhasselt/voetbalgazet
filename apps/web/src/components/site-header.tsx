"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { capturePublicEvent } from "@/lib/analytics";

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20L16.5 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    inputRef.current?.focus();
    capturePublicEvent("search_opened", {
      source_page: "nav",
    });

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && !containerRef.current?.contains(target)) {
        setSearchOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const href = trimmed
      ? `/archief?q=${encodeURIComponent(trimmed)}`
      : "/archief";
    router.push(href);
    setSearchOpen(false);
  }

  return (
    <header className="site-header">
      <div className="shell site-header__utility">
        <span>Editie Vlaanderen</span>
        <span>Onafhankelijk lokaal voetbal</span>
      </div>
      <div className="shell site-header__brand">
        <Link className="wordmark" href="/" aria-label="De Voetbalgazet, home">
          De Voetbalgazet
        </Link>
        <p>Lokaal voetbal, echte verhalen.</p>
      </div>
      <nav className="site-nav" aria-label="Hoofdnavigatie">
        <div className="shell site-nav__inner">
          <div
            ref={containerRef}
            className={`site-nav__search${searchOpen ? " site-nav__search--open" : ""}`}
          >
            <button
              type="button"
              className="site-nav__search-toggle"
              aria-expanded={searchOpen}
              aria-controls={inputId}
              aria-label={searchOpen ? "Sluit zoeken" : "Zoeken"}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <SearchIcon />
            </button>
            <form
              className="site-nav__search-form"
              role="search"
              onSubmit={onSubmit}
              aria-hidden={!searchOpen}
            >
              <label className="sr-only" htmlFor={inputId}>
                Zoek in titel en intro
              </label>
              <input
                ref={inputRef}
                id={inputId}
                type="search"
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoek een verhaal"
                tabIndex={searchOpen ? 0 : -1}
                enterKeyHint="search"
              />
            </form>
          </div>
          <Link href="/archief">Archief</Link>
          <Link className="site-nav__subscribe" href="/#inschrijven">
            Abonneren
          </Link>
        </div>
      </nav>
    </header>
  );
}
