# Production backend setup

The GitHub Pages build is a UX/data-flow prototype. It is not a secure credential store.

## Recommended architecture

1. Create a **new Supabase project dedicated to Fluency First**.
2. Apply `supabase-schema.sql`.
3. Use Supabase Auth for sessions and keep the learner-facing username in `profiles`.
4. Add a trusted Edge Function or Railway API for teacher-only account creation and password reset.
5. Teacher creates a student → backend creates the Auth identity → inserts `profiles` and `class_members` → returns a temporary password once.
6. Store attempts, completion and writing submissions in Supabase.
7. Row Level Security keeps student evidence private while allowing teachers to read students in their own classes.

## Why a new project

The connected Supabase account already contains other applications. Reusing one would mix unrelated data and security policies. The Fluency First system should have its own isolated backend.


## System Admin

Set these Railway environment variables to create the System Admin account:

- `SYSTEM_ADMIN_USERNAME` — optional, defaults to `admin`
- `SYSTEM_ADMIN_PASSWORD` — required to create/verify the admin account
- `SYSTEM_ADMIN_NAME` — optional, defaults to `System Admin`

Role flow:

1. System Admin creates teacher accounts.
2. System Admin creates classes and assigns a teacher.
3. System Admin can add the initial students to a class.
4. After setup, each teacher can create and manage students only inside classes assigned to that teacher.

Temporary passwords are generated for newly created teachers/students and are shown only at creation/reset time.

## Build failure: "failed to solve: secret admin not found"

If a Railway build fails with `failed to solve: secret admin not found`, this is a
Docker BuildKit error that occurs when a build step references
`--mount=type=secret,id=admin` but no secret named `admin` was supplied to the
build. This repository does not contain a `Dockerfile`, `docker-compose.yml`,
`railpack.toml`/`railpack.json`, or any build script under `scripts/` that
references a secret called `admin` — the app is built with Railway's Railpack
builder using the standard Node.js detection from `package.json` (`npm install`
then `npm start`), with no custom secret mounts defined anywhere in this repo.

This means the error is not caused by application code (including CSS-only
commits) and cannot be fixed by changing files in this repository. It points to
a stale or misconfigured **build-time secret** set at the Railway service level
(Service → Settings → Build → Secrets, or an inherited variable group) that is
no longer valid. To resolve it:

1. Open the Railway service's build settings and check for any build secret
   named `admin`. Remove it if it is not intentionally used, since Railpack
   builds for this service do not require any build-time secrets.
2. If a secret is genuinely required (for example, to authenticate a private
   registry or package source during the build), recreate it under Railway's
   "Secrets" panel so the builder can resolve `id=admin` successfully.
3. Confirm the runtime environment variables this app actually needs
   (`DATABASE_URL`, `JWT_SECRET`, `SYSTEM_ADMIN_USERNAME`,
   `SYSTEM_ADMIN_PASSWORD`, `SYSTEM_ADMIN_NAME`, `TEACHER_USERNAME`,
   `TEACHER_PASSWORD`) are set as regular **deploy** variables, not build
   secrets — none of them are needed at build time.
4. Trigger a fresh build after clearing Railway's build cache, since a cached
   build plan can keep referencing a secret ID that has since been removed.
