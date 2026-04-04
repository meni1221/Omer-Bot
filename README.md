# 🤖 Omer-Bot: Automated WhatsApp Distribution System

A robust, enterprise-grade WhatsApp automation service built with **NestJS** and **whatsapp-web.js**. This bot is specifically engineered to handle the daily counting of the Omer (Sefirat HaOmer) with high precision, halachic accuracy (Zmanim), and fault-tolerant deployment on **Railway.app**.

## 🌟 Key Features

### 📅 Halachic Precision (Zmanim)

- **Real-time API Integration:** Fetches daily sunset data from **Hebcal** specifically for Bnei Brak, Israel.
- **Dynamic Scheduling:** Automatically calculates the distribution time by adding exactly **24 minutes** to the local sunset (following Chabad custom).
- **Auto-Refresh:** Re-calculates prayer times every hour and upon every system reboot to ensure 100% accuracy.

### 🛡️ Resilience & Fault Tolerance (The "Meni-Logic")

- **Anti-Sleep Mechanism:** Configured with specific Chromium flags (`--disable-renderer-backgrounding`) to prevent the cloud environment from putting the WhatsApp tab to sleep.
- **Self-Healing:** Automatically detects `detached Frame` errors or session timeouts and triggers a full client restart within 15 seconds.
- **Recovery Window:** If the server restarts near the target time, the bot checks if it missed the window. If it's within 30 minutes of the target, it triggers a "Late Send" to ensure no group is left behind.
- **Double-Send Protection:** Uses a "Day-Lock" mechanism (RAM-based) to ensure that the bot never spams groups twice on the same day, even after a mid-day restart.

### 📊 Monitoring & Reporting

- **Hourly Heartbeat:** Sends an automated "🟢 Bot is Alive" status message to the admin every hour on the hour (e.g., 03:00, 04:00) including the current target time.
- **Startup Diagnostics:** Sends a "System Startup" report to the administrator (Meni Levi) within the first 10 minutes of deployment.
- **Detailed Cloud Logs:** Every heartbeat and message delivery is logged with clear emojis for easy debugging in the Railway console.
- **Remote QR Scanning:** Generates a direct URL for the QR code in the logs: `👉 QR LINK FOR SCANNING: https://...`

---

## 🛠️ Tech Stack

- **Framework:** [NestJS](https://nestjs.com/)
- **WhatsApp API:** [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- **Automation:** Puppeteer (Headless Chrome)
- **Deployment:** Docker & [Railway](https://railway.app/)
- **Scheduler:** `@nestjs/schedule`

---

## 📂 Media Structure

The bot retrieves daily images from the following path:
`assets/omer/{dayNumber}.jpg`
_Example: For the 5th day of counting, the bot will look for a file named `5.jpg`. If the image is missing, the bot gracefully fails over to a text-only message._

---

## 📝 Operational Logic (The Scheduler)

1. **Initialization:** On startup, the bot fetches the sunset time and calculates the target send time (e.g., 19:27).
2. **Heartbeat:** Every minute, the bot checks the current time against the target.
3. **The Logic Tree:**
   - **Current Time == Target Time:** Trigger distribution to all 4 groups.
   - **Current Time > Target Time:** If `Last Sent != Today` AND `Time < 30m late` -> **RECOVERY SEND**.
   - **Safety Lock:** The bot will never trigger a send between **00:00 and 05:00 AM** to avoid sending "yesterday's" data during a late-night maintenance restart.
   - **Hourly Status:** If `Minute == 00` -> Send "Bot is Alive" ping to Admin.

---

## 👨‍💻 Credits

**Lead Developer:** Meni Levi - Full Stack Developer & Tech Content Creator.
_Project developed in 2026 for automated community service._

---

_Disclaimer: This project is for educational and community service purposes. Use responsibly according to WhatsApp's Terms of Service._

🤖 בוט עומר (Omer-Bot): מערכת הפצה אוטומטית לוואטסאפ
מערכת אוטומציה מתקדמת לוואטסאפ שנבנתה עם NestJS ו-whatsapp-web.js. הבוט תוכנן במיוחד להפצה יומית של ספירת העומר בדיוק הלכתי גבוה, תוך עמידה בתנאי פריסה מאתגרים על שרת Railway.app.

🌟 יכולות מרכזיות
📅 דיוק הלכתי (זמנים)
אינטגרציה בזמן אמת: משיכת נתוני שקיעה יומיומיים מ-Hebcal עבור בני ברק.

תזמון דינמי: חישוב אוטומטי של זמן ההפצה על ידי הוספת 24 דקות בדיוק לשקיעה (לפי מנהג חב"ד).

רענון אוטומטי: חישוב מחדש של הזמנים בכל שעה ובכל הפעלה מחדש של השרת.

🛡️ חסינות ושרידות (לוגיקת "מני")
מנגנון נגד הרדמה: הגדרות כרום מיוחדות למניעת הרדמת הטאב של וואטסאפ בסביבת ענן.

תיקון עצמי (Self-Healing): זיהוי שגיאות חיבור או קריסות של דפדפן ואתחול מחדש של המערכת תוך 15 שניות.

חלון שחזור (Recovery): אם השרת מבצע Restart קרוב לזמן היעד, הבוט בודק אם הוא פספס את השליחה. אם עברו פחות מ-30 דקות, הוא יבצע שליחה בדיעבד כדי שאף קבוצה לא תישאר מאחור.

הגנה משליחה כפולה: מנגנון "נעילת יום" (מבוסס זיכרון) המבטיח שהבוט לא ישלח הודעות פעמיים באותו יום, גם אחרי קריסת שרת.

📊 ניטור ודיווח (עדכונים חדשים 🚀)
דופק שעתי (Heartbeat): שליחת הודעת סטטוס "🟢 הבוט חי" למנהל המערכת בכל שעה עגולה, כולל זמן היעד המעודכן.

דיווח התנעה: שליחת דוח אבחון למנהל (מני לוי) ב-10 הדקות הראשונות של הפריסה.

לוגים מפורטים: כל פעולה מתועדת בלוגים של Railway עם אימוג'ים ברורים לניטור קל.

סריקת QR מרחוק: יצירת לינק ישיר לסריקת ה-QR מתוך הלוגים ללא צורך במסך פיזי.

🛠️ טכנולוגיות
Backend: NestJS

WhatsApp API: whatsapp-web.js

Automation: Puppeteer (Headless Chrome)

Deployment: Docker & Railway

Scheduler: @nestjs/schedule

📂 מבנה המדיה
הבוט מושך תמונות יומיומיות מהנתיב הבא:
assets/omer/{dayNumber}.jpg
לדוגמה: ביום החמישי לעומר, הבוט יחפש קובץ בשם 5.jpg. אם התמונה חסרה, הבוט ישלח הודעת טקסט בלבד כדי לקיים את המצווה.

📝 לוגיקת עבודה (התזמון)
אתחול: בעליית השרת, הבוט מושך את זמן השקיעה ומחשב את זמן היעד (למשל 19:27).

בדיקה דקתית: בכל דקה הבוט משווה את השעה הנוכחית ליעד.

עץ החלטות:

שעה נוכחית == זמן יעד: ביצוע הפצה ל-4 הקבוצות המוגדרות.

שעה נוכחית > זמן יעד: אם לא נשלח היום ועברו פחות מ-30 דקות - שליחת שחזור.

נעילת בטיחות: הבוט לעולם לא ישלח הודעות בין 00:00 ל-05:00 בבוקר כדי למנוע טעויות בגלל ריסטארטים ליליים.

סטטוס שעתי: בכל דקה שמתחלקת ל-00 (שעה עגולה) - שליחת הודעת "סימן חיים" למנהל.

👨‍💻 קרדיטים
מפתח ראשי: מני לוי - Full Stack Developer & Tech Content Creator.
הפרויקט פותח בשנת 2026 כשירות קהילתי אוטומטי.

הצהרה: פרויקט זה נועד למטרות חינוכיות ושירות קהילתי. השימוש הוא באחריות המשתמש ובהתאם לתנאי השימוש של וואטסאפ.
