export const normalizeDayKey = (value: unknown): string | null => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (["0", "7", "sun", "sunday", "dim", "dimanche"].includes(raw)) return "sun";
  if (["1", "mon", "monday", "lun", "lundi"].includes(raw)) return "mon";
  if (["2", "tue", "tues", "tuesday", "mar", "mardi"].includes(raw)) return "tue";
  if (["3", "wed", "weds", "wednesday", "mer", "mercredi"].includes(raw)) return "wed";
  if (["4", "thu", "thur", "thurs", "thursday", "jeu", "jeudi"].includes(raw)) return "thu";
  if (["5", "fri", "friday", "ven", "vendredi"].includes(raw)) return "fri";
  if (["6", "sat", "saturday", "sam", "samedi"].includes(raw)) return "sat";
  return null;
};

export const parseDishAvailableDays = (value: unknown): string[] => {
  if (!value) return [];
  const rawList: Array<unknown> = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          const trimmed = value.trim();
          if (!trimmed) return [];
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            return trimmed
              .slice(1, -1)
              .split(",")
              .map((entry) => entry.replace(/"/g, "").trim())
              .filter(Boolean);
          }
          return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean);
        })()
      : [];
  const normalized = rawList
    .map((entry) => normalizeDayKey(entry))
    .filter((entry): entry is string => Boolean(entry));
  return Array.from(new Set(normalized));
};

export const normalizeTimeInput = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hours = Math.min(23, Math.max(0, Math.trunc(Number(match[1]))));
  const minutes = Math.min(59, Math.max(0, Math.trunc(Number(match[2]))));
  const paddedHours = String(hours).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");
  return `${paddedHours}:${paddedMinutes}`;
};

export const parseTimeToMinutes = (value: unknown): number | null => {
  const normalized = normalizeTimeInput(value);
  if (!normalized) return null;
  const [hoursText, minutesText] = normalized.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};
