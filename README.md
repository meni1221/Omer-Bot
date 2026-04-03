# 🕯️ Omer Counter Bot (NestJS + WhatsApp)

An advanced, automated WhatsApp bot for Sefirat HaOmer, built with **NestJS** and **WhatsApp-web.js**, specifically optimized for seamless deployment on **Railway** via Docker.

## 🚀 Key Features
- **Automated Counting:** Calculates sunset times and automatically sends the daily counting message.
- **Media Support:** Sends a dedicated image for each specific day from the `assets/omer` directory.
- **Admin Management:** Personalized notifications to the administrator (Meni Levi) regarding connection status and successful deliveries.
- **Cloud Stability:** Custom Docker configurations designed for running Puppeteer and Headless Chrome in Linux environments.

## 🛠️ Tech Stack
- **Framework:** [NestJS](https://nestjs.com/)
- **WhatsApp API:** [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- **Automation:** Puppeteer (Headless Chrome)
- **Deployment:** Docker & [Railway](https://railway.app/)
- **Scheduler:** `@nestjs/schedule`

## 📂 Media Structure
The bot retrieves daily images from the following path:
`assets/omer/{dayNumber}.jpg`
*Example: On the first day of counting, the bot will look for a file named `1.jpg`.*

## ⚙️ Deployment Settings (Railway)

### Environment Variables
Ensure the following variables are configured in your Railway dashboard:
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: `false`
- `NODE_ENV`: `production`

### Docker Engine
The project utilizes a custom `Dockerfile` that installs all necessary Linux dependencies for Chrome:
1. Installs system libraries (`libnss3`, `libgbm`, etc.).
2. Downloads a compatible Chrome browser using `npx puppeteer browsers install chrome`.

## 🖥️ Local Installation
1. `npm install`
2. `npm run start:dev`
3. Scan the QR code generated in the terminal.

## 📱 WhatsApp Authentication
During the initial deployment on Railway, a QR code link will appear in the logs:
`👉 Open this link to scan: https://api.qrserver.com/...`
Open this link in your browser and scan it with your mobile device. The session is persistent and will remain connected automatically.

## ✍️ Credits
**Lead Developer:** Meni Levi - Full Stack Developer & AI Prompt Engineer.
