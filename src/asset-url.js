// Vite supplies the deployment prefix; Node tests and local Docker use the root.
export function assetUrl(path, base = import.meta.env?.BASE_URL || '/') {
  return `${base}${path.replace(/^\/+/, '')}`;
}
