const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { createTenant } = require('../tenants');

router.get('/tenants', async (_req, res) => {
  res.json(await db('tenants').select('id', 'name', 'slug', 'plan', 'active').orderBy('name'));
});

const schema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  plan: z.string().max(30).optional(),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

// Alta de un cliente nuevo (empresa + administrador): el flujo de "venta" de la plataforma.
router.post('/tenants', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const d = parsed.data;
  if (await db('tenants').where({ slug: d.slug }).first()) return res.status(409).json({ error: 'Ese slug ya existe' });

  const email = d.adminEmail.toLowerCase();
  const id = await db.transaction(async (trx) => {
    const { tenantId, adminRoleId } = await createTenant(trx, { name: d.name, slug: d.slug, plan: d.plan });
    let user = await trx('users').where({ email }).first();
    if (!user) {
      const [uid] = await trx('users').insert({ name: d.adminName, email, password_hash: await bcrypt.hash(d.adminPassword, 12) });
      user = { id: uid };
    }
    await trx('memberships').insert({ user_id: user.id, tenant_id: tenantId, role_id: adminRoleId });
    return tenantId;
  });
  res.status(201).json({ id });
});

module.exports = router;
