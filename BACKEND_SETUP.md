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
