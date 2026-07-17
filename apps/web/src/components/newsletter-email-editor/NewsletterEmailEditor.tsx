"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { Content, Editor, JSONContent } from "@tiptap/core";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { composeReactEmail } from "@react-email/editor/core";
import { StarterKit } from "@react-email/editor/extensions";
import {
  EmailTheming,
  imageSlashCommand,
  useEditorImage,
} from "@react-email/editor/plugins";
import {
  BubbleMenu,
  Inspector,
  SlashCommand,
} from "@react-email/editor/ui";
import "@react-email/editor/themes/default.css";

import { Spacer } from "./spacer-extension";
import { newsletterSlashCommands } from "./slash-commands";
import { voetbalgazetEmailTheme } from "./theme";

export type NewsletterEmailEditorRef = {
  getEmail: () => Promise<{ html: string; text: string }>;
  getEmailHTML: () => Promise<string>;
  getEmailText: () => Promise<string>;
  getJSON: () => JSONContent;
  editor: Editor | null;
};

export type NewsletterEmailEditorProps = {
  content?: Content;
  onUpdate?: (ref: NewsletterEmailEditorRef) => void;
  onReady?: (ref: NewsletterEmailEditorRef) => void;
  editable?: boolean;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
  className?: string;
  /** Show the design inspector sidebar (document / node / text). Default true. */
  showInspector?: boolean;
};

function emptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function buildRef(editor: Editor | null): NewsletterEmailEditorRef {
  return {
    editor,
    getJSON: () => editor?.getJSON() ?? emptyDoc(),
    getEmail: async () => {
      if (!editor) return { html: "", text: "" };
      return composeReactEmail({ editor, preview: undefined });
    },
    getEmailHTML: async () => {
      if (!editor) return "";
      const { html } = await composeReactEmail({ editor, preview: undefined });
      return html;
    },
    getEmailText: async () => {
      if (!editor) return "";
      const { text } = await composeReactEmail({ editor, preview: undefined });
      return text;
    },
  };
}

function EditorBridges({
  editorRef,
  onUpdate,
  onReady,
}: {
  editorRef: React.MutableRefObject<NewsletterEmailEditorRef | null>;
  onUpdate?: (ref: NewsletterEmailEditorRef) => void;
  onReady?: (ref: NewsletterEmailEditorRef) => void;
}) {
  const { editor } = useCurrentEditor();
  const readyFired = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onReadyRef.current = onReady;
  }, [onUpdate, onReady]);

  useEffect(() => {
    const helpers = buildRef(editor);
    editorRef.current = helpers;

    if (editor && !readyFired.current) {
      readyFired.current = true;
      onReadyRef.current?.(helpers);
    }

    if (!editor) return;

    const handleUpdate = () => {
      const next = buildRef(editor);
      editorRef.current = next;
      onUpdateRef.current?.(next);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, editorRef]);

  return null;
}

/**
 * Full-featured React Email editor for nieuwsbrief / dienstmail drafting.
 *
 * Includes StarterKit blocks (headings, lists, quote, code, button, section,
 * columns, table, divider), image upload, spacer, bubble menus, slash
 * commands, Voetbalgazet theming, and the design inspector sidebar.
 */
export const NewsletterEmailEditor = forwardRef<
  NewsletterEmailEditorRef,
  NewsletterEmailEditorProps
>(function NewsletterEmailEditor(
  {
    content,
    onUpdate,
    onReady,
    editable = true,
    placeholder,
    onUploadImage,
    className,
    showInspector = true,
  },
  ref,
) {
  const helpersRef = useRef<NewsletterEmailEditorRef | null>(null);

  useImperativeHandle(ref, () => ({
    getEmail: async () =>
      helpersRef.current?.getEmail() ?? { html: "", text: "" },
    getEmailHTML: async () => helpersRef.current?.getEmailHTML() ?? "",
    getEmailText: async () => helpersRef.current?.getEmailText() ?? "",
    getJSON: () => helpersRef.current?.getJSON() ?? emptyDoc(),
    get editor() {
      return helpersRef.current?.editor ?? null;
    },
  }));

  const uploadImage = useCallback(
    async (file: File) => {
      if (!onUploadImage) {
        throw new Error("Afbeelding uploaden is niet beschikbaar.");
      }
      return onUploadImage(file);
    },
    [onUploadImage],
  );

  const imageExtension = useEditorImage({ uploadImage });

  const extensions = useMemo(() => {
    return [
      StarterKit.configure(),
      Placeholder.configure({
        placeholder:
          placeholder ??
          (({ node }) => {
            if (node.type.name === "heading") {
              return `Kop ${node.attrs.level as number}`;
            }
            return "Typ '/' voor blokken (tekst, knop, kolommen, afbeelding, …)";
          }),
        includeChildren: true,
      }),
      EmailTheming.configure({ theme: voetbalgazetEmailTheme }),
      Spacer,
      // Always register image so existing image nodes remain in the schema
      // (paste/drop/slash upload only work when onUploadImage is provided).
      imageExtension,
    ];
  }, [placeholder, imageExtension]);

  const slashItems = useMemo(() => {
    if (onUploadImage) return newsletterSlashCommands;
    return newsletterSlashCommands.filter(
      (item) => item.title !== imageSlashCommand.title,
    );
  }, [onUploadImage]);

  return (
    <div
      className={[
        "newsletter-re-shell",
        showInspector ? "newsletter-re-shell--with-inspector" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="newsletter-re-shell__row">
        <EditorProvider
          extensions={extensions}
          content={content}
          editable={editable}
          immediatelyRender={false}
          editorContainerProps={{
            className: "newsletter-re-canvas",
          }}
        >
          <EditorBridges
            editorRef={helpersRef}
            onUpdate={onUpdate}
            onReady={onReady}
          />
          <BubbleMenu
            hideWhenActiveNodes={[
              "button",
              "horizontalRule",
              "image",
              "spacer",
            ]}
            hideWhenActiveMarks={["link"]}
          />
          <BubbleMenu.LinkDefault />
          <BubbleMenu.ButtonDefault />
          {onUploadImage ? <BubbleMenu.ImageDefault /> : null}
          <SlashCommand items={slashItems} />
          {showInspector ? (
            <Inspector.Root className="newsletter-re-inspector">
              <div className="newsletter-re-inspector__header">
                <span>Ontwerp</span>
                <p>
                  Document, blok of tekst selecteren om kleuren, padding,
                  typografie en uitlijning aan te passen.
                </p>
              </div>
              <Inspector.Breadcrumb />
              <Inspector.Document />
              <Inspector.Node />
              <Inspector.Text />
            </Inspector.Root>
          ) : null}
        </EditorProvider>
      </div>
      <p className="newsletter-re-hint">
        Typ <kbd>/</kbd> voor blokken (tekst, knop, sectie, 2–4 kolommen,
        spacer, tabel
        {onUploadImage ? ", afbeelding" : ""}) · selecteer tekst voor opmaak
        {showInspector ? " · klik een blok voor de inspector" : ""}
      </p>
    </div>
  );
});
