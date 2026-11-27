import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MotoParts & Ruta 9 — Repuestos y Lubricantes",
  description: "Sistema Integral de Mostrador de MotoParts & Ruta 9.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>
        {children}
        <footer className="no-print fixed bottom-2 right-3 z-50 rounded-md border bg-background/90 px-2.5 py-1.5 text-right text-[11px] leading-tight text-muted-foreground shadow-sm backdrop-blur">
          <div>63307 Román Santiago</div>
          <div>63310 Carobbio Tiziano</div>
          <div>63633 Barroca Nahuel</div>
        </footer>
      </body>
    </html>
  );
}
