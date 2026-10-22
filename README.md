
# AquaReach — Water Tanker Request Portal

A responsive EWP mini-project built with **Node.js, Express, HTML, CSS, and vanilla JavaScript**. It has a polished landing page, a water tanker request form, request tracking, and an admin dashboard.

## Features

- Responsive layout for desktop, tablet, and mobile.
- Submit a request with contact details, delivery address, locality, delivery date, quantity, priority, and notes.
- Server-side validation and a unique tracking ID for each request.
- Track a request by ID without creating an account.
- Admin sign-in, request overview, status changes, and request deletion.
- Status history for each request.
- Express REST API and JSON-file persistence (no database setup needed for the demo).

## Requirements

- Node.js 18 or newer
- npm

## Run locally

1. Download or clone this repository.
2. Open the project folder in a terminal.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env` and change `ADMIN_PASSWORD` to a password of your choice. The project uses `dotenv` to load these settings automatically.
5. Start the app:

   ```bash
   npm start
   ```

6. Visit **http://localhost:3000**.

For auto-restart during development, run `npm run dev` after `npm install`.

## Admin dashboard

- Click **Admin sign in** in the footer.
- Default local demo password: `admin123`
- Set `ADMIN_PASSWORD` in your hosting environment before deploying.

**Important:** This is an educational demo. The admin password is checked on each protected request and is not a production authentication system. For a public production service, use proper admin accounts, hashed passwords, sessions or secure tokens, rate limiting, HTTPS, audit logging, and a database.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/requests` | Public request list (private phone numbers excluded) |
| GET | `/api/requests?trackingId=WT-...` | Look up one request by tracking ID |
| POST | `/api/requests` | Create a request |
| POST | `/api/admin/login` | Validate admin password |
| GET | `/api/admin/requests` | Admin list (requires `x-admin-password`) |
| PATCH | `/api/admin/requests/:id` | Update status (requires `x-admin-password`) |
| DELETE | `/api/admin/requests/:id` | Delete request (requires `x-admin-password`) |

### Example request payload

```json
{
  "name": "Priya Sharma",
  "phone": "+91 98765 43210",
  "address": "Flat 402, Example Apartments",
  "area": "Madhapur",
  "quantity": 1,
  "date": "2026-11-01",
  "urgency": "Normal",
  "notes": "Call on arrival"
}
```

## Request lifecycle

`Pending → Approved → Assigned → In Transit → Delivered`

An administrator can also mark a request as `Rejected`.

## GitHub setup

Create an empty repository on GitHub, then run:

```bash
git init
git add .
git commit -m "Build AquaReach water tanker request portal"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## Suggested EWP viva points

- **Node.js:** runs JavaScript on the server.
- **Express.js:** defines routes and REST API endpoints.
- **HTTP methods:** GET reads data, POST creates requests, PATCH updates status, DELETE removes a request.
- **JSON persistence:** stores demo requests in `data/requests.json`; a database such as MongoDB can replace it later.
- **Validation:** checks required fields, contact number, tanker quantity, priority, and delivery date on the server.
- **Frontend:** HTML structures the page, CSS handles responsive styling, and JavaScript calls the Express API with `fetch()`.

