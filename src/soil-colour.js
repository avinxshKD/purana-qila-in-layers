// D65/2° CIELAB and IEC sRGB. Palette targets are look decisions, not colourimetry of the photographs.
export function labToHex([l, a, b]) {
  const fy = (l + 16) / 116, f = v => v ** 3 > .008856 ? v ** 3 : (v - 16 / 116) / 7.787;
  const x = .95047 * f(fy + a / 500), y = f(fy), z = 1.08883 * f(fy - b / 200);
  const encode = c => Math.round(255 * Math.max(0, Math.min(1, c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055)));
  const rgb = [3.2404542 * x - 1.5371385 * y - .4985314 * z,
    -.969266 * x + 1.8760108 * y + .041556 * z, .0556434 * x - .2040259 * y + 1.0572252 * z].map(encode);
  return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}
export function hexToLab(hex) {
  const linear = [hex >> 16 & 255, hex >> 8 & 255, hex & 255].map(v => {
    const c = v / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  const [r, g, b] = linear, f = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  const x = f((.4124564 * r + .3575761 * g + .1804375 * b) / .95047);
  const y = f(.2126729 * r + .7151522 * g + .072175 * b);
  const z = f((.0193339 * r + .119192 * g + .9503041 * b) / 1.08883);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z), chroma: Math.hypot(500 * (x - y), 200 * (y - z)) };
}

// CIEDE2000, kL=kC=kH=1. Tested against Sharma/Wu/Dalal's published supplementary data.
export function deltaE2000(first, second) {
  const [l1, a1, b1] = first, [l2, a2, b2] = second, rad = degrees => degrees * Math.PI / 180;
  const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2), cMean = (c1 + c2) / 2;
  const g = .5 * (1 - Math.sqrt(cMean ** 7 / (cMean ** 7 + 25 ** 7)));
  const ap1 = (1 + g) * a1, ap2 = (1 + g) * a2, cp1 = Math.hypot(ap1, b1), cp2 = Math.hypot(ap2, b2);
  const hue = (a, b) => a === 0 && b === 0 ? 0 : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  const h1 = hue(ap1, b1), h2 = hue(ap2, b2), dl = l2 - l1, dc = cp2 - cp1;
  let dh = h2 - h1;
  if (cp1 * cp2 === 0) dh = 0;
  else if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(rad(dh / 2)), lm = (l1 + l2) / 2, cm = (cp1 + cp2) / 2;
  let hm = (h1 + h2) / 2;
  if (cp1 * cp2 === 0) hm = h1 + h2;
  else if (Math.abs(h1 - h2) > 180) hm += h1 + h2 < 360 ? 180 : -180;
  const t = 1 - .17 * Math.cos(rad(hm - 30)) + .24 * Math.cos(rad(2 * hm))
    + .32 * Math.cos(rad(3 * hm + 6)) - .20 * Math.cos(rad(4 * hm - 63));
  const sl = 1 + .015 * (lm - 50) ** 2 / Math.sqrt(20 + (lm - 50) ** 2), sc = 1 + .045 * cm, sh = 1 + .015 * cm * t;
  const rt = -2 * Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)) * Math.sin(rad(60 * Math.exp(-(((hm - 275) / 25) ** 2))));
  return Math.sqrt((dl / sl) ** 2 + (dc / sc) ** 2 + (dH / sh) ** 2 + rt * dc / sc * dH / sh);
}
