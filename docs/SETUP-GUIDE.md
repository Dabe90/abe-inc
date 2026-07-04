# Abe Stack — Setup guide (Email, SEO, Firebase)

Step-by-step checklist for **A** (email + Search Console), **B** (Genkit deploy), and **C** (contact backend + lead capture).

---

## A — Professional email (Zoho) + Search Console

### 1. Zoho Mail for `hello@abestack.com`

1. Sign up at [zoho.com/mail](https://www.zoho.com/mail/) → add domain **abestack.com**
2. Copy the **verification TXT** value from Zoho Admin
3. Run (replace the TXT value):

```powershell
cd "c:\Users\damil\OneDrive\Desktop\Abe Inc"
.\scripts\setup-zoho-dns.ps1 -VerificationTxt "zoho-verification=zb....zmverify.zoho.com"
```

4. In Zoho Admin → **Verify** domain (wait 15–60 min for DNS)
5. Create mailbox **hello@abestack.com**
6. After mail works, add DKIM in Zoho Admin and re-run:

```powershell
.\scripts\setup-zoho-dns.ps1 -VerificationTxt "..." -DkimHost "zmail._domainkey" -DkimValue "v=DKIM1; k=rsa; p=..."
```

7. **FormSubmit activation** — submit the contact form once; check `hello@abestack.com` for FormSubmit’s activation link and click it.

### 2. Google Search Console

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property **https://abestack.com** (Domain or URL prefix)
3. Verify via DNS TXT (Vercel) or HTML tag
4. **Sitemaps** → submit: `sitemap.xml`
5. **URL inspection** → request indexing for:
   - `https://abestack.com/`
   - `https://abestack.com/ai-agents/`
   - `https://abestack.com/contact.html`

---

## B — Deploy Genkit + Firebase Functions

### 1. Create Firebase project

1. [console.firebase.google.com](https://console.firebase.google.com) → Create project (e.g. `abe-stack-prod`)
2. Enable **Firestore** (production mode, `us-central1`)
3. Copy project ID into `.firebaserc`:

```powershell
Copy-Item .firebaserc.example .firebaserc
# Edit .firebaserc and set your project ID
```

### 2. Secrets & deploy

```powershell
cd "c:\Users\damil\OneDrive\Desktop\Abe Inc"
firebase login
firebase use YOUR_PROJECT_ID

firebase functions:secrets:set GEMINI_API_KEY
# Paste the same key from your local .env

cd functions
npm install
npm run deploy
```

Deployed functions:

| Function | Purpose |
|----------|---------|
| `submitInquiry` | HTTP POST — contact form → Firestore |
| `onInquiryCreated` | Firestore trigger — Genkit triage |
| `helloGenkit` | Callable smoke-test flow |

### 3. Wire the contact form to Firebase

After deploy, copy the `submitInquiry` URL from the Firebase console (e.g. `https://us-central1-abe-stack-prod.cloudfunctions.net/submitInquiry`).

Edit `js/config.js`:

```js
formEndpoint: 'https://us-central1-YOUR_PROJECT.cloudfunctions.net/submitInquiry',
```

Push to GitHub → Vercel redeploys. FormSubmit remains the **fallback** if Firebase is unreachable.

### 4. Local Genkit dev

```powershell
cp .env.example .env
# Add GEMINI_API_KEY
npm run genkit:dev
```

Open http://localhost:4000

---

## C — Contact backend + lead capture (already in repo)

| Piece | Location |
|-------|----------|
| FormSubmit fallback | `contact.html` |
| Firebase POST (when configured) | `js/site.js` + `formEndpoint` in `config.js` |
| Thank-you page | `contact/thank-you.html` |
| Genkit triage flow | `src/flows/triage-inquiry.ts` |
| Case study | `projects/inquiry-triage-pipeline.html` |

### Firestore collections

- `inquiry_queue` — raw submissions + triage fields
- `inquiry_triage_log` — structured triage summaries

Review new inquiries in Firebase Console → Firestore.

---

## Quick commands

```powershell
# Preview marketing site
npm run dev
# → http://localhost:3456

# Genkit Developer UI
npm run genkit:dev
# → http://localhost:4000

# Typecheck Genkit
npm run genkit:check

# Deploy functions only
cd functions && npm run deploy
```

---

## After everything is live

- [ ] Send test inquiry on production contact form
- [ ] Confirm email arrives at `hello@abestack.com`
- [ ] Confirm Firestore doc created (if `formEndpoint` set)
- [ ] Search Console sitemap shows **Success**
- [ ] Calendly booking works on contact page
