# Bellcorp Parking Lot Management System

A production-oriented parking lot system with a React operations dashboard and an Express API backed by PostgreSQL, MongoDB, and Redis.

## Stack

- React + Vite + CSS
- Node.js + Express
- PostgreSQL for users, slots, vehicles, and tickets
- MongoDB for audit events
- Redis for rate-limiting infrastructure
- JWT authentication and bcrypt password hashing

## Run locally

1. Start PostgreSQL, MongoDB, and Redis on their default local ports.
2. Create `server/.env` from `server/.env.example`.
3. Apply `database/postgres/schema.sql` to the `bellcorp_parking` database.
4. Start the API:

```powershell
cd server
npm install
npm start
```

5. Start the dashboard in a second terminal:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## API

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/parking/availability`
- `POST /api/parking/park`
- `POST /api/parking/exit`
- `GET /api/parking/active`
- `GET /api/parking/history?page=1&limit=20`

Parking routes require `Authorization: Bearer <token>`. Slot assignment uses a PostgreSQL transaction and `SELECT ... FOR UPDATE`, so simultaneous requests cannot claim the same final slot.

## Verification completed

- PostgreSQL, MongoDB, and Redis connectivity verified.
- Auth registration and login verified against PostgreSQL.
- Park, active ticket, exit, fare, and history flow verified.
- Concurrent final-slot test verified: two truck requests succeed and the third returns `409 Parking Full`.
- React production build verified with `npm run build`.

## Problem statement and features

The system manages a fixed lot of 5 Bike, 5 Car, and 2 Truck slots. Operators can authenticate, view live capacity, park vehicles, issue unique tickets, complete exits, calculate server-side fares, and inspect active and completed parking records.

## Architecture and project structure

React calls the stateless Express API. Controllers delegate to services; PostgreSQL is the source of truth for transactional data, MongoDB stores audit events, and Redis caches availability. See [DESIGN.md](DESIGN.md) for the HLD, transaction boundary, scaling approach, and security design.

```text
client/                 React/Vite dashboard
server/src/config/      environment and database clients
server/src/controllers/ HTTP request handlers
server/src/middleware/  auth, validation, errors, rate limiting
server/src/routes/      REST route definitions
server/src/services/    authentication, parking, audit business logic
server/src/validators/  Joi request schemas
database/postgres/      relational schema and seed slots
database/mongo/         audit collection indexes
```

## Database design

PostgreSQL contains `users`, `parking_slots`, `vehicles`, and `parking_tickets`, with foreign keys, unique constraints, status checks, and indexes. MongoDB contains the append-only `audit_logs` collection with event type, user/ticket references, vehicle details, timestamp, and metadata. Core records are not duplicated in MongoDB.

## Redis usage and invalidation

`parking:availability` caches the availability read model for 60 seconds. A cache hit avoids the aggregate query; a successful park or exit invalidates the key after the PostgreSQL commit. Cache failures are logged and do not replace PostgreSQL as the source of truth.

## Security and error handling

JWT protects parking routes, bcrypt hashes passwords, Joi rejects unexpected or malformed input, and SQL statements are parameterized. MongoDB receives structured objects rather than user-built query operators. Authentication and parking writes are rate limited. Errors return status codes and safe messages without stack traces.

## Environment variables

Copy `server/.env.example` to `server/.env` and provide local values for `PORT`, `JWT_SECRET`, `DATABASE_URL`, `MONGODB_URI`, `REDIS_URL`, and `NODE_ENV`. Never commit `.env` or real credentials.

## Local services

PostgreSQL uses database `bellcorp_parking` on port `5432`; apply `database/postgres/schema.sql`. MongoDB runs on port `27017`; run `database/mongo/init.js` with `mongosh` when available. Redis runs on port `6379`. Docker Compose is available as an optional alternative in `docker-compose.yml`.

## Testing checklist

Exercise registration, login, invalid login, unauthorized access, validation failures, Bike/Car/Truck parking, duplicate active vehicles, full capacity, invalid and repeated exits, slot release, fare boundaries, history pagination, audit events, and concurrent requests with one remaining slot. The concurrency check must assert one allocation and one `Parking Full` response when only one slot remains. `DEMO_SCRIPT.md` contains the repeatable presentation flow.

## Submission notes

Screenshots should be captured from the running dashboard and attached to the final submission; no binary screenshots are committed by default. Known limitations are local service startup management and a single-process in-memory rate limiter; production deployment should use managed services and a shared limiter store. Future improvements include role-based operator access, automated migrations, stronger observability, and a CI test pipeline. `DESIGN.md` is the design document and `DEMO_SCRIPT.md` is the video demonstration guide.
