"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type ComboboxOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  options: ComboboxOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  "aria-label"?: string;
};

/**
 * Multi-select combobox matching segment-builder UX:
 * chips in the field, type-to-search, checkbox list that stays open,
 * select-all, chevron toggle. Styled for De Voetbalgazet admin.
 */
export function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Zoeken…",
  disabled,
  emptyMessage = "Geen resultaten",
  "aria-label": ariaLabel = "Zoek en selecteer",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selectedSet = new Set(selected);
  const labelByValue = new Map(options.map((option) => [option.value, option]));

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) => {
    if (!normalizedQuery) {
      return true;
    }
    const haystack = `${option.label} ${option.hint ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
  const visible = filtered.slice(0, 80);
  const selectedInVisible = visible.filter((option) =>
    selectedSet.has(option.value),
  ).length;
  const allVisibleSelected =
    visible.length > 0 && selectedInVisible === visible.length;

  // Keep highlight in range without an effect (avoids cascading renders).
  // highlight 0 = select-all row when menu has options.
  const maxHighlight = visible.length; // 0..visible.length inclusive
  const safeHighlight = Math.min(highlight, maxHighlight);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function toggleValue(value: string) {
    if (selectedSet.has(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
    setOpen(true);
    inputRef.current?.focus();
  }

  function removeValue(value: string) {
    onChange(selected.filter((item) => item !== value));
    inputRef.current?.focus();
  }

  function toggleSelectAllVisible() {
    if (visible.length === 0) {
      return;
    }
    if (allVisibleSelected) {
      const visibleValues = new Set(visible.map((option) => option.value));
      onChange(selected.filter((value) => !visibleValues.has(value)));
    } else {
      const next = new Set(selected);
      for (const option of visible) {
        next.add(option.value);
      }
      onChange([...next]);
    }
    setOpen(true);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && query === "" && selected.length > 0) {
      event.preventDefault();
      removeValue(selected[selected.length - 1]!);
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.min(index + 1, maxHighlight));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (!open) {
        setOpen(true);
        return;
      }
      // Space while typing should insert a space, not toggle.
      if (event.key === " " && query.length > 0) {
        return;
      }
      event.preventDefault();
      if (safeHighlight === 0) {
        toggleSelectAllVisible();
        return;
      }
      const option = visible[safeHighlight - 1];
      if (option) {
        toggleValue(option.value);
      }
    }
  }

  return (
    <div className="audience-combobox" ref={rootRef}>
      <div
        className={`audience-combobox-field${open ? " is-open" : ""}${
          disabled ? " is-disabled" : ""
        }`}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <div className="audience-combobox-values">
          {selected.map((value) => {
            const option = labelByValue.get(value);
            return (
              <span key={value} className="audience-combobox-chip">
                <span className="audience-combobox-chip-label">
                  {option?.label ?? value}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className="audience-combobox-chip-remove"
                    aria-label={`Verwijder ${option?.label ?? value}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeValue(value);
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
          <input
            ref={inputRef}
            className="audience-combobox-input"
            type="text"
            value={query}
            disabled={disabled}
            placeholder={selected.length === 0 ? placeholder : ""}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            role="combobox"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>
        <button
          type="button"
          className="audience-combobox-chevron"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? "Sluit lijst" : "Open lijst"}
          onClick={(event) => {
            event.stopPropagation();
            if (disabled) {
              return;
            }
            setOpen((wasOpen) => !wasOpen);
            if (!open) {
              inputRef.current?.focus();
            }
          }}
        >
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          className="audience-combobox-menu"
          role="listbox"
          aria-multiselectable="true"
        >
          {visible.length === 0 ? (
            <li className="audience-combobox-empty">{emptyMessage}</li>
          ) : (
            <>
              <li role="option" aria-selected={allVisibleSelected}>
                <button
                  type="button"
                  className={`audience-combobox-option audience-combobox-select-all${
                    safeHighlight === 0 ? " is-highlighted" : ""
                  }`}
                  onMouseEnter={() => setHighlight(0)}
                  onClick={(event) => {
                    event.preventDefault();
                    toggleSelectAllVisible();
                  }}
                >
                  <span
                    className={`audience-combobox-check${
                      allVisibleSelected ? " is-checked" : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    Selecteer alles ({selectedInVisible}/{visible.length})
                  </span>
                </button>
              </li>
              {visible.map((option, index) => {
                const checked = selectedSet.has(option.value);
                const rowIndex = index + 1;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={checked}
                  >
                    <button
                      type="button"
                      className={`audience-combobox-option${
                        rowIndex === safeHighlight ? " is-highlighted" : ""
                      }${checked ? " is-checked" : ""}`}
                      onMouseEnter={() => setHighlight(rowIndex)}
                      onClick={(event) => {
                        event.preventDefault();
                        toggleValue(option.value);
                      }}
                    >
                      <span
                        className={`audience-combobox-check${
                          checked ? " is-checked" : ""
                        }`}
                        aria-hidden="true"
                      />
                      <span className="audience-combobox-option-text">
                        <span>{option.label}</span>
                        {option.hint ? (
                          <span className="audience-combobox-hint">
                            {option.hint}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
