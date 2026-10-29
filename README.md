# Viaje Solar

## GitHub Pages

El repositorio personal es `JuanChavezToriz/viaje-solar`. El flujo de
`.github/workflows/pages.yml` compila y publica los cambios de `main` cuando
GitHub Pages está habilitado con **Settings → Pages → Source → GitHub Actions**.
GitHub Pages requiere un plan compatible si el repositorio se mantiene privado.

La dirección de publicación es `https://juanchaveztoriz.github.io/viaje-solar/`.
El flujo establece `VITE_BASE_PATH=/viaje-solar/`; Docker y el desarrollo local
conservan `/` como ruta base. Las texturas, los retratos y Auto orbital usan esa
misma base al cargar sus recursos.

La identidad personal de Git se configura exclusivamente en `.git/config`,
que no se publica. No es necesario cambiar la configuración global ni las
credenciales de otros servicios.

## Retratos planetarios

La llegada a cada planeta espera a tener sus imágenes decodificadas y preparadas
en la GPU. Durante una carga lenta se conserva el destino anterior; un fallo se
puede reintentar. El cambio mezcla la imagen completa de un solo modelo para
evitar transparencias y sombras entre planetas. Los destinos más próximos se
preparan durante la visita y los mapas para móvil conservan su versión 2K.

En móvil, el giro horizontal no bloquea el desplazamiento vertical. Cambiar la
orientación conserva el destino. El selector incluye la pausa; el zoom y los
ajustes viven en «Opciones», y «Conocer más» abre una ficha que se puede recorrer
sin desplazar el viaje. Los textos distinguen la llegada, la galaxia y los
planetas con frases breves.

Seleccionar un destino abre una vista 3D dedicada, con rotación lenta, iluminación
lateral y transiciones entre mundos. Marte se presenta como un gran horizonte;
Saturno aparece a la derecha con sus anillos inclinados y sombras; la Tierra
añade nubes, atmósfera y luces nocturnas. Cada destino tiene su propio encuadre.
Los detalles se despliegan a petición y el selector inferior admite flechas,
Inicio y Fin. La pausa detiene la rotación; Esc y «Destinos» regresan
al atlas. Se respeta la preferencia de movimiento reducido.

Enlaces directos: `http://localhost:4173/?planeta=mars#explorar` y
`http://localhost:4173/?planeta=saturn#explorar`. Los mapas se cargan al seleccionar:
4K para los primeros planos principales y versiones 2K para móvil. Fuentes y
adaptaciones en [public/textures/portraits/README.md](public/textures/portraits/README.md).
Los encuadres y la luz son artísticos e independientes de la simulación orbital.

## Auto orbital

Se añadió una experiencia independiente de automóvil espacial en **http://localhost:4173/automovil/**. Incluye una introducción de 10.8 segundos, Tierra con día/noche/nubes, deportivo GLB detallado, materiales PBR y un configurador de pintura, rines e interior. El atlas conserva su escena y su motor originales.

Instrucciones, controles, arquitectura y enlaces de validación: [docs/auto-orbital.md](docs/auto-orbital.md). Créditos y condiciones: [ASSET_LICENSES.md](ASSET_LICENSES.md).

Una presentación continua en una sola vista: una llegada inicial desde el espacio profundo se acerca a la Vía Láctea y el scroll entra entre sus estrellas hasta el Sistema Solar. Las estrellas conservan su posición; la cámara se acerca al vecindario del Sol y cambia de unidades para revelar los planetas. La misma escena permite girar, acercar y seleccionar mundos. El recorrido entre escalas, tamaños y distancias es artístico; los periodos orbitales mantienen su proporción. A 1×, un minuto representa aproximadamente un año terrestre.

El disco de la galaxia combina dos brazos estelares dominantes, dos secundarios, ramificaciones y una población entre brazos. Los tonos cálidos del centro, los azules de los brazos y las regiones rosadas se usan como interpretación visual de poblaciones estelares y gas; no representan un mapa exacto ni una fotografía exterior de la Vía Láctea. Referencias: [estructura ilustrada de NASA](https://science.nasa.gov/resource/the-milky-way-galaxy/) y [cómo se reconstruye nuestra galaxia](https://imagine.gsfc.nasa.gov/science/objects/milkyway1.html).

## Ejecutar

~~~bash
docker compose up --build -d
~~~

Abre http://localhost:4173. Para detener el contenedor: <code>docker compose down</code>.

También se puede ejecutar en desarrollo:

~~~bash
npm install
npm run dev
~~~

## Tecnologías

- Three.js y WebGL para iluminación, esferas, órbitas, selección y cámara.
- Vite para desarrollo y compilación.
- Nginx y Docker para servir el sitio.
- Mapas de textura locales de NASA/JPL y materiales procedurales para el Sol y algunos detalles atmosféricos.

## Fuentes astronómicas

- Mapas equirectangulares: [NASA/JPL-Caltech Solar System Simulator](https://space.jpl.nasa.gov/tmaps/). Las notas de cada mapa y sus limitaciones están en el catálogo. La nube visible de Venus se genera sobre su mapa de radar Magellan. Las atmósferas de Saturno y Urano son procedurales porque las texturas JPL de referencia son ficticias o de color plano.
- Datos de diámetros, distancias y periodos orbitales: [NASA/JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/planets/phys_par.html).
- Datos del Sol, incluida su rotación ecuatorial y temperatura de la fotosfera: [NASA — Sun Facts](https://science.nasa.gov/sun/facts/).
- Descripciones y cantidades de lunas: páginas de [NASA Solar System Exploration](https://science.nasa.gov/solar-system/planets/) por planeta. Los recuentos de lunas pueden cambiar al confirmarse nuevas.
- Cada ficha enlaza la página de NASA usada para los datos de lunas; los recuentos vigentes se pueden contrastar en ese enlace.
- El Sol y los anillos de Saturno usan materiales procedurales WebGL dibujados localmente; no se cargan imágenes externas al ejecutar el sitio.

## Estructura

- <code>index.html</code>: secciones, controles, panel y créditos.
- <code>src/main.js</code>: escena 3D, viaje de cámara, animación y eventos.
- <code>src/galaxy.js</code>: estrellas, luz difusa y estructura galáctica.
- <code>src/galaxy-field.js</code>: luz del disco, polvo y bulbo con volumen.
- <code>src/journey.js</code>: aproximación inicial y recorrido continuo entre escalas.
- <code>src/stellar-passage.js</code>: estrellas cercanas y paralaje durante el viaje.
- <code>src/journey.css</code>: presentación fija y recorrido continuo.
- <code>src/planets.js</code>: datos y parámetros orbitales.
- <code>src/styles.css</code>: composición editorial y diseño responsivo.
- <code>public/textures/</code>: mapas JPL incluidos localmente.
- <code>Dockerfile</code>, <code>docker-compose.yml</code>, <code>nginx.conf</code>: empaquetado y servidor.

## Controles

La introducción dura 5.6 segundos. «Ir a la galaxia», Esc, la navegación o empezar a desplazar la página permiten omitirla. El botón «Intro» de la galaxia repite la llegada. Los enlaces directos a `#explorar` abren el Sistema Solar y la preferencia de movimiento reducido omite la llegada automática y el campo de estrellas en movimiento.

La selección abre el retrato del destino con su encuadre propio. «Destinos» y Esc recuperan la vista general. Espacio pausa o reanuda cuando el foco no está en otro control. «Opciones» reúne el acercamiento, el giro por botones y el regreso al encuadre inicial.

La velocidad se muestra en años simulados por minuto. La animación usa posiciones ilustrativas; no representa las efemérides de una fecha real. En Ajustes también se puede elegir la vista en perspectiva o desde arriba.

En móvil, «Conocer más» abre una ficha sobre el selector. El giro horizontal y el desplazamiento vertical conviven sin cambiar de modo. La orientación conserva el destino; los cambios de tamaño que acompañan un desplazamiento táctil no fuerzan el regreso al planeta.

- Recorrido: desliza hacia abajo para entrar al Sistema Solar y hacia arriba para volver a la galaxia. Los enlaces del encabezado permiten ir directamente a cada extremo.
- Sistema Solar: arrastra para girar, usa clic derecho para mover y +/− para acercar. El selector de destinos se desliza horizontalmente.
- Ajustes: cambia la velocidad y activa las órbitas o los nombres. La ficha muestra dos datos; «Detalles» abre el resto.
- Vía Láctea: arrastra para girar, usa +/− o Ctrl + rueda para acercar y ↻ para restablecer la vista. El giro automático continúa después de arrastrar o cambiar el zoom, conservando el ángulo y el acercamiento elegidos.
- En móvil, «Girar» activa los gestos de giro, desplazamiento y pellizco sobre la galaxia; «Continuar» permite volver a deslizar la página.

En PowerShell, utiliza `npm.cmd run dev` o `npm.cmd run build` si la política de ejecución bloquea `npm.ps1`.

## Galaxia de partículas

La galaxia combina 156,200 estrellas procedurales con una base continua de luz calculada por el shader: un disco denso, dos brazos principales, dos ramificaciones, polvo irregular y un bulbo cálido con volumen. Las estrellas y la luz comparten la misma curva espiral. La luz de las estrellas se suma y sus puntos tienen bordes suaves; las posiciones se generan una vez con una semilla fija. Un volumen de 12,000 estrellas alrededor del vecindario aporta profundidad al acercamiento. No se carga una imagen galáctica ni una textura externa.

En móvil se dibujan 65,604 partículas galácticas y se reduce el detalle del polvo. Durante el viaje se añaden 3,600 estrellas cercanas en móvil o 7,600 en escritorio. El shader recibe la densidad de píxeles real del renderer, limitada a 1.5× en móvil y 2× en escritorio. La cámara conserva el ángulo de exploración al iniciar el recorrido. La galaxia permanece en la escena al entrar al Sistema Solar y la exposición de su luz difusa se adapta al acercarnos al Sol. La preferencia de movimiento reducido elimina la introducción, la rotación automática y el parpadeo. Esta es una interpretación visual, no una reconstrucción astronómica a escala.

La textura generada de la versión anterior y su prompt permanecen archivados en `public/textures/milky-way-disk-v1.png` y `docs/galaxy-texture-prompt.md`; ya no se utilizan.

## Interfaz esencial

La vista conserva el título, la ubicación y el marcador «Nuestro pequeño vecindario», que lleva al Sistema Solar al pulsarlo. «Desliza» indica el recorrido. La indicación para girar desaparece al interactuar, y el botón «?» reúne las instrucciones y fuentes. Las fichas muestran información al seleccionar un cuerpo; pausa, zoom y ajustes mantienen etiquetas accesibles sin repetir instrucciones en la escena.
