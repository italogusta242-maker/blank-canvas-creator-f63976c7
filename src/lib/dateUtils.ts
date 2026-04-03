/** Returns local date string in YYYY-MM-DD format (avoids UTC timezone shift) */
export const toLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getToday = (): string => toLocalDate(new Date());

/** Returns yesterday's local date string */
export const getYesterday = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDate(d);
};

/** 
 * Safely parses a date string, specifically handling Safari's strict requirements.
 * Replaces spaces with 'T' to ensure ISO compliance if necessary.
 */
export const parseSafeDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  
  // Safari compatibility: replace space with T if missing, and ensure dashes for date
  let normalized = dateStr.trim();
  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T');
  }
  
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return new Date();
  return d;
};

/** localStorage helpers with date-based keys */
export const getDailyKey = (prefix: string): string => `${prefix}-${getToday()}`;

export const getDailyValue = <T>(prefix: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(getDailyKey(prefix));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const setDailyValue = <T>(prefix: string, value: T): void => {
  localStorage.setItem(getDailyKey(prefix), JSON.stringify(value));
};
