# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-05

First release.

- Lists every route in an Express 4 or 5 app, including nested routers and sub-apps.
- Reads arguments from paths, express-validator chains, and Zod or Joi schemas (`schema()` helper or `.schema`).
- Learns query, body and header names and types from real requests (never values).
- Built-in test page at `/__routepeek`: send requests, see status, time, headers and body, copy as curl.
- `listRoutes(app)` for use in code.
- Off in production and limited to localhost by default.

[Unreleased]: https://github.com/ragib-mrb/routepeek/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ragib-mrb/routepeek/releases/tag/v0.1.0
