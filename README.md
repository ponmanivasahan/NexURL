# NEXURL

NEXURL is a robust, modern URL shortening and analytics platform. Built with a scalable architecture, it provides an intuitive web interface for managing links and a powerful backend for tracking detailed analytics.

## Key Features

- **Advanced URL Shortening:** Generate random short codes or create custom, memorable aliases for your URLs. Set expiration dates for time-sensitive links.
- **Detailed Analytics:** Track every click with rich metadata. The platform captures and analyzes data including:
  - Geographic location (Country, City)
  - Device and Browser information (OS, Device Type, Browser)
  - Referrer URLs to track traffic sources
  - Aggregated hourly and daily click statistics (unique visitors and total clicks)
- **User Authentication:** Secure user registration and login system, allowing users to manage their own custom links and view their analytics.
- **API Key Management:** Developers can generate secure API keys to integrate NEXURL's features into their own applications, with configurable rate limits.
- **Rate Limiting:** Built-in protection against abuse with a robust rate limiting system applied to endpoints.

## Tech Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Language:** TypeScript

### Backend
- **Framework:** Node.js with [Express.js](https://expressjs.com/)
- **Database:** MySQL
- **Caching & Asynchronous Processing:** Redis & [BullMQ](https://docs.bullmq.io/)
- **Authentication:** JWT (JSON Web Tokens)
- **Logging:** Winston & Morgan
- **Security:** Helmet & bcryptjs

## Prerequisites

Before running the project locally, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **MySQL** server (running locally or remotely)
- **Redis** server (running locally or remotely)

## Getting Started

### 1. Backend Setup

Navigate to the `backend` directory and install the dependencies:
```bash
cd backend
npm install
```

Set up your database schema by running the SQL scripts provided in `backend/schema.sql` against your MySQL instance. 

Create a `.env` file in the `backend` directory and configure your environment variables (e.g., database connection string, Redis URL, JWT secret). *Note: Ensure your `.env` file is added to `.gitignore` to prevent sensitive data from being pushed to version control.*

Start the development server:
```bash
npm run dev
```

### 2. Frontend Setup

Navigate to the `frontend` directory and install the dependencies:
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```

The frontend will typically be accessible at `http://localhost:3000`.

## Architecture & Data Model

The application uses a relational data model (MySQL) for persistent storage and Redis for high-speed caching and job queues. 

- **Users:** Manages user accounts and credentials securely.
- **URLs:** Stores the original and shortened URLs, along with metadata such as custom aliases and expiration times.
- **Analytics:** The `click_events` table captures raw data for every interaction, which is then asynchronously processed and aggregated into `analytics_hourly` and `analytics_daily` tables for efficient querying and dashboard presentation.
- **Security:** `api_keys` and `rate_limits` tables ensure that API access is secure and fair usage is enforced.
