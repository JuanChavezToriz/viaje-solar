// One family of astronomical silhouettes, drawn for the small portrait header.
const shapes = {
  sun: '<circle cx="16" cy="16" r="7"/><path d="M16 2v3m0 22v3M2 16h3m22 0h3M6.1 6.1l2.1 2.1m15.6 15.6 2.1 2.1m0-19.8-2.1 2.1M8.2 23.8l-2.1 2.1"/>',
  mercury: '<circle cx="16" cy="16" r="11"/><circle cx="12" cy="12" r="2.5"/><circle cx="20" cy="19" r="3.4"/><path d="M10 21h.01M21 10h.01"/>',
  venus: '<circle cx="16" cy="16" r="11"/><path d="M6 12c5-3 10 3 19 0M5 17c7-3 14 3 22-1M8 22c5-2 10 1 15 0"/>',
  earth: '<circle cx="16" cy="16" r="11"/><path d="m11 6-1 5 4 2 2-1 2 4-3 3-1 6m9-17-3 4 2 3 4 1M5 17l4 1 2 4"/>',
  mars: '<circle cx="16" cy="16" r="11"/><path d="M10 7c3 2 7 2 11 0M8 25c4-2 7-1 10 1"/><circle cx="20" cy="18" r="3"/><path d="M11 16h.01"/>',
  jupiter: '<circle cx="16" cy="16" r="11"/><path d="M7 10c6 3 12-1 18 1M5 15c7-2 15 3 22 0M7 22c5 2 11-1 17 0"/><ellipse cx="20" cy="19" rx="3" ry="1.5"/>',
  saturn: '<circle cx="16" cy="16" r="8.5"/><path d="M8.2 12.5c-4.3.1-6.9 1-6.4 2.6.8 2.5 8 5.4 16 6.5s14 .1 13.2-2.4c-.4-1.2-2.5-2.6-5.8-3.8" transform="rotate(-25 16 16)"/><path d="M3 19c6 0 17-3 26-8"/>',
  uranus: '<circle cx="16" cy="16" r="9"/><ellipse cx="16" cy="16" rx="4.6" ry="14.5" transform="rotate(24 16 16)"/>',
  neptune: '<circle cx="16" cy="16" r="11"/><path d="M6 13c4-4 8 4 12 0s6 0 8 0M7 20c4-3 8 3 12 0s5 0 6 0"/>',
};

export function planetIcon(id) {
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[id] || shapes.earth}</svg>`;
}
