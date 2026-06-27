# NEXURL

Hey there! Welcome to NEXURL. I built this project because I wanted a URL shortener that does more than just redirect links. I wanted something scalable, fast, and packed with analytics so I could actually see how my links are performing.

NEXURL is a complete URL shortening and analytics platform. It focuses on giving you actionable data in real-time, while keeping things highly available and robust under the hood.

## What it does

### Advanced URL Management
- **Shortening:** Turns long, ugly URLs into neat, shareable links instantly.
- **Custom Aliases:** You can make your links your own (like `nexurl.com/my-campaign`). It just looks better and gets more clicks.
- **Link Expiration:** I added a feature to let links expire at a specific time. Super useful for limited-time offers or when you only want to share something temporarily.
- **Dashboard:** There's a clean UI where you can see and manage all the links you've created.

### Deep Analytics & Tracking
I wanted to know exactly what happens after someone clicks a link, so I built in a lot of tracking (while respecting privacy, of course).
- **Location Data:** You can see which countries and cities your clicks are coming from.
- **Devices & Browsers:** It tracks whether people are on their phones or desktops, and what browsers they are using.
- **Referrers:** It tells you where the traffic came from, like a specific website or social media platform.
- **Fast Dashboards:** I made sure the data is aggregated into hourly and daily buckets in the background, so when you open your dashboard, it loads lightning fast.

### Developer API
If you're a developer and want to integrate this into your own apps, you can!
- **API Keys:** You can grab your own secure API keys right from the dashboard.
- **Rate Limiting:** I set up a solid rate-limiting system to keep the API stable and prevent abuse.
- **RESTful Design:** The API is straightforward to use with standard HTTP responses.

### Security
I didn't cut corners on security.
- **Auth:** It uses JWT and bcrypt for secure logins.
- **Protection:** Added Helmet to guard against things like XSS and Clickjacking.
- **Validation:** Every input is strictly validated so injection attacks are blocked.

## The Tech Stack

I chose a modern, decoupled stack for this because I wanted it to be as fast and reliable as possible.

### Frontend
I went with Next.js and React. Using TypeScript was a no-brainer for catching errors early, and Tailwind CSS made styling the UI incredibly fast. For the icons, I used Lucide React because they look great and scale perfectly.

### Backend
The backend is Node.js with Express. I chose MySQL for the database because I wanted reliable, relational data storage. For caching and managing sessions, I brought in Redis. 
One of the coolest parts is how it handles the heavy lifting: I used BullMQ to manage asynchronous tasks (like tracking those link clicks and aggregating the analytics) so it never slows down the main application. I also set up Winston and Morgan to keep track of logs.

## How it works under the hood

When you submit a URL, the backend checks it, generates a short code, and saves it in MySQL. 

When someone clicks that short link, the system grabs the original URL (using Redis if it's cached) and redirects them immediately. At the exact same time, it drops the click details (like IP and User-Agent) into a Redis-backed BullMQ queue. 

Then, background workers pick up those tasks, figure out the location and device info, and update the analytics tables. This means the redirect is instant, and the heavy data processing happens completely behind the scenes.

## Contributing

If you find this project interesting and want to help make it better, I'd love your contributions! Just fork the repo, create a branch for your feature, and open a Pull Request when you're ready.
