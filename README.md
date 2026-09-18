# Property Pricer 1.7

Property Pricer 1.7 is the next iteration of the deterministic real-estate pricing and diagnostic system.

## Current status

Early-stage rebuild. The connected Supabase project is active and currently has no public tables, migrations, or Edge Functions. This repository establishes source control before the 1.7 backend and application layers expand.

## Architecture

- Application source: to be added as 1.7 is built
- Supabase: database, migrations, generated types, and Edge Functions
- Deterministic pricing engine: versioned separately from presentation/UI code
- Secrets: never committed to Git

## Repository structure

```text
/
├─ app/                  # application/UI source
├─ engine/               # deterministic pricing logic
├─ supabase/
│  ├─ migrations/        # SQL migrations
│  └─ functions/         # Supabase Edge Functions
├─ docs/                 # architecture and implementation notes
├─ .env.example          # environment-variable names only
└─ README.md
```

## Development rule

Any schema change should be represented by a migration committed to this repository. Production secrets, service-role keys, database passwords, and private tokens must remain outside Git.

## Version

**1.7 — early development**
