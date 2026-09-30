import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import styles from "./index.module.css";

const pad = (n) => String(n).padStart(2, "0");
const MINUTES = [0, 15, 30, 45];

// "0930" -> "09:30" | "09" -> "09" | "093" -> "09:3"
const maskTime = (raw) => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const parseTime = (text) => {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 0) return null;
  let h;
  let m;
  if (digits.length <= 2) {
    h = Number(digits); // "9" ou "09" -> 09:00
    m = 0;
  } else if (digits.length === 3) {
    h = Number(digits.slice(0, 1)); // "930" -> 09:30
    m = Number(digits.slice(1));
  } else {
    h = Number(digits.slice(0, 2));
    m = Number(digits.slice(2, 4));
  }
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
};


export function TimePicker({
  value = "",
  onChange,
  hourStart = 0,
  hourEnd = 23,
  hasError = false,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef(null);
  const hourListRef = useRef(null);

  // Mantém o texto sincronizado quando o valor muda por fora (seletor, reset...)
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const [selH, selM] = value ? value.split(":") : ["", ""];

  const hours = [];
  for (let h = hourStart; h <= hourEnd; h++) hours.push(h);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && hourListRef.current && selH !== "") {
      const el = hourListRef.current.querySelector(`[data-h="${Number(selH)}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [open, selH]);

  const handleType = (e) => {
    const masked = maskTime(e.target.value);
    setDraft(masked);
    // Horário completo e válido: já avisa o formulário
    if (masked.length === 5) {
      const parsed = parseTime(masked);
      if (parsed) onChange(parsed);
    }
  };

  // Ao sair do campo: completa ("9" -> "09:00"), ou volta ao último valor válido
  const handleBlur = () => {
    if (draft === "") {
      if (value !== "") onChange("");
      return;
    }
    const parsed = parseTime(draft);
    if (parsed) {
      setDraft(parsed);
      if (parsed !== value) onChange(parsed);
    } else {
      setDraft(value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // não envia o formulário ao confirmar o horário
      setOpen(false);
      e.currentTarget.blur();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const pickHour = (h) => onChange(`${pad(h)}:${selM !== "" ? selM : "00"}`);
  const pickMinute = (m) => {
    const h = selH !== "" ? selH : pad(hourStart);
    onChange(`${pad(h)}:${pad(m)}`);
    setOpen(false);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <div
        className={`${styles.field} ${hasError ? styles.fieldError : ""} ${open ? styles.fieldOpen : ""}`}
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          placeholder="--:--"
          aria-label={ariaLabel}
          value={draft}
          onChange={handleType}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={styles.input}
        />
        <button
          type="button"
          aria-label="Abrir seletor de horário"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={styles.iconButton}
        >
          <Clock size={15} />
        </button>
      </div>

      {open && (
        <div className={styles.popover} role="listbox">
          <div className={styles.column} ref={hourListRef}>
            <p className={styles.colTitle}>Hora</p>
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                data-h={h}
                onClick={() => pickHour(h)}
                className={`${styles.option} ${Number(selH) === h && selH !== "" ? styles.optionActive : ""}`}
              >
                {pad(h)}
              </button>
            ))}
          </div>
          <div className={styles.column}>
            <p className={styles.colTitle}>Min</p>
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pickMinute(m)}
                className={`${styles.option} ${Number(selM) === m && selM !== "" ? styles.optionActive : ""}`}
              >
                {pad(m)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TimePicker;