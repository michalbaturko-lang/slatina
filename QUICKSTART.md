# 🚀 Rychlý start - Slatina

## Požadavky

- **Docker** - [stáhnout](https://docker.com/get-started)
- **Node.js 18+** - [stáhnout](https://nodejs.org)
- **pnpm** - nainstaluje se automaticky

## Spuštění (3 kroky)

### 1. Spusť databázi a úložiště

```bash
docker-compose -f docker-compose.demo.yml up -d
```

Počkej ~10 sekund na spuštění.

### 2. Nainstaluj závislosti a připrav databázi

```bash
# Instalace
npm install -g pnpm
pnpm install

# Databáze
cd apps/api
npx prisma generate
npx prisma db push
cd ../..
```

### 3. Spusť aplikaci

```bash
pnpm dev
```

## Hotovo! 🎉

Otevři v prohlížeči:

| Služba | URL |
|--------|-----|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:3001 |
| **MinIO Console** | http://localhost:9001 |

MinIO přihlášení: `minioadmin` / `minioadmin`

## Nahrání videa

1. Jdi na http://localhost:3000/videos/upload
2. Přetáhni video nebo klikni pro výběr
3. Vyplň název a klikni "Nahrát"

## Zastavení

```bash
# Ctrl+C pro zastavení aplikace
# Pak:
docker-compose -f docker-compose.demo.yml down
```

## Problémy?

### Port je obsazený
```bash
# Zkontroluj co běží na portu 3000
lsof -i :3000
# nebo na Windows:
netstat -ano | findstr :3000
```

### Databáze se nespustila
```bash
docker-compose -f docker-compose.demo.yml logs postgres
```

### Reset všeho
```bash
docker-compose -f docker-compose.demo.yml down -v
docker-compose -f docker-compose.demo.yml up -d
```
