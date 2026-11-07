# Contributing to routepeek

Thanks for helping! Bug reports, ideas, docs fixes and code are all welcome.

## Before you start

- **Bugs:** open an issue with the bug template. A small Express app that shows the problem helps most.
- **New features:** open an issue first, so we can agree on the idea before you spend time on it.
- **Small fixes** (typos, docs, tests): send a pull request straight away.
- Looking for something to do? Try the issues labelled [`good first issue`](https://github.com/ragib-mrb/routepeek/labels/good%20first%20issue) or [`help wanted`](https://github.com/ragib-mrb/routepeek/labels/help%20wanted). Comment on the issue so others know you're on it.

## Set up

You need Node.js 22 or newer.

```bash
git clone https://github.com/<your-username>/routepeek.git
cd routepeek
npm install
npm test
```

Useful scripts:

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm test`          | Runs all tests (Vitest), on Express 4 and 5               |
| `npm run lint`      | ESLint                                                    |
| `npm run typecheck` | TypeScript type check                                     |
| `npm run format`    | Formats the code with Prettier                            |
| `npm run build`     | Builds `dist/`                                            |
| `npm run example`   | Runs the example app on http://localhost:3077/__routepeek |

## Project layout

- `src/discover.ts`: walks the Express router and lists routes
- `src/patch.ts`: records mount paths when routepeek is imported first
- `src/schemas.ts`: reads express-validator, Zod and Joi schemas
- `src/learn.ts`: learns argument names and types from real requests
- `src/middleware.ts`: serves the test page and its JSON
- `src/ui/`: the test page (built into one file by `scripts/build-ui.mjs`)
- `test/`: tests, one file per area

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep the change focused: one fix or feature per pull request.
3. Add or update tests for what you changed.
4. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run format:check` before you push. CI runs the same checks.
5. Update `README.md` if behaviour or options change, and add a line under "Unreleased" in `CHANGELOG.md`.
6. Write a clear title, e.g. `fix: keep mount path for nested routers`.

## Rules that keep routepeek safe

- **No runtime dependencies.** Express is a peer dependency; everything else is dev-only.
- **Never store values** from requests, only names and types.
- The page must work offline: no external scripts, fonts or trackers.

## Code of conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
