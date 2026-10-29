import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, OWNER, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/privacidad")({
  head: () => legalHead("Política de privacidad", "Cómo trata Aquí Bonela los datos de los negocios y de quienes envían avisos o sugerencias."),
  component: Privacidad,
});

function Privacidad() {
  return (
    <LegalPage title="Política de privacidad">
      <h2>Responsable del tratamiento</h2>
      <p>
        {OWNER.name} ({OWNER.nif}), {OWNER.address}. Contacto: {OWNER.email}.
      </p>

      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Datos de los negocios:</strong> nombre, actividad, contacto, dirección, horario y fotos, para
          publicar su ficha en el directorio. Los datos de contacto internos (nombre del titular, teléfono o email
          privados) solo los ve la administración y no se publican.
        </li>
        <li>
          <strong>Avisos «¿Algo no es correcto?»:</strong> el mensaje que escribas, para corregir la ficha.
        </li>
        <li>
          <strong>Sugerencias:</strong> el nombre del negocio, tu contacto (opcional) y tu mensaje, para valorar su
          inclusión y, si lo indicas, contactarte.
        </li>
      </ul>

      <h2>Base legal</h2>
      <ul>
        <li>Fichas: el consentimiento del titular, que autoriza expresamente qué datos se publican mediante su enlace privado de revisión.</li>
        <li>Avisos y sugerencias: tu consentimiento al enviarlos y el interés legítimo en mantener el directorio correcto.</li>
      </ul>

      <h2>Conservación</h2>
      <p>
        Los datos de cada ficha se conservan mientras esté publicada o hasta que su titular pida la baja. Los avisos y
        sugerencias se eliminan una vez gestionados, y como máximo al año.
      </p>

      <h2>Destinatarios</h2>
      <p>
        No cedemos datos a terceros. Usamos proveedores de alojamiento y base de datos que actúan como encargados del
        tratamiento con garantías adecuadas. Al pulsar llamar o WhatsApp en una ficha, el contacto se hace
        directamente desde tu teléfono con el negocio.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes pedir acceso, rectificación, supresión, oposición, limitación o portabilidad de tus datos, y retirar tu
        consentimiento en cualquier momento, escribiendo a {OWNER.email}. Si no quedas satisfecho, puedes reclamar
        ante la Agencia Española de Protección de Datos (aepd.es).
      </p>
    </LegalPage>
  );
}
