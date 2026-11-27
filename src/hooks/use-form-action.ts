"use client";

import { useCallback, useState } from "react";
import type { ActionResult } from "@/lib/action-handler";

type Action<TInput, TResult> = (
  input: TInput,
) => Promise<ActionResult<TResult>>;

export function useFormAction<TInput, TResult>(action: Action<TInput, TResult>) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult<TResult> | null>(null);

  const submit = useCallback(
    async (input: TInput) => {
      setPending(true);
      try {
        const nextResult = await action(input);
        setResult(nextResult);
        return nextResult;
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  const reset = useCallback(() => setResult(null), []);

  return { pending, result, submit, reset };
}
