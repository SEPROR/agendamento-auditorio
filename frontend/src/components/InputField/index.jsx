import { AlertCircle } from "lucide-react";
import styles from "./index.module.css";

export function InputField({ label, icon: Icon, type = "text", value, onChange, placeholder, error }) {
  const containerClassName = [styles.inputContainer, error ? styles.inputContainerError : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>{label}</label>
      <div className={containerClassName}>
        <Icon size={14} className={styles.icon} />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
        />
      </div>

      {error && (
        <p className={styles.errorText}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

export default InputField;