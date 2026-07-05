const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve('./data/gems.db');
const db = new Database(dbPath);

const count = db.prepare('SELECT COUNT(*) as count FROM gems').get();
console.log('Number of gems:', count.count);

const gems = db.prepare('SELECT id, title, lat, lng FROM gems LIMIT 5').all();
console.log('Sample gems:', gems);

db.close();
