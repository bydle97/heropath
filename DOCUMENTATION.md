# DOKUMENTACJA PROJEKTU: "Droga Bohatera" (Hero's Path)

## 1. Koncepcja i Sterowanie
- **Postać:** Reprezentowana przez strzałkę (wskazującą jeden z 8 kierunków).
- **Ruch:** Klawisze `WASD` (góra, lewo, dół, prawo oraz płynny skos z normalizacją prędkości).
- **Celowanie / Kierunek patrzenia:** Klawisze strzałek (`↑`, `↓`, `←`, `→`). Obsługa 8 kierunków. Pozwala na prowadzenie ognia / atakowanie w jedną stronę podczas ucieczki w inną.
- **Unik (Dodge Roll):** `SPACJA`. Krótki, zwinny zryw dający klatki nieśmiertelności (`i-frames`). Cooldown zależy od statystyki Zręczności (`DEX`).

## 2. Pętla Gry i Balans (10-minutowy Run)
- **Czas trwania:** Pojedyncza sesja gry (run) trwa maksymalnie **10 minut** (600 sekund). Przetrwanie pełnych 10 minut skutkuje wygraną i ekranem zwycięstwa.
- **Wymóg walki:** Liczba spawnujących się wrogów oraz ich statystyki (HP i prędkość) płynnie rosną wraz z upływem czasu. Ucieczka bez eliminacji wrogów prowadzi do szybkiego otoczenia i przytłoczenia przez hordę.
- **Ekran Startowy:** Proste i przejrzyste menu główne z tytułem „Droga Bohatera” oraz przyciskiem „Nowa Gra”, przygotowane strukturalnie pod późniejsze wdrożenie grafik.
- **Układ Kolumnowy (UI):** Widok podzielony na główny obszar gry (Canvas w środku) oraz panel boczny (Sidebar po prawej stronie) zawierający:
  - Czas runu (odliczanie do 10:00).
  - Pasek życia (HP), Poziom oraz doświadczenie (EXP).
  - Statystyki postaci (STR, DEX, SPD, INT) oraz status uniku.
  - Informacje o wybranej broni oraz jej statystykach.
  - Listę aktywnych/wybranych ulepszeń broni i statystyk.

## 3. Początek Gry: Wybór Broni (Poziom 1 - Młodość)
Przed rozpoczęciem fali gracze wybierają jedną z trzech unikalnych broni:
1. **Łuk:** Atak dystansowy zbalansowanymi pociskami w kierunku spoglądania.
2. **Widły:** Atak pchnięciem (wąski, daleki stożek z silnym odepchnięciem).
3. **Pałka / Maczuga:** Ciężki, wolny atak obszarowy (szeroki stożek o dużych obrażeniach).

## 4. Statystyki Bohatera
- **Życie (HP):** Maksymalna wytrzymałość bohatera.
- **Siła (STR):** Skaluje bazowe obrażenia wszystkich ataków (procentowy przelicznik: +1% obrażeń na punkt).
- **Zręczność (DEX):** Skraca czas odnowienia (cooldown) Dasha pod Spacją.
- **Szybkość (SPD):** Prędkość poruszania się postaci po planszy.
- **Inteligencja (INT):** Szansa (%) na zadanie obrażeń krytycznych (Krit = 200% obrażeń).

## 5. Pełna Lista Ulepszeń (Upgrades)
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