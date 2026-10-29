# Retratos planetarios

Mapas de **Solar System Scope / INOVE**, basados en datos e imágenes NASA.
Fuente y condiciones: https://www.solarsystemscope.com/textures/
Licencia: **Creative Commons Attribution 4.0 International**
https://creativecommons.org/licenses/by/4.0/

| Archivo | Original | Versión local |
| --- | --- | --- |
| sun.jpg | 8k_sun.jpg | 4K, JPEG calidad 94 |
| mercury.jpg | 8k_mercury.jpg | 4K, JPEG calidad 94 |
| venus.jpg | 4k_venus_atmosphere.jpg | 4K, sin modificar |
| earth.jpg / earth-mobile.jpg | 8k_earth_daymap.jpg | 4K / 2K |
| mars.jpg / mars-mobile.jpg | 8k_mars.jpg | 4K / 2K |
| jupiter.jpg / jupiter-mobile.jpg | 8k_jupiter.jpg | 4K / 2K |
| saturn.jpg / saturn-mobile.jpg | 8k_saturn.jpg | 4K / 2K |
| uranus.jpg | 2k_uranus.jpg | 2K, sin modificar |
| neptune.jpg | 2k_neptune.jpg | 2K, sin modificar |
| saturn-rings.png | 8k_saturn_ring_alpha.png | 8K, sin modificar |

Descargas originales en `https://www.solarsystemscope.com/textures/download/`.
Las versiones adaptadas se redujeron con interpolación bicúbica y JPEG calidad 92 o 94,
sin cambiar sus colores ni la relación 2:1. Los mapas de noche y nubes de la Tierra
se reutilizan desde `public/assets/earth/`. Los anillos del retrato usan un mapa
radial con transparencia; los del atlas conservan su material procedural.

La selección carga el mapa de su destino; no se descargan todos al iniciar.
Los retratos móviles usan los mapas detallados por defecto. Las versiones 2K
disponibles se reservan para ahorro de datos o equipos con menos memoria/capacidad.
Se conservan hasta tres retratos preparados en móvil; los anteriores liberan sus
texturas y materiales. Tierra, Marte y Saturno se anticipan durante el recorrido.
La licencia y atribución también figuran en la ayuda del atlas.

Los destinos se presentan después de decodificar sus mapas y preparar la GPU.
El retrato del Sol usa su mapa 2K y rotación suave; el plasma procedural se
conserva en la vista general. Las transiciones mezclan la imagen completa y
mantienen un solo planeta visible para evitar sombras entre destinos.
