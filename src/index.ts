import { createRequire } from 'node:module';
import { patchExpress } from './patch.js';
import { SCHEMAS, type RouteSchemas } from './schemas.js';
import { routepeek } from './middleware.js';

export { routepeek, listRoutes } from './middleware.js';
export type { RoutepeekMiddleware } from './middleware.js';
export { patchExpress } from './patch.js';
export type { Field, FieldLocation, FieldSource, RouteInfo, RoutepeekOptions } from './types.js';
export type { RouteSchemas } from './schemas.js';

/**
 * Importing routepeek before your routes are registered lets it keep the
 * mount path of every sub-router (Express 5 throws that path away).
 */
for (const from of [import.meta.url, `${process.cwd()}/package.json`]) {
  try {
    if (patchExpress(createRequire(from)('express'))) break;
  } catch {
    // Not found from here; try the next place. If neither works, call patchExpress(express).
  }
}

/**
 * Tells routepeek which Zod or Joi schemas a route uses. Returns a middleware
 * that does nothing except carry the schemas, so it can sit anywhere in the route.
 *
 * @example app.post('/users', schema({ body: CreateUser }), createUser)
 */
export function schema(schemas: RouteSchemas) {
  const tag = function routepeekSchema(_req: unknown, _res: unknown, next: () => void) {
    next();
  };
  Object.defineProperty(tag, SCHEMAS, { value: schemas });
  return tag;
}

export default routepeek;
