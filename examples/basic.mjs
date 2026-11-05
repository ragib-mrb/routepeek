// A small app to try routepeek: npm run example, then open http://localhost:3077/__routepeek
import { routepeek, schema } from '../dist/index.js';
import express from 'express';
import { body } from 'express-validator';
import { z } from 'zod';

const app = express();
app.use(express.json());
app.use(routepeek(app));

const users = express.Router();
const people = new Map([['1', { id: '1', name: 'Ada', email: 'ada@example.test' }]]);

users.get('/', function listUsers(req, res) {
  const limit = Number(req.query.limit ?? 10);
  res.json([...people.values()].slice(0, limit));
});
users.get('/:id', function getUser(req, res) {
  const user = people.get(req.params.id);
  if (!user) return res.status(404).json({ error: { code: 'not_found', message: 'No user with that id.' } });
  res.json(user);
});
users.post('/', body('name').isString(), body('email').isEmail(), function createUser(req, res) {
  const id = String(people.size + 1);
  const user = { id, name: req.body.name, email: req.body.email };
  people.set(id, user);
  res.status(201).json(user);
});

const Order = z.object({ item: z.string(), qty: z.number(), note: z.string().optional() });
const orders = express.Router();
orders.post('/', schema({ body: Order }), function createOrder(req, res) {
  const parsed = Order.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'invalid', message: 'Check item and qty.' } });
  }
  res.status(201).json({ id: Date.now(), ...parsed.data });
});

app.use('/api/users', users);
app.use('/api/orgs/:org/orders', orders);
app.get('/health', (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3077);
app.listen(port, '127.0.0.1', () => {
  console.log(`Example app on http://localhost:${port}  ·  routepeek: http://localhost:${port}/__routepeek`);
});
