import { describe, expect, it } from 'vitest';
import { joinPaths, mountPathFromRegexp, pathParams } from '../src/paths.js';

describe('paths', () => {
  it('joins paths cleanly', () => {
    expect(joinPaths('', '/')).toBe('/');
    expect(joinPaths('/api/', '/users/')).toBe('/api/users');
    expect(joinPaths('/api', 'users')).toBe('/api/users');
  });

  it('rebuilds Express 4 mount paths, or gives up on odd RegExps', () => {
    expect(mountPathFromRegexp(/^\/users(?:\/([^/]+?))\/?(?=\/|$)/i, [{ name: 'org' }])).toBe('/users/:org');
    expect(mountPathFromRegexp(/^\/v1\/?(?=\/|$)/i, [])).toBe('/v1');
    expect(mountPathFromRegexp(/^\/(a|b)\/?(?=\/|$)/i, [])).toBeUndefined();
    expect(mountPathFromRegexp('nope', [])).toBeUndefined();
  });

  it('finds path params in Express 4 and 5 patterns', () => {
    expect(pathParams('/a/:id/b/:slug?').map((f) => [f.name, f.required])).toEqual([
      ['id', true],
      ['slug', false],
    ]);
    expect(pathParams('/files{/:dir}/*rest').map((f) => [f.name, f.required, f.type])).toEqual([
      ['dir', false, 'string'],
      ['rest', true, 'path'],
    ]);
  });
});
