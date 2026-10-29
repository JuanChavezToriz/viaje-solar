// Node 22+ · Run separately from the website.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const API_VERSION = '1.3';
export const BODY_CODES = {
  mercury: '199', venus: '299', earth: '399', mars: '499',
  jupiter: '599', saturn: '699', uranus: '799', neptune: '899'
};
export const DEMO_CONFIG = {
  bodies: ['earth', 'mars'],
  startUtc: '2026-10-14T18:00:00Z',
  stopUtc: '2026-10-16T18:00:00Z',
  step: '6 h'
};
const DAY_MS = 86400000;
const quote = value => "'" + value + "'";

function calendarUtc(iso) {
  if (!/Z$/.test(iso) || !Number.isFinite(Date.parse(iso))) throw new Error('Usa una fecha ISO explícita en UTC, terminada en Z.');
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19);
}

export function buildHorizonsUrl(body, config = DEMO_CONFIG) {
  if (!BODY_CODES[body]) throw new Error('Planeta no reconocido: ' + body);
  if (Date.parse(config.stopUtc) <= Date.parse(config.startUtc)) throw new Error('La fecha final debe ser posterior a la inicial.');
  const url = new URL('https://ssd.jpl.nasa.gov/api/horizons.api');
  url.search = new URLSearchParams({
    format: 'json', COMMAND: quote(BODY_CODES[body]),
    OBJ_DATA: quote('NO'), MAKE_EPHEM: quote('YES'),
    EPHEM_TYPE: quote('VECTORS'), CENTER: quote('500@10'),
    REF_SYSTEM: quote('ICRF'), REF_PLANE: quote('ECLIPTIC'),
    VEC_CORR: quote('NONE'), OUT_UNITS: quote('AU-D'),
    VEC_TABLE: quote('2'), CSV_FORMAT: quote('YES'), VEC_LABELS: quote('NO'),
    TIME_TYPE: quote('UT'), TIME_DIGITS: quote('SECONDS'),
    START_TIME: quote(calendarUtc(config.startUtc)),
    STOP_TIME: quote(calendarUtc(config.stopUtc)), STEP_SIZE: quote(config.step)
  }).toString();
  return url;
}

export function parseHorizonsVectors(payload) {
  if (payload.error) throw new Error('Horizons: ' + payload.error);
  if (payload.signature?.version !== API_VERSION) {
    throw new Error('Versión de Horizons distinta de ' + API_VERSION + '. Revisa la documentación antes de interpretar los datos.');
  }
  const result = payload.result;
  if (typeof result !== 'string' || !result.includes('$$SOE') || !result.includes('$$EOE')) {
    throw new Error('Horizons no devolvió una tabla de vectores válida.');
  }
  if (!/Center body name:\s*Sun\s*\(10\)/i.test(result)) throw new Error('El origen de los vectores no es el centro del Sol.');
  const table = result.split('$$SOE')[1].split('$$EOE')[0];
  const samples = table.trim().split(/\r?\n/).filter(line => line.trim()).map(line => {
    const fields = line.split(',').map(value => value.trim());
    const values = [fields[0], ...fields.slice(2, 8)].map(value => Number(value?.replace(/[dD]/g, 'E')));
    if (fields.length < 8 || values.some(value => !Number.isFinite(value))) throw new Error('Fila de vectores incompleta o no numérica.');
    const [jdUtc, x, y, z, vx, vy, vz] = values;
    return {
      utc: new Date(Math.round((jdUtc - 2440587.5) * DAY_MS)).toISOString(),
      positionAu: [x, y, z], velocityAuPerDay: [vx, vy, vz]
    };
  });
  if (!samples.length) throw new Error('La tabla de vectores está vacía.');
  for (let i = 1; i < samples.length; i++) {
    if (Date.parse(samples[i].utc) <= Date.parse(samples[i - 1].utc)) throw new Error('Las muestras no están ordenadas por fecha.');
  }
  return samples;
}

export async function downloadEphemerides(config, contact, fetchImpl = fetch) {
  if (!contact || /[\r\n]/.test(contact)) {
    throw new Error('Define HORIZONS_CONTACT con un correo o URL de contacto válido para el User-Agent solicitado por JPL.');
  }
  const data = {
    schema: 1, config, origin: 'Sun center (10)', reference: 'ICRF / Ecliptic J2000',
    timeScale: 'UTC', positionUnits: 'AU', velocityUnits: 'AU/day',
    retrievedAt: new Date().toISOString(), source: 'NASA/JPL Horizons API',
    apiVersion: API_VERSION, bodies: {}
  };
  // JPL requires ONE request at a time. Never change this loop to Promise.all.
  for (const body of config.bodies) {
    const url = buildHorizonsUrl(body, config);
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SolarAtlas-HorizonsDemo/1.0 (contact: ' + contact + ')'
      },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error('JPL devolvió HTTP ' + response.status + '. Reintenta más tarde; no se harán reintentos automáticos.');
    const samples = parseHorizonsVectors(await response.json());
    data.bodies[body] = { horizonsId: BODY_CODES[body], samples };
  }
  return data;
}

async function main() {
  const config = { ...DEMO_CONFIG, bodies: process.argv.includes('--all') ? Object.keys(BODY_CODES) : DEMO_CONFIG.bodies };
  const output = new URL('./horizons-sample.json', import.meta.url);
  if (!process.argv.includes('--refresh')) {
    const cached = await readFile(output, 'utf8').then(JSON.parse).catch(() => null);
    if (cached?.apiVersion === API_VERSION && JSON.stringify(cached.config) === JSON.stringify(config)) {
      console.log('Se reutiliza examples/horizons-sample.json. Para regenerarlo manualmente usa --refresh.');
      return;
    }
  }
  const data = await downloadEphemerides(config, process.env.HORIZONS_CONTACT);
  await writeFile(output, JSON.stringify(data, null, 2) + '\n');
  console.log('Archivo generado: examples/horizons-sample.json');
  console.log('Planetas: ' + Object.keys(data.bodies).join(', ') + ' · UTC: ' + config.startUtc + ' a ' + config.stopUtc);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
