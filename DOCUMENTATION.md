# DOKUMENTACJA PROJEKTU: "Droga Rycerza" (Knight's Path)

## 1. Koncepcja i Sterowanie
- **Postać:** Reprezentowana przez strzałkę (wskazującą jeden z 8 kierunków).
- **Ruch:** Klawisze `WASD` (góra, lewo, dół, prawo oraz skosy).
- **Celowanie / Kierunek patrywania:** Klawisze strzałek (`↑`, `↓`, `←`, `→`). Obsługa 8 kierunków (góra, dół, lewo, prawo oraz kombinacje diagonalne, np. góra+prawo).
- **Unik (Dodge Roll):** `SPACJA`. Krótki, zwinny zryw w kierunku ruchu (skrócony dystans) dający klatki nieśmiertelności (i-frames). Cooldown zależy od Zręczności.

## 2. Początek Gry: Wybór Broni (Poziom 1 - Młodość)
Przed rozpoczęciem fali pojawia się modalny ekran wyboru pierwszej broni dla młodego chłopaka:
1. **Łuk:** Atak dystansowy, szybkie pociski w kierunku spoglądania.
2. **Widły:** Atak pchnięciem (wąski, daleki stożek/linia przed bohaterem z efektownym odepchnięciem).
3. **Pałka / Maczuga:** Ciężki, wolny atak obszarowy (szeroki stożek przed bohaterem o dużych obrażeniach).

## 3. Statystyki Bohatera
- **Życie (HP):** Maksymalna wytrzymałość bohatera.
- **Siła (STR):** Skaluje bazowe obrażenia wszystkich ataków (procentowy przelicznik).
- **Zręczność (DEX):** Skraca czas odnowienia (cooldown) Dasha/Uniku pod Spacją.
- **Szybkość (SPD):** Prędkość poruszania się postaci po planszy.
- **Inteligencja (INT):** Szansa (%) na zadanie obrażeń krytycznych (Krit = 200% obrażeń).

## 4. System Awansu (Leveling & Upgrades)
- Zdobywanie doświadczenia (EXP) ze zgładzonych wrogów jest spowolnione dla większego ciężaru rozgrywki.
- Po zdobyciu poziomu gra pauzuje i wyświetla okno wyboru 1 z 3 losowych ulepszeń podzielonych na kategorie:
  - **Ulepszenia Statystyk:** np. +Życie, +Siła, +Szybkość, +Zręczność, +Inteligencja.
  - **Ulepszenia Broni / Style Walki:** np. Podwójny szybki strzał z łuku, szersze zamachy pałką, szybszy atak widłami.
