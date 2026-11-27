// Comprueba que la instancia demo no muestra datos del municipio piloto.
// Requiere un build de la demo como servidor Node (NITRO_PRESET=node-server).
// Arranca un Supabase simulado que devuelve listas vacías, visita las rutas
// públicas y busca términos del piloto en el HTML. No usa ninguna base real.
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

const SERVER_ENTRY = ".output/server/index.mjs";
const CLIENT_DIR = ".output/public";
const SUPABASE_PORT = 54321;
const APP_PORT = 3999;
const BASE = `http://127.0.0.1:${APP_PORT}`;

/** Términos del piloto. Mantener alineado con src/config/demo-instance.test.ts. */
const PILOT_TERMS = /casarabonela|bonela|m[aá]laga|alozaina|sierra de las nieves|guadalhorce|punto vuela|l[ií]nea verde|buenavista|federico muñoz|cuatro esquinas|952\s?\d{3}\s?\d{3}|36\.786/gi;
/** Variables de marca sin sustituir. */
const RAW_VARIABLES = /\{(app|municipio|nombreCorto|provincia)\}/g;

const PAGES = ["/", "/directorio", "/servicios-publicos", "/tramites", "/sobre", "/sugerir", "/aviso-legal", "/privacidad", "/cookies", "/auth", `/revision/${"a".repeat(50)}`, "/vida-diaria", "/manifest.webmanifest", "/robots.txt"];
const NOT_FOUND = ["/descubre", "/vida-diaria/transporte", "/punto-vuela", "/comercios/no-existe"];

if (!existsSync(SERVER_ENTRY)) {
  console.error(`No existe ${SERVER_ENTRY}: el build de la demo debe hacerse con NITRO_PRESET=node-server.`);
  process.exit(1);
}

// Supabase simulado: datos vacíos, sin sesión ni archivos.
const supabase = createServer((req, res) => {
  const json = (status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.url?.startsWith("/rest/v1/")) return json(200, []);
  if (req.url?.startsWith("/auth/v1/")) return json(200, {});
  return json(404, { message: "not found" });
}).listen(SUPABASE_PORT, "127.0.0.1");

const app = spawn(process.execPath, [SERVER_ENTRY], {
  env: { ...process.env, PORT: String(APP_PORT), HOST: "127.0.0.1", NITRO_PORT: String(APP_PORT), NITRO_HOST: "127.0.0.1" },
  stdio: ["ignore", "inherit", "inherit"],
});

const stop = (code) => { app.kill(); supabase.close(); process.exit(code); };

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(`${BASE}/robots.txt`); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  throw new Error("El servidor de la demo no arrancó.");
}

function findings(text, re) {
  return [...new Set([...text.matchAll(re)].map((m) => m[0]))];
}

try {
  await waitForServer();
  const errors = [];
  for (const path of PAGES) {
    const res = await fetch(BASE + path);
    const body = await res.text();
    const leaks = findings(body, PILOT_TERMS);
    const raw = findings(body, RAW_VARIABLES);
    console.log(`${res.status} ${path}${leaks.length ? ` | piloto: ${leaks.join(", ")}` : ""}${raw.length ? ` | sin sustituir: ${raw.join(", ")}` : ""}`);
    if (res.status >= 400) errors.push(`${path}: estado ${res.status}`);
    if (leaks.length) errors.push(`${path}: ${leaks.join(", ")}`);
    if (raw.length) errors.push(`${path}: variables sin sustituir ${raw.join(", ")}`);
  }
  // Archivos públicos de la instancia (favicon, iconos, manifest, robots.txt): deben servirse tal cual.
  const PUBLIC_DIR = "instances/demo/public";
  for (const file of readdirSync(PUBLIC_DIR)) {
    const res = await fetch(`${BASE}/${file}`);
    const same = Buffer.from(await res.arrayBuffer()).equals(readFileSync(join(PUBLIC_DIR, file)));
    console.log(`${res.status} /${file} (archivo público)${same ? "" : " | distinto del de " + PUBLIC_DIR}`);
    if (res.status !== 200 || !same) errors.push(`/${file}: no se sirve el archivo de ${PUBLIC_DIR}`);
  }
  for (const path of NOT_FOUND) {
    const res = await fetch(BASE + path);
    const body = await res.text();
    const leaks = findings(body, PILOT_TERMS);
    console.log(`${res.status} ${path} (debe no existir)${leaks.length ? ` | piloto: ${leaks.join(", ")}` : ""}`);
    if (res.status !== 404) errors.push(`${path}: debía devolver 404 y devolvió ${res.status}`);
    if (leaks.length) errors.push(`${path}: ${leaks.join(", ")}`);
  }

  // Informativo: los diccionarios comunes aún viajan en el JavaScript.
  const files = [];
  const walk = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) e.isDirectory() ? walk(join(dir, e.name)) : files.push(join(dir, e.name)); };
  walk(CLIENT_DIR);
  let total = 0;
  const perFile = [];
  for (const f of files.filter((f) => /\.(js|css|html|json|webmanifest)$/.test(f))) {
    const n = [...readFileSync(f, "utf8").matchAll(PILOT_TERMS)].length;
    if (n) { total += n; perFile.push([n, f]); }
  }
  console.log(`\nInformativo: ${total} apariciones de términos del piloto en ${perFile.length} archivos del cliente.`);
  for (const [n, f] of perFile.sort((a, b) => b[0] - a[0]).slice(0, 10)) console.log(`  ${n}\t${f}`);

  if (errors.length) {
    console.error(`\nLa demo muestra datos del piloto o páginas incorrectas:\n- ${errors.join("\n- ")}`);
    stop(1);
  }
  console.log("\nDemo sin referencias visibles al municipio piloto.");
  stop(0);
} catch (error) {
  console.error(error);
  stop(1);
}
