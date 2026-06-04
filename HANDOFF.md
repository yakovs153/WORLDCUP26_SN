# 🏆 מונדיאל 2026 — מסמך העברה (Handoff)

מסמך זה נועד למפתח/ת חדש/ה שממשיך/ה את הפרויקט ממחשב אחר, ללא הקשר קודם.
קרא אותו מתחילתו ותהיה מוכן להריץ תוך 5 דקות.

---

## 1. מה זה?

אפליקציית **PWA לניחושי מונדיאל 2026** עבור StoreNext (פנים-ארגונית, עברית/RTL).
משתמשים מנחשים תוצאות משחקים + ניחושי בונוס (זוכה הטורניר + מלך שערים), צוברים נקודות,
ומתחרים בלוח דירוג. יש פאנל ניהול מלא לשליטה בכל ההגדרות ללא נגיעה בקוד.

**Stack:** React 18 + TypeScript + Vite · Firebase (Auth/Firestore/Functions/Hosting/Storage) · PWA.

---

## 2. הרצה מהירה (מצב דמו — בלי Firebase)

דרישה יחידה: **Node.js 20+** ([הורדה](https://nodejs.org)).

```bash
# 1. התקנת תלויות
npm install

# 2. הגדרת מצב דמו (נתונים מקומיים, בלי שרת)
cp .env.example .env.local       # PowerShell: Copy-Item .env.example .env.local
#   ודא ש- VITE_DEMO_MODE=true בקובץ (זו ברירת המחדל)

# 3. הרצה
npm run dev
```

פתח את הכתובת שמודפסת (בד"כ `http://localhost:5173`).
**במצב דמו:** התחבר עם כל אימייל (Google או אימייל+סיסמה), הניחושים נשמרים ב-localStorage.

> ⚠️ אם הגבלת דומיין מופעלת (טאב "גישה" בפאנל), במצב דמו תצטרך אימייל מהדומיין המורשה
> (למשל `someone@storenext.com`). אפס ע"י מחיקת `localStorage` בדפדפן.

---

## 3. מבנה הפרויקט

```
src/
  main.tsx, App.tsx          # נקודת כניסה + Router (HashRouter) + Providers
  firebase.ts                # אתחול Firebase + דגל DEMO_MODE
  theme/
    tokens.css               # משתני CSS (צבעי StoreNext: אדום #e11d48 + סגול #1a1320)
    global.css               # reset, RTL, אנימציות, skeleton
  auth/
    AuthProvider.tsx          # התחברות (Email/Google) + email-domain gate + demo users
    ProtectedRoute.tsx
  hooks/
    useMatches, usePredictions, useLeaderboard, useUserDoc, useBonus, useAppConfig
  lib/
    scoring.ts               # פונקציית ניקוד טהורה (קוראת ערכים מ-AppConfig)
    predictions.ts, bonus.ts # שמירת ניחושים (Firestore או localStorage לפי DEMO_MODE)
    appConfig.ts             # קריאה/כתיבה של הגדרות אדמין
    demoData.ts              # לוח משחקים + משתמשי דמו + storage דמו
    players.ts               # מועמדים למלך שערים + צבעי נבחרות
    countryFlags.ts          # מיפוי קוד FIFA → דגל (flagcdn.com)
    emailGate.ts             # בדיקת דומיין מורשה
    playerPhotos.ts, imageUtils.ts  # העלאת/הקטנת תמונות שחקנים
    format.ts                # תאריכים בעברית, שמות שלבים
  components/
    Layout, Header, BottomNav (5 טאבים), MatchCard, ScoreInput, FlagIcon,
    PlayerAvatar (עיגול / משושה-לוגו), LiveBadge, NextMatchHero (ספירה לאחור),
    PollCard, Toast, Skeleton, StatsBreakdown, PointsChart (SVG), ThemeApplier, Bracket*
  pages/
    Login, Register, Matches, Bonus, MyPredictions, Leaderboard, Profile, Rules, Admin
  admin/
    AdminGate, AdminScoring, AdminTheme, AdminPolls, AdminIcons, AdminPlayers, AdminAccess

functions/src/                # Cloud Functions (TypeScript)
  index.ts                   # exports + region europe-west1
  syncMatches.ts             # cron 6h — מושך לוח מ-football-data.org (+ syncMatchesNow HTTP)
  pollLiveResults.ts         # cron 2m — תוצאות LIVE
  onMatchFinished.ts         # trigger — חישוב נקודות בסיום משחק
  onPredictionWrite.ts       # trigger — מונה ניחושים
  scoring.ts, footballApi.ts

scripts/seed-matches.mjs      # זריעת לוח משחקים ל-Firestore/emulator (dev)
firestore.rules               # כללי אבטחה (matches read-only, predictions בעלים בלבד, וכו')
firebase.json, .firebaserc    # הגדרות hosting/functions/emulators
public/avatar-demo.html       # דף דוגמה עצמאי: שחקן בתוך משושה הלוגו

* Bracket.tsx קיים בקוד אך לא בשימוש (הוסר מ-UI לבקשת המשתמש).
```

---

## 4. פיצ'רים שהושלמו

- ✅ התחברות/הרשמה (Email + Google) + **הגבלה לדומיין ארגוני**
- ✅ רשימת משחקים מקובצת לפי תאריך + כרטיס "המשחק הבא" עם ספירה לאחור
- ✅ ניחוש תוצאה לכל משחק (ננעל אחרי שריקת פתיחה)
- ✅ **ניחושי בונוס:** זוכה (20 נק') + מלך שערים (15 נק')
- ✅ ניקוד אוטומטי: תוצאה מדויקת=5, מנצחת+הפרש=3, מנצחת=1, שגוי=0
- ✅ לוח דירוג, היסטוריית ניחושים + גרף נקודות, פירוט ביצועים בפרופיל
- ✅ שיתוף (Web Share API), תקנון מפורט, PWA (התקנה במובייל)
- ✅ **פאנל ניהול (6 טאבים):** ניקוד · עיצוב (החלפת צבעים חיה) · סקרים · אייקוני ניווט · שחקנים (העלאת תמונות) · גישה (דומיינים + אדמינים)
- ✅ אווטר שחקן בצורת לוגו StoreNext (משושה + צ'בּרון אדום)

---

## 5. מעבר לפרודקשן (Firebase אמיתי)

```bash
npm i -g firebase-tools
firebase login
firebase use --add                      # בחר/צור פרויקט, alias "default"

# מלא ב-.env.local את ערכי ה-Web SDK + שנה VITE_DEMO_MODE=false

# מפתח API ללוח המשחקים (חינמי): https://www.football-data.org/client/register
firebase functions:secrets:set FOOTBALL_DATA_TOKEN

cd functions && npm install && cd ..
npm run build
firebase deploy                          # hosting + functions + rules
```

**הזנת לוח ראשוני:** קרא ל-`syncMatchesNow` (HTTP) או הרץ `npm run seed -- <project-id>`.
**הגדרת אדמין ראשון:** ב-Firestore צור `appConfig/main` עם `adminEmails: ["you@storenext.com"]`
ו-`allowedEmailDomains: ["storenext.com"]`.

---

## 6. עבודה במקביל / שיתוף פעולה

מכיוון שאתם עובדים במקביל ממחשבים שונים, מומלץ מאוד **GitHub**:

```bash
# במחשב הראשון (יש כבר git repo מקומי עם commit):
gh repo create storenext-mundial-2026 --private --source=. --push   # אם gh מותקן
#   או ידנית: צור repo ריק ב-GitHub ואז:
git remote add origin https://github.com/<org>/storenext-mundial-2026.git
git push -u origin main

# במחשב השני:
git clone https://github.com/<org>/storenext-mundial-2026.git
cd storenext-mundial-2026
npm install
cp .env.example .env.local
npm run dev
```

**כללי עבודה כדי לא לדרוס אחד את השני:**
- כל אחד עובד בענף משלו: `git checkout -b feature/<שם>`
- מיזוג דרך Pull Request ב-GitHub
- `.env.local` **לא** נכנס ל-git (מקומי לכל מחשב)

---

## 7. מצב פתוח / TODO (נכון להעברה)

| נושא | סטטוס |
|---|---|
| לוח משחקים | **דמו ייצוגי** (11/6–19/7/2026). בפרודקשן `syncMatches` ימשוך אמיתי מ-football-data.org. ההגרלה הרשמית מ-Wikipedia עדיין לא הוטמעה ידנית. |
| תמונות שחקנים | אווטר משושה מוכן. תמונות אמיתיות: דרך טאב "שחקנים" (העלאה) או Wikimedia Commons (CC). **אסור** מ-FIFA/Getty/365 (זכויות יוצרים). |
| צורת אווטר משושה | ממתין לאישור סופי של המשתמש (`public/avatar-demo.html` = הדוגמה). |
| טאב "משחקים" בפאנל ניהול | **לא נבנה עדיין** — המשתמש ביקש לנהל משחקים מה-UI במקום מהקוד. זו המשימה הבאה המומלצת. |
| Cloud Function לחישוב בונוס סופי | לא מומש — צריך פונקציה שמשווה זוכה/מלך-שערים בתום הטורניר. |
| לוגו StoreNext | יש להניח `public/logo.png` (+ icon-192/512, apple-touch-icon). כרגע מוסתר אם חסר. |

---

## 8. פקודות שימושיות

```bash
npm run dev        # שרת פיתוח
npm run build      # בדיקת טייפים + build (tsc -b && vite build)
npm run preview    # תצוגת ה-build
npm run seed       # זריעת משחקים (דורש firebase-admin + project-id)
firebase emulators:start   # אמולטורים מקומיים
firebase deploy            # פריסה מלאה
```

בהצלחה! 🚀
