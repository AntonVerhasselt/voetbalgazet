"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { canonicalizeDivisionKey } from "@convex/lib/neonSeriesMap";
import {
  pipelineApi,
  type PipelineDivisionRow,
} from "@/lib/pipeline-api";

const STORAGE_KEY = "pipeline.reeks";

const reeksListeners = new Set<() => void>();
let reeksMemory: string | null = null;

function subscribeReeks(onStoreChange: () => void) {
  reeksListeners.add(onStoreChange);
  return () => {
    reeksListeners.delete(onStoreChange);
  };
}

function getReeksSnapshot(): string | null {
  if (typeof window === "undefined") return reeksMemory;
  try {
    return localStorage.getItem(STORAGE_KEY) ?? reeksMemory;
  } catch {
    return reeksMemory;
  }
}

function getReeksServerSnapshot(): string | null {
  return null;
}

function persistReeks(key: string) {
  reeksMemory = key;
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // ignore quota / private mode
  }
  for (const listener of reeksListeners) {
    listener();
  }
}

type PipelineDivisionContextValue = {
  canEdit: boolean;
  divisions: PipelineDivisionRow[] | undefined;
  divisionKey: string | null;
  selectedDivision: PipelineDivisionRow | null;
  setDivisionKey: (key: string) => void;
  withReeksQuery: (href: string) => string;
};

const PipelineDivisionContext =
  createContext<PipelineDivisionContextValue | null>(null);

export function PipelineDivisionProvider({
  canEdit,
  children,
}: {
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const divisions = useQuery(pipelineApi.listDivisionsForPipeline);
  const storedKey = useSyncExternalStore(
    subscribeReeks,
    getReeksSnapshot,
    getReeksServerSnapshot,
  );

  const urlKey = searchParams.get("reeks");

  const divisionKey = useMemo(() => {
    const raw = urlKey ?? storedKey ?? divisions?.[0]?.key ?? null;
    if (!raw) return null;
    const candidate = canonicalizeDivisionKey(raw);
    if (!divisions) return candidate;
    if (divisions.some((d) => d.key === candidate)) return candidate;
    if (divisions.some((d) => d.key === raw)) return raw;
    return divisions[0]?.key ?? null;
  }, [urlKey, storedKey, divisions]);

  const selectedDivision = useMemo(() => {
    if (!divisionKey || !divisions) return null;
    return divisions.find((d) => d.key === divisionKey) ?? null;
  }, [divisionKey, divisions]);

  const setDivisionKey = useCallback(
    (key: string) => {
      persistReeks(key);
      const params = new URLSearchParams(searchParams.toString());
      params.set("reeks", key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Sync URL when we resolved from localStorage / default.
  useEffect(() => {
    if (!divisionKey || urlKey === divisionKey) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("reeks", divisionKey);
    router.replace(`${pathname}?${params.toString()}`);
    persistReeks(divisionKey);
  }, [divisionKey, urlKey, pathname, router, searchParams]);

  const withReeksQuery = useCallback(
    (href: string) => {
      if (!divisionKey) return href;
      const [path, existing] = href.split("?");
      const params = new URLSearchParams(existing ?? "");
      params.set("reeks", divisionKey);
      return `${path}?${params.toString()}`;
    },
    [divisionKey],
  );

  const value = useMemo(
    () => ({
      canEdit,
      divisions,
      divisionKey,
      selectedDivision,
      setDivisionKey,
      withReeksQuery,
    }),
    [
      canEdit,
      divisions,
      divisionKey,
      selectedDivision,
      setDivisionKey,
      withReeksQuery,
    ],
  );

  return (
    <PipelineDivisionContext.Provider value={value}>
      {children}
    </PipelineDivisionContext.Provider>
  );
}

export function usePipelineDivision(): PipelineDivisionContextValue {
  const ctx = useContext(PipelineDivisionContext);
  if (!ctx) {
    throw new Error("usePipelineDivision moet binnen PipelineDivisionProvider");
  }
  return ctx;
}
