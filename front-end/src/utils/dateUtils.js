/* Keep MySQL dates as local dates so they do not shift by one day. */
export const formatDateOnly = (value, options = {}) => {
  if (!value) return "—";

  const text = String(value).trim().slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return "—";

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(options.locale || "en-US", {
    month: options.month || "short",
    day: options.day || "numeric",
    year: options.year || "numeric",
  });
};

export const getDateParts = (value) => {
  if (!value) return null;

  const text = String(value).trim().slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};
