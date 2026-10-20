// Creates a brand-new database: runs db/schema.sql, then every migration in
// db/migrations/ (in number order).
//
// Run from the project root:
//   npm run db:schema -- --yes
//
// WARNING: this DROPS every table first, permanently deleting all data.
// Only use it on a fresh database or the development database - never on the
// live one. To change an existing database, use `npm run db:migrate` instead.

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const db = require("../config/db");
const { migrate } = require("./migrate");

async function main() {
    // Safety lock: only a database explicitly marked as development can be wiped.
    // The live server's .env does not set this, so this script refuses to run there.
    if (process.env.DB_ENVIRONMENT !== "development") {
        console.log("Refusing to run: DB_ENVIRONMENT is not 'development' in community-service-backend/.env.");
        console.log("This script deletes ALL data. It is only meant for the development database");
        console.log("or a brand-new empty database (set DB_ENVIRONMENT=development temporarily for that).");
        process.exitCode = 1;
        return;
    }

    if (!process.argv.includes("--yes")) {
        console.log("This deletes ALL data and recreates every table.");
        console.log("If you are sure, run:  npm run db:schema -- --yes");
        process.exitCode = 1;
        return;
    }

    const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
    await db.query(sql);
    console.log("Schema applied. All tables were recreated (empty).");

    await migrate();
}

main()
    .catch((error) => {
        console.error("apply-schema failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
