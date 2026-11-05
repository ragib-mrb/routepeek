import type { Field, FieldLocation } from './types.js';

/** Schemas attached with `schema()`, keyed by where they apply. */
export interface RouteSchemas {
  body?: unknown;
  query?: unknown;
  params?: unknown;
  headers?: unknown;
}

export const SCHEMAS = Symbol.for('routepeek.schemas');

const LOCATION: Record<keyof RouteSchemas, FieldLocation> = {
  body: 'body',
  query: 'query',
  params: 'path',
  headers: 'header',
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;

/* ---------------- Zod (v3 and v4) ---------------- */

function zodDef(s: unknown): Obj | undefined {
  if (!isObj(s) && typeof s !== 'function') return undefined;
  const z = s as Obj;
  if (isObj(z._zod) && isObj((z._zod as Obj).def)) return (z._zod as Obj).def as Obj; // v4
  if (isObj(z._def) && typeof (z._def as Obj).typeName === 'string') return z._def as Obj; // v3
  return undefined;
}

function zodType(def: Obj): { type: string; optional: boolean } {
  const raw = String(def.type ?? def.typeName ?? '')
    .replace(/^Zod/, '')
    .toLowerCase();
  if (raw === 'optional' || raw === 'default' || raw === 'nullable' || raw === 'catch') {
    const inner = zodDef(def.innerType);
    const t = inner ? zodType(inner) : { type: 'string', optional: false };
    return { type: t.type, optional: raw !== 'nullable' || t.optional };
  }
  if (raw === 'pipe' || raw === 'effects') {
    const inner = zodDef(def.in ?? def.schema);
    return inner ? zodType(inner) : { type: 'string', optional: false };
  }
  if (raw === 'literal' || raw === 'enum' || raw === 'nativeenum') return { type: 'enum', optional: false };
  return { type: raw || 'string', optional: false };
}

function zodFields(schema: unknown, where: FieldLocation): Field[] | undefined {
  const def = zodDef(schema);
  if (!def) return undefined;
  let shape = def.shape;
  if (typeof shape === 'function') shape = (shape as () => unknown)();
  if (!isObj(shape)) return [];
  return Object.entries(shape).map(([name, child]) => {
    const d = zodDef(child);
    const t = d ? zodType(d) : { type: 'string', optional: false };
    return { name, in: where, type: t.type, required: !t.optional, source: 'validator' as const };
  });
}

/* ---------------- Joi ---------------- */

function joiFields(schema: unknown, where: FieldLocation): Field[] | undefined {
  if (!isObj(schema) || typeof schema.describe !== 'function' || !('$_root' in schema || 'type' in schema)) {
    return undefined;
  }
  let described: unknown;
  try {
    described = (schema.describe as () => unknown)();
  } catch {
    return undefined;
  }
  if (!isObj(described) || described.type !== 'object') return undefined;
  const keys = isObj(described.keys) ? described.keys : {};
  return Object.entries(keys).map(([name, d]) => {
    const info = isObj(d) ? d : {};
    const flags = isObj(info.flags) ? info.flags : {};
    return {
      name,
      in: where,
      type: String(info.type ?? 'string'),
      required: flags.presence === 'required',
      source: 'validator' as const,
    };
  });
}

/** Fields from a Zod or Joi object schema; empty when the schema type is unknown. */
export function fieldsFromSchema(schema: unknown, where: FieldLocation): Field[] {
  return zodFields(schema, where) ?? joiFields(schema, where) ?? [];
}

/* ---------------- express-validator ---------------- */

const EV_TYPES: Record<string, string> = {
  isInt: 'number',
  isFloat: 'number',
  isNumeric: 'number',
  isDecimal: 'number',
  isBoolean: 'boolean',
  isEmail: 'email',
  isURL: 'url',
  isUUID: 'uuid',
  isDate: 'date',
  isISO8601: 'date',
  isArray: 'array',
  isObject: 'object',
  isJWT: 'jwt',
};

const EV_LOCATIONS: Record<string, FieldLocation> = {
  body: 'body',
  query: 'query',
  params: 'path',
  headers: 'header',
  cookies: 'header',
};

function expressValidatorFields(fn: unknown): Field[] | undefined {
  const builder = (fn as { builder?: { build?: () => unknown } }).builder;
  if (!builder || typeof builder.build !== 'function') return undefined;
  let ctx: Obj;
  try {
    ctx = builder.build() as Obj;
  } catch {
    return undefined;
  }
  const names = Array.isArray(ctx.fields) ? ctx.fields.map(String) : [];
  const locations = Array.isArray(ctx.locations) ? ctx.locations.map(String) : ['body'];
  const stack = Array.isArray(ctx.stack) ? (ctx.stack as Obj[]) : [];
  let type = 'string';
  for (const item of stack) {
    const name = (item.validator as { name?: string } | undefined)?.name ?? '';
    if (EV_TYPES[name]) type = EV_TYPES[name];
  }
  const required = ctx.optional === false || ctx.optional === undefined;
  const fields: Field[] = [];
  for (const loc of locations) {
    const where = EV_LOCATIONS[loc] ?? 'body';
    for (const name of names) fields.push({ name, in: where, type, required, source: 'validator' });
  }
  return fields;
}

/** Fields that a single middleware function tells us about, if any. */
export function fieldsFromHandler(fn: unknown): Field[] {
  if (typeof fn !== 'function') return [];
  const tagged = (fn as { [SCHEMAS]?: RouteSchemas })[SCHEMAS];
  if (tagged) {
    return (Object.keys(LOCATION) as (keyof RouteSchemas)[]).flatMap((key) =>
      tagged[key] ? fieldsFromSchema(tagged[key], LOCATION[key]) : [],
    );
  }
  const ev = expressValidatorFields(fn);
  if (ev) return ev;
  const own = (fn as { schema?: unknown }).schema;
  return own ? fieldsFromSchema(own, 'body') : [];
}
