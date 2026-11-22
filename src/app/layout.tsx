import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const cuerpo = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-body", display: "swap" });
const titulos = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-display", display: "swap" });

const descripcion = "En qué gastan su presupuesto Madrid y Cataluña: gasto liquidado por políticas, por habitante, con los datos oficiales del Ministerio de Hacienda.";

export const metadata: Metadata = {
  // Dirección prevista en Vercel; cambiarla si el proyecto se publica con otro nombre.
  metadataBase: new URL("https://presupuestos-ccaa.vercel.app"),
  title: "Presupuestos por comunidades",
  description: descripcion,
  // Vista previa al compartir: public/og.png (1200x630, captura de la cabecera de la página)
  openGraph: {
    title: "Madrid y Cataluña: ¿en qué gastan su presupuesto?", description: descripcion, url: "/", siteName: "Presupuestos por comunidades",
    locale: "es_ES", type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Gasto por habitante de Madrid y Cataluña con los datos de Hacienda" }],
  },
  twitter: { card: "summary_large_image", title: "Madrid y Cataluña: ¿en qué gastan su presupuesto?", description: descripcion, images: ["/og.png"] },
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
