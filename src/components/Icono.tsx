/** Iconos sencillos de trazo (24×24) para áreas y políticas de gasto. Dibujos propios. */
const TRAZOS: Record<string, string> = {
  escudo: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z",
  personas: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 1 0 0-5M16 14.2c2.9.4 5 2.8 5 5.8",
  corazon: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  grafico: "M4 20V11M10 20V5M16 20v-7M21 20H3",
  edificio: "M3 9.5L12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20.5h18",
  cruz: "M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z",
  libro: "M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14",
  musica: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  balanza: "M12 3v18M7 21h10M4 7h16M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z",
  globo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9M12 3C9.5 5.5 8.2 8.5 8.2 12s1.3 6.5 3.8 9",
  maletin: "M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18",
  casa: "M3 11l9-7 9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5",
  hoja: "M5 20c0-9 6-15 15-15 0 9-6 15-15 15zM5 20l8-8",
  fabrica: "M3 20V10l6 4v-4l6 4V5h5v15zM3 20h18",
  bolsa: "M5 8h14l-1.2 12H6.2zM9 8V7a3 3 0 0 1 6 0v1",
  autobus: "M6 3h12a2 2 0 0 1 2 2v12H4V5a2 2 0 0 1 2-2zM4 11h16M7 17v3M17 17v3M7.5 14h.01M16.5 14h.01",
  puente: "M2 18h20M5 18v-6M19 18v-6M2 12c4-5 16-5 20 0M12 8.3V18",
  matraz: "M9 3h6M10 3v6.5L4.5 19a1.3 1.3 0 0 0 1.1 2h12.8a1.3 1.3 0 0 0 1.1-2L14 9.5V3M7 15h10",
  engranaje: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  calculadora: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01",
  flechas: "M4 8h15l-3.5-3.5M20 16H5l3.5 3.5",
  monedas: "M12 10c3.9 0 7-1.3 7-3s-3.1-3-7-3-7 1.3-7 3 3.1 3 7 3zM5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5",
  reloj: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  mas: "M12 5v14M5 12h14",
};

const POR_PARTIDA: Record<string, string> = {
  "1": "escudo", "2": "personas", "3": "corazon", "4": "grafico", "9": "edificio",
  "11": "balanza", "12": "escudo", "13": "escudo", "14": "globo",
  "21": "reloj", "22": "personas", "23": "personas", "24": "maletin", "25": "maletin", "26": "casa", "29": "personas",
  "31": "cruz", "32": "libro", "33": "musica",
  "41": "hoja", "42": "fabrica", "43": "bolsa", "44": "autobus", "45": "puente", "46": "matraz", "49": "grafico",
  "91": "edificio", "92": "engranaje", "93": "calculadora", "94": "flechas", "95": "monedas",
};

export function Icono({ id, tam = 18 }: { id: string; tam?: number }) {
  const d = TRAZOS[POR_PARTIDA[id] ?? id] ?? TRAZOS.mas;
  return (
    <svg className="icono" width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
