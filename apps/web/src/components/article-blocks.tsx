import * as React from "react";
import Markdoc, { Node as MarkdocNode } from "@markdoc/markdoc";
import { articleMarkdocConfig } from "../../keystatic.config";

export function ArticleBlocks({
  blocks,
}: {
  blocks: readonly MarkdocNode[];
}) {
  const document = new MarkdocNode("document", {}, [...blocks]);
  const renderable = Markdoc.transform(document, articleMarkdocConfig);
  return <>{Markdoc.renderers.react(renderable, React)}</>;
}
