# EnglishGate Jitsi setup

EnglishGate is wired for a private, JWT-protected Jitsi deployment.

## Required EnglishGate environment variables

Set these on the EnglishGate production service:

- `JITSI_DOMAIN` — hostname of the self-hosted Jitsi service, for example `live.englishgate.com`
- `JITSI_APP_ID` — shared Jitsi JWT application ID
- `JITSI_APP_SECRET` — shared Jitsi JWT secret

Never expose `JITSI_APP_SECRET` to the browser.

## Required Jitsi configuration

Use the official Jitsi Docker deployment or equivalent self-hosted install.

JWT authentication must be enabled and anonymous/no-token access must be disabled. For the official Docker deployment, configure:

```
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=<same value as EnglishGate JITSI_APP_ID>
JWT_APP_SECRET=<same value as EnglishGate JITSI_APP_SECRET>
JWT_ALLOW_EMPTY=0
```

Use HTTPS for the Jitsi hostname.

The Jitsi service should be hosted separately from the EnglishGate Railway web service because WebRTC video requires its own networking, UDP/TURN and resource profile.

## EnglishGate access flow

Teacher:

`TEACH -> Whiteboard -> Live Class -> Start Live Class`

EnglishGate verifies that the teacher owns the approved class, creates a private room name, and issues a short-lived room-specific JWT.

Student:

`EnglishGate login -> enrolled class -> Join Live Class`

EnglishGate verifies enrollment before issuing the student JWT. The raw meeting link is not displayed in the EnglishGate UI, invite controls are disabled inside the embedded Jitsi UI, and Jitsi must reject requests without a valid JWT.

## Security model

A Jitsi URL by itself is not sufficient to enter the room when `JWT_ALLOW_EMPTY=0`. Access requires a valid short-lived JWT signed by EnglishGate.

Jitsi room JWTs expire after 15 minutes and are scoped to one room. The token is used to enter the meeting; the EnglishGate app separately records classroom attendance.

## Attendance

EnglishGate records join, heartbeat, and leave events in `jitsi_session_attendance`.

Teacher attendance is available from:

`GET /api/teacher/jitsi-session/:id/attendance`

## Current implementation

Backend:
- `jitsi-classroom-bootstrap.js`

Frontend:
- `public/jitsi-classroom-v1.js`
- `public/jitsi-classroom-v1.css`
- Jitsi appears as `Live Class` inside the teacher Whiteboard.
- Enrolled students receive a `Join Live Class` banner while a class session is active.
