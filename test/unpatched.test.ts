// No import of src/index.ts here, so Express is not patched in this file.
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { listRoutes, routepeek } from '../src/middleware.js';
import { buildApp, EXPECTED, summary, versions } from './helpers.js';

describe('without the patch', () => {
  it('express 4: rebuilds mount paths from their RegExp', () => {
    const [, load] = versions[1]!;
    expect(summary(listRoutes(buildApp(load())))).toEqual(EXPECTED);
  });

  it('express 5: marks unknown mount paths, then fills them in after a request', async () => {
    const [, load] = versions[0]!;
    const express = load();
    const app = express();
    app.use(routepeek(app));
    const users = express.Router();
    users.get('/:id', (req, res) => res.json({ id: req.params.id }));
    app.use('/orgs/:org/users', users);

    const before = listRoutes(app).find((r) => r.method === 'GET');
    expect(before?.partialPath).toBe(true);
    expect(before?.path).toBe('/…/:id');

    await request(app).get('/orgs/acme/users/7').expect(200);
    const res = await request(app).get('/__routepeek/routes.json').expect(200);
    const after = (res.body.routes as { path: string; partialPath: boolean }[])[0];
    expect(after).toMatchObject({ path: '/orgs/acme/users/:id', partialPath: false });
  });
});
