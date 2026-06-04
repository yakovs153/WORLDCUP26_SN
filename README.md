# ניחושי מונדיאל 2026

אפליקציית PWA לניחושי תוצאות מונדיאל 2026, בעברית.
בנויה על React + Vite + Firebase (Auth, Firestore, Functions, Hosting).

## פיצ'רים

- הרשמה/התחברות (Email + Password, Google)
- רשימת משחקים מסונכרנת אוטומטית מ-[football-data.org](https://www.football-data.org)
- ניחושי תוצאה מדויקת לכל משחק
- עדכוני LIVE של התוצאות (כל 2 דקות)
- חישוב נקודות אוטומטי בסיום משחק
- לוח דירוג גלובלי
- היסטוריית ניחושים אישית
- PWA - ניתן להתקנה במובייל

## טבלת ניקוד

| תרחיש | נקודות |
|---|---|
| תוצאה מדויקת | **5** |
| מנצחת + הפרש שערים נכון | **3** |
| מנצחת בלבד (כולל תיקו) | **1** |

## דרישות מקדימות

- Node.js 20+
- Firebase CLI: `npm i -g firebase-tools`
- חשבון ב-[football-data.org](https://www.football-data.org/client/register) (חינמי) — מפתח API למשיכת לוח המשחקים

## הקמה ראשונית

```bash
# 1) התקנת חבילות
npm install
cd functions && npm install && cd ..

# 2) הגדרת Firebase
firebase login
firebase use --add   # בחר/צור פרויקט; שמור alias 'default'

# 3) משתני סביבה ל-Vite (Firebase Web SDK)
cp .env.example .env
# מלא את הערכים מ-Firebase Console > Project settings > Your apps

# 4) מפתח football-data.org נשמר כ-secret של Functions
firebase functions:secrets:set FOOTBALL_DATA_TOKEN
# הזן את המפתח כשמתבקש
```

## פיתוח מקומי

```bash
# טרמינל 1 - emulators (auth, firestore, functions)
firebase emulators:start

# טרמינל 2 - dev server
# הפעל עם VITE_USE_EMULATORS=true ב-.env כדי לחבר ל-emulators
npm run dev
```

ה-UI ב-`http://localhost:5173`, Firebase UI ב-`http://localhost:4000`.

## פריסה

```bash
# בנייה ופריסה
npm run build
firebase deploy
```

או בנפרד:

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
firebase deploy --only hosting
```

## הזנת לוח המשחקים בפעם הראשונה

לאחר ה-deploy, להפעיל ידנית:

```bash
# פתח את ה-URL של syncMatchesNow:
curl https://<region>-<project-id>.cloudfunctions.net/syncMatchesNow
```

או הריץ דרך ה-shell:

```bash
firebase functions:shell
> syncMatches()
```

מכאן והלאה זה רץ אוטומטית כל 6 שעות.
`pollLiveResults` רץ כל 2 דקות ומעדכן תוצאות LIVE.

## מבנה הפרויקט

```
src/
  auth/           AuthProvider + ProtectedRoute
  components/    Layout, Header, BottomNav, MatchCard, ScoreInput, FlagIcon, LiveBadge
  hooks/         useMatches, usePredictions, useLeaderboard, useUserDoc
  lib/           scoring (זהה ל-functions/), format (תאריכים בעברית), predictions
  pages/         Login, Register, Matches, Leaderboard, MyPredictions, Profile
  theme/         tokens.css (CSS variables), global.css
  types/         טיפוסי Match/Prediction/UserDoc

functions/src/
  syncMatches       cron 6h - מושך לוח משחקים
  pollLiveResults   cron 2m - תוצאות LIVE
  onMatchFinished   Firestore trigger - מחשב נקודות
  onPredictionWrite Firestore trigger - מעדכן predictionsCount
  scoring           פונקציית ניקוד טהורה
  footballApi       wrapper ל-football-data.org
```

## עיצוב

הצבעים מוגדרים ב-`src/theme/tokens.css` — חולצו מצבעי לוגו StoreNext
(אדום `#e11d48` + סגול-בורדו `#1a1320`). אין צבעים מקודדים בקומפוננטות,
לכן שינוי ערכה = עריכת קובץ אחד.

### הוספת הלוגו

שמור את קובץ הלוגו של StoreNext בנתיבים הבאים (אותו קובץ או גרסאות שונות):

```
public/logo.png              # רוחב ~200-400px (יוצג ב-Header וב-Login)
public/icon-192.png          # 192x192 ריבועי (PWA)
public/icon-512.png          # 512x512 ריבועי (PWA, splash)
public/apple-touch-icon.png  # 180x180 (iOS)
```

אם תרצה — תוכל להפיק את כל הגדלים מהלוגו המקורי בעזרת
[realfavicongenerator.net](https://realfavicongenerator.net/)
או דרך CLI כמו `sharp` / `imagemagick`.

## אבטחה

Firestore Rules ב-`firestore.rules`:
- `matches` - read-only ל-client; נכתב רק ע"י Functions
- `predictions` - יצירה/עדכון מותרת רק לבעלים, ורק לפני kickoff
- `users.totalPoints` - לא ניתן לעדכן ידנית (רק Functions)

מפתחות API לא נחשפים — הם מוחזקים כ-Functions Secrets.
