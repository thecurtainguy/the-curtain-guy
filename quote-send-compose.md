# Quote send compose dialog

## Understanding
- Admin Send quote opens a full compose dialog (To/Cc/Bcc/Subject/body editable)
- Smart personalized defaults; live HTML preview matching sent mail
- PDF always attached; pick opportunity files; upload more with optional save-to-opportunity
- Bcc prefills admin@; explicit recipients own copy (no silent duplicate BCC)

## Decision log
- Approach: compose dialog + extended send API
- Body: editable plain text → branded HTML shell preview/send
- Extra uploads: per-file “Also save to opportunity files”
- Bcc: prefill admin@, editable; `copyOutbound: false` on this path

## Design
- UI: `AdminQuoteSendDialog` (Dialog, luxury cards)
- API: `POST /api/admin/quotes/[id]/send` accepts compose JSON (+ base64 extras or opportunity IDs)
- Shared helpers for defaults + HTML build used by dialog preview and server send
