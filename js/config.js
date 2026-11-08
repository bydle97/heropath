export const CONFIG = {
  playerSize: 26,

  speedBase: 100,
  speedPerPoint: 5,
  speedCap: 340,

  dashSpeed: 500,
  dashDuration: 0.15,
  dashIframeExtra: 0.06,
  dashCooldownBase: 2.05,
  dashCooldownDex: 0.03,
  dashCooldownMin: 0.4,

  hurtCooldown: 0.65,

  enemySize: 22,
  contactDamage: 1,

  chaserHp: 16,
  chaserSpeed: 58,
  chaserReach: 86,
  chaserWindup: 0.6,
  chaserRecover: 1.25,
  chaserConeRange: 112,
  chaserConeArc: Math.PI * 0.62,
  chaserSwingDamage: 2,

  shooterHp: 9,
  shooterSpeed: 72,
  shooterMinDist: 200,
  shooterMaxDist: 280,
  shooterFireInterval: 2,

  runnerHp: 8,
  runnerSpeed: 98,
  runnerDamage: 1,

  enemyBulletSize: 9,
  enemyBulletSpeed: 250,
  enemyBulletDamage: 1,

  chaserExp: 7,
  shooterExp: 9,
  runnerExp: 6,

  xpBase: 18, // Szybsze levelowanie
  xpGrowth: 1.45,

  runDuration: 600, // 10 minut
};

export const WEAPON_NAMES = {
  bow: "Łuk",
  fork: "Widły",
  club: "Pałka",
};

export const WEAPON_DESCS = {
  bow: "Precyzyjne strzały w kierunku spojrzenia.",
  fork: "Wąskie, szybkie pchnięcie o dużej sile wzdłuż linii.",
  club: "Ciężki, bardzo wąski zamach o dużych obrażeniach obszarowych.",
};

export const STARTING_STATS = {
  hp: 10,
  str: 10,
  dex: 8,
  spd: 10,
  int: 5,
};

export const UPGRADE_DEFS = [
  {
    id: "hp",
    category: "Statystyka",
    kind: "stat",
    title: "+ Życie",
    description: "+4 maksymalnego HP. Bohater odzyskuje 4 punkty życia.",
    weight: 1, // Mniejsza szansa na czyste statystyki
    apply(player) {
      player.maxHp += 4;
      player.hp = Math.min(player.maxHp, player.hp + 4);
    },
  },
  {
    id: "str",
    category: "Statystyka",
    kind: "stat",
    title: "+ Siła",
    description: "+5 Siły. Każdy punkt Siły dodaje 1% do obrażeń wszystkich ataków.",
    weight: 1,
    apply(player) {
      player.str += 5;
    },
  },
  {
    id: "spd",
    category: "Statystyka",
    kind: "stat",
    title: "+ Szybkość",
    description: "+4 Szybkości. Bohater szybciej przemierza planszę.",
    weight: 1,
    apply(player) {
      player.spd += 4;
    },
  },
  {
    id: "dex",
    category: "Statystyka",
    kind: "stat",
    title: "+ Zręczność",
    description: "+4 Zręczności. Unik pod spacją odnawia się szybciej.",
    weight: 1,
    apply(player) {
      player.dex += 4;
    },
  },
  {
    id: "int",
    category: "Statystyka",
    kind: "stat",
    title: "+ Inteligencja",
    description: "+5 Inteligencji. Zwiększa szansę na uderzenie krytyczne (200% obrażeń).",
    weight: 1,
    apply(player) {
      player.int += 5;
    },
  },
  {
    id: "bow-volley",
    weapon: "bow",
    max: 2,
    category: "Broń",
    kind: "weapon",
    weight: 4, // Większa szansa na ulepszenia broni
    title(rank) {
      return rank === 0 ? "Podwójny szybki strzał" : "Potrójny szybki strzał";
    },
    description(rank) {
      return rank === 0
        ? "Łuk wypuszcza drugi pocisk i naciąga się szybciej."
        : "Łuk wypuszcza trzeci pocisk i strzela jeszcze szybciej.";
    },
    apply(player) {
      player.bowVolley += 1;
      player.bowHaste *= 0.86;
    },
  },
  {
    id: "bow-power",
    weapon: "bow",
    max: 2,
    category: "Broń",
    kind: "weapon",
    weight: 4,
    title: "Mocniejszy naciąg",
    description: "Groty strzał zadają wyraźnie wyższe obrażenia.",
    apply(player) {
      player.bowPower += 0.28;
    },
  },
  {
    id: "fork-haste",
    weapon: "fork",
    max: 3,
    category: "Styl walki",
    kind: "weapon",
    weight: 4,
    title: "Szybszy atak widłami",
    description: "Kolejne pchnięcie nadchodzi wyraźnie szybciej.",
    apply(player) {
      player.forkHaste *= 0.72;
    },
  },
  {
    id: "fork-reach",
    weapon: "fork",
    max: 2,
    category: "Styl walki",
    kind: "weapon",
    weight: 4,
    title: "Dłuższe widły",
    description: "Pchnięcie sięga dalej i mocniej odpycha trafionych.",
    apply(player) {
      player.forkReach += 0.18;
    },
  },
  {
    id: "club-wide",
    weapon: "club",
    max: 3,
    category: "Styl walki",
    kind: "weapon",
    weight: 4,
    title: "Szersze zamachy",
    description: "Pałka obejmuje szerszy stożek przed bohaterem.",
    apply(player) {
      player.clubArc += 0.18;
    },
  },
  {
    id: "club-heavy",
    weapon: "club",
    max: 2,
    category: "Styl walki",
    kind: "weapon",
    weight: 4,
    title: "Ciężki cios",
    description: "Zamach pałką zadaje większe obrażenia.",
    apply(player) {
      player.clubPower += 0.24;
    },
  },
];