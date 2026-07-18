"use client";

import type { Id } from "@convex/_generated/dataModel";
import {
  AUDIENCE_FIELD_OPTIONS,
  createDefaultCondition,
  createEmptyGroup,
  type AudienceCondition,
  type AudienceRuleGroup,
} from "@convex/lib/audienceRules";

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
        <MultiSelectChips
          disabled={disabled}
          selected={condition.divisionIds as string[]}
          options={catalog.divisions.map((division) => ({
            value: division._id as string,
            label: division.label,
          }))}
          onToggle={(id) => {
            const typedId = id as Id<"divisions">;
            const current = condition.divisionIds;
            onChange({
              ...condition,
              divisionIds: current.includes(typedId)
                ? current.filter((item) => item !== typedId)
                : [...current, typedId],
            });
          }}
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
        <MultiSelectChips
          disabled={disabled}
          selected={condition.teamIds as string[]}
          options={catalog.teams.map((team) => ({
            value: team._id as string,
            label: team.label,
          }))}
          onToggle={(id) => {
            const typedId = id as Id<"teams">;
            const current = condition.teamIds;
            onChange({
              ...condition,
              teamIds: current.includes(typedId)
                ? current.filter((item) => item !== typedId)
                : [...current, typedId],
            });
          }}
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
          abonnees.
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
