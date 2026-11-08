# DOKUMENTACJA PROJEKTU: "Droga Bohatera" (Hero's Path)

## 1. Koncepcja i Sterowanie
- **Postać:** Reprezentowana przez strzałkę (wskazującą jeden z 8 kierunków).
- **Ruch:** Klawisze `WASD` (góra, lewo, dół, prawo oraz płynny skos z normalizacją prędkości).
- **Celowanie / Kierunek patrzenia:** Klawisze strzałek (`↑`, `↓`, `←`, `→`). Obsługa 8 kierunków. Pozwala na prowadzenie ognia / atakowanie w jedną stronę podczas ucieczki w inną.
- **Unik (Dodge Roll):** `SPACJA`. Krótki, zwinny zryw dający klatki nieśmiertelności (`i-frames`). Cooldown zależy od statystyki Zręczności (`DEX`).

## 2. Pętla Gry i Balans (10-minutowy Run)
- **Czas trwania:** Pojedyncza sesja gry (run) trwa maksymalnie **10 minut** (600 sekund). Przetrwanie pełnych 10 minut skutkuje wygraną i ekranem zwycięstwa.
- **Wymóg walki:** Liczba spawnujących się wrogów oraz ich statystyki (HP i prędkość) płynnie rosną wraz z upływem czasu. Ucieczka bez eliminacji wrogów prowadzi do szybkiego otoczenia i przytłoczenia przez hordę.

## 3. Sztuczna Inteligencja Tłumu i Kolizje (Flocking & Flanking)
- **Separacja wrogów (Unikanie nakładania się):** Przeciwnicy nie mogą wchodzić "w siebie". Zaimplementowano siłę odpychania (separation), która wymusza zachowanie osobistego dystansu między jednostkami.
- **Flankowanie (Otaczanie bohatera):** Wrogowie nie poruszają się idealnie w tym samym punkcie centralnym. Posiadają unikalny offset kątowy (`flankOffset`), co powoduje, że naturalnie rozpraszają się i otaczają gracza z różnych stron.

## 4. Statystyki Broni (Tabelka)
| Nazwa Broni | Typ Ataku | Obrażenia Bazowe | Zasięgowość / Obszar | Cooldown (Szybkość Ataku) | Opis / Efekt Specjalny |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Łuk** | Dystansowy (Pociski) | 4 | Nielimitowany (Pociski) | ~0.65 s | Wystrzeliwuje szybkie strzały w kierunku spojrzenia. |
| **Widły** | Pchnięcie (Prostokąt) | 11 | Wąski prostokąt (160 px) | ~0.78 s | Precyzyjne pchnięcie wzdłuż linii z mocnym odepchnięciem. |
| **Pałka** | Obszarowy (Wąski Stożek) | 10 | Wąski stożek (85 px) | ~1.32 s | Wolny zamach obszarowy o umiarkowanym zasięgu. |

## 5. Statystyki Przeciwników (Tabelka)
| Nazwa Przeciwnika | Typ AI / Zachowanie | HP Bazowe | Prędkość Ruchu | Obrażenia Ataku | EXP |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Biegun (`Chaser`)** | Podbiega i wykonuje zamach w zwarciu (z sygnalizacją) | 16 | 58 px/s | 2 (wręcz) / 1 (kontakt) | 7 |
| **Strzelec (`Shooter`)** | Trzyma dystans i strzela pociskami dystansowymi | 9 | 72 px/s | 1 (pocisk / kontakt) | 9 |
| **Zwinny (`Runner`)** | Szybka szarża, atak z bliska i natychmiastowy odskok | 8 | 98 px/s | 1 (wręcz / kontakt) | 6 |

## 6. Parametry Postaci i Silnika
- **Bazowa prędkość ruchu bohatera:** 100 px/s (+5 px/s za każdy punkt `SPD`, maks. 340 px/s).
- **Prędkość Uniku (Dash):** 500 px/s (czas trwania: 0.15 s, dodatkowe klatki nieśmiertelności: 0.06 s).
- **Odnowienie Uniku (Cooldown):** Bazowo 2.05 s (skracane przez statystykę `DEX`).
- **Skalowanie obrażeń (Siła `STR`):** Każdy punkt `STR` zwiększa obrażenia wszystkich ataków o 1%.
- **Szansa na krytyk (Inteligencja `INT`):** 1 punkt `INT` = 1% szansy na cios krytyczny zadający 200% obrażeń.
- **Czas trwania runu:** 600 sekund (10 minut).

## 7. Pełna Lista Ulepszeń (Upgrades)
Po zdobyciu poziomu (EXP) gra pauzuje i pozwala wybrać 1 z 3 losowych ulepszeń:

### Ulepszenia Statystyk:
1. **+ Życie (`hp`)**: +4 maksymalnego HP. Bohater odzyskuje 4 punkty życia.
2. **+ Siła (`str`)**: +5 Siły. Każdy punkt Siły dodaje 1% do obrażeń wszystkich ataków.
3. **+ Szybkość (`spd`)**: +4 Szybkości. Bohater szybciej przemierza planszę.
4. **+ Zręczność (`dex`)**: +4 Zręczności. Unik pod spacją odnawia się szybciej.
5. **+ Inteligencja (`int`)**: +5 Inteligencji. Zwiększa szansę na uderzenie krytyczne (200% obrażeń).

### Ulepszenia Łuku (`bow`):
6. **Podwójny / Potrójny szybki strzał (`bow-volley`, max 2 poziomy)**: Łuk wypuszcza dodatkowy pocisk i naciąga się szybciej.
7. **Mocniejszy naciąg (`bow-power`, max 2 poziomy)**: Groty strzał zadają wyraźnie wyższe obrażenia.

### Ulepszenia Wideł (`fork`):
8. **Szybszy atak widłami (`fork-haste`, max 3 poziomy)**: Kolejne pchnięcie nadchodzi wyraźnie szybciej.
9. **Dłuższe widły (`fork-reach`, max 2 poziomy)**: Pchnięcie sięga dalej i mocniej odpycha trafionych.

### Ulepszenia Pałki (`club`):
10. **Szersze zamachy (`club-wide`, max 3 poziomy)**: Pałka obejmuje szerszy stożek przed bohaterem.
11. **Ciężki cios (`club-heavy`, max 2 poziomy)**: Zamach pałką zadaje większe obrażenia.