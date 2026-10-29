# Ejemplo de Horizons para Solar / Atlas

## Qué aporta

Horizons puede proporcionar posiciones y velocidades para fechas pasadas y futuras, relativas al origen y marco solicitados. Para la escena se usan vectores geométricos centrados en el Sol y el plano eclíptico J2000. Son efemérides calculadas con incertidumbre; la interpolación y la escala artística añaden sus propias aproximaciones.

La propuesta de interfaz es una fecha dentro de «Ajustes», con «Hoy» como valor inicial. Al elegir otra fecha cambian los planetas. Al reproducir el tiempo, se interpolan datos locales. La introducción conserva el recorrido visual.

## Ejemplo independiente

- `examples/horizons-fetch.mjs`: descarga Tierra y Marte en serie, valida la versión y genera un JSON.
- `examples/horizons-scene.mjs`: interpola posiciones y las adapta a la jerarquía de Three.js actual.
- Intervalo del ejemplo: 14 de octubre de 2026 a las 18:00 UTC hasta el 16 a las 18:00 UTC; una muestra cada seis horas.
- El JSON generado se guarda en `examples/horizons-sample.json`; se reutiliza en la siguiente ejecución.

En PowerShell, desde la raíz del proyecto:

~~~powershell
$env:HORIZONS_CONTACT = 'TU_CORREO_O_URL_DE_CONTACTO'
node examples/horizons-fetch.mjs
~~~

Sustituye el valor por información real de contacto: la política de JPL exige un User-Agent con producto, versión y contacto. No hace falta una API key en esta consulta.

`--all` consulta los ocho planetas, uno tras otro. `--refresh` regenera manualmente el archivo.

## Petición de ejemplo para la Tierra

| Parámetro | Valor |
|---|---|
| COMMAND | 399: centro de la Tierra |
| CENTER | 500@10: centro del Sol |
| EPHEM_TYPE | VECTORS |
| REF_SYSTEM / REF_PLANE | ICRF / ECLIPTIC |
| VEC_CORR | NONE: estado geométrico |
| OUT_UNITS | AU-D: distancias en UA y velocidades en UA/día |
| VEC_TABLE | 2: posición y velocidad |
| TIME_TYPE | UT: UTC para las fechas modernas del ejemplo |
| CSV_FORMAT | YES |

Aunque se pide `format=json`, la tabla viene como texto dentro de `result`. El script interpreta las filas entre `$$SOE` y `$$EOE` y detecta errores incluso si la respuesta HTTP es 200.

## Cómo se conectaría a la escena

Después de generar el JSON, se serviría una copia desde `public/data/horizons.json`. El contenedor Nginx actual puede servir ese archivo; esta primera integración puede usar datos precalculados sin añadir otro servicio.

~~~js
import { positionAt, applyHorizonsPosition } from '../examples/horizons-scene.mjs';

const data = await fetch('/data/horizons.json').then(r => r.json());
const earth = planetObjects.find(body => body.data.id === 'earth');
const xyz = positionAt(
  data.bodies.earth.samples,
  '2026-10-14T18:00:00Z'
);

// Ejemplo: 3.94 unidades de dibujo por UA, para mantener la Tierra visible.
applyHorizonsPosition(earth, xyz, THREE, 3.94);
~~~

En el modo por fecha, esta actualización debe sustituir `updateOrbitalPosition()`; la animación actual volvería a sobrescribir la posición si se ejecutaran ambas. Las trayectorias y estelas también deben reconstruirse a partir de las muestras, usando la misma conversión de ejes y escala. La transformación `(X, Y, Z) → (X, Z, -Y)` pone el norte eclíptico en el eje vertical de la escena.

La visualización puede conservar tamaños ampliados y distancias comprimidas por planeta. Las coordenadas originales deben mantenerse separadas y usarse para cálculos de distancia y cualquier dato científico. Una vista con escala lineal común necesitaría otro encuadre de cámara.

Para animar, la fecha de simulación debe partir del inicio del conjunto de datos. El ejemplo rechaza fechas fuera del intervalo en lugar de extrapolar silenciosamente. La precisión entre muestras necesita contrastarse con consultas intermedias reales antes de fijar el paso definitivo.

## Política y fuentes

- [API Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [Manual: vectores, marcos, tiempos y límites](https://ssd.jpl.nasa.gov/horizons/manual.html)
- [Política de uso de JPL](https://ssd-api.jpl.nasa.gov/)

JPL pide una consulta a la vez, reutilizar resultados y gestionar fallos sin solicitudes repetitivas. Su política impide incrustar llamadas a la API en una web por CORS. Las consultas del ejemplo ocurren en Node; la página consumiría el JSON propio.

## Validación del ejemplo

El parser, la serialización de solicitudes, la interpolación y la conversión de ejes se comprueban con datos sintéticos de prueba. La consulta en vivo no se ha validado: la herramienta de navegación no pudo abrir el endpoint con parámetros, y todavía falta definir el contacto real para un descargador automatizado.
