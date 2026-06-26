# NEXURL

NEXURL is a highly scalable, robust, and modern URL shortening and analytics platform. It goes beyond simple URL redirection by offering developers and end-users a comprehensive suite of tools to track, manage, and analyze link performance in real-time. Built with a focus on high availability and data integrity, NEXURL leverages a modern web stack to deliver a seamless user experience and lightning-fast API responses.

---

## 🌟 Core Features

### 1. Advanced URL Management
- **Intelligent Shortening:** Instantly convert long, cumbersome URLs into compact, shareable links.
- **Custom Aliases:** Personalize your links with custom aliases (e.g., `nexurl.com/my-campaign`) for better brand recognition and click-through rates.
- **Link Expiration:** Configure URLs to automatically expire at a specific date and time, perfect for time-bound promotions and secure one-time sharing.
- **Link Management Dashboard:** A comprehensive user interface to view, edit, and manage all your shortened links in one place.

### 2. Deep Analytics & Tracking
Every click on a NEXURL link is meticulously tracked and processed to provide actionable insights without compromising user privacy.
- **Geographic Data:** Track the country and city of origin for each click to understand global reach.
- **Device & Browser Profiling:** Analyze the devices (Desktop, Mobile, Tablet), operating systems, and browsers your audience uses.
- **Referrer Tracking:** Identify which external websites, social media platforms, or campaigns are driving traffic to your links.
- **Time-Series Aggregation:** Click data is asynchronously aggregated into hourly and daily buckets, allowing for high-performance dashboard rendering and trend analysis.

### 3. Developer API & Integration
NEXURL is built with developers in mind, offering a secure and rate-limited API for external integrations.
- **API Key Provisioning:** Users can generate and manage their own secure API keys from the dashboard.
- **Granular Rate Limiting:** A sophisticated rate-limiting engine protects endpoints from abuse, ensuring fair usage and system stability.
- **RESTful Architecture:** Predictable, resource-oriented URLs and standard HTTP response codes make integration a breeze.

### 4. Enterprise-Grade Security
- **Authentication:** Secure user login and registration powered by JSON Web Tokens (JWT) and bcrypt password hashing.
- **Data Protection:** Extensive use of HTTP headers via Helmet to prevent common web vulnerabilities (XSS, Clickjacking, etc.).
- **Input Validation:** Strict sanitization and validation on all user inputs to prevent injection attacks.

---

## 🛠️ Technology Stack

NEXURL utilizes a decoupled architecture, separating the client-side presentation from the server-side business logic.

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Language:** TypeScript for type safety and improved developer experience.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) for rapid, utility-first UI development.
- **Icons & Assets:** [Lucide React](https://lucide.dev/) for crisp, scalable iconography.

### Backend
- **Framework:** Node.js with [Express.js](https://expressjs.com/)
- **Database:** MySQL for reliable, ACID-compliant relational data storage.
- **Caching Layer:** Redis for ultra-fast data retrieval and session management.
- **Job Queues:** [BullMQ](https://docs.bullmq.io/) handles asynchronous tasks like click tracking and analytics aggregation without blocking the main event loop.
- **Logging & Monitoring:** Winston and Morgan for comprehensive application and request logging.

---

## 🏗️ Architecture Workflow

1. **Link Creation:** A user submits a long URL. The Express backend validates the input, generates a unique short code (or verifies a custom alias), and stores the mapping in the MySQL database.
2. **Redirection & Tracking:** When a user visits a short link, the backend quickly retrieves the original URL (leveraging Redis cache if applicable) and initiates a redirection.
3. **Asynchronous Processing:** Simultaneously, the request headers (IP, User-Agent) are pushed to a Redis-backed BullMQ queue.
4. **Data Aggregation:** Background workers process the queue, parsing IPs for geolocation and User-Agents for device info, inserting raw events into the `click_events` table, and updating the `analytics_hourly` and `analytics_daily` rollup tables.

---

## ⚙️ Prerequisites

Before setting up the project locally, ensure your development environment meets the following requirements:
- **Node.js**: v18.x or higher
- **MySQL**: v8.x or higher (Running locally or via a cloud provider)
- **Redis**: v6.x or higher (Required for caching and BullMQ)
- **Git**: For version control

---

## 🚀 Installation & Setup Guide

### 1. Database Configuration
Initialize your MySQL database using the provided schema.
```sql
-- Connect to your MySQL server and run:
SOURCE backend/schema.sql;
```

### 2. Backend Setup
Navigate to the backend directory, install dependencies, and configure the environment.

```bash
cd backend
npm install
```

**Environment Variables:**
Create a `.env` file in the root of the `backend` directory. Use the following template to guide you (do not commit actual secrets to version control):

```env
# Server
PORT=5000
NODE_ENV=development

# Database (MySQL)
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=nexurl

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
```

Start the backend server:
```bash
npm run dev
```
The API will typically be available at `http://localhost:5000`.

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies.

```bash
cd frontend
npm install
```

**Environment Variables:**
Create a `.env.local` file in the root of the `frontend` directory.

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend development server:
```bash
npm run dev
```
Access the web application at `http://localhost:3000`.

---

## 🗄️ Database Schema Overview

The MySQL database is structured to optimize both write-heavy tracking events and read-heavy analytics queries:
- `users`: Stores user credentials and profile information.
- `urls`: Maps short codes to original URLs, including ownership and expiration metadata.
- `click_events`: An append-only table recording granular details of every link click.
- `analytics_hourly` & `analytics_daily`: Pre-aggregated tables that summarize click events, significantly speeding up dashboard load times.
- `api_keys` & `rate_limits`: Dedicated tables for managing developer access and enforcing usage policies.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve NEXURL, please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

This project is open-source and available under standard open-source licensing. Please review the repository for specific license details.
