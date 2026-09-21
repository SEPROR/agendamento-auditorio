import { HOUR_START, HOUR_END } from "./constants";

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function fmt(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHallAllowed(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startYear  = today.getFullYear();
  let startMonth = today.getMonth();

  if (today.getDate() < 17) {
    startMonth -= 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const windowStart = new Date(startYear, startMonth, 28);
  const windowEnd   = new Date(startYear, startMonth + 1, 16);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  return d >= windowStart && d <= windowEnd;
}

export function toMinutes(t) {
  const [h, min] = t.split(":").map(Number);
  return h * 60 + min;
}

export function hasAnyBooking(bookings, date) {
  return bookings.some((b) => b.date === date);
}

export const getDayBookings = (bookings, dateStr) =>
  bookings.filter((b) => b.date === dateStr);

// retorna o agendamento em conflito (ou undefined)
export const findConflict = (bookings, dateStr, inicio, fim) => {
  const ini = toMinutes(inicio);
  const end = toMinutes(fim);
  return getDayBookings(bookings, dateStr).find(
    (b) => ini < toMinutes(b.fim) && end > toMinutes(b.inicio)
  );
};

// dia lotado = os agendamentos cobrem todo o expediente, sem lacunas
export const isDayFullyBooked = (bookings, dateStr) => {
  const sorted = getDayBookings(bookings, dateStr)
    .map((b) => [toMinutes(b.inicio), toMinutes(b.fim)])
    .sort((a, b) => a[0] - b[0]);

  let cursor = HOUR_START * 60;
  for (const [ini, fim] of sorted) {
    if (ini > cursor) return false; // achou lacuna
    cursor = Math.max(cursor, fim);
  }
  return cursor >= HOUR_END * 60;
};