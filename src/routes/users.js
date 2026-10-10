const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { requirePermission } = require('../middleware/auth');
const { userLimitReached } = require('../middleware/gates');

router.get('/roles', requirePermission('roles.read'), async (req, res) => {
  res.json(await db('roles').where({ tenant_id: req.ctx.tenant.id }).select('id', 'name'));
});

router.get('/users', requirePermission('users.read'), async (req, res) => {
  const rows = await db('memberships as m')
    .join('users as u', 'u.id', 'm.user_id')
    .join('roles as r', 'r.id', 'm.role_id')
    .where('m.tenant_id', req.ctx.tenant.id)
    .select('u.id', 'u.name', 'u.email', 'r.id as roleId', 'r.name as role')
    .orderBy('u.name');
  res.json(rows);
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.number().int(),
});

router.post('/users', requirePermission('users.manage'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos (contraseña mínimo 8 caracteres)' });
  const { name, password, roleId } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const tid = req.ctx.tenant.id;

  if (!(await db('roles').where({ id: roleId, tenant_id: tid }).first())) return res.status(400).json({ error: 'Rol inválido' });

  if (await userLimitReached(db, req.ctx)) {
    return res.status(402).json({ error: 'Llegaste al límite de usuarios de tu plan. Mejora tu plan para agregar más.', code: 'plan_limit' });
  }

  // El correo es único en toda la plataforma: si ya existe, solo se le da acceso a esta empresa.
  let user = await db('users').where({ email }).first();
  if (user && (await db('memberships').where({ user_id: user.id, tenant_id: tid }).first())) {
    return res.status(409).json({ error: 'El usuario ya pertenece a esta empresa' });
  }
  if (!user) {
    const [id] = await db('users').insert({ name, email, password_hash: await bcrypt.hash(password, 12) });
    user = { id };
  }
  await db('memberships').insert({ user_id: user.id, tenant_id: tid, role_id: roleId });
  res.status(201).json({ id: user.id });
});

const patchSchema = z.object({ roleId: z.number().int() });

router.patch('/users/:id', requirePermission('users.manage'), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const id = Number(req.params.id);
  const tid = req.ctx.tenant.id;
  if (id === req.ctx.user.id) return res.status(400).json({ error: 'No puedes modificarte a ti mismo' });
  if (!(await db('roles').where({ id: parsed.data.roleId, tenant_id: tid }).first())) return res.status(400).json({ error: 'Rol inválido' });
  const n = await db('memberships').where({ user_id: id, tenant_id: tid }).update({ role_id: parsed.data.roleId });
  if (!n) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
});

// Quita el acceso del usuario a ESTA empresa (la cuenta global no se borra).
router.delete('/users/:id', requirePermission('users.manage'), async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.ctx.user.id) return res.status(400).json({ error: 'No puedes quitarte a ti mismo' });
  const n = await db('memberships').where({ user_id: id, tenant_id: req.ctx.tenant.id }).del();
  if (!n) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
});

module.exports = router;
