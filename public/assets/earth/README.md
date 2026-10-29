# Tierra de Auto orbital

Mapas 2K de día, noche y nubes de Solar System Scope / INOVE, basados en datos NASA. Fuente y condiciones: https://www.solarsystemscope.com/textures/ — CC BY 4.0.

Los archivos `*-1k.jpg` conservan la proporción y fueron remuestreados a 1024 × 512 con JPEG calidad 92. Los originales 2K no se modificaron. Los tres mapas deben mantener la misma proyección equirectangular y alineación al reemplazarlos. El código está en `src/orbital/scenes/Earth.ts`; las rutas y la selección LOW, en `core/AssetManager.ts`.

Si se reemplazan, usar imágenes legalmente reutilizables de 2048 × 1024 y equivalentes 1024 × 512; actualizar créditos y `ASSET_LICENSES.md`. La atmósfera y el terminador se calculan en shaders, no en una imagen de fondo.
