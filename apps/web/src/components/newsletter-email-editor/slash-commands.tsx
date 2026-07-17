"use client";

import type { SlashCommandItem } from "@react-email/editor/ui";
import {
  defaultSlashCommands,
  MinusIcon,
  TableIcon,
} from "@react-email/editor/ui";
import { imageSlashCommand } from "@react-email/editor/plugins";

const SPACER: SlashCommandItem = {
  title: "Spacer",
  description: "Verticale ruimte tussen blokken",
  icon: <MinusIcon size={20} />,
  category: "Layout",
  searchTerms: ["spacer", "space", "gap", "ruimte", "witruimte"],
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: "spacer",
        attrs: { height: 24 },
      })
      .run();
  },
};

const TABLE: SlashCommandItem = {
  title: "Table",
  description: "Eenvoudige tabel (2×2)",
  icon: <TableIcon size={20} />,
  category: "Layout",
  searchTerms: ["table", "tabel", "grid"],
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [{ type: "paragraph" }],
              },
              {
                type: "tableHeader",
                content: [{ type: "paragraph" }],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [{ type: "paragraph" }],
              },
              {
                type: "tableCell",
                content: [{ type: "paragraph" }],
              },
            ],
          },
        ],
      })
      .run();
  },
};

/** Default slash commands plus image, spacer, and table. */
export const newsletterSlashCommands: SlashCommandItem[] = [
  ...defaultSlashCommands,
  imageSlashCommand,
  SPACER,
  TABLE,
];
