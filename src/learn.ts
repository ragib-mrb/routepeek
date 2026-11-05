import type { Field, FieldLocation } from './types.js';

/**
 * What routepeek has seen for one route. Only names and types are kept,
 * never values, so tokens and personal data are not stored.
 */
interface Learned {
  seen: number;
  fields: Map<string, { in: FieldLocation; name: string; types: Set<string>; hits: number }>;
  /** A real base URL seen for this route, used when the mount path is unknown. */
  sampleBase?: string;
}

const STANDARD_HEADERS = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'connection',
  'content-length',
  'content-type',
  'cookie',
  'host',
  'origin',
  'pragma',
  'referer',
  'user-agent',
  'if-none-match',
  'if-modified-since',
]);

const MAX_FIELDS_PER_ROUTE = 100;

export function typeOfValue(value: unknown, fromQuery: boolean): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (typeof value === 'object') return 'object';
  if (fromQuery && typeof value === 'string') {
    if (value !== '' && !Number.isNaN(Number(value))) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    return 'string';
  }
  return typeof value;
}

export class Learner {
  private readonly byRoute = new WeakMap<object, Learned>();

  record(
    route: object,
    req: { query?: unknown; body?: unknown; headers?: Record<string, unknown>; baseUrl?: string },
  ): void {
    let entry = this.byRoute.get(route);
    if (!entry) {
      entry = { seen: 0, fields: new Map() };
      this.byRoute.set(route, entry);
    }
    entry.seen++;
    if (req.baseUrl !== undefined) entry.sampleBase ??= req.baseUrl;

    const add = (where: FieldLocation, name: string, type: string) => {
      const key = `${where}:${name}`;
      let f = entry.fields.get(key);
      if (!f) {
        if (entry.fields.size >= MAX_FIELDS_PER_ROUTE) return;
        f = { in: where, name, types: new Set(), hits: 0 };
        entry.fields.set(key, f);
      }
      f.types.add(type);
      f.hits++;
    };

    if (req.query && typeof req.query === 'object') {
      for (const [k, v] of Object.entries(req.query)) add('query', k, typeOfValue(v, true));
    }
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      for (const [k, v] of Object.entries(req.body as Record<string, unknown>)) {
        add('body', k, typeOfValue(v, false));
      }
    }
    for (const name of Object.keys(req.headers ?? {})) {
      const lower = name.toLowerCase();
      if (STANDARD_HEADERS.has(lower) || lower.startsWith('sec-')) continue;
      add('header', lower, 'string');
    }
  }

  seen(route: object): number {
    return this.byRoute.get(route)?.seen ?? 0;
  }

  sampleBase(route: object): string | undefined {
    return this.byRoute.get(route)?.sampleBase;
  }

  fields(route: object): Field[] {
    const entry = this.byRoute.get(route);
    if (!entry) return [];
    return [...entry.fields.values()].map((f) => ({
      name: f.name,
      in: f.in,
      type: f.types.size === 1 ? [...f.types][0]! : [...f.types].sort().join(' | '),
      // Seen on every request: probably required.
      required: f.hits === entry.seen,
      source: 'learned' as const,
    }));
  }
}
