const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDateString = (value: string): boolean => DATE_REGEX.test(value);

export const getNormalizedDate = (value: string): Date => new Date(`${value}T00:00:00`);

export const isValidBookingDate = (dateStr: string): boolean => {
  if (!isValidDateString(dateStr)) return false;
  const date = getNormalizedDate(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 6);

  return date >= today && date <= maxDate;
};

export const ALL_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 7; h < 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
})();
