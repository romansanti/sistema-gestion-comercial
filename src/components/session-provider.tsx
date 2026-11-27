"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { UsuarioSesion } from "@/lib/session";

const SessionContext = createContext<UsuarioSesion | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: UsuarioSesion;
  children: ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    function redirectToLogin() {
      router.push("/login");
      router.refresh();
    }

    window.addEventListener("session-expired", redirectToLogin);
    return () => window.removeEventListener("session-expired", redirectToLogin);
  }, [router]);

  return (
    <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession debe utilizarse dentro de SessionProvider.");
  }
  return session;
}
