# Security policy

## Supported versions

Only the latest release of `@ragib.mrb/routepeek` gets security fixes.

## Reporting a vulnerability

Please **don't** open a public issue for security problems.

Report it privately through GitHub: go to the [Security tab](https://github.com/ragib-mrb/routepeek/security) and click **Report a vulnerability**. Include the routepeek and Express versions, what an attacker could do, and the steps to reproduce it.

You'll get a reply within 7 days. Once a fix is released, you'll be credited in the release notes unless you'd rather not be.

## What counts

routepeek is a development tool. It is off when `NODE_ENV` is `production` and only answers requests from `localhost` by default. Problems that matter most:

- the page being reachable from outside localhost while the defaults are on
- request values (not just names and types) being stored or shown
- script injection through route paths, field names or learned data
