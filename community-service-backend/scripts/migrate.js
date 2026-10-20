// =============================================================================
// Database migrations - apply schema changes WITHOUT losing data
// -----------------------------------------------------------------------------
// Run from the project root:
//   npm run db:migrate     apply every migration this database has not run yet
//   npm run db:status      list migrations and whether each one has been applied
//
// How it works:
//   - db/schema.sql is the frozen starting point (only used for brand-new databases).
//   - Every later change is a numbered file in db/migrations/, e.g.
//     001_add_account_status.sql, 002_..., run in number order.
//   - The table schema_migrations records which files have run, so each file
//     runs exactly once per database (development and live are tracked separately).
//   - Each file runs inside a transaction: if any statement fails, the whole file
//     is rolled back, the database is unchanged, and the run stops.
//   - deploy/deploy.sh runs this automatically on the school server.
//
// DATABASE INTERACTION: never edit a migration that has already been applied to
// the live database - add a new numbered file instead (see db/migrations/README.md).
// =============================================================================

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const db = require("../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");
const FILE_PATTERN = /^\d{3}_[a-z0-9_]+\.sql$/;

// Any fixed number: makes sure two migration runs can never happen at the same time
const LOCK_ID = 727274;

// Applies pending migrations (or only reports them when statusOnly is true).
// Uses its own connection; does not close the pool, so callers can reuse it.
async function migrate({ statusOnly = false } = {}) {
    const files = fs.existsSync(MIGRATIONS_DIR)
        ? fs.readdirSync(MIGRATIONS_DIR).filter((f) => FILE_PATTERN.test(f)).sort()
        : [];

    const client = await db.connect();
    try {
        await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);

        // Tracking table - locked down like every other table (backend-only access)
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                "Name"       text PRIMARY KEY,
                "Applied_At" timestamptz NOT NULL DEFAULT now()
            );
            ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
            REVOKE ALL ON TABLE schema_migrations FROM anon, authenticated;
        `);

        const { rows } = await client.query('SELECT "Name", "Applied_At" FROM schema_migrations');
        const applied = new Map(rows.map((r) => [r.Name, r.Applied_At]));
        const pending = files.filter((f) => !applied.has(f));

        if (statusOnly) {
            if (files.length === 0) console.log("No migration files yet.");
            for (const f of files) {
                const when = applied.get(f);
                console.log(`${when ? "applied " + when.toISOString().slice(0, 16).replace("T", " ") : "PENDING         "}  ${f}`);
            }
            console.log(`\n${pending.length} pending.`);
            return;
        }

        if (pending.length === 0) {
            console.log("Database is up to date - no migrations to apply.");
            return;
        }

        for (const file of pending) {
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
            try {
                await client.query("BEGIN");
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations ("Name") VALUES ($1)', [file]);
                await client.query("COMMIT");
                console.log(`Applied ${file}`);
            } catch (error) {
                await client.query("ROLLBACK").catch(() => {});
                throw new Error(`${file} failed and was rolled back (database unchanged): ${error.message}`);
            }
        }
        console.log(`Done - ${pending.length} migration(s) applied.`);
    } finally {
        await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
        client.release();
    }
}

module.exports = { migrate };

// Run directly: npm run db:migrate / npm run db:status
if (require.main === module) {
    migrate({ statusOnly: process.argv.includes("--status") })
        .catch((error) => {
            console.error("Migration failed:", error.message);
            process.exitCode = 1;
        })
        .finally(() => db.end());
}
