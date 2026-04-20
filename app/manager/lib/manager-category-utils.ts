export const normalizeCategoryDestination = (value: unknown): "cuisine" | "bar" => {
  return String(value || "").trim().toLowerCase() === "bar" ? "bar" : "cuisine";
};

export const normalizeSortOrder = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : 0;
};
