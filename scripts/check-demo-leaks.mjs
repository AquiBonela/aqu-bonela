// Comprueba que la instancia demo no muestra datos del municipio piloto y que la
// identidad se lee de Supabase en tiempo de ejecución, con respaldo si no responde.
// Requiere un build de la demo como servidor Node (NITRO_PRESET=node-server).
// Arranca un Supabase simulado (nunca una base real), visita las rutas públicas y
// revisa el HTML. Escenario en LEAK_SCENARIO:
//   vacio     (por defecto) site_config() sin datos: valores compilados de la demo.
//   identidad site_config() devuelve otra identidad: debe verse sin desplegar.
//   caido     site_config() no responde: páginas en tiempo razonable con los valores compilados.
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

const SERVER_ENTRY = ".output/server/index.mjs";
const CLIENT_DIR = ".output/public";
const SUPABASE_PORT = 54321;
const SCENARIO = process.env.LEAK_SCENARIO || "vacio";
const APP_PORT = { vacio: 3999, identidad: 3998, caido: 3997 }[SCENARIO];
const BASE = `http://127.0.0.1:${APP_PORT}`;

/** Términos del piloto. Mantener alineado con src/config/demo-instance.test.ts. */
const PILOT_TERMS =
  /casarabonela|bonela|m[aá]laga|alozaina|sierra de las nieves|guadalhorce|punto vuela|l[ií]nea verde|buenavista|federico muñoz|cuatro esquinas|952\s?\d{3}\s?\d{3}|36\.786/gi;
/** Variables de marca sin sustituir. */
const RAW_VARIABLES = /\{(app|municipio|nombreCorto|provincia)\}/g;

/** Valores compilados de la demo (instances/demo/config.ts). */
const DEMO_VALUES = ["Conecta tu Pueblo Demo", "Municipio de ejemplo", "Provincia de ejemplo"];
/** Identidad que devuelve el Supabase simulado en el escenario «identidad». */
const TEST_IDENTITY = {
  app_name: "Plataforma Ensayo",
  short_name: "Ensayo",
  municipality_name: "Villa Ensayo",
  province: "Provincia Ensayo",
  region: "",
  autonomous_community: "",
  demonym_masculine: "",
  demonym_feminine: "",
  site_url: "https://villa-ensayo.example.org",
  town_hall_name: "",
  town_hall_address: "",
  town_hall_phone: "",
  town_hall_website: "",
  latitude: null,
  longitude: null,
  timezone: "",
  updated_at: "2026-11-27T00:00:00Z",
};
/** Fila recién creada por la migración: todo vacío. */
const EMPTY_IDENTITY = Object.fromEntries(
  Object.entries(TEST_IDENTITY).map(([k, v]) => [
    k,
    typeof v === "string" && k !== "updated_at" ? "" : v,
  ]),
);

const PAGES = [
  "/",
  "/directorio",
  "/servicios-publicos",
  "/tramites",
  "/sobre",
  "/sugerir",
  "/aviso-legal",
  "/privacidad",
  "/cookies",
  "/auth",
  `/revision/${"a".repeat(50)}`,
  "/vida-diaria",
  "/manifest.webmanifest",
  "/robots.txt",
];
const NOT_FOUND = ["/descubre", "/vida-diaria/transporte", "/punto-vuela", "/comercios/no-existe"];
/** Con Supabase caído cada página debe responder sin esperar indefinidamente (corte de 1,5 s). */
const MAX_PAGE_MS = 4_000;

if (!APP_PORT) {
  console.error(`Escenario desconocido: ${SCENARIO}`);
  process.exit(1);
}
if (!existsSync(SERVER_ENTRY)) {
  console.error(
    `No existe ${SERVER_ENTRY}: el build de la demo debe hacerse con NITRO_PRESET=node-server.`,
  );
  process.exit(1);
}

// Supabase simulado: datos vacíos, sin sesión ni archivos; site_config() según el escenario.
let siteConfigCalls = 0;
/** Consultas a la tabla listings: la web pública solo debe leer la vista public_listings. */
const listingsTableRequests = [];
const supabase = createServer((req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.url?.startsWith("/rest/v1/rpc/site_config")) {
    siteConfigCalls++;
    if (SCENARIO === "caido")
      return void setTimeout(() => {
        if (!res.writableEnded && !res.destroyed) json(200, { identity: TEST_IDENTITY });
      }, 10_000);
    return json(200, { identity: SCENARIO === "identidad" ? TEST_IDENTITY : EMPTY_IDENTITY });
  }
  if (/^\/rest\/v1\/listings(\?|\/|$)/.test(req.url ?? "")) listingsTableRequests.push(req.url);
  if (req.url?.startsWith("/rest/v1/")) return json(200, []);
  if (req.url?.startsWith("/auth/v1/")) return json(200, {});
  return json(404, { message: "not found" });
}).listen(SUPABASE_PORT, "127.0.0.1");

const app = spawn(process.execPath, [SERVER_ENTRY], {
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    HOST: "127.0.0.1",
    NITRO_PORT: String(APP_PORT),
    NITRO_HOST: "127.0.0.1",
  },
  stdio: ["ignore", "inherit", "inherit"],
});

const stop = (code) => {
  app.kill();
  supabase.closeAllConnections?.();
  supabase.close();
  process.exit(code);
};

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/robots.txt`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("El servidor de la demo no arrancó.");
}

function findings(text, re) {
  return [...new Set([...text.matchAll(re)].map((m) => m[0]))];
}

/** Comprobaciones de identidad según el escenario, solo en páginas HTML (no en archivos públicos estáticos). */
function identityErrors(path, body) {
  if (!body.includes("window.__SITE_CONFIG__=")) return [`${path}: falta window.__SITE_CONFIG__`];
  // Lo que se renderiza, sin los scripts (que también llevan la configuración serializada).
  const visible = body.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  if (SCENARIO === "identidad") {
    const errors = [];
    if (!visible.includes(TEST_IDENTITY.app_name))
      errors.push(`${path}: no muestra el nombre leído de Supabase`);
    const stale = DEMO_VALUES.filter((v) => body.includes(v));
    if (stale.length)
      errors.push(`${path}: sigue mostrando valores compilados (${stale.join(", ")})`);
    return errors;
  }
  // vacio y caido: se usan los valores compilados de la demo.
  return visible.includes(DEMO_VALUES[0])
    ? []
    : [`${path}: no muestra el nombre compilado de la demo`];
}

try {
  await waitForServer();
  console.log(`Escenario: ${SCENARIO}`);
  const errors = [];
  for (const path of PAGES) {
    const started = Date.now();
    const res = await fetch(BASE + path);
    const body = await res.text();
    const ms = Date.now() - started;
    const leaks = findings(body, PILOT_TERMS);
    const raw = findings(body, RAW_VARIABLES);
    const html = (res.headers.get("content-type") ?? "").includes("text/html");
    const identity = html ? identityErrors(path, body) : [];
    console.log(
      `${res.status} ${path} ${ms} ms${leaks.length ? ` | piloto: ${leaks.join(", ")}` : ""}${raw.length ? ` | sin sustituir: ${raw.join(", ")}` : ""}${identity.length ? ` | ${identity.join("; ")}` : ""}`,
    );
    if (res.status >= 400) errors.push(`${path}: estado ${res.status}`);
    if (leaks.length) errors.push(`${path}: ${leaks.join(", ")}`);
    if (raw.length) errors.push(`${path}: variables sin sustituir ${raw.join(", ")}`);
    errors.push(...identity);
    if (ms > MAX_PAGE_MS) errors.push(`${path}: tardó ${ms} ms (máximo ${MAX_PAGE_MS})`);
  }
  // Archivos públicos de la instancia (favicon, iconos, manifest, robots.txt): deben servirse tal cual.
  const PUBLIC_DIR = "instances/demo/public";
  for (const file of readdirSync(PUBLIC_DIR)) {
    const res = await fetch(`${BASE}/${file}`);
    const same = Buffer.from(await res.arrayBuffer()).equals(readFileSync(join(PUBLIC_DIR, file)));
    console.log(
      `${res.status} /${file} (archivo público)${same ? "" : " | distinto del de " + PUBLIC_DIR}`,
    );
    if (res.status !== 200 || !same)
      errors.push(`/${file}: no se sirve el archivo de ${PUBLIC_DIR}`);
  }
  for (const path of NOT_FOUND) {
    const res = await fetch(BASE + path);
    const body = await res.text();
    const leaks = findings(body, PILOT_TERMS);
    console.log(
      `${res.status} ${path} (debe no existir)${leaks.length ? ` | piloto: ${leaks.join(", ")}` : ""}`,
    );
    if (res.status !== 404) errors.push(`${path}: debía devolver 404 y devolvió ${res.status}`);
    if (leaks.length) errors.push(`${path}: ${leaks.join(", ")}`);
  }
  // La caché evita una consulta por página: en un recorrido de pocos segundos bastan muy pocas.
  console.log(`Consultas a site_config(): ${siteConfigCalls}`);
  if (siteConfigCalls === 0) errors.push("El servidor no consultó site_config()");
  if (listingsTableRequests.length)
    errors.push(
      `La web consultó la tabla listings en lugar de public_listings: ${listingsTableRequests.join(", ")}`,
    );
  if (siteConfigCalls > 3)
    errors.push(`Demasiadas consultas a site_config() (${siteConfigCalls}): la caché no funciona`);

  if (SCENARIO === "vacio") {
    // Informativo: los diccionarios comunes aún viajan en el JavaScript.
    const files = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true }))
        e.isDirectory() ? walk(join(dir, e.name)) : files.push(join(dir, e.name));
    };
    walk(CLIENT_DIR);
    let total = 0;
    const perFile = [];
    for (const f of files.filter((f) => /\.(js|css|html|json|webmanifest)$/.test(f))) {
      const n = [...readFileSync(f, "utf8").matchAll(PILOT_TERMS)].length;
      if (n) {
        total += n;
        perFile.push([n, f]);
      }
    }
    console.log(
      `\nInformativo: ${total} apariciones de términos del piloto en ${perFile.length} archivos del cliente.`,
    );
    for (const [n, f] of perFile.sort((a, b) => b[0] - a[0]).slice(0, 10))
      console.log(`  ${n}\t${f}`);
  }

  if (errors.length) {
    console.error(`\nEscenario «${SCENARIO}» con errores:\n- ${errors.join("\n- ")}`);
    stop(1);
  }
  console.log(`\nEscenario «${SCENARIO}» correcto.`);
  stop(0);
} catch (error) {
  console.error(error);
  stop(1);
}
