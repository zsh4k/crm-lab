import { useState, useCallback } from "preact/hooks";
import type { ComponentChildren } from "preact";

// ── Toast ──────────────────────────────────────────────────
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3200);
  }, []);
  return { msg, flash };
}
export function Toast({ msg }: { msg: string | null }) {
  return msg ? <div class="toast">{msg}</div> : null;
}

// ── Modal genérico ─────────────────────────────────────────
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
}) {
  return (
    <div class="modal-bg" onClick={onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal-head">
          <h2>{title}</h2>
          <button class="ghost" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div class="modal-body">{children}</div>
        {footer && <div class="modal-actions">{footer}</div>}
      </div>
    </div>
  );
}

// ── Campo etiquetado ───────────────────────────────────────
export function Field({
  label,
  value,
  onInput,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onInput: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label class="field">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      />
    </label>
  );
}

// ── Buscador reutilizable ──────────────────────────────────
export function SearchBar({ value, onInput, placeholder }: { value: string; onInput: (v: string) => void; placeholder?: string }) {
  return (
    <input
      class="search"
      type="search"
      placeholder={placeholder ?? "Buscar…"}
      value={value}
      onInput={(e) => onInput((e.target as HTMLInputElement).value)}
    />
  );
}

// ── Estado vacío ───────────────────────────────────────────
// Recibe el componente de ícono (line-art, el mismo del nav/encabezado).
export function Empty({ Icon, text }: { Icon: () => preact.JSX.Element; text: string }) {
  return (
    <div class="empty">
      <div class="empty-ico"><Icon /></div>
      <p>{text}</p>
    </div>
  );
}
