// scripts/createUser.js
require('dotenv').config();
const pool   = require('../config/db');
const bcrypt = require('bcrypt');

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node createUser.js <username> <password>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.execute(
    `INSERT INTO users (username, password_hash)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [username, hash]
  );

  console.log(`User '${username}' created/updated.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
