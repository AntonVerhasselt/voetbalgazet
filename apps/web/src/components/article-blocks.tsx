import * as React from "react";
import Markdoc from "@markdoc/markdoc";
import { articleMarkdocConfig } from "../../keystatic.config";

export function ArticleBlocks({
  blocks,
}: {
  blocks: readonly Markdoc.Node[];
}) {
  const document = new Markdoc.Node("document", {}, [...blocks]);
  const renderable = Markdoc.transform(document, articleMarkdocConfig);
  return <>{Markdoc.renderers.react(renderable, React)}</>;
}
