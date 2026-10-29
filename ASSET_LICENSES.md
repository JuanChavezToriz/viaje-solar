# Auto orbital: recursos y licencias

Los recursos de esta experiencia se sirven localmente. No se utiliza renderizado remoto, marcas de fabricantes ni una fotografía del cielo como sustituto de las estrellas 3D. Los créditos también están disponibles en el botón **Créditos** de `/automovil/`.

| Recurso | Autor / titular | Fuente y licencia | Uso y adaptación |
| --- | --- | --- | --- |
| Car Concept | Eric Chadwick / Darmstadt Graphics Group GmbH, 2024 | [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | GLB local. Logotipos Khronos y 3D Commerce retirados, placa y flancos neutros, materiales ajustados y rines adicionales. Variante LOW con AO de 1K. Aviso original y trazabilidad en `public/assets/car/`. |
| Base original del automóvil | Unity Fan | [Free Concept Car 004](https://sketchfab.com/3d-models/free-concept-car-004-public-domain-cc0-4cba124633eb494eadc3bb0c4660ad7e), CC0 | Antecedente del modelo optimizado. La adaptación distribuida de Eric Chadwick utiliza CC BY 4.0; no se presenta el GLB completo como CC0. |
| Tierra: día, noche y nubes | Solar System Scope / INOVE, basadas en datos e imágenes NASA | [Página y condiciones de las texturas](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Mapas 2K sin modificaciones; copias 1K con proporción preservada y JPEG calidad 92. |
| HDR de estudio, estrellas, nebulosa y rines Racing/Carbon | Creación original para este proyecto | Código y generación local | Sin fotografías, texturas ni modelos externos adicionales. |
| Babylon.js 8.56.2 | Babylon.js contributors | [Proyecto oficial](https://github.com/BabylonJS/Babylon.js), Apache 2.0 | Motor y cargador. Licencia y NOTICE conservados en `public/assets/runtime/`. |
| GLSLang y TWGSL | Khronos Group, Babylon.js contributors y colaboradores de Tint/Dawn | Distribuidos con Babylon.js; Apache 2.0 y avisos de componentes BSD/MIT | JS/WASM locales. Se conservan NOTICE y los avisos completos de [glslang 11.8.0](https://github.com/KhronosGroup/glslang/blob/11.8.0/LICENSE.txt). El aviso Dawn/Tint adjunto es una referencia upstream, no una identificación de revisión exacta de la compilación incluida. |
| Manrope | Mikhail Sharanda y colaboradores | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/manrope), SIL Open Font License 1.1 | Tipografía de la interfaz; conserva la familia del atlas. Hay fuentes locales del sistema como alternativa. |

La adaptación del modelo no implica patrocinio ni afiliación con Khronos, INOVE o un fabricante automotriz. Las condiciones originales de cada recurso permanecen aplicables a sus partes y derivados.

## Retratos del atlas planetario

Los nuevos mapas planetarios son de [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/),
basados en imágenes y datos NASA, bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Se sirven localmente: 4K para Tierra, Marte, Júpiter, Saturno, Mercurio, Venus (atmósfera)
y el Sol; 2K para Urano y Neptuno. Los mapas compactos disponibles se reservan para
ahorro de datos o menor capacidad del dispositivo. Las adaptaciones se limitan a
resolución y compresión. Trazabilidad en `public/textures/portraits/README.md`.
La ayuda del atlas conserva la atribución visible. Los encuadres, atmósferas y la
iluminación son una interpretación artística. Los anillos del retrato de Saturno
usan el mapa radial 8K del mismo autor y licencia; el atlas conserva sus anillos procedurales.
El retrato del Sol deriva de `8k_sun.jpg`, reducido a 4K con JPEG calidad 94.
