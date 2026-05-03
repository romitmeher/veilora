export function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const code = countryCode.toUpperCase();
  const offset = 0x1F1E6 - 65;
  const chars = [...code].map((c) => String.fromCodePoint(c.charCodeAt(0) + offset));
  return chars.join("");
}
