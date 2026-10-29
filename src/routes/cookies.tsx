import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => legalHead("Política de cookies", "Aquí Bonela no usa cookies de analítica ni de publicidad."),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalPage title="Política de cookies">
      <p>
        Aquí Bonela <strong>no utiliza cookies de analítica, publicidad ni seguimiento</strong>, por eso no te
        mostramos ningún aviso para aceptarlas.
      </p>

      <h2>Almacenamiento técnico</h2>
      <p>
        Solo cuando una persona administradora inicia sesión en el panel, el navegador guarda la sesión para mantenerla
        conectada. Es un almacenamiento estrictamente necesario, exento de consentimiento, y los visitantes del
        directorio no lo generan.
      </p>

      <h2>Enlaces externos</h2>
      <p>
        Al abrir WhatsApp o un mapa desde una ficha sales de esta web; esos servicios aplican sus propias políticas.
      </p>

      <h2>Cambios</h2>
      <p>Si en el futuro añadimos otro tipo de cookies, actualizaremos esta página y pediremos tu consentimiento.</p>
    </LegalPage>
  );
}
