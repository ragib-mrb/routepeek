import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { patchExpress, routepeek } from '../src/index.js';
import type { RouteInfo } from '../src/types.js';
import { buildApp, versions } from './helpers.js';

describe.each(versions)('%s: middleware', (_name, load) => {
  const express = load();
  patchExpress(express);

  const makeApp = (options?: Parameters<typeof routepeek>[1]) => {
    const app = express();
    app.use(routepeek(app, options));
    const inner = buildApp(express);
    app.use(inner);
    return app;
  };
  const routesOf = async (app: Parameters<typeof request>[0], base = '/__routepeek') =>
    (await request(app).get(`${base}/routes.json`).expect(200)).body.routes as RouteInfo[];

  it('serves the page with the base path injected', async () => {
    const res = await request(makeApp()).get('/__routepeek').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('window.__ROUTEPEEK_BASE__ = "/__routepeek"');
    expect(res.text).not.toContain('</script\n');
  });

  it('serves routes as JSON', async () => {
    const routes = await routesOf(makeApp());
    expect(routes.map((r) => `${r.method} ${r.path}`)).toContain('GET /orgs/:org/users/:id');
  });

  it('learns query, body and header names and types, but never values', async () => {
    const app = makeApp();
    await request(app)
      .post('/orgs/acme/users?notify=true')
      .set('X-Tenant', 'secret-tenant')
      .set('Authorization', 'Bearer secret-token')
      .send({ name: 'Ada', age: 36, tags: ['a'] })
      .expect(201);
    await request(app).post('/orgs/acme/users').send({ name: 'Grace' }).expect(201);

    const res = await request(app).get('/__routepeek/routes.json');
    expect(res.text).not.toMatch(/secret|Ada|Grace/);
    const route = (res.body.routes as RouteInfo[]).find((r) => r.method === 'POST')!;
    expect(route.seen).toBe(2);
    const byName = Object.fromEntries(route.fields.map((f) => [`${f.in}:${f.name}`, f]));
    expect(byName['query:notify']).toMatchObject({ type: 'boolean', required: false, source: 'learned' });
    expect(byName['body:name']).toMatchObject({ type: 'string', required: true });
    expect(byName['body:age']).toMatchObject({ type: 'number', required: false });
    expect(byName['body:tags']).toMatchObject({ type: 'array' });
    expect(byName['header:x-tenant']).toBeDefined();
    expect(byName['header:authorization']).toBeDefined();
    expect(byName['header:user-agent']).toBeUndefined();
  });

  it('does not learn when learn is false', async () => {
    const app = makeApp({ learn: false });
    await request(app).get('/health?x=1').expect(200);
    const route = (await routesOf(app)).find((r) => r.path === '/health')!;
    expect(route.seen).toBe(0);
    expect(route.fields).toEqual([]);
  });

  it('uses a custom path', async () => {
    const app = makeApp({ path: '/dev/routes/' });
    await request(app).get('/dev/routes').expect(200);
    await request(app).get('/__routepeek').expect(404);
  });

  it('does nothing when disabled', async () => {
    const app = makeApp({ enabled: false });
    await request(app).get('/__routepeek').expect(404);
  });

  it('is off in production by default', async () => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await request(makeApp()).get('/__routepeek').expect(404);
    } finally {
      process.env.NODE_ENV = before;
    }
  });

  it('answers unknown routepeek pages and non-GET with JSON errors', async () => {
    const app = makeApp();
    const missing = await request(app).get('/__routepeek/nope').expect(404);
    expect(missing.body).toEqual({ error: { code: 'not_found', message: expect.any(String) } });
    await request(app).post('/__routepeek/routes.json').expect(405);
  });

  it('refuses requests from other machines when localOnly is on', async () => {
    const app = express();
    app.use((req, _res, next) => {
      Object.defineProperty(req, 'socket', { value: { remoteAddress: '203.0.113.5' } });
      next();
    });
    app.use(routepeek(app));
    const res = await request(app).get('/__routepeek').expect(403);
    expect(res.body.error.code).toBe('local_only');
  });

  it('keeps working for the app’s own routes', async () => {
    const res = await request(makeApp()).get('/orgs/acme/users/9').expect(200);
    expect(res.body).toEqual({ id: '9' });
  });
});
