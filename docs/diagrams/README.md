# C4 diagrams

Three draw.io files model the system at C4 levels 1–3:

| Source | Rendered | Scope |
| --- | --- | --- |
| [`c4-context.drawio`](c4-context.drawio) | [`PNG`](c4-context.png) · [`SVG`](c4-context.svg) | Actors, the system and external services |
| [`c4-container.drawio`](c4-container.drawio) | [`PNG`](c4-container.png) · [`SVG`](c4-container.svg) | Browser, Next.js server, Postgres, OCR and OpenRouter |
| [`c4-component.drawio`](c4-component.drawio) | [`PNG`](c4-component.png) · [`SVG`](c4-component.svg) | Components inside the browser and Next.js application |

Open a `.drawio` file in [draw.io](https://app.diagrams.net/) or the desktop app to edit it. The PNG
and SVG files are generated exports; regenerate them after editing rather than editing the exports.

## Regenerate the exports

The exports are produced with the headless draw.io Docker image. `--shm-size=1g` matters: the
component page crashes the Electron renderer with Docker's default shared-memory size. Run the
commands from this directory (`cd docs/diagrams`). The commands pin the digest that produced the
committed exports.

```bash
docker run --rm --shm-size=1g -v "$PWD:/data" \
  rlespinasse/drawio-desktop-headless@sha256:617683fbcbc373fa30901999e05b83f5874f0e3165e177245ceb1d69154f2c54 \
  -x -f svg -o /data/c4-context.svg /data/c4-context.drawio

docker run --rm --shm-size=1g -v "$PWD:/data" \
  rlespinasse/drawio-desktop-headless@sha256:617683fbcbc373fa30901999e05b83f5874f0e3165e177245ceb1d69154f2c54 \
  -x -f png -o /data/c4-context.png /data/c4-context.drawio
```

Repeat for `c4-container` and `c4-component`. On Windows PowerShell, use the absolute path in the
volume mount, for example `-v "C:\path\to\docs\diagrams:/data"`.

The ERD is Mermaid source in [`../ERD.md`](../ERD.md), not a draw.io file.
