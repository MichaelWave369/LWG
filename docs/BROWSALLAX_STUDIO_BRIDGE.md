# Browsallax × LWG: Living Web Studio bridge

## Already real

- LWG is a static local-first authoring studio: scenes, layers, motion tracks, visual design mode, editable project JSON, scoped custom CSS, generated export, isolated Live preview.
- Browsallax Web is a browser/PWA companion with a Free Tools Dock and Research Mode; it cannot inspect arbitrary cross-origin pages from GitHub Pages.
- Browsallax Desktop includes an Electron browser and a grant-gated DOM-first Browser Operator, screenshot fallback, local planning, receipts and selected-text capture. These are governed browsing features, **not** a remote website CSS editor today.

## Rung 3 integration

- LWG shows a **Browsallax** launcher; Browsallax Free Tools Dock can show an **LWG Studio** launcher.
- Links open regular browser tabs (`noopener noreferrer`); no tokens, cookies, browser automation capabilities, project JSON or images are automatically shared.
- The LWG live preview uses a sandbox without `allow-same-origin`, so editor code does not gain iframe script access. Do not imply that opening Browsallax from LWG grants new operator authority.

## Future governed interface (not implemented)

A safe `PV-LWG-BROWSE-0.1` might contain bounded *user-requested* `observe`, `screenshot`, `measure-layout` and `compare-render` operations, transported through Browsallax-owned Desktop. Return provenance, source URL, screenshot/DOM hashes, bounding boxes, and explicit user grants. A separate LWG import step converts those data packets into a proposed style profile. Untrusted webpage content must never become executable instructions or have write authority over an LWG project. Avoid arbitrary DOM injection, raw script execution, unsandboxed iframes and cross-origin iframe DOM access.

Before implementation, verify Browsallax's current task schema, owner/origin binding, grant lifecycle, receipts and the web/desktop distinction. Browser permissions and copyright/terms apply to reference capture. Extract *design grammar* as inspiration; do not clone third-party protected site content.
