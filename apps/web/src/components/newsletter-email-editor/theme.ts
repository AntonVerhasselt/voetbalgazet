import { extendTheme } from "@react-email/editor/plugins";

/** De Voetbalgazet defaults for the React Email editor theme. */
export const voetbalgazetEmailTheme = extendTheme("basic", {
  body: {
    backgroundColor: "#F5F0E8",
    color: "#1A1510",
  },
  container: {
    backgroundColor: "#FFFFFF",
    width: "600px",
    padding: "28px 24px",
  },
  h1: {
    color: "#1A1510",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "28px",
    fontWeight: "700",
    lineHeight: "1.25",
  },
  h2: {
    color: "#1A1510",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "22px",
    fontWeight: "700",
    lineHeight: "1.25",
  },
  h3: {
    color: "#1A1510",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "18px",
    fontWeight: "700",
    lineHeight: "1.3",
  },
  link: {
    color: "#1A1510",
    textDecoration: "underline",
  },
  button: {
    backgroundColor: "#1A1510",
    color: "#F5F0E8",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    fontSize: "15px",
    fontWeight: "600",
    padding: "12px 18px",
  },
  image: {
    maxWidth: "100%",
  },
  codeBlock: {
    backgroundColor: "#F5F0E8",
    color: "#1A1510",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "13px",
    padding: "12px 14px",
  },
  inlineCode: {
    backgroundColor: "#F5F0E8",
    color: "#1A1510",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "0.9em",
  },
});
