import { body, query } from 'express-validator';
import Joi from 'joi';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { listRoutes, patchExpress, schema } from '../src/index.js';
import { fieldsFromSchema } from '../src/schemas.js';
import { versions } from './helpers.js';

const express = versions[0]![1]();
patchExpress(express);

const noop = (_req: unknown, res: { end: () => void }) => res.end();

describe('arguments from validators', () => {
  it('reads express-validator chains', () => {
    const app = express();
    app.post('/signup', body('email').isEmail(), body('age').optional().isInt(), noop);
    app.get('/search', query('page').isInt(), noop);
    const [signup, search] = listRoutes(app);
    expect(signup?.fields).toEqual([
      { name: 'email', in: 'body', type: 'email', required: true, source: 'validator' },
      { name: 'age', in: 'body', type: 'number', required: false, source: 'validator' },
    ]);
    expect(search?.fields).toEqual([
      { name: 'page', in: 'query', type: 'number', required: true, source: 'validator' },
    ]);
  });

  it('reads Zod schemas passed to schema()', () => {
    const app = express();
    const CreateUser = z.object({
      name: z.string(),
      age: z.number().optional(),
      role: z.enum(['admin', 'user']),
      tags: z.array(z.string()).default([]),
    });
    app.post('/users', schema({ body: CreateUser, query: z.object({ dry: z.boolean() }) }), noop);
    expect(listRoutes(app)[0]?.fields).toEqual([
      { name: 'name', in: 'body', type: 'string', required: true, source: 'validator' },
      { name: 'age', in: 'body', type: 'number', required: false, source: 'validator' },
      { name: 'role', in: 'body', type: 'enum', required: true, source: 'validator' },
      { name: 'tags', in: 'body', type: 'array', required: false, source: 'validator' },
      { name: 'dry', in: 'query', type: 'boolean', required: true, source: 'validator' },
    ]);
  });

  it('reads Joi schemas passed to schema()', () => {
    const app = express();
    app.put(
      '/items/:id',
      schema({ body: Joi.object({ title: Joi.string().required(), qty: Joi.number() }) }),
      noop,
    );
    expect(listRoutes(app)[0]?.fields).toEqual([
      { name: 'id', in: 'path', type: 'string', required: true, source: 'path' },
      { name: 'title', in: 'body', type: 'string', required: true, source: 'validator' },
      { name: 'qty', in: 'body', type: 'number', required: false, source: 'validator' },
    ]);
  });

  it('reads a schema exposed on a custom middleware as .schema', () => {
    const app = express();
    const validate = Object.assign(noop, { schema: z.object({ q: z.string() }) });
    app.post('/find', validate);
    expect(listRoutes(app)[0]?.fields[0]).toMatchObject({ name: 'q', in: 'body', source: 'validator' });
  });

  it('ignores schemas it does not understand', () => {
    expect(fieldsFromSchema({ foo: 1 }, 'body')).toEqual([]);
    expect(fieldsFromSchema(z.string(), 'body')).toEqual([]);
  });
});
