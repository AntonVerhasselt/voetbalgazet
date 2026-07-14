"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

type AudienceFilter = {
  newsletterSubscribedOnly: boolean;
  divisionIds?: Id<"divisions">[];
  favoriteTeamIds?: Id<"teams">[];
  matchMode?: "any" | "all";
};

interface AudienceFilterPanelProps {
  initialFilter?: AudienceFilter;
  onSend: (filter: AudienceFilter) => void;
  sending: boolean;
}

export function AudienceFilterPanel({
  initialFilter,
  onSend,
  sending,
}: AudienceFilterPanelProps) {
  const divisions = useQuery(api.catalog.listDivisions, {});
  const teams = useQuery(api.catalog.listTeams, {});

  const [selectedDivisions, setSelectedDivisions] = useState<Id<"divisions">[]>(
    initialFilter?.divisionIds ?? [],
  );
  const [selectedTeams, setSelectedTeams] = useState<Id<"teams">[]>(
    initialFilter?.favoriteTeamIds ?? [],
  );
  const [matchMode, setMatchMode] = useState<"any" | "all">(
    initialFilter?.matchMode ?? "any",
  );

  const filter: AudienceFilter = {
    newsletterSubscribedOnly: true,
    divisionIds: selectedDivisions.length > 0 ? selectedDivisions : undefined,
    favoriteTeamIds: selectedTeams.length > 0 ? selectedTeams : undefined,
    matchMode,
  };

  const audienceCount = useQuery(api.newsletterEmails.previewAudienceCount, {
    audienceFilter: filter,
  });

  const toggleDivision = (id: Id<"divisions">) => {
    setSelectedDivisions((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const toggleTeam = (id: Id<"teams">) => {
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const groupedDivisions = divisions?.reduce(
    (acc, div) => {
      if (!acc[div.province]) acc[div.province] = [];
      acc[div.province]!.push(div);
      return acc;
    },
    {} as Record<string, typeof divisions>,
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-[#888]">
          Filter op reeks
        </label>
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setMatchMode("any")}
            className={`px-3 py-1 text-xs border ${matchMode === "any" ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "border-[#1a1a1a]/20"}`}
          >
            Eén van geselecteerd
          </button>
          <button
            onClick={() => setMatchMode("all")}
            className={`px-3 py-1 text-xs border ${matchMode === "all" ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "border-[#1a1a1a]/20"}`}
          >
            Alle geselecteerd
          </button>
        </div>
        {groupedDivisions &&
          Object.entries(groupedDivisions).map(([province, divs]) => (
            <div key={province} className="mb-3">
              <p className="mb-1 text-xs font-medium text-[#888]">{province}</p>
              <div className="flex flex-wrap gap-2">
                {divs?.map((div) => (
                  <button
                    key={div._id}
                    onClick={() => toggleDivision(div._id)}
                    className={`px-3 py-1 text-xs border transition-colors ${
                      selectedDivisions.includes(div._id)
                        ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                        : "border-[#1a1a1a]/20 hover:border-[#1a1a1a]/40"
                    }`}
                  >
                    {div.level} — {div.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        {selectedDivisions.length === 0 && (
          <p className="text-xs text-[#888]">Geen filter = alle abonnees</p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-[#888]">
          Filter op favoriete club
        </label>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {teams?.map((team) => (
            <button
              key={team._id}
              onClick={() => toggleTeam(team._id)}
              className={`px-3 py-1 text-xs border transition-colors ${
                selectedTeams.includes(team._id)
                  ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                  : "border-[#1a1a1a]/20 hover:border-[#1a1a1a]/40"
              }`}
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#1a1a1a]/10 pt-4">
        <p className="font-mono text-sm text-[#666]">
          {audienceCount !== undefined
            ? `${audienceCount} abonnee${audienceCount !== 1 ? "s" : ""} bereikt`
            : "Berekenen..."}
        </p>
        <button
          onClick={() => onSend(filter)}
          disabled={sending || audienceCount === 0}
          className="bg-[#1a1a1a] px-6 py-2 text-sm text-white hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {sending ? "Verzenden..." : "Verstuur naar publiek"}
        </button>
      </div>
    </div>
  );
}
