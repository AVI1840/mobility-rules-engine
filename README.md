# מנוע זכויות ניידות

מנוע כללים דטרמיניסטי לאגף הניידות, המוסד לביטוח לאומי.

---

## העלאה לאוויר — 5 דקות

### שלב 1 — העלה ל-GitHub

```bash
git init
git add .
git commit -m "feat: mobility rules engine MVP"
git remote add origin https://github.com/YOUR_USERNAME/mobility-rules-engine.git
git push -u origin main
```

### שלב 2 — הפעל GitHub Pages

1. כנס ל-repo ב-GitHub
2. Settings → Pages → Source: **GitHub Actions**
3. Actions → Deploy to GitHub Pages → **Run workflow**

הממשק יהיה זמין בכתובת:
`https://YOUR_USERNAME.github.io/mobility-rules-engine/`

> אם ה-repo לא בשם `mobility-rules-engine`, הוסף ל-`.env` של הקליינט:
> `VITE_BASE_PATH=/YOUR_REPO_NAME/`

### שלב 3 — הפעל שרת עם ngrok (לבדיקות)

**terminal 1 — שרת:**
```bash
cd packages/server
npm run start
```

**terminal 2 — ngrok:**
```bash
cd packages/server
npm run tunnel
```

ngrok ייתן URL כמו `https://abc123.ngrok-free.app`

### שלב 4 — חבר ממשק לשרת

ב-GitHub repo → Settings → Secrets and variables → Actions → New secret:
- Name: `VITE_API_URL`
- Value: ה-URL של ngrok (לדוגמה `https://abc123.ngrok-free.app`)

הרץ שוב את ה-workflow — הממשק יתחבר לשרת.

---

## הפעלה מקומית

```bash
npm install

# terminal 1
cd packages/server && npm run start

# terminal 2
cd packages/client && npm run dev
```

פתח http://localhost:5173

---

## API

| Method | Path | תיאור |
|--------|------|-------|
| `POST` | `/api/v1/evaluate` | הערכת זכאות |
| `GET`  | `/api/v1/health`   | בדיקת תקינות |
| `POST` | `/api/v1/backtest` | בדיקות רגרסיה |

### דוגמה

```bash
curl -X POST http://localhost:3001/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "claimant_id": "123456789",
    "claim_date": "2024-06-01",
    "claim_type": "vehicle_less_allowance",
    "medical": { "disability_percentage": 50 },
    "operational": { "institutional_residence_status": true }
  }'
```

---

## ממשק HQ

7 פאנלים בעברית RTL:
- **בדיקת זכאות** — טופס מלא עם תוצאה מיידית
- **מעקב החלטות** — שרשרת כללים עם ציטוטים משפטיים
- **הסבר כללים** — נרטיב עברי מלא
- **בדיקת משתנים** — ערכי קלט שהוחלו
- **סימולציית קצה** — 6 תרחישים מוכנים
- **השוואה היסטורית** — שלב 2
- **בדיקות QA** — backtest runner

**פידבק פיילוט** — כפתור קבוע בפינה שמאלית תחתונה, מחובר ל-Google Sheet.
