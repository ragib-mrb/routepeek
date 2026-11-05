import { createRequire } from 'node:module';
import type { RouteInfo } from '../src/types.js';

const require = createRequire(import.meta.url);

/** Express 5 and Express 4, loaded as separate modules. */
export type ExpressModule = typeof import('express');
export const versions: [string, () => ExpressModule][] = [
  ['express 5', () => require('express') as ExpressModule],
  ['express 4', () => require('express4') as ExpressModule],
];

/** `METHOD path` for each route, sorted, for easy comparison. */
export const summary = (routes: RouteInfo[]) => routes.map((r) => `${r.method} ${r.path}`).sort();

/** Builds the same small app on any Express version. */
export function buildApp(express: ExpressModule) {
  const app = express();
  app.use(express.json());

  const users = express.Router();
  users.get('/', function listUsers(_req, res) {
    res.json([]);
  });
  users.get('/:id', function getUser(req, res) {
    res.json({ id: req.params.id });
  });
  users.post('/', function createUser(req, res) {
    res.status(201).json(req.body);
  });

  const admin = express.Router();
  admin.delete('/cache', (_req, res) => {
    res.sendStatus(204);
  });
  users.use('/admin', admin);

  app.use('/orgs/:org/users', users);
  app
    .route('/items')
    .get((_req, res) => res.json([]))
    .put((_req, res) => res.json({}));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.all('/echo', (req, res) => res.json({ method: req.method }));
  return app;
}

export const EXPECTED = [
  'ALL /echo',
  'DELETE /orgs/:org/users/admin/cache',
  'GET /health',
  'GET /items',
  'GET /orgs/:org/users',
  'GET /orgs/:org/users/:id',
  'POST /orgs/:org/users',
  'PUT /items',
];
