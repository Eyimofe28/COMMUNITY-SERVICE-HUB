// Creates all database tables from db/schema.sql.
//
// Run from the project root:
//   npm run db:schema -- --yes
//
// WARNING: this DROPS every table first, permanently deleting all data.
// Only use it on a fresh database or when you really want to start over.

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const db = require("../config/db");

async function main() {
    if (!process.argv.includes("--yes")) {
        console.log("This deletes ALL data and recreates every table.");
        console.log("If you are sure, run:  npm run db:schema -- --yes");
        process.exitCode = 1;
        return;
    }

    const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
    await db.query(sql);
    console.log("Schema applied. All tables were recreated (empty).");
}

main()
    .catch((error) => {
        console.error("apply-schema failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
