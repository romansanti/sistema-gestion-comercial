"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { formatearMoneda } from "@/lib/format";

type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number | null;
  onValueChange: (centavos: number | null) => void;
};

function formattedValue(value: number | null): string {
  return value === null ? "" : formatearMoneda(value).replace("$ ", "");
}

function parseCentavos(value: string): number | null {
  const cleaned = value.trim().replace(/^\$\s*/, "").replace(/\s/g, "");
  if (!cleaned) return null;

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);
  if (!match) return null;

  const centavos =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

export function CurrencyInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: CurrencyInputProps) {
  const [draft, setDraft] = useState(() => formattedValue(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(formattedValue(value));
  }, [value]);

  function commit() {
    const parsed = parseCentavos(draft);
    if (parsed === null && draft.trim() !== "") {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    onValueChange(parsed);
    setDraft(formattedValue(parsed));
  }

  return (
    <div>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        value={draft}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          setInvalid(false);
        }}
        onBlur={(event) => {
          commit();
          onBlur?.(event);
        }}
      />
      {invalid && (
        <p role="alert" className="mt-1 text-xs text-red-300">
          Ingresá un importe válido con hasta dos decimales.
        </p>
      )}
    </div>
  );
}
