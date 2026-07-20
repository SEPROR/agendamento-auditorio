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

// export function isHallAllowed(date) {
//   const day = date.getDate();
//   return day >= 28 || day <= 16;
// }

export function isHallAllowed(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determina o mês/ano de referência da janela (o mês do "dia 28" que a inicia).
  // Se hoje ainda não passou do dia 17, a janela vigente começou no mês anterior.
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
  const windowEnd   = new Date(startYear, startMonth + 1, 16); // JS ajusta o overflow de mês automaticamente

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  return d >= windowStart && d <= windowEnd;
}

export function toMinutes(t) {
  const [h, min] = t.split(":").map(Number);
  return h * 60 + min;
}

export function isSlotBooked(bookings, date, hour) {
  return bookings.some((b) => {
    if (b.date !== date) return false;
    const start = toMinutes(b.inicio);
    const end   = toMinutes(b.fim);
    return hour * 60 >= start && hour * 60 < end;
  });
}

export function getBookingForSlot(bookings, date, hour) {
  return bookings.find((b) => {
    if (b.date !== date) return false;
    const start = toMinutes(b.inicio);
    const end   = toMinutes(b.fim);
    return hour * 60 >= start && hour * 60 < end;
  });
}

export function isDayFullyBooked(bookings, date) {
  const dayBookings = bookings.filter((b) => b.date === date);
  let booked = 0;
  for (const b of dayBookings) booked += toMinutes(b.fim) - toMinutes(b.inicio);
  return booked >= (HOUR_END - HOUR_START) * 60;
}

export function hasAnyBooking(bookings, date) {
  return bookings.some((b) => b.date === date);
}
