(() => {
  const canvas = document.querySelector(".orb-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const tau = Math.PI * 2;

  const SUBDIVISIONS = 1;
  const phi = (1 + Math.sqrt(5)) / 2;
  const baseVerts = [
    [-1, phi, 0],
    [1, phi, 0],
    [-1, -phi, 0],
    [1, -phi, 0],
    [0, -1, phi],
    [0, 1, phi],
    [0, -1, -phi],
    [0, 1, -phi],
    [phi, 0, -1],
    [phi, 0, 1],
    [-phi, 0, -1],
    [-phi, 0, 1],
  ].map(([x, y, z]) => {
    const len = Math.hypot(x, y, z);
    return { x: x / len, y: y / len, z: z / len };
  });

  const baseFaces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  function subdivide(verts, faces, level) {
    let currentVerts = verts.slice();
    let currentFaces = faces.slice();

    for (let i = 0; i < level; i += 1) {
      const midpointCache = new Map();
      const nextFaces = [];

      const getMidpoint = (a, b) => {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (midpointCache.has(key)) {
          return midpointCache.get(key);
        }
        const v1 = currentVerts[a];
        const v2 = currentVerts[b];
        const mid = normalize({
          x: (v1.x + v2.x) / 2,
          y: (v1.y + v2.y) / 2,
          z: (v1.z + v2.z) / 2,
        });
        const idx = currentVerts.length;
        currentVerts.push(mid);
        midpointCache.set(key, idx);
        return idx;
      };

      for (const face of currentFaces) {
        const [a, b, c] = face;
        const ab = getMidpoint(a, b);
        const bc = getMidpoint(b, c);
        const ca = getMidpoint(c, a);
        nextFaces.push([a, ab, ca]);
        nextFaces.push([b, bc, ab]);
        nextFaces.push([c, ca, bc]);
        nextFaces.push([ab, bc, ca]);
      }

      currentFaces = nextFaces;
    }

    return { verts: currentVerts, faces: currentFaces };
  }

  const { verts, faces } = subdivide(baseVerts, baseFaces, SUBDIVISIONS);

  const palette = [
    "#6dd5c3",
    "#4bbaa5",
    "#9fe0d3",
    "#8ec6ff",
    "#60a8ff",
    "#b8ddff",
    "#7f5ce6",
    "#5f3ac7",
    "#a68aff",
    "#f6a85d",
    "#e08e3a",
    "#ffbe85",
    "#d04f5f",
    "#b33548",
    "#e57585",
    "#ff6b8f",
    "#4a8c82",
    "#5a4b8c",
    "#c97e3f",
    "#f9d6c2",
  ];
  const light = normalize({ x: 0.4, y: -0.2, z: 1 });

  function normalize(v) {
    const len = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  function rotate(v, ax, ay) {
    let { x, y, z } = v;
    const cosY = Math.cos(ay);
    const sinY = Math.sin(ay);
    let dx = x * cosY - z * sinY;
    let dz = x * sinY + z * cosY;
    const cosX = Math.cos(ax);
    const sinX = Math.sin(ax);
    let dy = y * cosX - dz * sinX;
    dz = y * sinX + dz * cosX;
    return { x: dx, y: dy, z: dz };
  }

  function shade(hex, intensity) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const boost = 0.25 + 0.75 * intensity;
    const nr = Math.min(255, Math.round(r * boost + 18));
    const ng = Math.min(255, Math.round(g * boost + 18));
    const nb = Math.min(255, Math.round(b * boost + 18));
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(canvas.clientWidth, canvas.clientHeight);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let last = 0;
  let rotX = 0.45;
  let rotY = 0;

  function draw(ts) {
    if (!last) last = ts;
    const delta = Math.min(32, ts - last);
    last = ts;

    rotY += delta * 0.00045;
    rotX += delta * 0.00015;

    resize();

    const size = Math.min(canvas.clientWidth, canvas.clientHeight);
    const center = size / 2;
    const radius = size * 0.93;
    const perspective = 3.2;

    ctx.clearRect(0, 0, size, size);

    const projected = verts.map((v) => {
      const r = rotate(v, rotX, rotY);
      const z = r.z + perspective;
      const scale = radius / z;
      return {
        x: r.x * scale + center,
        y: r.y * scale + center,
        z: r.z,
        rx: r.x,
        ry: r.y,
        rz: r.z,
      };
    });

    const faceData = faces.map((face, idx) => {
      const a = projected[face[0]];
      const b = projected[face[1]];
      const c = projected[face[2]];
      const ab = { x: b.rx - a.rx, y: b.ry - a.ry, z: b.rz - a.rz };
      const ac = { x: c.rx - a.rx, y: c.ry - a.ry, z: c.rz - a.rz };
      const normal = normalize({
        x: ab.y * ac.z - ab.z * ac.y,
        y: ab.z * ac.x - ab.x * ac.z,
        z: ab.x * ac.y - ab.y * ac.x,
      });
      const depth = (a.z + b.z + c.z) / 3;
      const lightness = Math.max(
        0,
        normal.x * light.x + normal.y * light.y + normal.z * light.z,
      );
      return { idx, face, depth, lightness };
    });

    faceData.sort((a, b) => a.depth - b.depth);

    ctx.lineJoin = "round";
    ctx.lineWidth = 0.8;

    for (const data of faceData) {
      const face = data.face;
      const color = palette[data.idx % palette.length];
      ctx.beginPath();
      ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
      ctx.lineTo(projected[face[1]].x, projected[face[1]].y);
      ctx.lineTo(projected[face[2]].x, projected[face[2]].y);
      ctx.closePath();
      ctx.fillStyle = shade(color, data.lightness);
      ctx.fill();
      ctx.strokeStyle = "rgba(34, 34, 34, 0.45)";
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
  window.addEventListener("resize", resize);
})();
