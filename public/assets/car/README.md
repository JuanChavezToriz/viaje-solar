# Concept car asset

`concept-car.glb` is a local, logo-free adaptation of **Car Concept**, a generic sports car from the Khronos glTF Sample Assets collection.

## Attribution

Model and textures © 2024 **Darmstadt Graphics Group GmbH**, by **Eric Chadwick**. Licensed under **Creative Commons Attribution 4.0 International (CC-BY-4.0)**.

- Model source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept
- Original GLB: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb
- License: https://creativecommons.org/licenses/by/4.0/
- Original model base: Unity Fan, *Free Concept Car 004*, CC0: https://sketchfab.com/3d-models/free-concept-car-004-public-domain-cc0-4cba124633eb494eadc3bb0c4660ad7e
- Original license notice is preserved in `LICENSE.original.md`.

Suggested visible credit: **Car Concept — Eric Chadwick / Darmstadt Graphics Group · CC BY 4.0 · adapted**. Link the model source and license.

## Adaptation

The upstream asset includes Khronos and 3D Commerce logos whose trademark rights are excluded from the model's CC-BY license. This adaptation removes their three embedded images and their material references. The license plate is now a plain dark surface; tire sidewalls have a plain rubber base and no branded normal map. Logo-dependent emissive textures were removed and their emissive factor set to zero. Geometry, the other PBR maps, material variants, interior, headlights and tread normal maps are retained. These changes are also recorded in the GLB asset metadata.

This is a generic concept vehicle; no manufacturer sponsorship or affiliation is implied.

## Technical profile

- Binary glTF 2.0, self-contained: **11,271,240 bytes**.
- 101 nodes, 97 mesh definitions, approximately 213,347 triangles.
- 29 materials; 11 embedded PNG images and 12 texture/sampler definitions.
- Largest map: 2048 × 2048 ambient occlusion. Other maps range from 32 × 32 to 1024 × 256.
- No external URLs, buffers or image dependencies.
- No required extensions, Draco, KTX2, Basis or Meshopt decoder.
- Optional material extensions: clearcoat, emissive strength, iridescence, transmission, variants, texture transform.
- Right-handed glTF bounds, before any loader coordinate conversion: minimum `[-1.3632963, -0.1592990, -1.9402312]`, maximum `[1.3528624, 1.1486551, 2.4171548]`.
- Approximate dimensions: **2.7162 wide × 1.3080 high × 4.3574 long**. Units are model units, broadly meter-scale.

## Material adapter

| Component | Material names |
| --- | --- |
| Main paint | `Paint 1 Carmine` |
| Secondary trim | `Paint 2 Carmine` |
| Glass | `Glass` |
| Headlights | `Headlight` |
| Tail and signal lights | `Brakelight`, `Signallight` |
| Colored interior | `Interior 3 Carmine` |
| Other interior | `Interior 1`, `Interior 2`, `Panel Sides`, `Dashboard`, `Floormat` |
| Rims | `Rim1`, `Rim2` |
| Brake calipers and discs | `Brake`, `Disc` |
| Tires | `Tireside`, `Tiretread` |

Wheel transform-node groups are `WheelFrontL`, `WheelFrontR`, `WheelRearL`, `WheelRearR`. Rim meshes are named `WheelFrontLRim`, `WheelFrontRRim`, `WheelRearLRim`, `WheelRearRRim`; each uses the two rim materials. The car includes separate doors, hood, seats, dash, brake pads/discs, windows and mirrors. The sample has no animation clips.

## LOW texture variant

`concept-car-low.glb` retains the exact nodes, meshes, materials, accessors and texture/sampler references of the main asset, with every embedded image limited to a maximum dimension of 1024. Its size is **10,696,596 bytes**. All 11 maps are retained.

Only the ambient-occlusion image required resizing: 2048 × 2048 → 1024 × 1024. It was resampled using Windows `System.Drawing` high-quality bilinear filtering with preserved aspect ratio and edge handling. AO is sampled as numerical channel data; no photographic gamma or color transform was requested. Every normal map and all other embedded image bytes are unchanged, so no normal renormalization was needed. Geometry is also byte-for-byte unchanged. Under standard RGBA mipmapped allocation the AO resize saves approximately 16 MiB of GPU texture storage.

Variant hashes and resampling metadata are recorded in `source.json`. This is a texture-only optimization; it does not reduce triangle count or add compression/decoder requirements.

## Replacement

Replace `concept-car.glb` with a legally reusable generic GLB using +Y up, a meter-scale vehicle and separate body paint, glass, rims, rubber, interior and emissive lights. Update the material adapter and attribution if names or license change. Validate both desktop and mobile camera framing after replacement. A larger real-world production model may require an explicit geometry LOD and compressed textures for low-end devices.
