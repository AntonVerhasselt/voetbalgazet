/**
 * Rich TipTap document showcasing columns, CTAs, typography, lists, divider,
 * tables, code, and quote — used for visual send smoke tests after renderer fixes.
 */
export function richDemoNewsletterDocumentJson(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1, alignment: "left", style: "" },
        content: [
          {
            type: "text",
            text: "Zondag langs de lijn — editie met echte knoppen",
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { alignment: "left", style: "" },
        content: [
          {
            type: "text",
            text: "Deze testmail toont de volledige opmaak van De Voetbalgazet: koppen, kolommen, citaten, tabellen, lijsten én ",
          },
          {
            type: "text",
            marks: [{ type: "bold" }],
            text: "bulletproof knoppen",
          },
          {
            type: "text",
            text: " die in Gmail/Outlook zichtbaar blijven — plus ",
          },
          {
            type: "text",
            marks: [{ type: "underline" }],
            text: "onderstreepte",
          },
          {
            type: "text",
            text: " en ",
          },
          {
            type: "text",
            marks: [{ type: "strike" }],
            text: "doorgehaalde",
          },
          {
            type: "text",
            text: " markeringen.",
          },
        ],
      },
      {
        type: "image",
        attrs: {
          src: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80",
          alt: "Voetbal op het veld in de avondzon",
          width: 560,
          alignment: "center",
          href: "https://devoetbalgazet.be",
        },
      },
      {
        type: "spacer",
        attrs: { height: 16 },
      },
      {
        type: "twoColumns",
        attrs: { cellspacing: 16, style: "" },
        content: [
          {
            type: "columnsColumn",
            content: [
              {
                type: "heading",
                attrs: { level: 2, alignment: "left", style: "" },
                content: [{ type: "text", text: "Het laatste" }],
              },
              {
                type: "paragraph",
                attrs: { alignment: "left", style: "" },
                content: [
                  {
                    type: "text",
                    text: "Waarom de mooiste voetbalverhalen nog altijd langs de lijn beginnen — vrijwilligers, koffie en cornervlaggen.",
                  },
                ],
              },
              {
                type: "button",
                attrs: {
                  href: "/nieuws/zondagen-langs-de-lijn",
                  alignment: "left",
                  style: "",
                },
                content: [{ type: "text", text: "Lees het verhaal" }],
              },
            ],
          },
          {
            type: "columnsColumn",
            content: [
              {
                type: "heading",
                attrs: { level: 2, alignment: "left", style: "" },
                content: [{ type: "text", text: "Jeugd" }],
              },
              {
                type: "paragraph",
                attrs: { alignment: "left", style: "" },
                content: [
                  {
                    type: "text",
                    text: "De jeugdtrainer die winnen opnieuw leerde uitleggen — eerst een veld bouwen, dan pas scoren.",
                  },
                ],
              },
              {
                type: "button",
                attrs: {
                  href: "/nieuws/jeugdtrainer-met-een-plan",
                  alignment: "left",
                  variant: "accent",
                  style: "background-color:#9F2F24;color:#FFFDF8",
                },
                content: [{ type: "text", text: "Naar het jeugdstuk" }],
              },
            ],
          },
        ],
      },
      {
        type: "horizontalRule",
        attrs: {},
      },
      {
        type: "heading",
        attrs: { level: 3, alignment: "left", style: "" },
        content: [{ type: "text", text: "Drie kolommen — weekendplan" }],
      },
      {
        type: "threeColumns",
        attrs: { cellspacing: 12, style: "" },
        content: [
          {
            type: "columnsColumn",
            content: [
              {
                type: "heading",
                attrs: { level: 3, alignment: "left", style: "color:#9F2F24" },
                content: [{ type: "text", text: "Za" }],
              },
              {
                type: "paragraph",
                attrs: { alignment: "left", style: "font-size:14px" },
                content: [
                  { type: "text", text: "Jeugd U13 · 14u · K. Berchem" },
                ],
              },
            ],
          },
          {
            type: "columnsColumn",
            content: [
              {
                type: "heading",
                attrs: { level: 3, alignment: "left", style: "color:#9F2F24" },
                content: [{ type: "text", text: "Zo" }],
              },
              {
                type: "paragraph",
                attrs: { alignment: "left", style: "font-size:14px" },
                content: [
                  { type: "text", text: "Eerste ploeg · 15u · thuis" },
                ],
              },
            ],
          },
          {
            type: "columnsColumn",
            content: [
              {
                type: "heading",
                attrs: { level: 3, alignment: "left", style: "color:#9F2F24" },
                content: [{ type: "text", text: "Ma" }],
              },
              {
                type: "paragraph",
                attrs: { alignment: "left", style: "font-size:14px" },
                content: [
                  { type: "text", text: "Derde helft · kantine open" },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3, alignment: "left", style: "" },
        content: [{ type: "text", text: "Wat je deze week niet mag missen" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "Derde helft: ",
                  },
                  {
                    type: "text",
                    text: "hoe de kantine een club recht houdt.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "italic" }],
                    text: "Transfers zonder paniek",
                  },
                  {
                    type: "text",
                    text: " — rust in de kleedkamer blijft goud waard.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Tip: open dit mailtje op je telefoon — de knoppen moeten rood/zwart blijven.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "orderedList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Lees het weekendverslag." },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Deel met de kantineploeg." },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Klik minstens één knop — die moet eruitzien als een knop.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "“De derde helft is geen romantisch extraatje. Ze is een werkvergadering zonder agenda.”",
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3, alignment: "left", style: "" },
        content: [{ type: "text", text: "Stand — demo-tabel" }],
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Club" }],
                  },
                ],
              },
              {
                type: "tableHeader",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Ptn" }],
                  },
                ],
              },
              {
                type: "tableHeader",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Doelpuntensaldo" }],
                  },
                ],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "K. Racing" }],
                  },
                ],
              },
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "24" }],
                  },
                ],
              },
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "+11" }],
                  },
                ],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Sporting" }],
                  },
                ],
              },
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "21" }],
                  },
                ],
              },
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "+4" }],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { alignment: "left", style: "" },
        content: [
          {
            type: "text",
            text: "Inline code voor redacteuren: ",
          },
          {
            type: "text",
            marks: [{ type: "code" }],
            text: "rendererVersion=3",
          },
          {
            type: "text",
            text: ".",
          },
        ],
      },
      {
        type: "codeBlock",
        content: [
          {
            type: "text",
            text: "CTA checklist:\n- zwarte primary knop\n- rode accent knop\n- href=\"#\" → site home (nooit grijze tekst)",
          },
        ],
      },
      {
        type: "spacer",
        attrs: { height: 20 },
      },
      {
        type: "section",
        attrs: {
          style:
            "background-color:#F5F0E8;padding:20px 18px;border:1px solid #D4C8B8",
        },
        content: [
          {
            type: "heading",
            attrs: { level: 3, alignment: "center", style: "" },
            content: [{ type: "text", text: "Klaar voor meer lokaal voetbal?" }],
          },
          {
            type: "paragraph",
            attrs: { alignment: "center", style: "" },
            content: [
              {
                type: "text",
                text: "Pas je voorkeuren aan of duik meteen in het archief.",
              },
            ],
          },
          {
            type: "button",
            attrs: {
              href: "https://devoetbalgazet.be/archief",
              alignment: "center",
              style: "",
            },
            content: [{ type: "text", text: "Open het archief" }],
          },
          {
            type: "button",
            attrs: {
              href: "https://devoetbalgazet.be/voorkeuren",
              alignment: "center",
              variant: "accent",
              style: "background-color:#9F2F24;color:#FFFDF8",
            },
            content: [{ type: "text", text: "Voorkeuren aanpassen" }],
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { alignment: "left", style: "color:#6B5E52;font-size:13px" },
        content: [
          {
            type: "text",
            text: "P.S. Ook een knop die in de editor nog op “#” stond, moet nu als echte CTA verschijnen — niet als grijze tekst.",
          },
        ],
      },
      {
        type: "button",
        attrs: { href: "#", alignment: "left", style: "" },
        content: [{ type: "text", text: "Naar De Voetbalgazet" }],
      },
    ],
  });
}
