/** IANA-Zeitzone für Tages-Reset (Mitternacht). Standard: Deutschland. */
export const OUTREACH_DAY_TIMEZONE =
  process.env.OUTREACH_DAY_TIMEZONE ?? "Europe/Berlin";

/** UTC-Zeitpunkt von 00:00:00 des aktuellen Kalendertags in der konfigurierten Zeitzone. */
export function getDayStartInTimezone(timeZone = OUTREACH_DAY_TIMEZONE): Date {
  const now = new Date();
  const dateInTz = now.toLocaleDateString("en-CA", { timeZone });
  const [y, m, d] = dateInTz.split("-").map(Number);
  const target = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  let lo = Date.UTC(y, m - 1, d - 1);
  let hi = Date.UTC(y, m - 1, d + 1);

  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    const midDate = new Date(mid);
    const midDateStr = midDate.toLocaleDateString("en-CA", { timeZone });
    const midTime = midDate.toLocaleTimeString("en-GB", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (midDateStr < target || (midDateStr === target && midTime < "00:00:00")) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date(hi);
}
