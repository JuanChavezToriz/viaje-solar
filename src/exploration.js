// Fit the illustrated system and the selected world's silhouette to the viewport.
const overviewDistances = new Map();

export function overviewProfile(aspect, mobile = false, height = 844) {
  const upright = mobile && aspect < .9;
  const top = upright ? Math.max(.22, 202 / height) : .22;
  const bottom = Math.min(.93, 1 - 58 / height);
  // Shorter phones need a gentler diagonal to use their width as well as their height.
  const roll = upright ? Math.max(1, 1.27 - Math.max(0, aspect - .48) * 3) : 0;
  return { roll, centerShift: mobile ? upright ? (top + bottom) / 2 - .5 : -.04 : -.08,
    horizontalShift: mobile && !upright ? -.1 : 0,
    planetScale: mobile ? 1.2 : 1, top, bottom };
}

export function overviewDistance(aspect, fov, mobile = false, height = 844) {
  const tangent = Math.tan(fov * Math.PI / 360);
  const radius = mobile ? 16.8 : 17.8;
  if (mobile) {
    const key = `${aspect}:${fov}:${height}`;
    if (overviewDistances.has(key)) return overviewDistances.get(key);
    const profile = overviewProfile(aspect, true, height);
    const cosine = .58 / Math.hypot(.58, .815), sine = .815 / Math.hypot(.58, .815);
    const top = 1 - profile.top * 2, bottom = 1 - profile.bottom * 2;
    const horizontal = profile.horizontalShift * 2;
    const cosRoll = Math.cos(profile.roll), sinRoll = Math.sin(profile.roll);
    let distance = 25;
    // Fit the rolled plane in perspective, including its nearer orbital edge.
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 180) {
      const along = Math.cos(angle) * radius, across = Math.sin(angle) * radius;
      const x = along * cosRoll - across * cosine * sinRoll;
      const y = -along * sinRoll - across * cosine * cosRoll;
      const depth = across * sine;
      distance = Math.max(distance, (x / (tangent * aspect) + .98 * depth) / (.98 + horizontal),
        (-x / (tangent * aspect) + .98 * depth) / (.98 - horizontal),
        (y / tangent + top * depth) / (top + 2 * profile.centerShift),
        (-y / tangent - bottom * depth) / (-bottom - 2 * profile.centerShift));
    }
    if (overviewDistances.size > 16) overviewDistances.clear();
    overviewDistances.set(key, distance * 1.025);
    return distance * 1.025;
  }
  const depth = radius * 0.815;
  // Include perspective foreshortening: the near edge of the tilted disk is closer.
  const horizontal = Math.hypot(radius / (tangent * aspect * 0.89), depth);
  const vertical = depth + radius * 0.58 / (tangent * 0.80);
  return Math.max(mobile ? 49 : 43, horizontal, vertical);
}

export function markerPlacement(x, y, width, height, labelWidth, labelHeight, mobile = false, topLimit = 80) {
  const margin = mobile ? 20 : 24;
  const minX = margin, maxX = Math.max(minX, width - labelWidth - margin);
  const minY = Math.min(topLimit, Math.max(12, height - labelHeight - 90));
  const maxY = Math.max(minY, height - labelHeight - 90);
  const left = mobile ? x - (x > width / 2 ? labelWidth - 16 : 16)
    : x + labelWidth + 48 < width ? x + 24 : x - labelWidth - 24;
  const top = mobile ? y + 20 : y - labelHeight / 2;
  return { left: Math.max(minX, Math.min(maxX, left)), top: Math.max(minY, Math.min(maxY, top)) };
}

export function focusDistance(body, aspect, fov, mobile = false, heightFraction = mobile ? 0.25 : 0.44) {
  const tangent = Math.tan(fov * Math.PI / 360);
  const radius = body.radius * (body.id === 'saturn' ? 2.42 : body.id === 'sun' ? 1.15 : 1);
  const widthFraction = mobile ? 0.76 : 0.50;
  return Math.max(0.9, radius / (tangent * heightFraction), radius / (tangent * aspect * widthFraction));
}

export function simulationRate(speed) {
  return `${speed.toLocaleString('es-MX')} ${speed === 1 ? 'año' : 'años'} / min`;
}
