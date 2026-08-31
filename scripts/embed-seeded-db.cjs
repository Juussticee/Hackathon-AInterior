const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'src', 'data', 'seeded.db');
const outPath = path.join(__dirname, '..', 'src', 'data', 'seeded-db-buf.cjs');

const buf = fs.readFileSync(dbPath);
console.log('DB size:', buf.length, 'bytes');

const b64 = buf.toString('base64');
console.log('Base64 size:', b64.length, 'chars');

const content = `// AUTO-GENERATED: Pre-seeded SQLite database (base64 encoded)
// Generated from src/data/seeded.db (${buf.length} bytes)
// DO NOT EDIT — regenerate via: node scripts/embed-seeded-db.cjs
module.exports = Buffer.from(${JSON.stringify(b64)}, "base64");
`;

fs.writeFileSync(outPath, content);
console.log('Written to', outPath, ':', fs.statSync(outPath).size, 'bytes');
