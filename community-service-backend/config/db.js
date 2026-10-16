const { Pool } = require('pg');

// Connects to Supabase Postgres using the session pooler connection string.
// Use query placeholders $1, $2, ... and double-quote Mixed_Case column names.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase requires TLS. Its certificate is signed by Supabase's own CA,
    // so it is not verified against the system CA list here.
    ssl: { rejectUnauthorized: false },
    max: 10
});

module.exports = pool;
