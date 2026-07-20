import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Info, CheckCircle2 } from "lucide-react";
import { BOOKINGS } from "../../booking.js";
import { HOUR_START, HOUR_END, PT_MONTHS, PT_DAYS } from "../../constants";
import {
  fmt, isWeekend, isHallAllowed,
  isSlotBooked, getBookingForSlot,
  isDayFullyBooked, hasAnyBooking, pad,
} from "../../helpers";
import styles from "./index.module.css";

const LEGEND_ITEMS = [
  { dotClass: "dotWarning", label: "Parcialmente ocupado" },
  { dotClass: "dotDanger", label: "Sem disponibilidade" },
  { dotClass: "dotSelected", label: "Selecionado" },
];

export function CalendarPanel({ selectedDate, onSelectDate, selectedSlot, onSelectSlot, isHall }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

// cursor guarda o mês/ano atual exibido no calendário
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = cursor;

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const result = [];
    for (let i = 0; i < first.getDay(); i++) result.push(null);
    for (let d = 1; d <= last.getDate(); d++) result.push(new Date(year, month, d));
    return result;
  }, [year, month]);

  const prevMonth = () => setCursor((c) => {
    const m = c.month === 0 ? 11 : c.month - 1;
    const y = c.month === 0 ? c.year - 1 : c.year;
    return { year: y, month: m };
  });

  const nextMonth = () => setCursor((c) => {
    const m = c.month === 11 ? 0 : c.month + 1;
    const y = c.month === 11 ? c.year + 1 : c.year;
    return { year: y, month: m };
  });

  const canGoPrev  = new Date(year, month, 1) > today; 
  const hours      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const selDayDate = selectedDate ? new Date(selectedDate + "T00:00:00") : null;

  return (
    <div className={styles.container}>
      {/* Nav botões que permitem avançar ou voltar de mês*/}
      <div className={styles.navRow}>
        <button type="button" onClick={prevMonth} disabled={!canGoPrev} className={styles.navButton}>
          <ChevronLeft size={16} className={styles.navIcon} />
        </button>
        <span className={styles.monthLabel}>{PT_MONTHS[month]} {year}</span>
        <button type="button" onClick={nextMonth} className={styles.navButton}>
          <ChevronRight size={16} className={styles.navIcon} />
        </button>
      </div>

      {/* Aviso do Hall */}
      {isHall && (
        <div className={styles.hallWarning}>
          <Info size={13} className={styles.hallWarningIcon} />
          <p className={styles.hallWarningText}>
            O Hall está disponível apenas entre os dias <strong>28</strong> (mês atual)
            e <strong>16</strong> (mês seguinte). Os demais dias estão bloqueados.
          </p>
        </div>
      )}

      {/* Cabeçalho de dias */}
      <div className={styles.weekHeader}>
        {PT_DAYS.map((d) => (
          <div key={d} className={styles.weekHeaderCell}>
            {d}
          </div>
        ))}
      </div>

      {/* Células */}
      <div className={styles.daysGrid}>
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;

          const dateStr     = fmt(date);
          const isPast      = date < today;
          const isWknd      = isWeekend(date);
          const hallBlocked = isHall && !isHallAllowed(date);
          const disabled    = isPast || isWknd || hallBlocked;
          const isFull      = isDayFullyBooked(BOOKINGS, dateStr);
          const hasSome     = hasAnyBooking(BOOKINGS, dateStr);
          const isSelected  = dateStr === selectedDate;
          const isToday     = fmt(date) === fmt(today);

          let cellClass = styles.dayCell + " ";
          if (disabled) {
            cellClass += hallBlocked && !isPast && !isWknd
              ? styles.dayCellHallBlocked
              : styles.dayCellDisabled;
          } else if (isSelected) {
            cellClass += styles.dayCellSelected;
          } else if (isFull) {
            cellClass += styles.dayCellFull;
          } else {
            cellClass += styles.dayCellDefault;
          }

          return (
            <button key={dateStr} type="button" disabled={disabled || isFull}
              onClick={() => onSelectDate(dateStr)} className={cellClass}>
              {isToday && !isSelected && (
                <span className={styles.todayDot} />
              )}
              {date.getDate()}
              {hasSome && !isFull && !isSelected && !disabled && (
                <span className={styles.hasBookingDot} />
              )}
              {isFull && !disabled && (
                <span className={styles.fullDot} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className={styles.legend}>
        {LEGEND_ITEMS.map(({ dotClass, label }) => (
          <div key={label} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles[dotClass]}`} />
            <span className={styles.legendLabel}>{label}</span>
          </div>
        ))}
        {isHall && (
          <div className={styles.legendItem}>
            <span className={styles.legendHallBlockedBox} />
            <span className={styles.legendLabel}>Bloqueado (Hall)</span>
          </div>
        )}
      </div>

      {/* Horários */}
      {selectedDate ? (
        <div className={styles.slotsSection}>
          <p className={styles.slotsTitle}>
            Horários —{" "}
            {selDayDate?.toLocaleDateString("pt-BR", {
              weekday: "long", day: "2-digit", month: "short",
            })}
          </p>
          <div className={styles.slotsList}>
            {hours.map((h) => {
              const booked  = isSlotBooked(BOOKINGS, selectedDate, h);
              const booking = getBookingForSlot(BOOKINGS, selectedDate, h);
              const slotIni = `${pad(h)}:00`;
              const slotFim = `${pad(h + 1)}:00`;
              const isSel   = selectedSlot?.inicio === slotIni && selectedSlot?.fim === slotFim;

              const slotClass = `${styles.slotButton} ${
                booked ? styles.slotBooked : isSel ? styles.slotSelected : styles.slotDefault
              }`;

              return (
                <button key={h} type="button" disabled={booked}
                  onClick={() => onSelectSlot({ inicio: slotIni, fim: slotFim })}
                  className={slotClass}
                >
                  <span className={styles.slotTime}>
                    {slotIni} – {slotFim}
                  </span>
                  {booked ? (
                    <span className={styles.slotBookedInfo}>{booking?.nome} · {booking?.assunto}</span>
                  ) : isSel ? (
                    <span className={styles.slotSelectedInfo}>
                      <CheckCircle2 size={11} /> Selecionado
                    </span>
                  ) : (
                    <span className={styles.slotAvailable}>Disponível</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Info size={14} className={styles.emptyStateIcon} />
          <p className={styles.emptyStateText}>Selecione um dia no calendário para ver os horários disponíveis.</p>
        </div>
      )}
    </div>
  );
}

export default CalendarPanel;