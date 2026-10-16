// =============================================================================
// Database connection (Supabase PostgreSQL)
// -----------------------------------------------------------------------------
// DATABASE INTERACTION: one shared connection pool for the whole backend.
//   - db.query(sql, params) borrows a connection, runs the query, returns it.
//   - db.connect() checks out a dedicated client for transactions
//     (BEGIN ... COMMIT / ROLLBACK, then client.release()).
//   Always use $1, $2 ... placeholders for values (parameterized queries) and
//   double-quote Mixed_Case column names, e.g. 'SELECT * FROM users WHERE "Email" = $1'.
// SECURITY: the connection string (with the database password) comes from the
//   DATABASE_URL environment variable in .env, which is never committed to git.
//   Traffic to Supabase is encrypted with TLS.
// =============================================================================

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase requires TLS. Its certificate is signed by Supabase's own CA,
    // so it is not verified against the system CA list here.
    ssl: { rejectUnauthorized: false },
    max: 10
});

// ERROR HANDLING: if an idle connection drops (network blip, database restart),
// pg emits an 'error' event. Without this listener Node would crash the whole
// backend; with it, the error is logged and the pool opens a fresh connection
// for the next query.
pool.on('error', (err) => {
    console.error('Database pool error (idle connection lost):', err.message);
});

module.exports = pool;
