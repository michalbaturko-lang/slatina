# Deployment Guide - SK Slatina 2017

## 1. Supabase Setup (5 min)

1. Jdi na **https://supabase.com** a klikni "Start your project"
2. Přihlas se přes GitHub
3. Vytvoř nový projekt:
   - Organization: vyber nebo vytvoř
   - Name: `slatina`
   - Database Password: vygeneruj a **ulož si ho**
   - Region: `Frankfurt (eu-central-1)`
4. Počkej než se projekt vytvoří (~2 min)
5. Jdi do **SQL Editor** a vlož obsah souboru `supabase/schema.sql`
6. Klikni "Run" - vytvoří se všechny tabulky
7. Jdi do **Settings > API** a zkopíruj:
   - `Project URL` → to je `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → to je `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Cloudflare R2 Setup (5 min)

1. Jdi na **https://dash.cloudflare.com**
2. Vytvoř si účet (zdarma)
3. V levém menu klikni na **R2 Object Storage**
4. Klikni "Create bucket":
   - Name: `slatina-media`
   - Location: `WEUR`
5. V bucketu jdi do **Settings > Public access**:
   - Zapni "Allow public access"
   - Zkopíruj "Public R2.dev bucket URL" → to je `R2_PUBLIC_URL`
6. Jdi do **R2 > Manage R2 API Tokens**:
   - Create API Token
   - Permissions: "Object Read & Write"
   - Bucket: `slatina-media`
   - Zkopíruj:
     - `Access Key ID` → `R2_ACCESS_KEY_ID`
     - `Secret Access Key` → `R2_SECRET_ACCESS_KEY`
7. Tvůj Account ID najdeš v URL: `dash.cloudflare.com/XXXXX/...` → `R2_ACCOUNT_ID`

## 3. Vercel Deployment (5 min)

1. Jdi na **https://vercel.com**
2. Klikni "Add New Project"
3. Import Git Repository (nebo přidej tento projekt)
4. V nastavení projektu:
   - Root Directory: `apps/web`
   - Framework: Next.js
5. Přidej Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   R2_ACCOUNT_ID=xxx
   R2_ACCESS_KEY_ID=xxx
   R2_SECRET_ACCESS_KEY=xxx
   R2_BUCKET_NAME=slatina-media
   R2_PUBLIC_URL=https://pub-xxx.r2.dev
   ```
6. Klikni "Deploy"

## 4. Custom Domain (2 min)

1. Ve Vercelu jdi do **Settings > Domains**
2. Přidej `skslatina.fun`
3. U registrátora domény nastav DNS:
   - Type: `CNAME`
   - Name: `@` nebo prázdné
   - Value: `cname.vercel-dns.com`

---

## Hotovo! 🎉

Tvoje aplikace běží na **https://skslatina.fun**

## Náklady (odhad)

| Služba | Cena |
|--------|------|
| Vercel | $0 (hobby) |
| Supabase | $0 (free tier) |
| Cloudflare R2 | ~$0.15/měsíc za 10GB |
| **Celkem** | **~$0.15/měsíc** |
