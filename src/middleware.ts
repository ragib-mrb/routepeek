import { discoverRoutes } from './discover.js';
import { Learner } from './learn.js';
import { renderPage } from './ui/page.js';
import type { Field, RouteInfo, RoutepeekOptions } from './types.js';

interface Req {
  method: string;
  path: string;
  baseUrl?: string;
  query?: unknown;
  body?: unknown;
  headers: Record<string, unknown>;
  route?: object;
  socket?: { remoteAddress?: string };
}
interface Res {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  on(event: 'finish', cb: () => void): void;
}
type Next = (err?: unknown) => void;
export type RoutepeekMiddleware = (req: Req, res: Res, next: Next) => void;

const LOOPBACK = /^(127\.\d+\.\d+\.\d+|::1|::ffff:127\.\d+\.\d+\.\d+)$/;

/** Validator fields win over learned ones; path params always come from the pattern. */
function mergeFields(groups: Field[][]): Field[] {
  const out = new Map<string, Field>();
  for (const group of groups) {
    for (const f of group) {
      const key = `${f.in}:${f.name}`;
      if (!out.has(key)) out.set(key, f);
    }
  }
  return [...out.values()];
}

/** Every route in the app, with its arguments merged from all sources. */
export function listRoutes(app: unknown, learner?: Learner): RouteInfo[] {
  return discoverRoutes(app, learner).map((r) => ({
    method: r.method,
    path: r.path,
    partialPath: r.partialPath,
    handlers: r.handlers,
    seen: learner?.seen(r.route) ?? 0,
    fields: mergeFields([
      r.pathFields,
      r.validatorFields.filter((f) => f.in !== 'path'),
      learner?.fields(r.route) ?? [],
    ]),
  }));
}

function send(res: Res, status: number, type: string, body: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(body);
}

const sendError = (res: Res, status: number, code: string, message: string) =>
  send(res, status, 'application/json; charset=utf-8', JSON.stringify({ error: { code, message } }));

/**
 * Express middleware: serves the routepeek page and learns arguments
 * from the requests your app handles. Add it with `app.use(routepeek(app))`.
 */
export function routepeek(app: unknown, options: RoutepeekOptions = {}): RoutepeekMiddleware {
  const enabled = options.enabled ?? process.env.NODE_ENV !== 'production';
  if (!enabled) return (_req, _res, next) => next();

  const base = `/${(options.path ?? '/__routepeek').replace(/^\/+|\/+$/g, '')}`;
  const learn = options.learn ?? true;
  const localOnly = options.localOnly ?? true;
  const learner = new Learner();

  return function routepeekMiddleware(req, res, next) {
    const isOwn = req.path === base || req.path.startsWith(`${base}/`);
    if (!isOwn) {
      if (learn) {
        res.on('finish', () => {
          if (req.route) learner.record(req.route, req);
        });
      }
      next();
      return;
    }

    if (localOnly && !LOOPBACK.test(req.socket?.remoteAddress ?? '')) {
      sendError(res, 403, 'local_only', 'routepeek only answers requests from this machine.');
      return;
    }
    if (req.method !== 'GET') {
      sendError(res, 405, 'method_not_allowed', 'Use GET for routepeek pages.');
      return;
    }

    const sub = req.path.slice(base.length).replace(/\/+$/, '');
    const fullBase = `${req.baseUrl ?? ''}${base}`;
    if (sub === '') {
      send(res, 200, 'text/html; charset=utf-8', renderPage(fullBase));
      return;
    }
    if (sub === '/routes.json') {
      const routes = listRoutes(app, learner).filter((r) => !r.path.startsWith(fullBase));
      send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ routes }));
      return;
    }
    sendError(res, 404, 'not_found', 'This routepeek page does not exist.');
  };
}
