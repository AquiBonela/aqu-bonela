import { Text, useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => legalHead("Política de cookies", "Aquí Bonela no usa cookies de analítica ni de publicidad."),
  component: Cookies,
});

function Cookies() {
  const { tr, locale } = useI18n();
  return (
    <LegalPage title={tr("Política de cookies")}>
      <p>
        Aquí Bonela <strong><Text text="no utiliza cookies de analítica, publicidad ni seguimiento" /></strong><Text text=", por eso no te mostramos ningún aviso para aceptarlas." /> </p>

      <h2><Text text="Almacenamiento técnico" /></h2>
      <p>
         <Text text="Solo cuando una persona administradora inicia sesión en el panel, el navegador guarda la sesión para mantenerla conectada. Es un almacenamiento estrictamente necesario, exento de consentimiento, y los visitantes del directorio no lo generan." /> </p>

      <h2><Text text="Enlaces externos" /></h2>
      <p>
         <Text text="Al abrir WhatsApp o un mapa desde una ficha sales de esta web; esos servicios aplican sus propias políticas." /> </p>

      <h2><Text text="Cambios" /></h2>
      <p><Text text="Si en el futuro añadimos otro tipo de cookies, actualizaremos esta página y pediremos tu consentimiento." /></p>
    </LegalPage>
  );
}
