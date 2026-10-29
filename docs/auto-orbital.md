# Auto orbital

Vista independiente en **`/automovil/`**. El atlas conserva Three.js y sus módulos originales. Esta vista utiliza su propia entrada HTML, CSS, cámara y motor Babylon.js, que se cargan al abrirla. El acceso está en el encabezado del atlas en escritorio, en su ayuda y en la URL directa.

## Ejecutar

```sh
npm install
npm run dev
```

Abrir la URL local impresa por Vite y añadir `/automovil/`. Para servir la compilación con el mismo contenedor del proyecto:

```sh
npm test
npm run build
docker compose up --build -d
```

URL habitual del contenedor: **http://localhost:4173/automovil/**. Las pruebas de TypeScript utilizan los hooks de módulos de Node; se han ejecutado con Node 24. La compilación del contenedor usa su imagen Node 22.

## Experiencia y controles

- Loader con progreso de recursos críticos y calentamiento de shaders. Se prepara una escena negra antes de retirar el loader para evitar revelar el coche prematuramente.
- Intro de 10.8 segundos: tres capas de estrellas, llegada de la Tierra, entrada del automóvil en silueta, iluminación progresiva, faros y aparición del configurador.
- `Explorar el auto` o Esc omite la introducción. `Repetir` reinicia la secuencia manteniendo la configuración seleccionada.
- Arrastrar gira el automóvil con inercia, sin mover la Tierra alrededor de él. La rotación vertical tiene límites.
- Rueda en escritorio y pellizco en móvil controlan el zoom. También hay botones de giro, acercamiento y restablecimiento.
- En el canvas: flechas giran, `+`/`−` acercan y alejan, `0` o Esc restablece la vista. Los selectores usan radios nativos accesibles por teclado.
- Cinco pinturas, tres interiores y tres diseños de rines. La pintura cambia en 650 ms; los rines hacen una transición gradual. Neumáticos y frenos permanecen en su sitio.
- `Pausar movimiento` detiene flotación, Tierra y variaciones estelares. El movimiento reducido omite la intro y comienza con el ambiente detenido.
- No se crea ningún contexto de audio ni se reproduce sonido automáticamente. `AudioManager` queda preparado para un recurso futuro activado por gesto explícito.

## Arquitectura

`src/orbital/` separa:

- `core/`: selección WebGPU/WebGL, carga, ciclo de escena, calidad adaptativa y audio.
- `scenes/`: Tierra, estrellas, nebulosa y composición del espacio.
- `car/`: importación y normalización, materiales, flotación y configurador.
- `camera/`: trayectoria cinematográfica y control posterior por puntero, touch o teclado.
- `animation/`: timeline pura y control de intro, repetición y movimiento reducido.
- `lighting/` y `effects/`: key, rim, rebote terrestre, HDR, tone mapping, bloom y AO según calidad.
- `ui/`: interacción de controles, créditos y estados accesibles.

La versión del motor está fijada en **8.56.2**. La instalación 9.32 encontró un archivo puesto en cuarentena por la protección del entorno corporativo; no se restauró ese archivo ni se alteraron protecciones.

## Recursos

El GLB detallado es un concepto genérico real, con carrocería, cristales, interior, llantas, frenos y lámparas separados. No es un coche formado por cajas. Tiene unos 213 mil triángulos. La variante LOW reduce el mapa AO de 2048 a 1024 y conserva la geometría y los mapas normales. No necesita decodificadores Draco/KTX2 ni solicitudes externas para sus texturas.

Los GLB, los mapas terrestres, el entorno HDR y los compiladores de shaders se sirven desde `public/assets/`. El HDR es un estudio original de luces suaves utilizado sólo para reflejos; no aparece como fondo. Los avisos están en `ASSET_LICENSES.md` y en los subdirectorios de recursos.

`node --use-system-ca scripts/prepare-orbital-assets.mjs` vuelve a descargar los mapas terrestres 2K, genera el HDR original y copia los compiladores de la versión instalada. Los GLB y las copias 1K se incluyen preparados. No desactivar la verificación TLS si el entorno usa certificados corporativos.

## Calidad y validación

Se detectan capacidades y se elige HIGH, MEDIUM o LOW. Se limita el DPR a 2 en escritorio y 1.5 en móvil. Si el FPS permanece bajo, se reducen partículas, resolución y postprocesos. LOW utiliza el modelo y las texturas terrestres de 1K y mantiene la pintura y la iluminación principales.

Enlaces para revisión:

- `/automovil/?debug=1`: backend, nivel de calidad, FPS, resolución y geometría activa.
- `/automovil/?renderer=webgl&debug=1`: modo compatible forzado.
- `/automovil/?quality=low&debug=1`: perfil LOW.

Las pruebas usan la geometría real del GLB con Babylon NullEngine y verifican normalización, materiales, rines sin ocultar neumáticos, transiciones, timeline, movimiento reducido, calidad y encuadre. NullEngine comprueba estado y comandos de renderizado; **no sustituye una revisión de iluminación, reflejos, shaders GPU, FPS o gestos en un navegador real**.

La herramienta de navegador de esta sesión no tiene un navegador conectado. Quedan para validación visual: WebGPU y su fallback, contraste del coche frente a la Tierra, reflejos de cada pintura, la intro completa, orientación vertical/horizontal en teléfono y calidad adaptativa en GPU real.
