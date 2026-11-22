import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const cuerpo = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-body", display: "swap" });
const titulos = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-display", display: "swap" });

const descripcion = "En qué gastan su presupuesto Madrid y Cataluña: gasto liquidado por políticas, por habitante, con los datos oficiales del Ministerio de Hacienda.";

export const metadata: Metadata = {
  title: "Presupuestos por comunidades",
  description: descripcion,
  openGraph: { title: "Madrid y Cataluña: ¿en qué gastan su presupuesto?", description: descripcion, locale: "es_ES", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${cuerpo.variable} ${titulos.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
