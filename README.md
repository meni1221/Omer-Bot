# 🕯️ Omer-Bot: Smart AI-Driven WhatsApp Automation

**An automated daily reminder system for "Sefirat HaOmer" featuring dynamic "Zmanim" scheduling and handcrafted cinematic AI art.**

---

## 🚀 Overview
Omer-Bot brings a high-end cinematic experience to the daily Omer count. Instead of static messages, the system fetches real-time astronomical data (Zmanim) to ensure each reminder is delivered exactly at the halachic time, providing a seamless blend of tradition and high-tech automation.

## ✨ Key Features
- **Dynamic "Zmanim" Scheduling:** Unlike static bots, this system calculates **Tzeit HaKochavim** (dusk) daily via the Hebcal API to trigger messages at the precise moment.
- **Friday & Shabbat Logic:** Smart built-in logic that detects Fridays and sends the reminder **early (before Shabbat starts)**, ensuring users are prepared before the day of rest.
- **Handcrafted AI Art:** 49 unique 8K cinematic renders—one for each day. Every image was manually prompted and curated to maintain a premium, consistent visual language.
- **WhatsApp Integration:** Robust connection using `whatsapp-web.js` with session persistence.
- **Cloud-Ready (Render.com):** Fully optimized for headless Linux environments with automated Chromium management.

## 🛠️ Tech Stack
- **Backend:** [NestJS](https://nestjs.com/) (Node.js & TypeScript)
- **Automation:** [Puppeteer](https://pptr.dev/) & [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js/)
- **Data Source:** [Hebcal API](https://www.hebcal.com/home/category/developers) (Zmanim & Omer Data)
- **Art Direction:** Manually Crafted Generative AI Art (8K Cinematic Style)
- **Deployment:** [Render](https://render.com/)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/omer-bot.git](https://github.com/YOUR_USERNAME/omer-bot.git)
   cd omer-bot
Install dependencies:

Bash
npm install
npx puppeteer browsers install chrome
Assets:
Ensure your 49 handcrafted images are located in assets/omer/ named 1.jpg through 49.jpg.

Run Locally:

Bash
npm run start:dev
☁️ Deployment (Render.com)
To successfully deploy on Render, use these settings:

Build Command: npm install && npx puppeteer browsers install chrome && npm run build

Start Command: npm run start:prod

Environment Variable: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = false

Developed by Meni Levi Full-Stack Developer & Tech Content Creator
