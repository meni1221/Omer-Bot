🤖 Omer-Bot: Automated WhatsApp Distribution System
A robust, enterprise-grade WhatsApp automation service built with NestJS and whatsapp-web.js. This bot is specifically engineered to handle the daily counting of the Omer (Sefirat HaOmer) with high precision, halachic accuracy (Zmanim), and fault-tolerant deployment on Railway.app.

🌟 Key Features
📅 Halachic Precision (Zmanim)
Real-time API Integration: Fetches daily sunset data from Hebcal specifically for Bnei Brak, Israel.

Dynamic Scheduling: Automatically calculates the distribution time by adding exactly 24 minutes to the local sunset (following Chabad custom).

Auto-Refresh: Re-calculates prayer times every hour and upon every system reboot to ensure 100% accuracy.

Early Distribution (NEW): Integrated detection for Friday and Holiday eves, triggering an early send at 16:00 with appropriate halachic warnings.

🛡️ Resilience & Fault Tolerance (The "Meni-Logic" v3.0)
State Persistence (The Fix): Unlike RAM-only versions, this bot uses a StateService to write the lastSentDay into a bot-state.json file. This ensures that even after a server restart, the bot "remembers" it already sent the message and won't spam groups.

Anti-Sleep Mechanism: Configured with specific Chromium flags (--disable-renderer-backgrounding) to prevent the cloud environment from putting the WhatsApp tab to sleep.

Self-Healing: Automatically detects detached Frame errors or session timeouts and triggers a full client restart within 20 seconds.

Recovery Window: If the server restarts near the target time, the bot checks its saved state. If it's within 30 minutes of the target, it triggers a "Late Send" to ensure no group is left behind.

Double-Send Protection: A double-lock mechanism (File + Memory) to ensure 0% chance of double messages.

📊 Monitoring & Reporting
Hourly Heartbeat: Sends an automated "🟢 Bot is Alive" status message to the admin every hour on the hour (e.g., 03:00, 04:00) including the current target time and day type.

Startup Diagnostics: Sends a "System Startup" report to the administrator (Meni Levi) within the first 10 minutes of deployment.

Detailed Cloud Logs: Every heartbeat and message delivery is logged with clear emojis for easy debugging in the Railway console.

Remote QR Scanning: Generates a direct URL for the QR code in the logs: 👉 QR LINK FOR SCANNING: https://...

🛠️ Tech Stack & Architecture
Framework: NestJS

Architecture: Modular Provider Pattern (Common, Omer, Whatsapp modules).

WhatsApp API: whatsapp-web.js

Automation: Puppeteer (Headless Chrome) optimized for Railway.

Persistence: JSON-based state tracking for restart-resiliency.

📂 Media Structure
The bot retrieves daily images from the following path:
assets/omer/{dayNumber}.jpg
Example: For the 5th day of counting, the bot will look for a file named 5.jpg. If the image is missing, the bot gracefully fails over to a text-only message.

📝 Operational Logic (The Scheduler)
Initialization: On startup, the bot fetches the sunset time and determines if today is a weekday, Friday, or a Holiday Eve.

Heartbeat: Every minute, the bot checks the current time against the target.

The Logic Tree:

Current Time == Target Time: Trigger distribution to all groups.

Current Time == 16:00 (Fri/Holiday): Trigger early distribution with "Shabbat Shalom" prefix.

Persistence Check: Before sending, the bot verifies the bot-state.json to ensure the day hasn't already been processed.

Safety Lock: The bot will never trigger a send between 00:00 and 05:00 AM to avoid errors during maintenance.

👨‍💻 Credits
Lead Developer: Meni Levi - Full Stack Developer & Tech Content Creator.
Project developed in 2026 for automated community service.

🇮🇱 בוט עומר (Omer-Bot): מערכת הפצה אוטומטית לוואטסאפ
מערכת אוטומציה מתקדמת לוואטסאפ שנבנתה עם NestJS ו-whatsapp-web.js. הבוט תוכנן במיוחד להפצה יומית של ספירת העומר בדיוק הלכתי גבוה, תוך עמידה בתנאי פריסה מאתגרים על שרת Railway.app.

🌟 יכולות מרכזיות
📅 דיוק הלכתי (זמנים)
אינטגרציה בזמן אמת: משיכת נתוני שקיעה יומיומיים מ-Hebcal עבור בני ברק.

תזמון דינמי: חישוב אוטומטי של זמן ההפצה (שקיעה + 24 דקות) לפי מנהג חב"ד.

שליחה מוקדמת: זיהוי אוטומטי של ערבי שבת וחג ושליחה ב-16:00 עם אזהרה הלכתית.

🛡️ חסינות ושרידות (לוגיקת "מני" v3.0)
ניהול מצב (הפתרון): שימוש ב-StateService למעקב אחרי שליחות בקובץ JSON. מבטיח שהבוט לא ישלח הודעות פעמיים גם אחרי ריסטארט לשרת.

תיקון עצמי (Self-Healing): זיהוי שגיאות חיבור או קריסות דפדפן ואתחול מחדש תוך 20 שניות.

חלון שחזור (Recovery): אם השרת מבצע Restart קרוב לזמן היעד, הבוט בודק אם הוא פספס את השליחה ומבצע שליחה בדיעבד במידת הצורך.

הגנה משליחה כפולה: מנגנון נעילה כפול (זיכרון + קובץ) להגנה מקסימלית.

📊 ניטור ודיווח
דופק שעתי (Heartbeat): הודעת סטטוס "🟢 הבוט חי" למנהל המערכת בכל שעה עגולה.

דיווח התנעה: דוח אבחון מפורט נשלח למנהל (מני לוי) ב-10 הדקות הראשונות של הפריסה.

סריקת QR מרחוק: יצירת לינק ישיר לסריקת ה-QR מתוך הלוגים ללא צורך במסך פיזי.

🛠️ טכנולוגיות
Backend: NestJS (ארכיטקטורה מודולרית)

WhatsApp API: whatsapp-web.js

שרידות: ניהול State מבוסס JSON למניעת כפילויות.

👨‍💻 קרדיטים
מפתח ראשי: מני לוי - Full Stack Developer & Tech Content Creator.
הפרויקט פותח בשנת 2026 כשירות קהילתי אוטומטי.

הצהרה: פרויקט זה נועד למטרות חינוכיות ושירות קהילתי. השימוש הוא באחריות המשתמש ובהתאם לתנאי השימוש של וואטסאפ.
