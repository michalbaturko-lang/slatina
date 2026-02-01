# Slatina Video Analysis - Přehled obrazovek

Dokumentace všech obrazovek aplikace pro videoanalýzu SK Slatina 2017.

---

## 1. Úvodní stránka (Homepage)

**URL:** `/`

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] SK Slatina 2017          [Hráči] [Zápasy] [Analyzovat]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              🎥 Videoanalýza pro fotbalový tým                  │
│                                                                 │
│     Nahrávejte videa ze zápasů a tréninků, kreslete            │
│     přímo do videa a sdílejte momenty s hráči.                 │
│                                                                 │
│                    [ Analyzovat videa ]                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       JAK NA TO                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ 1. Nahraj │  │ 2. Kresli │  │ 3. Koment │  │ 4. Sdílej │   │
│  │   video   │  │  do videa │  │   hlasem  │  │  momenty  │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                       CO TO UMÍ                                 │
│                                                                 │
│  ✏️ Kreslení      Šipky, kruhy, značky hráčů                   │
│  🎙️ Hlasové       Nahrávejte komentáře s přepisem              │
│  📸 Screenshoty   Zachyťte důležité momenty                     │
│  ⭐ Hodnocení     Označte problém/pochvalu pro hráče           │
│  ✂️ Klipy        Vytvářejte krátké ukázky                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Funkce:**
- Navigace do hlavních sekcí (Hráči, Zápasy, Analyzovat videa)
- Přehled funkcí aplikace
- Vstup do videoanalýzy

---

## 2. Seznam videí

**URL:** `/videos`

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] SK Slatina 2017 (5 videí)    [Hráči] [Zápasy] [Nahrát] │
├─────────────────────────────────────────────────────────────────┤
│  [🔍 Hledat videa...                    ]     [Grid] [List]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 💬3  🎙️2       │  │                 │  │ 💬1            │ │
│  │  [Thumbnail]    │  │  [Thumbnail]    │  │  [Thumbnail]    │ │
│  │     ▶️          │  │     ▶️          │  │     ▶️          │ │
│  │          12:34  │  │          8:21   │  │          15:42  │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ Slatina vs      │  │ Trénink         │  │ Vinohrady:      │ │
│  │ Tuřany 3:1      │  │ 15.1.2026       │  │ Slatina vs...   │ │
│  │ 📅 20. led  [⋮] │  │ 📅 15. led  [⋮] │  │ 📅 12. led  [⋮] │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Funkce:**
- **Vyhledávání** videí podle názvu
- **Přepínání zobrazení** - mřížka / seznam
- **Indikátory stavu:**
  - 💬 Počet textových komentářů (zelený)
  - 🎙️ Počet hlasových komentářů (fialový)
- **Náhled videa** s délkou
- **Smazání videa** přes menu (⋮)
- **Klik na video** → otevře editor

---

## 3. Nahrávání videa

**URL:** `/videos/upload`

```
┌─────────────────────────────────────────────────────────────────┐
│  [←] Nahrát video                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Typ videa:  (•) Zápas   ( ) Trénink                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Vyberte soupeře:                                            ││
│  │ [▼ Vyberte soupeře                              ]           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ☐ Je součástí turnaje?                                        │
│    [▼ Vyberte turnaj (Vinohrady, Žabčice, Křenovice, Tuřany) ] │
│                                                                 │
│  Datum zápasu: [ 01.02.2026 📅 ]                               │
│                                                                 │
│  Skóre:  Slatina [ 3 ] : [ 1 ] Soupeř                          │
│                                                                 │
│  Úvodní komentář k zápasu:                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Důležitý zápas o postup do finále turnaje...               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│  │                                                             │ │
│  │         📁 Přetáhněte videa nebo klikněte                  │ │
│  │            Podporované formáty: MP4, MOV, AVI              │ │
│  │            Max. velikost: 500 MB                           │ │
│  │                                                             │ │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
│                                                                 │
│  Vybraná videa:                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📹 zapas_1polocas.mp4    156 MB    ████████░░ 80%    [✓]  ││
│  │ 📹 zapas_2polocas.mp4    142 MB    Čeká...           [×]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                              [ Nahrát všechna videa ]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Funkce:**
- **Typ videa:** Zápas nebo Trénink
- **Pro zápas:**
  - Výběr soupeře
  - Checkbox "Je součástí turnaje" + výběr turnaje
  - Datum zápasu
  - Skóre (domácí : hosté)
  - Úvodní komentář k zápasu
- **Pro trénink:**
  - Datum tréninku
- **Drag & drop** nebo kliknutí pro výběr souborů
- **Multi-upload** - více videí najednou
- **Chunked upload** - podpora velkých souborů (500 MB+)
- **Progress bar** pro každý soubor

---

## 4. Video editor (hlavní obrazovka)

**URL:** `/videos/[id]`

```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Slatina vs Tuřany 3:1 ✏️   [🖼️] [🔗 2:34] [Shrnutí]       │
│     20.1.2026                                                   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │                                                             │ │
│ │                    [VIDEO PŘEHRÁVAČ]                        │ │
│ │                         ▶️                                  │ │
│ │                                                             │ │
│ │    ┌─────────────────────────────┐                         │ │
│ │    │ ← Šipka nakreslená          │                         │ │
│ │    │    na videu                 │                         │ │
│ │    └─────────────────────────────┘                         │ │
│ │                                                   12:34    │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  NÁSTROJE:                                                      │
│  [🖱️] [✏️] [→] [○] [□] [👥]  │  [⚪][⚫][🟡][🔵]  │  [●][●][●]  │
│   ^    ^    ^   ^   ^   ^        barvy              tloušťka    │
│  výběr tužka šipka kruh rect hráč                               │
│                                                                 │
│  AKCE:                          HODNOCENÍ:      KLIP:           │
│  [🎙️ Nahrát] [📷 Screenshot]   [⚠️][💡][⭐]   [🚩 Start]       │
│  [🗑️ Smazat anotace]                                           │
├─────────────────────────────────────────────────────────────────┤
│  Přepis: "Tady měl Honza lépe přihrát na Petra..."             │
├─────────────────────────────────────────────────────────────────┤
│  TIMELINE:                                                      │
│  ═══●═══════●════●══════●═════●══════════════════════════════  │
│     🟢      🟠   🟣     🟢    🔴                               │
│                                                                 │
│  🟢 Komentář  🟠 Screenshot  🟣 Hlasový  🔴 Problém  🟢 Pochvala│
├─────────────────────────────────────────────────────────────────┤
│  [⏪] [▶️] [⏩]     2:34.5 / 12:34     [0.5x ▼]  [🔊]           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.1 Funkce hlavičky

| Prvek | Funkce |
|-------|--------|
| ✏️ u názvu | Kliknutím přejmenovat video |
| 🖼️ | Vybrat náhled videa ze screenshotů |
| 🔗 2:34 | Sdílet odkaz na video od aktuálního času |
| Shrnutí | Sdílet textové shrnutí všech anotací |

### 4.2 Nástroje kreslení

| Ikona | Nástroj | Popis |
|-------|---------|-------|
| 🖱️ | Výběr | Normální ovládání videa |
| ✏️ | Tužka | Volné kreslení |
| → | Šipka | Nakreslení šipky (start → konec) |
| ○ | Kruh | Nakreslení kruhu/elipsy |
| □ | Obdélník | Nakreslení obdélníku |
| 👥 | Hráč | Označení hráče značkou s číslem |

**Barvy:** Bílá, Černá, Žlutá, Modrá
**Tloušťka:** 4 úrovně

### 4.3 Akční tlačítka

| Tlačítko | Funkce |
|----------|--------|
| 🎙️ Nahrát | Nahrát hlasový komentář s automatickým přepisem |
| 📷 Screenshot | Zachytit aktuální snímek včetně anotací |
| 🗑️ Smazat | Odstranit všechny nakreslené anotace |

### 4.4 Hodnocení (Rating)

| Ikona | Typ | Použití |
|-------|-----|---------|
| ⚠️ | Problém (červená) | Co je třeba zlepšit |
| 💡 | Zajímavé (oranžová) | K diskuzi |
| ⭐ | Pochvala (zelená) | Skvělá akce |

Po kliknutí se zobrazí modal pro výběr hráče (volitelné).

### 4.5 Vytváření klipů

```
1. Klikni [🚩 Start] → označí začátek klipu
2. Přesuň se na konec momentu
3. Klikni [✂️ Konec] → otevře se modal
4. Vyber hráče, kategorii (gól/asistence/akce/obrana/ostatní)
5. Ulož klip
```

---

## 5. Sekce pod videem

### 5.1 Screenshoty

```
┌─────────────────────────────────────────────────────────────────┐
│  📸 Screenshoty (3)                                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  [img]   │  │  [img]   │  │  [img]   │                      │
│  │ [🔗][×]  │  │ [🔗][×]  │  │ [🔗][×]  │                      │
│  │   2:34   │  │   5:12   │  │   8:45   │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

**Akce:**
- Klik na screenshot → skočí na čas ve videu
- 🔗 → Stáhnout/sdílet screenshot
- × → Smazat screenshot

### 5.2 Hlasové komentáře

```
┌─────────────────────────────────────────────────────────────────┐
│  🎙️ Hlasové komentáře (2)                                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [▶️]  2:34 • 15s                                     [🗑️] ││
│  │       ┌─────────────────────────────────────────────────┐  ││
│  │       │ "Tady měl Honza lépe přihrát na Petra,         │  ││
│  │       │  protože byl úplně volný."                     │  ││
│  │       └─────────────────────────────────────────────────┘  ││
│  │       [═══════════════════════════════════════] audio      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Funkce:**
- ▶️ → Skočit na čas ve videu
- Přehrávač pro poslech zvuku
- Automatický přepis (převod hlasu na text)
- Podpora interpunkce: "tečka" → ".", "vykřičník" → "!"

### 5.3 Hodnocení

```
┌─────────────────────────────────────────────────────────────────┐
│  Hodnocení (4)                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │⚠️  2:34      │  │💡  5:12      │  │⭐  8:45      │          │
│  │    Honza  [×]│  │    Petr  [×] │  │    Tomáš [×] │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

**Barevné kódování:**
- 🔴 Červená = Problém (co zlepšit)
- 🟠 Oranžová = Zajímavé (k diskuzi)
- 🟢 Zelená = Pochvala

### 5.4 Textové komentáře

```
┌─────────────────────────────────────────────────────────────────┐
│  💬 Komentáře (5)                                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Komentář v 2:34...                            ] [Odeslat] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 2:34                                                    [×]││
│  │ Všimněte si pozice obránců - jsou příliš vysoko.           ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 5:12                                                    [×]││
│  │ Skvělá kombinace přes střed!                               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Modální okna

### 6.1 Přejmenovat video

```
┌─────────────────────────────────────┐
│  Přejmenovat video                  │
├─────────────────────────────────────┤
│  [Slatina vs Tuřany 3:1         ]  │
│                                     │
│  [Zrušit]            [Uložit]       │
└─────────────────────────────────────┘
```

### 6.2 Vybrat náhled videa

```
┌─────────────────────────────────────────┐
│  Vybrat náhled videa                    │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  [img]  │  │  [img]  │  │  [img]  │ │
│  │  2:34   │  │  5:12   │  │[Aktuální│ │
│  │         │  │         │  │   8:45] │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
│              [Zavřít]                   │
└─────────────────────────────────────────┘
```

### 6.3 Vybrat hráče (pro hodnocení/značku)

```
┌─────────────────────────────────────┐
│  ⚠️ Problém                         │
│  Čas: 2:34 - Vyber hráče (volitelné)│
├─────────────────────────────────────┤
│  [Bez hráče (obecné)            ]   │
│  ┌─────────────────────────────────┐│
│  │ [7]  Honza Novák               ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [10] Petr Svoboda              ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [3]  Tomáš Dvořák              ││
│  └─────────────────────────────────┘│
│                                     │
│              [Zrušit]               │
└─────────────────────────────────────┘
```

### 6.4 Uložit klip

```
┌─────────────────────────────────────────┐
│  ✂️ Uložit klip                         │
│  2:34 → 2:58 (24s)                      │
├─────────────────────────────────────────┤
│  Název klipu:                           │
│  [Gól z přímého kopu              ]     │
│                                         │
│  Kategorie:                             │
│  [▼ ⚽ Gól                         ]    │
│     🎯 Asistence                        │
│     ✨ Akce                             │
│     🛡️ Obrana                           │
│     📹 Ostatní                          │
│                                         │
│  Hráč: *                                │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌─────┐ │
│  │[7]    │ │[10]   │ │[3]    │ │...  │ │
│  │Honza ✓│ │Petr   │ │Tomáš  │ │     │ │
│  └───────┘ └───────┘ └───────┘ └─────┘ │
│                                         │
│  [Zrušit]              [Uložit klip]    │
└─────────────────────────────────────────┘
```

---

## 7. Klávesové zkratky (plánované)

| Klávesa | Akce |
|---------|------|
| `Space` | Play/Pause |
| `←` / `→` | -5s / +5s |
| `J` / `L` | -10s / +10s |
| `K` | Play/Pause |
| `M` | Mute/Unmute |
| `F` | Fullscreen |
| `R` | Nahrát komentář |
| `S` | Screenshot |

---

## 8. Responzivní design

Aplikace je optimalizována pro:
- **Desktop** (1200px+) - plný layout, všechny nástroje viditelné
- **Tablet** (768px - 1199px) - zjednodušený layout
- **Mobil** (< 768px) - nástroje ve více řádcích, větší dotyková plocha

---

## 9. Datový model

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Match     │────<│   Video     │>────│  Screenshot │
│             │     │             │     └─────────────┘
│ - name      │     │ - title     │
│ - date      │     │ - file_url  │>────┌─────────────┐
│ - type      │     │ - thumbnail │     │AudioComment │
│ - opponent  │     │ - duration  │     │ - transcript│
│ - score     │     │ - match_id  │     └─────────────┘
│ - notes     │     └─────────────┘
└─────────────┘            │            ┌─────────────┐
                           │>───────────│  Comment    │
┌─────────────┐            │            │ - text      │
│   Player    │            │            │ - time      │
│             │            │            └─────────────┘
│ - name      │<───────────┤
│ - number    │            │            ┌─────────────┐
│ - position  │            └>───────────│ PlayerClip  │
│ - photo     │                         │ - start/end │
│ - active    │                         │ - category  │
└─────────────┘                         └─────────────┘
```

---

*Dokumentace vytvořena pro SK Slatina 2017 Video Analysis Platform*
