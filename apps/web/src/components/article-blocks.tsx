import type { ArticleBlock } from "@/content/articles";

export function ArticleBlocks({
  blocks,
}: {
  blocks: readonly ArticleBlock[];
}) {
  return blocks.map((block, index) => {
    const key = `${block.type}-${index}`;
    if (block.type === "heading") {
      return <h2 key={key}>{block.text}</h2>;
    }
    if (block.type === "quote") {
      return (
        <blockquote key={key}>
          <p>“{block.text}”</p>
          <cite>{block.attribution}</cite>
        </blockquote>
      );
    }
    return <p key={key}>{block.text}</p>;
  });
}
