// ============================================================
// data.js — יצירת נתוני דמו לדאשבורד פניות שירות לקוחות
// כל הנתונים מיוצרים באופן דטרמיניסטי (seeded RNG) כדי שהדאשבורד
// יראה עקבי בכל טעינה, אך עדיין "יזוז" יחסית לתאריך הנוכחי.
// ============================================================

(function () {
  "use strict";

  // ---- RNG דטרמיניסטי (mulberry32) ----
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260922);

  function pick(arr) {
    return arr[Math.floor(rand() * arr.length)];
  }
  function pickWeighted(items) {
    // items: [{v, w, ...}] — מחזיר את הפריט המלא (לא רק v)
    const total = items.reduce((s, i) => s + i.w, 0);
    let r = rand() * total;
    for (const it of items) {
      if (r < it.w) return it;
      r -= it.w;
    }
    return items[items.length - 1];
  }
  function randInt(min, max) {
    return Math.floor(rand() * (max - min + 1)) + min;
  }
  function randFloat(min, max) {
    return rand() * (max - min) + min;
  }

  // ---- מילוני בסיס ----
  const CATEGORIES = [
    {
      key: "billing",
      label: "חיוב ותשלומים",
      color: "#f59e0b",
      subjects: [
        "חיוב כפול בכרטיס האשראי",
        "לא התקבלה חשבונית מס",
        "בקשה לביטול חיוב חודשי",
        "שגיאה בסכום החיוב בהזמנה",
        "בקשה להחזר כספי בגין תקלה",
        "עדכון אמצעי תשלום בחשבון",
      ],
    },
    {
      key: "technical",
      label: "תקלה טכנית",
      color: "#ef4444",
      subjects: [
        "האפליקציה קורסת בעת התחברות",
        "שגיאת 500 בעת ביצוע הזמנה",
        "האתר נטען לאט מאוד",
        "לא ניתן לאפס סיסמה",
        "הדוח החודשי לא נטען",
        "תקלה בסנכרון נתונים בין מכשירים",
      ],
    },
    {
      key: "shipping",
      label: "משלוחים ואספקה",
      color: "#3b82f6",
      subjects: [
        "המשלוח מתעכב מעבר לזמן המובטח",
        "החבילה הגיעה פגומה",
        "כתובת המשלוח שגויה בהזמנה",
        "לא התקבל עדכון מעקב משלוח",
        "בקשה לשינוי כתובת למשלוח קיים",
      ],
    },
    {
      key: "returns",
      label: "החזרים וביטולים",
      color: "#8b5cf6",
      subjects: [
        "בקשה להחזרת מוצר פגום",
        "סטטוס זיכוי לאחר החזרה",
        "ביטול הזמנה לפני משלוח",
        "המוצר שהתקבל שונה מההזמנה",
        "בקשה להחלפת מידה/דגם",
      ],
    },
    {
      key: "account",
      label: "ניהול חשבון",
      color: "#06b6d4",
      subjects: [
        "בקשה למחיקת חשבון משתמש",
        "עדכון פרטי התקשרות",
        "שדרוג/הורדת מסלול מנוי",
        "שחזור גישה לחשבון נעול",
        "מיזוג שני חשבונות משתמש",
      ],
    },
    {
      key: "general",
      label: "שאלה כללית",
      color: "#64748b",
      subjects: [
        "שאלה לגבי זמינות מוצר",
        "בקשת מידע על שעות פעילות",
        "בקשה למדריך שימוש במוצר",
        "משוב כללי על השירות",
        "שאלה לגבי מדיניות פרטיות",
      ],
    },
  ];

  const PRIORITIES = [
    { v: "דחופה", w: 8, slaHours: 4 },
    { v: "גבוהה", w: 22, slaHours: 8 },
    { v: "בינונית", w: 45, slaHours: 24 },
    { v: "נמוכה", w: 25, slaHours: 48 },
  ];
  const PRIORITY_ORDER = ["דחופה", "גבוהה", "בינונית", "נמוכה"];

  const STATUSES = ["פתוחה", "בטיפול", "ממתינה ללקוח", "נפתרה", "סגורה"];
  const OPEN_STATUSES = ["פתוחה", "בטיפול", "ממתינה ללקוח"];

  const CHANNELS = ["אימייל", "צ'אט", "טלפון", "רשתות חברתיות", "טופס אתר"];

  const AGENTS = [
    { id: "a1", name: "דנה כהן", color: "#2563eb" },
    { id: "a2", name: "יובל לוי", color: "#16a34a" },
    { id: "a3", name: "מאיה אברהם", color: "#d97706" },
    { id: "a4", name: "עידן שרון", color: "#dc2626" },
    { id: "a5", name: "נועה פרץ", color: "#7c3aed" },
    { id: "a6", name: "אורי מזרחי", color: "#0891b2" },
  ];

  const FIRST_NAMES = [
    "יעל", "איתי", "שירה", "אלון", "רותם", "טל", "עומר", "הילה",
    "גיא", "ליאור", "אור", "נעמה", "אסף", "דנית", "רון", "שני",
  ];
  const LAST_NAMES = [
    "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אזולאי", "דהן", "אוחיון",
    "שפירא", "גולן", "רוזן", "נחום", "אליהו", "גבאי", "סבג", "חדד",
  ];

  function randomCustomer() {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    return {
      name: `${first} ${last}`,
      email: `${first}.${last}@example.com`.toLowerCase(),
    };
  }

  // ---- טווח זמן: 45 הימים האחרונים עד "עכשיו" ----
  const NOW = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RANGE_DAYS = 45;

  function businessHourTimestamp(daysBack) {
    // יוצר חותמת זמן ביום מסוים, מוטה לשעות פעילות (8:00-20:00)
    const base = new Date(NOW.getTime() - daysBack * DAY_MS);
    const hour = randInt(8, 20);
    const minute = randInt(0, 59);
    base.setHours(hour, minute, randInt(0, 59), 0);
    return base;
  }

  const TICKETS = [];
  const TOTAL_TICKETS = 220;

  for (let i = 0; i < TOTAL_TICKETS; i++) {
    // הטיה: יותר פניות בימים האחרונים (מגמת גידול קלה), פחות בעבר הרחוק
    const daysBack = Math.floor(Math.pow(rand(), 1.4) * RANGE_DAYS);
    const createdAt = businessHourTimestamp(daysBack);
    const category = pick(CATEGORIES);
    const priorityInfo = pickWeighted(PRIORITIES);
    const agent = pick(AGENTS);
    const channel = pick(CHANNELS);
    const customer = randomCustomer();

    // ככל שהפנייה ישנה יותר, סביר שכבר טופלה/נסגרה
    const ageRatio = daysBack / RANGE_DAYS; // 0 (חדש) -> 1 (ישן)
    let status;
    if (daysBack < 1) {
      status = pickWeighted([
        { v: "פתוחה", w: 40 },
        { v: "בטיפול", w: 35 },
        { v: "ממתינה ללקוח", w: 15 },
        { v: "נפתרה", w: 10 },
      ]).v;
    } else if (ageRatio < 0.25) {
      status = pickWeighted([
        { v: "פתוחה", w: 15 },
        { v: "בטיפול", w: 25 },
        { v: "ממתינה ללקוח", w: 15 },
        { v: "נפתרה", w: 25 },
        { v: "סגורה", w: 20 },
      ]).v;
    } else {
      status = pickWeighted([
        { v: "בטיפול", w: 5 },
        { v: "ממתינה ללקוח", w: 5 },
        { v: "נפתרה", w: 35 },
        { v: "סגורה", w: 55 },
      ]).v;
    }

    const isResolved = status === "נפתרה" || status === "סגורה";
    const isClosedOut = status !== "פתוחה";

    // זמן תגובה ראשונה (בדקות) - לרוב בתוך המטרה, לפעמים חריגה
    let firstResponseAt = null;
    let firstResponseMinutes = null;
    if (isClosedOut) {
      const targetMinutes = priorityInfo.slaHours * 60 * 0.35;
      firstResponseMinutes = Math.max(3, Math.round(randFloat(targetMinutes * 0.2, targetMinutes * 1.6)));
      firstResponseAt = new Date(createdAt.getTime() + firstResponseMinutes * 60 * 1000);
    }

    // זמן פתרון (בשעות) - יחסית ל-SLA, עם סיכוי לחריגה
    let resolvedAt = null;
    let resolutionHours = null;
    let satisfaction = null;
    if (isResolved) {
      const breach = rand() < 0.22; // 22% מהפניות חורגות מה-SLA
      const factor = breach ? randFloat(1.1, 2.2) : randFloat(0.25, 0.95);
      resolutionHours = Math.max(0.2, +(priorityInfo.slaHours * factor).toFixed(1));
      resolvedAt = new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
      if (resolvedAt > NOW) resolvedAt = new Date(NOW.getTime() - randInt(0, 60) * 60 * 1000);

      // שביעות רצון: הטיה לטובה, עם קורלציה שלילית לחריגת SLA
      const base = breach ? randFloat(1, 4) : randFloat(3, 5);
      satisfaction = Math.min(5, Math.max(1, Math.round(base)));
    }

    TICKETS.push({
      id: `TCK-${1000 + i}`,
      subject: pick(category.subjects),
      category: category.key,
      categoryLabel: category.label,
      categoryColor: category.color,
      priority: priorityInfo.v,
      slaHours: priorityInfo.slaHours,
      status,
      channel,
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      customerName: customer.name,
      customerEmail: customer.email,
      createdAt,
      firstResponseAt,
      firstResponseMinutes,
      resolvedAt,
      resolutionHours,
      slaBreached: isResolved ? resolutionHours > priorityInfo.slaHours : (function () {
        if (!isClosedOut) return false;
        const elapsedHours = (NOW - createdAt) / (60 * 60 * 1000);
        return elapsedHours > priorityInfo.slaHours;
      })(),
      satisfaction,
    });
  }

  // מיון מהחדש לישן כברירת מחדל
  TICKETS.sort((a, b) => b.createdAt - a.createdAt);

  window.DASHBOARD_DATA = {
    TICKETS,
    CATEGORIES,
    PRIORITIES: PRIORITY_ORDER,
    STATUSES,
    OPEN_STATUSES,
    CHANNELS,
    AGENTS,
    NOW,
  };
})();
