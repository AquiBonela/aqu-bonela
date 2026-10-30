import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, useOwner, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/aviso-legal")({
  head: () => legalHead("Aviso legal", "Datos del titular y condiciones de uso de Aquí Bonela, plataforma independiente de Casarabonela."),
  component: AvisoLegal,
});

function AvisoLegal() {
  const OWNER = useOwner();
  return (
    <LegalPage title="Aviso legal">
      <h2>1. Titular del sitio web</h2>
      <p>
        En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio
        Electrónico (LSSI-CE), se informa de los siguientes datos:
      </p>
      <ul>
        <li><strong>Titular:</strong> {OWNER.name}</li>
        <li><strong>NIF:</strong> {OWNER.nif}</li>
        <li><strong>Domicilio:</strong> {OWNER.address}</li>
        <li><strong>Correo electrónico:</strong> {OWNER.email}</li>
      </ul>
      <p>Aquí Bonela es una iniciativa privada gestionada por su titular como persona física.</p>

      <h2>2. Objeto y finalidad</h2>
      <p>
        Aquí Bonela es una plataforma digital independiente dedicada a Casarabonela (Málaga), cuyo objetivo es reunir,
        organizar y facilitar el acceso a información de interés sobre el municipio.
      </p>
      <p>La plataforma incluye, entre otros contenidos:</p>
      <ul>
        <li>Comercios, profesionales y servicios públicos.</li>
        <li>Asociaciones y colectivos.</li>
        <li>Lugares de interés, turismo y rutas.</li>
        <li>Noticias, actividades y eventos.</li>
        <li>Anuncios de compraventa, alquileres y empleo.</li>
        <li>Otra información de utilidad para vecinos y visitantes.</li>
      </ul>
      <p>
        Aquí Bonela no es una página web oficial del Ayuntamiento de Casarabonela ni representa a ninguna administración
        pública.
      </p>

      <h2>3. Condiciones de utilización</h2>
      <p>El acceso y la navegación por Aquí Bonela implican la aceptación de las condiciones recogidas en este aviso legal.</p>
      <p>
        El usuario se compromete a utilizar la plataforma de forma responsable, respetando la legislación vigente y los
        derechos de terceros.
      </p>
      <p>
        Queda prohibido utilizar la información publicada para actividades ilícitas, fraudulentas, difamatorias o que
        puedan perjudicar a otras personas.
      </p>
      <p>
        Asimismo, queda prohibido utilizar los datos del directorio para enviar comunicaciones comerciales no solicitadas
        o realizar actividades de recopilación masiva de información.
      </p>

      <h2>4. Contenidos y funcionamiento de la plataforma</h2>
      <p>
        Aquí Bonela reúne información procedente de distintas fuentes, incluyendo datos públicos, información facilitada
        por negocios, profesionales, asociaciones, particulares y otras entidades.
      </p>
      <p>
        Los contenidos enviados por terceros son revisados antes de su publicación. Aquí Bonela podrá aceptar, modificar,
        solicitar aclaraciones o rechazar cualquier propuesta.
      </p>
      <p>
        La revisión previa tiene como finalidad procurar que la información publicada sea adecuada, clara y útil. No
        supone una garantía absoluta de exactitud, integridad o actualización permanente.
      </p>
      <p>
        El titular de la plataforma podrá corregir, actualizar, suspender o retirar contenidos cuando lo considere
        necesario.
      </p>

      <h2>5. Contenidos aportados por terceros</h2>
      <p>
        Las personas que envíen información, fotografías, carteles, anuncios, noticias o cualquier otro material para su
        publicación declaran que están autorizadas para facilitar dicho contenido y que su utilización no vulnera
        derechos de terceros.
      </p>
      <p>
        Al enviar material, el remitente autoriza a Aquí Bonela a utilizarlo, reproducirlo y mostrarlo en la plataforma
        exclusivamente para gestionar, publicar y difundir el contenido enviado, respetando su finalidad y los derechos
        correspondientes.
      </p>
      <p>
        Esta autorización no implica una cesión de propiedad intelectual ni permite utilizar el material para
        finalidades ajenas a la plataforma sin el consentimiento correspondiente.
      </p>
      <p>
        Los remitentes deberán evitar el envío de contenidos ilícitos, engañosos, ofensivos, discriminatorios o que
        vulneren derechos de otras personas.
      </p>
      <p>Aquí Bonela se reserva el derecho de no publicar o retirar cualquier contenido que incumpla estas condiciones.</p>

      <h2>6. Información de negocios, profesionales y servicios</h2>
      <p>
        La información de comercios, profesionales, servicios públicos, asociaciones y otras entidades tiene como
        finalidad facilitar su localización y contacto.
      </p>
      <p>Los responsables de los negocios y entidades podrán solicitar la corrección o actualización de sus datos.</p>
      <p>
        Aquí Bonela no participa en las relaciones comerciales o profesionales que puedan establecerse entre los usuarios
        y los negocios anunciados, ni garantiza la calidad, disponibilidad, precios o resultados de los productos y
        servicios ofrecidos por terceros.
      </p>
      <p>La información publicada deberá entenderse como orientativa y podrá estar sujeta a cambios.</p>

      <h2>7. Anuncios y clasificados</h2>
      <p>
        Los anuncios de compraventa, alquileres, empleo y otros servicios publicados en Aquí Bonela son facilitados por
        terceros.
      </p>
      <p>
        Aquí Bonela actúa como espacio de difusión de dichos anuncios y no interviene en las operaciones, negociaciones,
        pagos o acuerdos que puedan establecerse entre las partes.
      </p>
      <p>
        Los usuarios deberán comprobar por sus propios medios la veracidad de la información, la identidad de los
        anunciantes y las condiciones de cualquier operación antes de llegar a un acuerdo.
      </p>
      <p>La publicación de un anuncio no supone que Aquí Bonela certifique su autenticidad o garantice la operación.</p>

      <h2>8. Propiedad intelectual e industrial</h2>
      <p>
        El diseño, la estructura, los elementos gráficos propios, los textos originales y demás contenidos creados
        específicamente para Aquí Bonela están protegidos por la normativa de propiedad intelectual e industrial.
      </p>
      <p>
        Queda prohibida su reproducción, distribución o utilización sin la autorización correspondiente, salvo en los
        casos permitidos legalmente.
      </p>
      <p>
        Los nombres comerciales, marcas, fotografías, logotipos, carteles y demás materiales pertenecientes a terceros
        mantienen los derechos de sus respectivos titulares.
      </p>
      <p>Su publicación en Aquí Bonela no implica la adquisición de dichos derechos por parte de la plataforma.</p>

      <h2>9. Enlaces externos</h2>
      <p>
        Aquí Bonela puede incluir enlaces a páginas web, servicios o plataformas de terceros con el propósito de facilitar
        información adicional.
      </p>
      <p>
        El titular no controla dichos sitios externos ni se responsabiliza de sus contenidos, disponibilidad, políticas o
        condiciones de uso.
      </p>
      <p>
        La inclusión de un enlace no implica necesariamente una relación, colaboración o recomendación por parte de Aquí
        Bonela.
      </p>

      <h2>10. Disponibilidad y responsabilidad</h2>
      <p>El titular realizará esfuerzos razonables para mantener la plataforma disponible y sus contenidos actualizados.</p>
      <p>
        No obstante, no garantiza la disponibilidad permanente del servicio ni la ausencia de errores, interrupciones o
        incidencias técnicas.
      </p>
      <p>
        El titular podrá realizar modificaciones, suspender funcionalidades o interrumpir temporalmente el servicio por
        razones técnicas, de mantenimiento o de otra naturaleza.
      </p>
      <p>Nada de lo dispuesto en este aviso limita las responsabilidades que legalmente no puedan excluirse.</p>

      <h2>11. Comunicaciones e incidencias</h2>
      <p>
        Cualquier persona que detecte información incorrecta, contenido presuntamente ilícito, una vulneración de
        derechos o cualquier otra incidencia relacionada con la plataforma podrá comunicarlo a través del correo
        electrónico de contacto o de los formularios habilitados en Aquí Bonela.
      </p>
      <p>
        Las comunicaciones serán revisadas y se adoptarán las medidas que correspondan conforme a la legislación
        aplicable.
      </p>

      <h2>12. Protección de datos personales</h2>
      <p>
        El tratamiento de los datos personales facilitados a través de la plataforma se regula en la correspondiente{" "}
        <a href="/privacidad" className="underline">Política de privacidad</a>, donde se informa sobre el responsable,
        las finalidades, las bases jurídicas, los destinatarios y los derechos de las personas interesadas.
      </p>

      <h2>13. Legislación aplicable</h2>
      <p>Este aviso legal se rige por la legislación española y europea que resulte aplicable.</p>
      <p>
        Para cualquier controversia se estará a lo dispuesto en las normas sobre jurisdicción y competencia que
        correspondan legalmente.
      </p>
    </LegalPage>
  );
}
