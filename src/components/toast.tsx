"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import { useEffect, useState } from "react";

type ToastMessage = { id: number; message: string; tone: "success" | "error" };

let nextToastId = 0;

export function notifyToast(message: string, tone: ToastMessage["tone"] = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("repuestos-toast", { detail: { message, tone } }),
  );
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const handleToast = (event: Event) => {
      const { message, tone } = (event as CustomEvent<Omit<ToastMessage, "id">>).detail;
      const id = ++nextToastId;
      setToasts((current) => [...current, { id, message, tone }]);
      const timer = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.delete(timer);
      }, 4500);
      timers.add(timer);
    };
    window.addEventListener("repuestos-toast", handleToast);
    return () => {
      window.removeEventListener("repuestos-toast", handleToast);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.tone}`} key={toast.id} role="status">
          {toast.tone === "success" ? <CircleCheck size={18} /> : <CircleX size={18} />}
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
