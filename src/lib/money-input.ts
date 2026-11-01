/** Reads "$1,250.00", "1250", or a decimal comma like "12,50" as dollars. NaN when unreadable. */
export function parseDollarInput(text: string): number {
  let s = text.replace(/[$\s]/g, "");
  if (s.includes(".")) s = s.replace(/,/g, "");
  else if (/,\d{1,2}$/.test(s)) s = s.replace(/,(?=\d{1,2}$)/, ".").replace(/,/g, "");
  else s = s.replace(/,/g, "");
  return Number.parseFloat(s);
}
