# Email renderer contract

Newsletter and transactional email rendering has two runtimes:

- Convex sends mail from `convex/lib/emailRender.ts`. This renderer is plain
  TypeScript because Convex cannot rely on the browser editor runtime or React
  Email editor internals when preparing sends.
- The browser admin editor uses `@react-email/editor` in
  `apps/web/src/components/newsletter-email-editor/NewsletterEmailEditor.tsx`
  so editors get the visual drafting experience.

Both renderers consume the same sanitized TipTap JSON document shape. Any editor
extension that changes saved JSON must also be supported by the Convex renderer
before it can be used for sendable content.

Parity and safety coverage lives in `tests/emailRender.test.ts`. Add or update
those tests whenever a new block, mark, or sanitizer behavior is introduced.
