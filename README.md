# KRABIT — Product & Business Requirements Questionnaire

Official intake and requirement confirmation questionnaire for the **KRABIT** platform, built for client completion, automated document delivery, and zero-storage compliance.

## ✨ Core Features

- **All 24 Structured Sections**: Full business, operational, Stripe & banking, escrow, disputes, security, and administrative requirements.
- **Zero-Database Storage**: Form responses are received in-memory by the `/api/submit-questionnaire` serverless function, compiled into an executive HTML document, dispatched immediately to developer **Erioluwa Daniel** (`erioluwawork@gmail.com`), and purged from memory. **Zero data touches a database.**
- **Live Auto-Save**: Real-time browser `localStorage` caching ensures the client never loses filled responses if they refresh or close the tab.
- **Contract-Grade PDF Export**: Built-in `@media print` styling enables one-click PDF generation directly in the browser.
- **Powered by Resend**: Pre-wired with your verified Resend API key (`re_GjhbvsSK_...`).

---

## 🚀 One-Click Deploy to Vercel

1. Import this repository into your [Vercel Dashboard](https://vercel.com/new).
2. Set Environment Variables in Vercel:
   - `RESEND_API_KEY`: Your Resend API Key (starts with re_...)
   - `DEVELOPER_EMAIL`: `dan17buck@gmail.com`
3. Click **Deploy**.

---

## 🛠️ Project Structure

```
├── api/
│   └── submit-questionnaire.js   # Serverless in-memory dispatch to Resend & email
├── index.html                    # 24-section interactive client questionnaire
├── vercel.json                   # Vercel routing configuration
├── package.json
└── .env.example
```

**Developer:** Erioluwa Daniel  
**Target Recipient:** erioluwawork@gmail.com
