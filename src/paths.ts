import type { Field } from './types.js';

/** Turns a route path (string, RegExp or array of them) into display strings. */
export function pathStrings(path: unknown): string[] {
  if (Array.isArray(path)) return path.flatMap(pathStrings);
  if (typeof path === 'string') return [path];
  if (path instanceof RegExp) return [String(path)];
  return ['/'];
}

/** Joins a mount prefix and a route path without doubling or losing slashes. */
export function joinPaths(prefix: string, path: string): string {
  if (path.startsWith('/^') || path.startsWith('^')) return `${prefix}${path}`;
  const joined = `${prefix.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  const clean = joined.replace(/\/{2,}/g, '/');
  return clean.length > 1 ? clean.replace(/\/$/, '') : '/';
}

/**
 * Express 4 keeps a router's mount path only as a RegExp.
 * This turns the common shapes back into a path, or returns undefined.
 */
export function mountPathFromRegexp(regexp: unknown, keys: unknown): string | undefined {
  if (!(regexp instanceof RegExp)) return undefined;
  if ((regexp as RegExp & { fast_slash?: boolean }).fast_slash) return '';
  const names = Array.isArray(keys)
    ? keys.map((k: unknown) => (k as { name?: unknown }).name).map(String)
    : [];
  let src = regexp.source
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\(\?=\\\/\|\$\)$/, '');
  let i = 0;
  src = src.replace(/\(\?:\\\/\(\[\^\\?\/\]\+\?\)\)(\?)?/g, (_m, optional?: string) => {
    const name = names[i++] ?? `param${i}`;
    return `/:${name}${optional ? '?' : ''}`;
  });
  src = src.replace(/\\(.)/g, '$1');
  if (/[()[\]^$|+*?]/.test(src.replace(/:[\w$]+\?/g, ''))) return undefined;
  return src === '/' ? '' : src;
}

/** Path parameters named in a pattern, for example `:id` or `*rest`. */
export function pathParams(path: string): Field[] {
  const fields: Field[] = [];
  const seen = new Set<string>();
  const re = /([:*])([A-Za-z_$][\w$]*)(\?)?/g;
  for (let m = re.exec(path); m; m = re.exec(path)) {
    const name = m[2] as string;
    if (seen.has(name)) continue;
    seen.add(name);
    const before = path.slice(0, m.index);
    const insideBraces = before.lastIndexOf('{') > before.lastIndexOf('}');
    fields.push({
      name,
      in: 'path',
      type: m[1] === '*' ? 'path' : 'string',
      required: !m[3] && !insideBraces,
      source: 'path',
    });
  }
  return fields;
}
