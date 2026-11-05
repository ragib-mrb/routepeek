/* Browser code for the routepeek page. Bundled into a string at build time. */

interface Field {
  name: string;
  in: 'path' | 'query' | 'body' | 'header';
  type: string;
  required: boolean;
  source: 'path' | 'validator' | 'learned';
}
interface Route {
  method: string;
  path: string;
  partialPath: boolean;
  handlers: string[];
  fields: Field[];
  seen: number;
}

const BASE = (window as unknown as { __ROUTEPEEK_BASE__: string }).__ROUTEPEEK_BASE__;
const STORE_KEY = 'routepeek:v1';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const listEl = byId<HTMLUListElement>('routes');
const detailEl = byId<HTMLElement>('detail');
const searchEl = byId<HTMLInputElement>('search');
const countEl = byId<HTMLElement>('count');

let routes: Route[] = [];
let current: Route | undefined;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const c of children) node.append(c);
  return node;
}

/* ---------- saved inputs (per browser, best effort) ---------- */

type Saved = Record<string, Record<string, string>>;
function loadSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Saved;
  } catch {
    return {};
  }
}
function save(key: string, values: Record<string, string>) {
  try {
    const all = loadSaved();
    all[key] = values;
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked: inputs just aren't remembered.
  }
}

/* ---------- route list ---------- */

function renderList() {
  const q = searchEl.value.trim().toLowerCase();
  listEl.replaceChildren();
  const shown = routes.filter((r) => `${r.method} ${r.path}`.toLowerCase().includes(q));
  for (const r of shown) {
    const btn = el(
      'button',
      { type: 'button' },
      el('span', { className: `method m-${r.method}` }, r.method),
      el('span', { className: 'path' }, r.path),
    );
    if (r.seen > 0) btn.append(el('span', { className: 'seen', title: 'Requests seen' }, String(r.seen)));
    if (r === current) btn.setAttribute('aria-current', 'true');
    btn.addEventListener('click', () => select(r));
    listEl.append(el('li', {}, btn));
  }
  if (shown.length === 0) listEl.append(el('li', { className: 'muted' }, '  No routes match.'));
}

/* ---------- request form ---------- */

const sampleFor = (type: string): unknown => {
  if (type.includes('number')) return 0;
  if (type.includes('boolean')) return false;
  if (type.includes('array')) return [];
  if (type.includes('object')) return {};
  if (type === 'email') return 'name@example.test';
  return '';
};

function fieldRow(f: Field, value: string) {
  const id = `f-${f.in}-${f.name}`;
  const input = el('input', { id, value, placeholder: f.type });
  input.dataset.in = f.in;
  input.dataset.name = f.name;
  const tag = `${f.type}${f.required ? ', required' : ''} · ${f.source}`;
  return el(
    'div',
    { className: 'row' },
    el('label', { htmlFor: id }, f.name),
    input,
    el('span', { className: 'tag' }, tag),
  );
}

function extraRow(where: 'query' | 'header') {
  const name = el('input', { placeholder: 'name', ariaLabel: `Extra ${where} name` });
  const value = el('input', { placeholder: 'value', ariaLabel: `Extra ${where} value` });
  name.dataset.extra = where;
  value.dataset.extraValue = where;
  return el('div', { className: 'row' }, name, value, el('span'));
}

function select(r: Route) {
  current = r;
  renderList();
  const key = `${r.method} ${r.path}`;
  const saved = loadSaved()[key] ?? {};
  const groups: Record<Field['in'], Field[]> = { path: [], query: [], header: [], body: [] };
  for (const f of r.fields) groups[f.in].push(f);

  const parts: Node[] = [
    el(
      'h2',
      {},
      el('span', { className: `method m-${r.method}` }, r.method),
      ' ',
      el('span', { className: 'path' }, r.path),
    ),
    el('p', { className: 'muted' }, `Handlers: ${r.handlers.join(' → ') || '—'}`),
  ];
  if (r.partialPath) {
    parts.push(
      el(
        'p',
        { className: 'note' },
        'Part of this path (…) is unknown. Import routepeek before your routes, or call this route once and reload.',
      ),
    );
  }

  for (const where of ['path', 'query', 'header'] as const) {
    const fields = groups[where];
    if (where === 'path' && fields.length === 0) continue;
    parts.push(el('h3', {}, where === 'path' ? 'Path' : where === 'query' ? 'Query' : 'Headers'));
    for (const f of fields) parts.push(fieldRow(f, saved[`${f.in}:${f.name}`] ?? ''));
    if (where !== 'path') parts.push(extraRow(where));
  }

  if (!['GET', 'HEAD', 'DELETE'].includes(r.method) || groups.body.length > 0) {
    const sample: Record<string, unknown> = {};
    for (const f of groups.body) sample[f.name] = sampleFor(f.type);
    const body = el('textarea', { id: 'body', ariaLabel: 'Request body (JSON)' });
    body.value = saved.body ?? (groups.body.length ? JSON.stringify(sample, null, 2) : '');
    parts.push(el('h3', {}, 'Body (JSON)'), body);
    if (groups.body.length) {
      parts.push(
        el(
          'p',
          { className: 'tag' },
          groups.body.map((f) => `${f.name}: ${f.type}${f.required ? '' : '?'} (${f.source})`).join(' · '),
        ),
      );
    }
  }

  const sendBtn = el('button', { type: 'button', className: 'btn primary' }, 'Send');
  const curlBtn = el('button', { type: 'button', className: 'btn' }, 'Copy as curl');
  const result = el('div', { id: 'result' });
  sendBtn.addEventListener('click', () => void send(r, result));
  curlBtn.addEventListener('click', () => {
    const req = buildRequest(r);
    const lines = [`curl -X ${r.method} '${new URL(req.url, location.href).href}'`];
    for (const [k, v] of Object.entries(req.headers)) lines.push(`  -H '${k}: ${v}'`);
    if (req.body) lines.push(`  --data '${req.body.replace(/'/g, `'\\''`)}'`);
    void navigator.clipboard?.writeText(lines.join(' \\\n')).then(
      () => (curlBtn.textContent = 'Copied'),
      () => (curlBtn.textContent = 'Copy failed'),
    );
    setTimeout(() => (curlBtn.textContent = 'Copy as curl'), 1500);
  });
  parts.push(el('div', { className: 'actions' }, sendBtn, curlBtn), result);
  detailEl.replaceChildren(...parts);
}

function buildRequest(r: Route) {
  const values: Record<string, string> = {};
  const query = new URLSearchParams();
  const headers: Record<string, string> = {};
  let path = r.path;

  detailEl.querySelectorAll<HTMLInputElement>('input[data-name]').forEach((input) => {
    const where = input.dataset.in!;
    const name = input.dataset.name!;
    values[`${where}:${name}`] = input.value;
    if (where === 'path') {
      path = path.replace(new RegExp(`[:*]${name}\\??`), encodeURIComponent(input.value));
    } else if (input.value !== '') {
      if (where === 'query') query.append(name, input.value);
      if (where === 'header') headers[name] = input.value;
    }
  });
  detailEl.querySelectorAll<HTMLInputElement>('input[data-extra]').forEach((nameInput) => {
    const valueInput = nameInput.nextElementSibling as HTMLInputElement;
    if (!nameInput.value) return;
    if (nameInput.dataset.extra === 'query') query.append(nameInput.value, valueInput.value);
    else headers[nameInput.value] = valueInput.value;
  });
  path = path.replace(/[{}]/g, '').replace(/\/…/g, '');

  const bodyEl = detailEl.querySelector<HTMLTextAreaElement>('#body');
  const body = bodyEl?.value.trim() ? bodyEl.value : undefined;
  if (bodyEl) values.body = bodyEl.value;
  if (body) headers['content-type'] ??= 'application/json';
  save(`${r.method} ${r.path}`, values);

  const qs = query.toString();
  return { url: qs ? `${path}?${qs}` : path, headers, body };
}

async function send(r: Route, out: HTMLElement) {
  const req = buildRequest(r);
  if (req.body) {
    try {
      JSON.parse(req.body);
    } catch {
      out.replaceChildren(el('p', { className: 'status s-err' }, 'The body is not valid JSON.'));
      return;
    }
  }
  out.replaceChildren(el('p', { className: 'muted' }, 'Sending…'));
  const method = r.method === 'ALL' ? 'GET' : r.method;
  const started = performance.now();
  try {
    const res = await fetch(req.url, { method, headers: req.headers, body: req.body });
    const ms = Math.round(performance.now() - started);
    const text = await res.text();
    let pretty = text;
    try {
      pretty = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // Not JSON: show as is.
    }
    const cls = res.status < 300 ? 's-ok' : res.status < 500 ? 's-warn' : 's-err';
    const headerText = [...res.headers.entries()].map(([k, v]) => `${k}: ${v}`).join('\n');
    out.replaceChildren(
      el('h3', {}, 'Response'),
      el(
        'p',
        {},
        el('span', { className: `status ${cls}` }, `${res.status} ${res.statusText}`),
        el('span', { className: 'muted' }, ` · ${ms} ms · ${text.length} bytes`),
      ),
      el('pre', {}, pretty || '(empty body)'),
      el('details', {}, el('summary', {}, 'Response headers'), el('pre', {}, headerText)),
    );
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    void refresh(false);
  } catch (err) {
    out.replaceChildren(el('p', { className: 'status s-err' }, `Request failed: ${(err as Error).message}`));
  }
}

/* ---------- load ---------- */

async function refresh(reselect: boolean) {
  try {
    const res = await fetch(`${BASE}/routes.json`, { cache: 'no-store' });
    const data = (await res.json()) as { routes: Route[] };
    const key = current && `${current.method} ${current.path}`;
    routes = data.routes;
    countEl.textContent = `${routes.length} route${routes.length === 1 ? '' : 's'}`;
    current = routes.find((r) => `${r.method} ${r.path}` === key);
    renderList();
    if (reselect && current) select(current);
  } catch {
    countEl.textContent = 'Could not load routes. Is the app still running?';
  }
}

searchEl.addEventListener('input', renderList);
void refresh(true);
