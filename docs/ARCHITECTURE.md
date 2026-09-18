# Property Pricer 1.7 Architecture

## Principle

Keep pricing logic deterministic and auditable. UI, persistence, integrations, and presentation must not silently alter pricing-engine behavior.

## Planned layers

1. **engine/** — deterministic pricing and diagnostic calculations.
2. **app/** — user-facing application and presentation layer.
3. **supabase/migrations/** — version-controlled database schema changes.
4. **supabase/functions/** — server-side Edge Functions.
5. **docs/** — specifications, decision records, and validation notes.

## Supabase baseline

Project: PropertyPricer 1.7

At repository initialization, the Supabase project had:
- no public tables
- no migrations
- no Edge Functions

This gives 1.7 a clean source-controlled baseline.

## Security

Private tokens, service-role keys, database credentials, and MCP secrets must never be committed. Only public client configuration belongs in `.env.example`.
