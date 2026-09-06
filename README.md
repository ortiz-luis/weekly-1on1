# Weekly 1:1

Sanitized static shell for a low-attention weekly 1:1 preparation workspace.

## Privacy model

This public repository contains application code and a generic seed only. Real meeting topics, deliverables and decisions are intended to stay in the user's browser data rather than being committed here.

The private source repository produces this public runtime through a sanitizing build step.

## PASQAL Quarkfoil Builder V1.7

The active presentation flow is:

`deck.md + local images -> Builder -> Quarkfoil PASQAL renderer -> preview -> browser Print/PDF`

Variable inputs are Markdown content and figures. Presentation identity and geometry are supplied by the pinned Quarkfoil PASQAL renderer.

Builder V1.7 is pinned to:

`ortiz-luis/quarkfoil@8bed44d3619bb1a4e6ce3b8dd2b17925830ca7b3`

Quarto/QMD and previous preview/parity layers are not loaded by the active application runtime.

## Deployment gate

Every GitHub Pages deployment checks that only the V1.7 Builder is active and runs an end-to-end browser smoke test that:

1. opens the Builder;
2. supplies a Markdown deck;
3. opens the real Quarkfoil PASQAL preview;
4. verifies PASQAL slide IDs;
5. prints the rendered presentation to PDF;
6. verifies the expected PDF page count.
