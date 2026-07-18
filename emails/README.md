# `@devoetbalgazet/emails`

Shared TipTap → HTML/plaintext renderer and compliance footer contract used by:

- **Convex sends** — `convex/lib/emailRender.ts` and `convex/lib/compliance.ts`
  re-export this package (plain TypeScript; no React Email editor runtime).
- **Browser admin editor** — `@react-email/editor` drafts TipTap JSON that this
  renderer must accept before content is sendable.

## Contract

Both runtimes consume the same sanitized TipTap JSON document shape. Any editor
extension that changes saved JSON must also be supported here before it can be
used for sendable content.

```ts
import {
  renderCampaignEmail,
  sanitizeEditorDocumentJson,
} from "@devoetbalgazet/emails";
```

Parity and safety coverage lives in `tests/emailRender.test.ts`. Add or update
those tests whenever a new block, mark, or sanitizer behavior is introduced.
