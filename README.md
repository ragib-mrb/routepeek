# routepeek

See every route in your Express app, with its arguments, and test it from a page that needs no setup.

- **No spec to write.** No OpenAPI file, no JSDoc comments, no decorators.
- **Finds arguments by itself:** path params from the route, fields from your validators, and query, body and header names it learns from the requests your app receives while you develop.
- **Test page built in:** pick a route, fill in a form, send, and see the status, time, headers and body. Copy any request as curl.
- **Express 4 and 5**, nested routers and sub-apps included. No runtime dependencies.

## Install

```bash
npm install --save-dev @ragib.mrb/routepeek
```

## Use

```js
import express from 'express';
import { routepeek } from '@ragib.mrb/routepeek'; // import it before your routes

const app = express();
app.use(express.json());
app.use(routepeek(app));

// …your routes…

app.listen(3000);
```

Open <http://localhost:3000/__routepeek>.

CommonJS works too: `const { routepeek } = require('@ragib.mrb/routepeek');`

> **Why import first?** Express 5 doesn't keep the mount path of a sub-router (like `/orgs/:org/users`) anywhere readable. Importing routepeek before your routers are created lets it record those paths. If you import it later, routes still show up: the unknown part is shown as `…` until the route gets its first request, and then the real path fills in.

## Where the arguments come from

| Source            | What you do                                                                                                 | What routepeek shows                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Path              | nothing                                                                                                     | `:id`, `*rest`, optional `{/:dir}`                                                     |
| express-validator | nothing: chains like `body('email').isEmail()` are read automatically                                       | name, location, type (`email`, `number`, …), required or optional                      |
| Zod or Joi        | add `schema({ body, query, params, headers })` to the route, or expose your validator's schema as `.schema` | every field of the object schema, with type and required                               |
| Real requests     | use your app as usual                                                                                       | query, body and custom header **names and types**, and how often each route was called |

```js
import { schema } from '@ragib.mrb/routepeek';

app.post('/users', schema({ body: CreateUser }), createUser);
```

`schema()` only carries the schema for routepeek; it doesn't validate anything, so keep your own validation.

## Options

```js
app.use(
  routepeek(app, {
    path: '/__routepeek', // where the page lives
    enabled: true, // default: off when NODE_ENV is "production"
    learn: true, // learn arguments from incoming requests
    localOnly: true, // only answer requests from this machine
  }),
);
```

You can also get the routes in code: `listRoutes(app)` returns `{ method, path, fields, handlers, … }[]`.

## Privacy and safety

- Off in production unless you turn it on.
- Only answers requests from `localhost` by default.
- Learning keeps **names and types only**, never values, so tokens, passwords and personal data are not stored. Everything stays in memory in your app's process and is gone when it stops.
- The page has no external scripts, fonts or trackers. Values you type are saved only in your own browser.

## Limits

- Express only, for now.
- Express 4 sub-apps (`app.use('/v1', otherApp)`) are found only when routepeek is imported first.
- Zod and Joi schemas hidden inside your own middleware can't be seen; use `schema()` or `.schema` for those.
- Learned "required" means "seen on every request so far", which is a good guess, not a rule.

## Develop

```bash
npm install
npm test
npm run example   # example app on http://localhost:3077/__routepeek
```

## License

[MIT](LICENSE)
