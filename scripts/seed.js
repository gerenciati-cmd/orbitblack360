// Uso manual: npm run seed
const db = require('../src/db');
const { seedOwner } = require('../src/seed');

seedOwner({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD })
  .then((email) => console.log(`Listo. Admin: ${email} (empresa demo)`))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
