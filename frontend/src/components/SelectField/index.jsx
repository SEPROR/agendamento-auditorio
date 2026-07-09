import { useState } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import styles from "./index.module.css";

export function SelectField({ label, icon: Icon, value, onChange, options, placeholder, error }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  const triggerClassName = [
    styles.trigger,
    error ? styles.triggerError : open ? styles.triggerOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>{label}</label>
      <div className={styles.selectContainer}>
        <button type="button" onClick={() => setOpen((p) => !p)} className={triggerClassName}>
          <Icon size={14} className={styles.icon} />
          <span className={`${styles.valueText} ${selected ? styles.valueTextSelected : ""}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={13}
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          />
        </button>

        {open && (
          <div className={styles.dropdown}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`${styles.option} ${opt.value === value ? styles.optionSelected : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className={styles.errorText}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

export default SelectField;