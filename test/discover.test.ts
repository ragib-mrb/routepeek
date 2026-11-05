import { describe, expect, it } from 'vitest';
import { listRoutes, patchExpress } from '../src/index.js';
import { buildApp, EXPECTED, summary, versions } from './helpers.js';

describe.each(versions)('%s, patched', (_name, load) => {
  const express = load();
  patchExpress(express);

  it('lists every route with full mount paths', () => {
    expect(summary(listRoutes(buildApp(express)))).toEqual(EXPECTED);
  });

  it('reads path params, including ones from the mount path', () => {
    const route = listRoutes(buildApp(express)).find((r) => r.path === '/orgs/:org/users/:id');
    expect(route?.fields).toEqual([
      { name: 'org', in: 'path', type: 'string', required: true, source: 'path' },
      { name: 'id', in: 'path', type: 'string', required: true, source: 'path' },
    ]);
    expect(route?.partialPath).toBe(false);
    expect(route?.handlers).toEqual(['getUser']);
  });

  it('follows sub-apps mounted with app.use', () => {
    const app = express();
    const sub = express();
    sub.get('/ping', (_req, res) => res.send('pong'));
    app.use('/v1', sub);
    expect(summary(listRoutes(app))).toEqual(['GET /v1/ping']);
  });

  it('handles array and RegExp paths', () => {
    const app = express();
    app.get(['/a', '/b'], (_req, res) => res.end());
    app.get(/^\/re/, (_req, res) => res.end());
    expect(summary(listRoutes(app))).toEqual(['GET /^\\/re/', 'GET /a', 'GET /b']);
  });

  it('returns an empty list for an app with no routes', () => {
    expect(listRoutes(express())).toEqual([]);
  });
});
