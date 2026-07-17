import { EmailNode } from "@react-email/editor/core";
import { mergeAttributes } from "@tiptap/core";

/** Vertical spacing block for email layouts. */
export const Spacer = EmailNode.create({
  name: "spacer",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      height: {
        default: 24,
        parseHTML: (element) => {
          const raw =
            element.getAttribute("data-height") ??
            element.style.height?.replace("px", "");
          const parsed = Number(raw);
          return Number.isFinite(parsed) ? parsed : 24;
        },
        renderHTML: (attributes) => ({
          "data-height": String(attributes.height ?? 24),
          style: `height:${Number(attributes.height ?? 24)}px;line-height:${Number(attributes.height ?? 24)}px`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="spacer"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "spacer",
        class: "node-spacer",
      }),
    ];
  },

  renderToReactEmail({ node }) {
    const height = Number(node.attrs?.height ?? 24);
    const safeHeight = Number.isFinite(height)
      ? Math.min(Math.max(height, 8), 96)
      : 24;
    return (
      <div
        style={{
          height: `${safeHeight}px`,
          lineHeight: `${safeHeight}px`,
          fontSize: "1px",
        }}
      >
        &nbsp;
      </div>
    );
  },
});
