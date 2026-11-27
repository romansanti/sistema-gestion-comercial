import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MotoParts & Ruta 9 — Repuestos y Lubricantes",
  description: "Sistema Integral de Mostrador de MotoParts & Ruta 9.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
