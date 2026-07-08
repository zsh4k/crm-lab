// Set de íconos propios del CRM (no librería, no emoji). Line-art 24×24 con
// stroke=currentColor (heredan el color del nav) + el rombo ◆ del logo como
// motivo común que une el set. El rombo va relleno (fill=currentColor).

const SVG = (props: { children: preact.ComponentChildren }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    {props.children}
  </svg>
);

// Inicio — casa con el rombo de marca como puerta.
export const IconInicio = () => (
  <SVG>
    <path d="M3.5 11.5L12 4l8.5 7.5" />
    <path d="M5.5 10v9.5h13V10" />
    <path d="M12 13l2 2-2 2-2-2z" fill="currentColor" stroke="none" />
  </SVG>
);

// Agenda — calendario con el rombo marcando "hoy".
export const IconAgenda = () => (
  <SVG>
    <rect x="3" y="5" width="18" height="15" rx="2.5" />
    <path d="M3 9.5h18" />
    <path d="M7.5 3v3M16.5 3v3" />
    <path d="M12 12.5l2 2-2 2-2-2z" fill="currentColor" stroke="none" />
  </SVG>
);

// Clientes — dos figuras (cliente + prospecto).
export const IconClientes = () => (
  <SVG>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" />
    <circle cx="17" cy="9" r="2.2" />
    <path d="M16 14.2c2.4.2 4 2 4 4.8" />
  </SVG>
);

// Pipeline — barras crecientes con el rombo coronando la más alta.
export const IconPipeline = () => (
  <SVG>
    <path d="M4 20.5h16" />
    <rect x="5.5" y="13" width="3" height="7" rx="0.8" />
    <rect x="10.5" y="9" width="3" height="11" rx="0.8" />
    <rect x="15.5" y="5.8" width="3" height="14.2" rx="0.8" />
    <path d="M17 1l1.5 1.5L17 4l-1.5-1.5z" fill="currentColor" stroke="none" />
  </SVG>
);

// Inventario — caja 3D (paquete) con el rombo como etiqueta en la cara frontal.
export const IconInventario = () => (
  <SVG>
    <path d="M12 2.8l8.2 4.6v9.2L12 21.2 3.8 16.6V7.4z" />
    <path d="M3.9 7.5l8.1 4.6 8.1-4.6" />
    <path d="M12 12.1v9" />
    <path d="M8.4 12l1.6 1.6-1.6 1.6-1.6-1.6z" fill="currentColor" stroke="none" />
  </SVG>
);

// Pedidos — recibo/nota con el rombo de marca como sello.
export const IconPedidos = () => (
  <SVG>
    <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" />
    <path d="M9 8h6M9 11.5h6" />
    <path d="M12 14.4l1.6 1.6-1.6 1.6-1.6-1.6z" fill="currentColor" stroke="none" />
  </SVG>
);

// Configuraciones — engrane con el rombo de marca en el núcleo.
export const IconConfig = () => (
  <SVG>
    <path d="M12 2.6l1.7 1.2 2-.6.9 1.9 2 .6-.1 2.1 1.6 1.3-1 1.8 1 1.8-1.6 1.3.1 2.1-2 .6-.9 1.9-2-.6L12 21.4l-1.7-1.2-2 .6-.9-1.9-2-.6.1-2.1L3.9 14.7l1-1.8-1-1.8 1.6-1.3-.1-2.1 2-.6.9-1.9 2 .6z" />
    <path d="M12 9.4l2.6 2.6L12 14.6 9.4 12z" fill="currentColor" stroke="none" />
  </SVG>
);

// Campana — recordatorios, con el rombo de marca como badana del badajo.
export const IconCampana = () => (
  <SVG>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.4 2H4.6z" />
    <path d="M12 3.4V1.9" />
    <path d="M10.1 19.3a2 2 0 0 0 3.8 0" />
    <path d="M12 11.6l1.6 1.6-1.6 1.6-1.6-1.6z" fill="currentColor" stroke="none" />
  </SVG>
);
