# Smart Locker Kiosk Backend API

Node.js + Express backend service with PostgreSQL integration for the Smart Locker Kiosk touch application.

## Endpoints

- `GET  /api/health` — API health check
- `GET  /api/stations/:id/availability` — Live vacant/occupied compartment counts
- `POST /api/orders/dropoff` — Creates a dropoff order & allocates locker box
- `POST /api/orders/verify-pin` — Verifies 6-digit claim PIN for customer pickup
- `GET  /api/orders/:id` — Order status check

## Running Locally

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Setup environment variables:
   Copy `.env.example` to `.env` and fill in `DATABASE_URL`.
3. Start the server:
   ```bash
   npm start
   ```
