import { MOUNT_PATH, MOUNTED_APP } from './patch.js';
import { joinPaths, mountPathFromRegexp, pathParams, pathStrings } from './paths.js';
import { fieldsFromHandler } from './schemas.js';
import type { Learner } from './learn.js';
import type { Field, RouteInfo } from './types.js';

interface Layer {
  name?: string;
  handle?: unknown;
  route?: Route;
  regexp?: unknown;
  keys?: unknown;
  slash?: boolean;
  [MOUNT_PATH]?: unknown;
  [MOUNTED_APP]?: unknown;
}
interface Route {
  path: unknown;
  methods: Record<string, boolean>;
  stack?: Layer[];
}

/** A discovered route plus the Express Route object it came from. */
export interface FoundRoute extends Omit<RouteInfo, 'fields' | 'seen'> {
  route: object;
  pathFields: Field[];
  validatorFields: Field[];
}

/** The router stack of an app or router, without creating one. */
export function stackOf(target: unknown): Layer[] | undefined {
  const t = target as { stack?: unknown; _router?: { stack?: unknown }; router?: { stack?: unknown } };
  if (!t) return undefined;
  if (Array.isArray(t.stack)) return t.stack as Layer[];
  if (t._router && Array.isArray(t._router.stack)) return t._router.stack as Layer[];
  // Express 4 throws when `app.router` is read.
  try {
    if (t.router && Array.isArray(t.router.stack)) return t.router.stack as Layer[];
  } catch {
    return undefined;
  }
  return undefined;
}

function mountPrefix(layer: Layer): string | undefined {
  const tagged = layer[MOUNT_PATH];
  if (tagged !== undefined) {
    const [first] = pathStrings(tagged);
    return first === '/' ? '' : first;
  }
  if (layer.slash) return ''; // Express 5, mounted at '/'
  return mountPathFromRegexp(layer.regexp, layer.keys);
}

/** More methods than any hand-written route would list: treat it as `app.all()`. */
const ALL_THRESHOLD = 20;

const handlerName = (fn: unknown) => (typeof fn === 'function' && fn.name ? fn.name : '<anonymous>');

/** Walks the app's routers and lists every route. */
export function discoverRoutes(app: unknown, learner?: Learner): FoundRoute[] {
  const found: FoundRoute[] = [];
  const visited = new Set<unknown>();

  const walk = (stack: Layer[], prefix: string, partial: boolean) => {
    for (const layer of stack) {
      if (layer.route) {
        const route = layer.route;
        const handlers = (route.stack ?? []).map((l) => l.handle);
        let methods = Object.keys(route.methods)
          .filter((m) => route.methods[m])
          .map((m) => (m === '_all' ? 'ALL' : m.toUpperCase()));
        // `app.all()` registers every HTTP method one by one.
        if (methods.length >= ALL_THRESHOLD) methods = ['ALL'];
        const validatorFields = handlers.flatMap(fieldsFromHandler);
        for (const p of pathStrings(route.path)) {
          let fullPrefix = prefix;
          let isPartial = partial;
          if (partial && learner) {
            const sample = learner.sampleBase(route);
            if (sample !== undefined) {
              fullPrefix = sample;
              isPartial = false;
            }
          }
          const path = joinPaths(fullPrefix, p);
          for (const method of [...new Set(methods)]) {
            found.push({
              method,
              path,
              partialPath: isPartial,
              handlers: handlers.map(handlerName),
              route,
              pathFields: pathParams(path),
              validatorFields,
            });
          }
        }
        continue;
      }

      const child = layer[MOUNTED_APP] ?? layer.handle;
      const childStack = stackOf(child);
      if (!childStack || visited.has(childStack)) continue;
      visited.add(childStack);
      const mount = mountPrefix(layer);
      walk(
        childStack,
        mount === undefined ? `${prefix}/…` : joinPaths(prefix, mount),
        partial || mount === undefined,
      );
    }
  };

  const root = stackOf(app);
  if (root) walk(root, '', false);
  return found;
}
