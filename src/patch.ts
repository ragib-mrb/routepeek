/**
 * Express 5 does not keep the mount path of a sub-router anywhere readable,
 * and Express 4 keeps it only as a RegExp. So routepeek wraps `use()` and
 * writes the path onto each new layer when the app registers it.
 */

export const MOUNT_PATH = Symbol.for('routepeek.mountPath');
export const MOUNTED_APP = Symbol.for('routepeek.mountedApp');
const PATCHED = Symbol.for('routepeek.patched');

type AnyFn = (...args: unknown[]) => unknown;
interface Layer {
  [MOUNT_PATH]?: unknown;
  [MOUNTED_APP]?: unknown;
}
interface HasStack {
  stack?: Layer[];
}

/** Same rule as Express: the first argument is a path unless it is (an array of) functions. */
function firstPath(args: unknown[]): unknown {
  let arg = args[0];
  while (Array.isArray(arg) && arg.length > 0) arg = arg[0];
  return typeof arg === 'function' ? '/' : args[0];
}

function isExpressApp(value: unknown): boolean {
  return (
    typeof value === 'function' &&
    typeof (value as { handle?: unknown }).handle === 'function' &&
    typeof (value as { set?: unknown }).set === 'function'
  );
}

function findApps(args: unknown[]): unknown[] {
  return args.flat(Infinity).filter(isExpressApp);
}

/** Express wraps each mounted sub-app in a function named `mounted_app`. */
const isMountedAppLayer = (layer: Layer) =>
  (layer as { handle?: { name?: string } }).handle?.name === 'mounted_app';

function wrapUse(owner: Record<string, unknown>, getStack: (self: unknown) => Layer[] | undefined) {
  const original = owner.use as AnyFn | undefined;
  if (typeof original !== 'function' || (original as { [PATCHED]?: boolean })[PATCHED]) return;
  const wrapped = function (this: unknown, ...args: unknown[]) {
    const before = getStack(this)?.length ?? 0;
    const result = original.apply(this, args);
    const stack = getStack(this);
    if (stack) {
      const path = firstPath(args);
      const apps = findApps(args);
      const added = stack.slice(before);
      for (const layer of added) layer[MOUNT_PATH] ??= path;
      added.filter(isMountedAppLayer).forEach((layer, i) => {
        if (apps[i]) layer[MOUNTED_APP] ??= apps[i];
      });
    }
    return result;
  };
  Object.defineProperty(wrapped, PATCHED, { value: true });
  owner.use = wrapped;
}

/**
 * Wraps `use()` on Express's router and application so mount paths are kept.
 * Safe to call more than once. Returns false when the module doesn't look like Express.
 */
export function patchExpress(express: unknown): boolean {
  const ex = express as { Router?: unknown; application?: Record<string, unknown> } | undefined;
  if (!ex || typeof ex.Router !== 'function') return false;
  const Router = ex.Router as unknown as Record<string, unknown> & {
    prototype?: Record<string, unknown>;
  };

  // Express 5 (the `router` package): methods live on Router.prototype.
  // Express 4: methods live on the Router function itself.
  const routerProto =
    Router.prototype && typeof Router.prototype.use === 'function' ? Router.prototype : Router;
  wrapUse(routerProto, (self) => (self as HasStack).stack);

  if (ex.application) {
    wrapUse(ex.application, (self) => {
      const app = self as { router?: HasStack; _router?: HasStack };
      // Express 4 throws on `app.router`, so read `_router` first.
      const router = '_router' in app ? app._router : undefined;
      if (router) return router.stack;
      try {
        return app.router?.stack;
      } catch {
        return undefined;
      }
    });
  }
  return true;
}
