export const logSqlError = (context: string, error: unknown) => {
  const err = (error || {}) as { code: string; message: string; details: string; hint: string };
  console.error("VRAI MESSAGE SQL:", err.message || null, "DETAILS:", err.details || null, "HINT:", err.hint || null);
  console.error("SQL CONTEXT:", context, "CODE:", err.code || null);
};
