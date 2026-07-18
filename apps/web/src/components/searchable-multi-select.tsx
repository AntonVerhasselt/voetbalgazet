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
 * Gmail-style multi-select: selected values as chips in the input,
 * type to search, pick from a dropdown. Scales to 100+ options.
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
    if (selectedSet.has(option.value)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const haystack = `${option.label} ${option.hint ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  // Keep highlight in range without an effect (avoids cascading renders).
  const safeHighlight =
    filtered.length === 0 ? 0 : Math.min(highlight, filtered.length - 1);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function addValue(value: string) {
    if (selectedSet.has(value)) {
      return;
    }
    onChange([...selected, value]);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  function removeValue(value: string) {
    onChange(selected.filter((item) => item !== value));
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
      setHighlight((index) =>
        filtered.length === 0 ? 0 : Math.min(index + 1, filtered.length - 1),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[safeHighlight];
      if (option) {
        addValue(option.value);
      }
    }
  }

  return (
    <div className="audience-combobox" ref={rootRef}>
      <div
        className={`audience-combobox-field${disabled ? " is-disabled" : ""}`}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {selected.map((value) => {
          const option = labelByValue.get(value);
          return (
            <span key={value} className="audience-combobox-chip">
              <span>{option?.label ?? value}</span>
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
      {open && !disabled && (
        <ul id={listId} className="audience-combobox-menu" role="listbox">
          {filtered.length === 0 ? (
            <li className="audience-combobox-empty">{emptyMessage}</li>
          ) : (
            filtered.slice(0, 80).map((option, index) => (
              <li key={option.value} role="option" aria-selected={index === safeHighlight}>
                <button
                  type="button"
                  className={`audience-combobox-option${
                    index === safeHighlight ? " is-highlighted" : ""
                  }`}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => addValue(option.value)}
                >
                  <span>{option.label}</span>
                  {option.hint ? (
                    <span className="audience-combobox-hint">{option.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
