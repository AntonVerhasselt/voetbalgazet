# Dutch Agent Conventions

## Rule

All **agent-authored** surfaces for the research-idea-agent are Dutch (Flemish editorial register — clear, concrete, local football).

Applies to:

| Surface | Language |
|---------|----------|
| `instructions.md` | Dutch |
| `skills/*.md` (body + description frontmatter) | Dutch |
| `defineTool({ description })` | Dutch |
| Zod `.describe()` for tool inputs | Dutch |
| IdeaBatch string values | Dutch |
| User-visible Eve / run error messages where we control copy | Dutch |
| Eval descriptions | Dutch or bilingual OK |

Does **not** force Dutch on:

- TypeScript identifiers in our app code (`pipelineArticles`, …)  
- Neon column names / SQL  
- JSON **keys** in the wire schema (we use Dutch keys in IdeaBatch for model clarity — see below — mapped in Convex)  
- Third-party log lines  

## IdeaBatch keys

Prefer Dutch keys in the schema the model fills (`ideetitel`, `waaromInteressant`, …) so the model stays in one language. Convex ingest maps to English/internal field names.

## Tone

- Local football, not press-agency English calques  
- Facts before adjectives  
- Interview questions/whyInterview: practical, respectful  

## Tool naming

Dutch snake filenames become tool names, e.g.:

- `zoek_gepubliceerde_artikelen`  
- `haal_artikel_samenvatting`  
- `haal_artikel_inhoud`  
- `lees_sitemap`  

## Instructions skeleton (outline)

```markdown
# Identiteit
Je bent de research- en voorstelagent van De Voetbalgazet …

# Harde regels
- Enkel Nederlandstalige output …
- Nooit statistieken verzinnen …
- Database alleen-lezen …
- Exact 5 ideeën …
- Gebruik zoek_gepubliceerde_artikelen vóór finaliseren …

# Werkwijze
1. Lees schema-documentatie
2. Verken Neon met TypeScript/SQL in de sandbox
3. Zoek overlappingen in het archief via tools
4. Lever IdeaBatch
```
