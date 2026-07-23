"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type TeamComboboxOption = {
  key: string;
  label: string;
};

type TeamComboboxProps = {
  id?: string;
  options: readonly TeamComboboxOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  disabledPlaceholder?: string;
  maxResults?: number;
  onSearch?: (query: string, resultCount: number) => void;
  onSelect?: (teamKey: string) => void;
};

const CLEAR_KEY = "";

function rankMatches(
  options: readonly TeamComboboxOption[],
  query: string,
  limit: number,
): TeamComboboxOption[] {
  const normalized = query.trim().toLocaleLowerCase("nl-BE");
  if (!normalized) {
    return options.slice(0, limit);
  }

  const scored: Array<{ option: TeamComboboxOption; score: number }> = [];
  for (const option of options) {
    const label = option.label.toLocaleLowerCase("nl-BE");
    let score = -1;
    if (label.startsWith(normalized)) {
      score = 0;
    } else if (label.includes(` ${normalized}`)) {
      score = 1;
    } else if (label.includes(normalized)) {
      score = 2;
    }
    if (score >= 0) {
      scored.push({ option, score });
    }
  }

  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }
    return left.option.label.localeCompare(right.option.label, "nl-BE");
  });

  return scored.slice(0, limit).map((entry) => entry.option);
}

type MenuItem = {
  key: string;
  label: string;
  isClear?: boolean;
};

/**
 * Single-select searchable club picker for public signup / preferences.
 * Type to filter; shows the top matching clubs (default 5).
 */
export function TeamCombobox({
  id,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Zoek een club",
  disabledPlaceholder = "Kies eerst een reeks",
  maxResults = 5,
  onSearch,
  onSelect,
}: TeamComboboxProps) {
  const reactId = useId();
  const listId = `${reactId}-list`;
  const inputId = id ?? `${reactId}-input`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const sortedOptions = useMemo(
    () =>
      [...options].sort((left, right) =>
        left.label.localeCompare(right.label, "nl-BE"),
      ),
    [options],
  );

  const selectedOption = sortedOptions.find((option) => option.key === value);
  const matches = useMemo(
    () => rankMatches(sortedOptions, query, maxResults),
    [maxResults, query, sortedOptions],
  );

  const trimmedQuery = query.trim();
  const menuItems = useMemo(() => {
    const items: MenuItem[] = [];
    if (value || matches.length > 0 || !trimmedQuery) {
      items.push({
        key: CLEAR_KEY,
        label: "Geen favoriete club",
        isClear: true,
      });
    }
    for (const option of matches) {
      items.push({ key: option.key, label: option.label });
    }
    return items;
  }, [matches, trimmedQuery, value]);

  const safeHighlight =
    menuItems.length === 0
      ? 0
      : Math.min(highlight, menuItems.length - 1);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function openMenu(): void {
    if (disabled) {
      return;
    }
    setOpen(true);
    setQuery("");
    setHighlight(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  }

  function closeMenu(): void {
    setOpen(false);
    setQuery("");
  }

  function choose(next: string): void {
    onChange(next);
    if (next) {
      onSelect?.(next);
    }
    closeMenu();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      if (menuItems.length === 0) {
        return;
      }
      setHighlight((index) => Math.min(index + 1, menuItems.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const item = menuItems[safeHighlight];
      if (item) {
        choose(item.key);
      }
      return;
    }
    if (event.key === "Tab") {
      closeMenu();
    }
  }

  const displayValue = open ? query : (selectedOption?.label ?? "");
  const showPlaceholder = !displayValue;
  const activePlaceholder = disabled ? disabledPlaceholder : placeholder;

  return (
    <div
      className={`team-combobox${open ? " is-open" : ""}${
        disabled ? " is-disabled" : ""
      }${value && !open ? " has-value" : ""}`}
      ref={rootRef}
    >
      <div
        className="team-combobox__field"
        onClick={() => {
          if (!open) {
            openMenu();
          } else {
            inputRef.current?.focus();
          }
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="team-combobox__input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && menuItems[safeHighlight]
              ? `${listId}-option-${safeHighlight}`
              : undefined
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          disabled={disabled}
          value={displayValue}
          placeholder={showPlaceholder ? activePlaceholder : undefined}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setOpen(true);
            setHighlight(0);
            const nextMatches = rankMatches(
              sortedOptions,
              nextQuery,
              maxResults,
            );
            onSearch?.(nextQuery, nextMatches.length);
          }}
          onFocus={() => {
            if (!open) {
              openMenu();
            }
          }}
          onKeyDown={onKeyDown}
        />
        {value && !disabled ? (
          <button
            type="button"
            className="team-combobox__clear"
            aria-label="Wis favoriete club"
            onClick={(event) => {
              event.stopPropagation();
              choose(CLEAR_KEY);
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
        <button
          type="button"
          className="team-combobox__chevron"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? "Sluit clublijst" : "Open clublijst"}
          onClick={(event) => {
            event.stopPropagation();
            if (open) {
              closeMenu();
            } else {
              openMenu();
            }
          }}
        >
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
      </div>

      {open && !disabled ? (
        <ul
          id={listId}
          className="team-combobox__menu"
          role="listbox"
          aria-label="Clubs"
        >
          {menuItems.map((item, index) => {
            const isActive = index === safeHighlight;
            const isSelected = item.key === value;
            return (
              <li
                key={item.isClear ? "__clear__" : item.key}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`team-combobox__option${
                  isActive ? " is-active" : ""
                }${isSelected ? " is-selected" : ""}${
                  item.isClear ? " is-clear" : ""
                }`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  // Prevent input blur before click registers.
                  event.preventDefault();
                  choose(item.key);
                }}
              >
                <span className="team-combobox__option-label">
                  {item.label}
                </span>
                {isSelected ? (
                  <span
                    className="team-combobox__option-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                ) : null}
              </li>
            );
          })}
          {trimmedQuery && matches.length === 0 ? (
            <li className="team-combobox__empty" role="presentation">
              Geen clubs gevonden voor “{trimmedQuery}”
            </li>
          ) : null}
          {!trimmedQuery && sortedOptions.length > maxResults ? (
            <li className="team-combobox__hint" role="presentation">
              Typ om te zoeken · toont top {maxResults}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
