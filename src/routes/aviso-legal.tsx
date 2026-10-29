import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, OWNER, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/aviso-legal")({
  head: () => legalHead("Aviso legal", "Datos del titular y condiciones de uso del directorio Aquí Bonela de Casarabonela."),
  component: AvisoLegal,
});

function AvisoLegal() {
  return (
    <LegalPage title="Aviso legal">
      <h2>Titular del sitio</h2>
      <p>
        En cumplimiento de la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI-CE), se informa de que
        este sitio web es titularidad de:
      </p>
      <ul>
        <li>Titular: {OWNER.name}</li>
        <li>NIF/CIF: {OWNER.nif}</li>
        <li>Dirección: {OWNER.address}</li>
        <li>Email: {OWNER.email}</li>
      </ul>

      <h2>Objeto</h2>
      <p>
        Aquí Bonela es un directorio gratuito de comercios y profesionales de Casarabonela. Su finalidad es facilitar
        que vecinos y visitantes encuentren servicios locales y contacten directamente con ellos.
      </p>

      <h2>Contenido de las fichas</h2>
      <p>
        Cada ficha se elabora con su titular y solo se publica cuando este la revisa y autoriza. Los datos publicados
        (teléfono, dirección, horarios, fotos…) son responsabilidad de cada negocio. Aquí Bonela no interviene en la
        relación comercial entre visitantes y negocios ni garantiza sus productos o servicios.
      </p>
      <p>
        Si detectas un dato incorrecto, usa el botón «¿Algo no es correcto?» de la ficha y lo revisaremos.
      </p>

      <h2>Uso del sitio</h2>
      <p>
        Queda prohibido utilizar los datos del directorio para enviar publicidad no solicitada o para cualquier fin
        distinto de contactar con el negocio por el servicio que ofrece.
      </p>

      <h2>Propiedad intelectual</h2>
      <p>
        El diseño y los textos del sitio pertenecen a su titular. Las fotos y logotipos de cada ficha pertenecen a sus
        negocios, que autorizan su uso en este directorio.
      </p>

      <h2>Legislación aplicable</h2>
      <p>Este aviso se rige por la legislación española.</p>
    </LegalPage>
  );
}
