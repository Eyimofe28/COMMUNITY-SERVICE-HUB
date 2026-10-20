# Database migrations

Every change to the database structure after the initial `../schema.sql` goes here as a numbered SQL file.

## Adding a migration

1. Create the next numbered file, e.g. `001_add_account_status.sql`:
   three digits, an underscore, then lowercase words joined by underscores.
2. Write the SQL change. Keep existing data in mind. For example, give a new
   `NOT NULL` column a `DEFAULT` so the rows that already exist get a value.
3. Test it on the **development** database: `npm run db:migrate`
4. Commit it. On the school server, `bash deploy/deploy.sh` applies it to the
   live database automatically.

## Rules

- **Never edit or rename a migration that has been applied to the live database.**
  Fix mistakes with a new, higher-numbered migration.
- Each file runs inside a transaction: if it fails, nothing in it is applied.
- Check where a database stands with `npm run db:status`.
- A brand-new database is created with `npm run db:schema -- --yes`, which runs
  `schema.sql` and then every migration in order.
