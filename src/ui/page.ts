import clientScript from './client.generated.js';

const CSS = `
:root {
  --bg: #ffffff; --panel: #f6f7f9; --text: #1b1f24; --muted: #57606a; --border: #d0d7de;
  --accent: #0b57d0; --accent-text: #ffffff; --ok: #116329; --warn: #9a6700; --err: #b42318;
  --get: #116329; --post: #0b57d0; --put: #8250df; --patch: #9a6700; --delete: #b42318;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117; --panel: #161b22; --text: #e6edf3; --muted: #9da7b3; --border: #30363d;
    --accent: #4493f8; --accent-text: #0d1117; --ok: #3fb950; --warn: #d29922; --err: #f85149;
    --get: #3fb950; --post: #4493f8; --put: #a371f7; --patch: #d29922; --delete: #f85149;
  }
}
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; background: var(--bg); color: var(--text); }
header { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border); }
header h1 { font-size: 16px; margin: 0; }
header .count { color: var(--muted); }
main { display: grid; grid-template-columns: minmax(260px, 360px) 1fr; height: calc(100vh - 49px); }
@media (max-width: 760px) { main { grid-template-columns: 1fr; height: auto; } }
aside { border-right: 1px solid var(--border); overflow: auto; background: var(--panel); }
aside input { width: calc(100% - 24px); margin: 12px; }
ul { list-style: none; margin: 0; padding: 0 0 12px; }
li button { all: unset; box-sizing: border-box; display: flex; gap: 8px; width: 100%; padding: 6px 12px; cursor: pointer; align-items: baseline; }
li button:hover, li button[aria-current="true"] { background: var(--bg); }
li button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.method { font: 600 11px var(--mono); min-width: 52px; }
.m-GET { color: var(--get); } .m-POST { color: var(--post); } .m-PUT { color: var(--put); }
.m-PATCH { color: var(--patch); } .m-DELETE { color: var(--delete); }
.path { font-family: var(--mono); word-break: break-all; }
.seen { margin-left: auto; color: var(--muted); font-size: 12px; }
section { overflow: auto; padding: 16px 20px; }
h2 { font-size: 15px; margin: 0 0 4px; }
h3 { font-size: 13px; margin: 18px 0 6px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.row { display: grid; grid-template-columns: 180px 1fr auto; gap: 8px; align-items: center; margin-bottom: 6px; }
.row label { font-family: var(--mono); word-break: break-all; }
.tag { font-size: 11px; color: var(--muted); }
input, textarea, select { font: 13px var(--mono); color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; }
input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 0; }
textarea { width: 100%; min-height: 140px; resize: vertical; }
.actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.btn { font: 600 13px system-ui, sans-serif; border-radius: 6px; padding: 7px 14px; cursor: pointer; border: 1px solid var(--border); background: var(--panel); color: var(--text); }
.btn.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.status { font: 600 13px var(--mono); }
.s-ok { color: var(--ok); } .s-warn { color: var(--warn); } .s-err { color: var(--err); }
pre { font: 12px/1.5 var(--mono); background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 10px; overflow: auto; max-height: 50vh; white-space: pre-wrap; word-break: break-word; }
.muted { color: var(--muted); }
.note { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; color: var(--muted); }
`;

const escapeForScript = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c');

/** The whole page: HTML shell, styles and the client script, with no external files. */
export function renderPage(base: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>routepeek</title>
<style>${CSS}</style>
</head>
<body>
<header><h1>routepeek</h1><span class="count" id="count">Loading routes…</span></header>
<main>
  <aside aria-label="Routes">
    <input id="search" type="search" placeholder="Search routes" aria-label="Search routes">
    <ul id="routes"></ul>
  </aside>
  <section id="detail" aria-live="polite"><p class="muted">Pick a route on the left.</p></section>
</main>
<script>window.__ROUTEPEEK_BASE__ = ${escapeForScript(base)};</script>
<script>${clientScript.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;
}
