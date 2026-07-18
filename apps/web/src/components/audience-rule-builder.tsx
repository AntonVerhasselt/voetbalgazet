"use client";

import type { Id } from "@convex/_generated/dataModel";
import {
  AUDIENCE_FIELD_OPTIONS,
  createDefaultCondition,
  createEmptyGroup,
  type AudienceCondition,
  type AudienceRuleGroup,
} from "@convex/lib/audienceRules";
import { SearchableMultiSelect } from "@/components/searchable-multi-select";

export type AudienceCatalog = {
  provinces: Array<{ key: string; label: string }>;
  levels: Array<{ level: number; label: string }>;
  divisions: Array<{
    _id: Id<"divisions">;
    label: string;
    provinceKey: string;
    level: number;
  }>;
  teams: Array<{
    _id: Id<"teams">;
    label: string;
    provinceKey: string;
  }>;
  campaigns: Array<{
    _id: Id<"newsletterCampaigns">;
    label: string;
    sentAt: number | null;
  }>;
};

type Props = {
  catalog: AudienceCatalog;
  ruleGroups: AudienceRuleGroup[];
  onChange: (next: AudienceRuleGroup[]) => void;
  disabled?: boolean;
};

function fieldLabel(field: AudienceCondition["field"]): string {
  return (
    AUDIENCE_FIELD_OPTIONS.find((option) => option.field === field)?.label ??
    field
  );
}

function MultiSelectChips<T extends string>({
  options,
  selected,
  onToggle,
  disabled,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="audience-rule-chips">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={`preference-chip${checked ? " is-selected" : ""}`}
            style={{ cursor: disabled ? "default" : "pointer" }}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function toDateInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00`);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function ConditionEditor({
  condition,
  catalog,
  disabled,
  onChange,
  onRemove,
}: {
  condition: AudienceCondition;
  catalog: AudienceCatalog;
  disabled?: boolean;
  onChange: (next: AudienceCondition) => void;
  onRemove: () => void;
}) {
  const help =
    AUDIENCE_FIELD_OPTIONS.find((option) => option.field === condition.field)
      ?.help ?? "";

  return (
    <div className="audience-rule-condition">
      <div className="audience-rule-condition-header">
        <select
          className="audience-rule-select audience-rule-field"
          value={condition.field}
          disabled={disabled}
          aria-label="Filtertype"
          onChange={(event) => {
            const field = event.target.value as AudienceCondition["field"];
            onChange({
              ...createDefaultCondition(field),
              id: condition.id,
            });
          }}
        >
          {AUDIENCE_FIELD_OPTIONS.map((option) => (
            <option key={option.field} value={option.field}>
              {option.label}
            </option>
          ))}
        </select>
        {!disabled && (
          <button
            type="button"
            className="audience-rule-remove"
            aria-label={`Verwijder voorwaarde ${fieldLabel(condition.field)}`}
            onClick={onRemove}
          >
            ×
          </button>
        )}
      </div>
      {help ? <p className="audience-rule-help">{help}</p> : null}

      {condition.field === "province" && (
        <MultiSelectChips
          disabled={disabled}
          selected={condition.provinceKeys}
          options={catalog.provinces.map((province) => ({
            value: province.key,
            label: province.label,
          }))}
          onToggle={(key) => {
            const current = condition.provinceKeys;
            onChange({
              ...condition,
              provinceKeys: current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key],
            });
          }}
        />
      )}

      {condition.field === "division" && (
        <SearchableMultiSelect
          disabled={disabled}
          aria-label="Zoek reeksen"
          placeholder="Zoek reeks…"
          selected={condition.divisionIds as string[]}
          options={catalog.divisions.map((division) => ({
            value: division._id as string,
            label: division.label,
            hint: division.provinceKey,
          }))}
          onChange={(next) =>
            onChange({
              ...condition,
              divisionIds: next as Id<"divisions">[],
            })
          }
        />
      )}

      {condition.field === "division_level" && (
        <MultiSelectChips
          disabled={disabled}
          selected={condition.levels.map(String)}
          options={catalog.levels.map((level) => ({
            value: String(level.level),
            label: level.label,
          }))}
          onToggle={(value) => {
            const level = Number(value);
            const current = condition.levels;
            onChange({
              ...condition,
              levels: current.includes(level)
                ? current.filter((item) => item !== level)
                : [...current, level],
            });
          }}
        />
      )}

      {condition.field === "favorite_team" && (
        <SearchableMultiSelect
          disabled={disabled}
          aria-label="Zoek clubs"
          placeholder="Zoek club…"
          emptyMessage="Geen clubs gevonden"
          selected={condition.teamIds as string[]}
          options={catalog.teams.map((team) => ({
            value: team._id as string,
            label: team.label,
            hint: team.provinceKey,
          }))}
          onChange={(next) =>
            onChange({
              ...condition,
              teamIds: next as Id<"teams">[],
            })
          }
        />
      )}

      {condition.field === "has_favorite_team" && (
        <select
          className="audience-rule-select"
          value={condition.value ? "true" : "false"}
          disabled={disabled}
          aria-label="Heeft favoriete club"
          onChange={(event) =>
            onChange({
              ...condition,
              value: event.target.value === "true",
            })
          }
        >
          <option value="true">Ja</option>
          <option value="false">Nee</option>
        </select>
      )}

      {condition.field === "subscribed_within" && (
        <div className="audience-rule-inline">
          <span className="audience-rule-inline-label">In de laatste</span>
          <input
            className="audience-rule-number"
            type="number"
            min={1}
            max={120}
            disabled={disabled}
            value={condition.amount}
            aria-label="Aantal"
            onChange={(event) =>
              onChange({
                ...condition,
                amount: Number(event.target.value) || 1,
              })
            }
          />
          <select
            className="audience-rule-select"
            value={condition.unit}
            disabled={disabled}
            aria-label="Eenheid"
            onChange={(event) =>
              onChange({
                ...condition,
                unit: event.target.value as "days" | "weeks" | "months",
              })
            }
          >
            <option value="days">dagen</option>
            <option value="weeks">weken</option>
            <option value="months">maanden</option>
          </select>
        </div>
      )}

      {condition.field === "email_campaign" && (
        <>
          <div className="audience-rule-inline">
            <select
              className="audience-rule-select"
              value={condition.operator}
              disabled={disabled}
              aria-label="Mailactie"
              onChange={(event) =>
                onChange({
                  ...condition,
                  operator: event.target.value as
                    | "received"
                    | "opened"
                    | "clicked",
                })
              }
            >
              <option value="received">Ontving</option>
              <option value="opened">Opende</option>
              <option value="clicked">Klikte in</option>
            </select>
            <span className="audience-rule-inline-label">campagne(s)</span>
          </div>
          <SearchableMultiSelect
            disabled={disabled}
            aria-label="Zoek verzonden nieuwsbrieven"
            placeholder="Zoek verzonden nieuwsbrief…"
            emptyMessage={
              catalog.campaigns.length === 0
                ? "Nog geen verzonden nieuwsbrieven"
                : "Geen resultaten"
            }
            selected={condition.campaignIds as string[]}
            options={catalog.campaigns.map((campaign) => ({
              value: campaign._id as string,
              label: campaign.label,
              hint: campaign.sentAt
                ? new Date(campaign.sentAt).toLocaleDateString("nl-BE")
                : undefined,
            }))}
            onChange={(next) =>
              onChange({
                ...condition,
                campaignIds: next as Id<"newsletterCampaigns">[],
              })
            }
          />
        </>
      )}

      {condition.field === "email_activity" && (
        <div className="audience-rule-inline">
          <select
            className="audience-rule-select"
            value={condition.operator}
            disabled={disabled}
            aria-label="Mailactie"
            onChange={(event) =>
              onChange({
                ...condition,
                operator: event.target.value as
                  | "received"
                  | "opened"
                  | "clicked",
              })
            }
          >
            <option value="received">Ontving</option>
            <option value="opened">Opende</option>
            <option value="clicked">Klikte in</option>
          </select>
          <span className="audience-rule-inline-label">een mail</span>
          <select
            className="audience-rule-select"
            value={condition.relative}
            disabled={disabled}
            aria-label="Relatief"
            onChange={(event) =>
              onChange({
                ...condition,
                relative: event.target.value as "after" | "before",
              })
            }
          >
            <option value="after">na</option>
            <option value="before">vóór</option>
          </select>
          <input
            className="audience-rule-select"
            type="date"
            disabled={disabled}
            value={toDateInputValue(condition.at)}
            aria-label="Datum"
            onChange={(event) =>
              onChange({
                ...condition,
                at: fromDateInputValue(event.target.value),
              })
            }
          />
        </div>
      )}
    </div>
  );
}

export function AudienceRuleBuilder({
  catalog,
  ruleGroups,
  onChange,
  disabled,
}: Props) {
  function updateGroup(groupId: string, next: AudienceRuleGroup) {
    onChange(
      ruleGroups.map((group) => (group.id === groupId ? next : group)),
    );
  }

  function removeGroup(groupId: string) {
    onChange(ruleGroups.filter((group) => group.id !== groupId));
  }

  function addCondition(groupId: string) {
    onChange(
      ruleGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: [
                ...group.conditions,
                createDefaultCondition("division"),
              ],
            }
          : group,
      ),
    );
  }

  return (
    <div className="audience-rule-builder">
      <div className="audience-rule-intro">
        <h2>Publieksregels</h2>
        <p>
          Groepen worden met <strong>OF</strong> gecombineerd. Voorwaarden
          binnen een groep met <strong>EN</strong>. Leeg = alle actieve
          abonnees. Reeksen en clubs zoek je via de combobox (zoals e-mailadressen
          in Gmail).
        </p>
      </div>

      {ruleGroups.length === 0 && (
        <div className="audience-rule-empty">
          <p>Geen filters — iedereen die de nieuwsbrief volgt komt in aanmerking.</p>
          {!disabled && (
            <button
              type="button"
              className="audience-rule-add"
              onClick={() => onChange([createEmptyGroup()])}
            >
              + Regel toevoegen
            </button>
          )}
        </div>
      )}

      {ruleGroups.map((group, groupIndex) => (
        <div key={group.id}>
          {groupIndex > 0 && (
            <div className="audience-rule-or" aria-hidden="true">
              OF
            </div>
          )}
          <section className="audience-rule-group" aria-label={`Groep ${groupIndex + 1}`}>
            <div className="audience-rule-group-header">
              <span className="audience-rule-group-label">
                Groep {groupIndex + 1}
              </span>
              {!disabled && (
                <button
                  type="button"
                  className="audience-rule-remove"
                  aria-label={`Verwijder groep ${groupIndex + 1}`}
                  onClick={() => removeGroup(group.id)}
                >
                  ×
                </button>
              )}
            </div>

            {group.conditions.map((condition, conditionIndex) => (
              <div key={condition.id}>
                {conditionIndex > 0 && (
                  <div className="audience-rule-and" aria-hidden="true">
                    EN
                  </div>
                )}
                <ConditionEditor
                  condition={condition}
                  catalog={catalog}
                  disabled={disabled}
                  onChange={(next) =>
                    updateGroup(group.id, {
                      ...group,
                      conditions: group.conditions.map((item) =>
                        item.id === condition.id ? next : item,
                      ),
                    })
                  }
                  onRemove={() => {
                    const nextConditions = group.conditions.filter(
                      (item) => item.id !== condition.id,
                    );
                    if (nextConditions.length === 0) {
                      removeGroup(group.id);
                      return;
                    }
                    updateGroup(group.id, {
                      ...group,
                      conditions: nextConditions,
                    });
                  }}
                />
              </div>
            ))}

            {!disabled && (
              <button
                type="button"
                className="audience-rule-add audience-rule-add-and"
                onClick={() => addCondition(group.id)}
              >
                + En
              </button>
            )}
          </section>
        </div>
      ))}

      {!disabled && ruleGroups.length > 0 && (
        <button
          type="button"
          className="audience-rule-add audience-rule-add-or"
          onClick={() => onChange([...ruleGroups, createEmptyGroup()])}
        >
          + Of
        </button>
      )}
    </div>
  );
}
