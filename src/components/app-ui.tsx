"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "normal",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "normal" | "small";
}) {
  return (
    <button
      className={`button button-${variant} button-${size} ${className}`}
      {...props}
    />
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ""}`} />;
}

export function SelectInput({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`input select-input ${className ?? ""}`}>
      {children}
    </select>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Panel({
  title,
  detail,
  action,
  children,
  className = "",
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-heading">
          <div>
            {title && <h2>{title}</h2>}
            {detail && <p>{detail}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={17} />
      <span>{message}</span>
    </div>
  );
}

export function Loading({ label = "Cargando información..." }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={20} />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark">—</span>
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
    </div>
  );
}

export function StatusPill({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`status-pill ${active ? "status-active" : "status-inactive"}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
