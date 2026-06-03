const guestNamePrefixes = [
  "Fanaticni Sakupljac",
  "Zlatni Duplikat",
  "Album Majstor",
  "Slicica Lovac",
  "Panini Ninja",
  "Kralj Menjaze",
  "Brzi Kolekcionar",
  "Nestali Stiker",
  "Duplikat Heroj",
  "Lovac Na Brazilce",
  "Meksicki Skaut",
  "Album Veteran",
  "Stiker Kapiten",
  "Menjaza Majstor",
  "Zlatna Kesica",
  "Sakupljac Iz Kraja",
  "Turbo Lepljac",
  "Fudbalski Arhivar",
  "Slicica Profesor",
  "Kralj Albuma",
  "Kapiten Kolekcije",
  "Lovac Na Embleme",
  "Brzi Skener",
  "Album Legenda",
  "Stiker Sampion",
  "Majstor Duplikata",
  "Zlatni Kolekcionar",
  "Slicica Strateg",
  "Menjaza Guru",
  "Album General"
];

function randomInt(max: number) {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

export function generateGuestName() {
  const prefix = guestNamePrefixes[randomInt(guestNamePrefixes.length)];
  const number = 1000 + randomInt(9000);
  return `${prefix} ${number}`;
}
