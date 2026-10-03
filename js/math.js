/**
 * GeoDescri3D - Motor Matemático y Geometría Analítica Diédrica
 */

// Ecuación general del plano Ax + By + Cz + D = 0 a partir de 3 puntos
function computePlaneEquation(p1, p2, p3) {
  const v1 = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
  const v2 = new THREE.Vector3(p3.x - p1.x, p3.y - p1.y, p3.z - p1.z);
  const n = new THREE.Vector3().crossVectors(v1, v2);
  const norm = n.length();
  if (norm > 0) n.normalize();
  return { A: n.x, B: n.y, C: n.z, D: -(n.x * p1.x + n.y * p1.y + n.z * p1.z), norm };
}

// Bounding box clipper para planos cortantes dentro de los límites del triedro
function computePlaneBoxIntersection(eq, xMin, xMax, yMin, yMax, zMin, zMax) {
  const { A, B, C, D } = eq;
  const pts = [];
  function evalPlane(x, y, z) { return A * x + B * y + C * z + D; }
  function checkSeg(p1, p2) {
    const v1 = evalPlane(p1.x, p1.y, p1.z), v2 = evalPlane(p2.x, p2.y, p2.z);
    if (Math.abs(v2 - v1) < 1e-7) return;
    const t = -v1 / (v2 - v1);
    if (t >= -1e-4 && t <= 1.0001) pts.push(new THREE.Vector3(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y), p1.z + t * (p2.z - p1.z)));
  }
  checkSeg({ x: xMin, y: yMin, z: zMin }, { x: xMax, y: yMin, z: zMin });
  checkSeg({ x: xMin, y: yMax, z: zMin }, { x: xMax, y: yMax, z: zMin });
  checkSeg({ x: xMin, y: yMin, z: zMax }, { x: xMax, y: yMin, z: zMax });
  checkSeg({ x: xMin, y: yMax, z: zMax }, { x: xMax, y: yMax, z: zMax });
  checkSeg({ x: xMin, y: yMin, z: zMin }, { x: xMin, y: yMax, z: zMin });
  checkSeg({ x: xMax, y: yMin, z: zMin }, { x: xMax, y: yMax, z: zMin });
  checkSeg({ x: xMin, y: yMin, z: zMax }, { x: xMin, y: yMax, z: zMax });
  checkSeg({ x: xMax, y: yMin, z: zMax }, { x: xMax, y: yMax, z: zMax });
  checkSeg({ x: xMin, y: yMin, z: zMin }, { x: xMin, y: yMin, z: zMax });
  checkSeg({ x: xMax, y: yMin, z: zMin }, { x: xMax, y: yMin, z: zMax });
  checkSeg({ x: xMin, y: yMax, z: zMin }, { x: xMin, y: yMax, z: zMax });
  checkSeg({ x: xMax, y: yMax, z: zMin }, { x: xMax, y: yMax, z: zMax });

  if (pts.length < 3) return null;
  const unique = [];
  pts.forEach(p => { if (!unique.some(u => u.distanceTo(p) < 1e-3)) unique.push(p); });
  if (unique.length < 3) return null;

  const center = new THREE.Vector3();
  unique.forEach(p => center.add(p));
  center.divideScalar(unique.length);

  const n = new THREE.Vector3(A, B, C).normalize();
  let u = new THREE.Vector3().subVectors(unique[0], center).normalize();
  if (u.lengthSq() < 1e-4) u = new THREE.Vector3(1, 0, 0).cross(n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();

  unique.sort((a, b) => Math.atan2(new THREE.Vector3().subVectors(a, center).dot(v), new THREE.Vector3().subVectors(a, center).dot(u)) -
                       Math.atan2(new THREE.Vector3().subVectors(b, center).dot(v), new THREE.Vector3().subVectors(b, center).dot(u)));
  return { polygon: unique, center };
}

// Trazas analíticas sobre los planos de proyección PV (Z=0) o PH (Y=0)
function computeTraceSegment(A, B, C, D, isVertical, xHalf, maxCoord) {
  const K = isVertical ? B : C;
  const pts = [];
  const eps = 1e-4;
  if (Math.abs(K) > eps) {
    const uLeft = -(A * (-xHalf) + D) / K;
    if (uLeft >= -eps && uLeft <= maxCoord + eps) pts.push({ x: -xHalf, u: Math.max(0, Math.min(maxCoord, uLeft)) });
    const uRight = -(A * xHalf + D) / K;
    if (uRight >= -eps && uRight <= maxCoord + eps) pts.push({ x: xHalf, u: Math.max(0, Math.min(maxCoord, uRight)) });
  }
  if (Math.abs(A) > eps) {
    const xBottom = -D / A;
    if (xBottom >= -xHalf - eps && xBottom <= xHalf + eps) pts.push({ x: Math.max(-xHalf, Math.min(xHalf, xBottom)), u: 0 });
    const xTop = -(D + K * maxCoord) / A;
    if (xTop >= -xHalf - eps && xTop <= xHalf + eps) pts.push({ x: Math.max(-xHalf, Math.min(xHalf, xTop)), u: maxCoord });
  }
  const unique = [];
  pts.forEach(p => {
    if (!unique.some(q => Math.hypot(p.x - q.x, p.u - q.u) < 1e-2)) unique.push(p);
  });
  if (unique.length !== 2) return null;
  return isVertical
    ? [new THREE.Vector3(unique[0].x, unique[0].u, 0.02), new THREE.Vector3(unique[1].x, unique[1].u, 0.02)]
    : [new THREE.Vector3(unique[0].x, 0.02, unique[0].u), new THREE.Vector3(unique[1].x, 0.02, unique[1].u)];
}

// Definición geométrica del sólido seleccionado o figura personalizada
function getSolidGeometryDefinition(mode = 'intersection') {
  const cfg = mode === 'line_solid' ? state.lineSolid : state.intersection;
  const H = cfg.solidHeight || 8.0, c = { x: 0, y: 0, z: 5.5 };

  if (typeof cfg.solidType === 'string' && cfg.solidType.startsWith('custom_')) {
    const fig = (state.customFigures || []).find(f => f.id === cfg.solidType);
    if (fig) {
      const figH = fig.H ?? H, figR = fig.R ?? 3.2, N = fig.sides ?? 4;
      const basePlane = fig.basePlane || 'PH';
      const X0 = fig.posX !== undefined ? fig.posX : 0.0;
      const Y0 = fig.posY !== undefined ? fig.posY : (basePlane === 'PV' ? 4.5 : 0.0);
      const Z0 = fig.posZ !== undefined ? fig.posZ : (basePlane === 'PV' ? 0.0 : 5.5);
      const center = { x: X0, y: Y0, z: Z0 };

      const bottom = [];
      if (fig.customPoints && Array.isArray(fig.customPoints) && fig.customPoints.length >= 3) {
        fig.customPoints.forEach(p => bottom.push({ x: p.x, y: p.y, z: p.z }));
      } else {
        for (let i = 0; i < N; i++) {
          const angle = (i * 2 * Math.PI) / N;
          if (basePlane === 'PH') {
            bottom.push({ x: X0 + figR * Math.cos(angle), y: Y0, z: Z0 + figR * Math.sin(angle) });
          } else {
            bottom.push({ x: X0 + figR * Math.cos(angle), y: Y0 + figR * Math.sin(angle), z: Z0 });
          }
        }
      }
      const actualN = bottom.length;
      const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].slice(0, actualN);

      if (fig.type === 'pyramid_reg' || fig.type === 'pyramid_irregular') {
        let apex;
        if (fig.type === 'pyramid_irregular' && fig.apex) {
          apex = { x: fig.apex.x, y: fig.apex.y, z: fig.apex.z };
        } else if (basePlane === 'PH') {
          apex = { x: X0, y: Y0 + figH, z: Z0 };
        } else {
          apex = { x: X0, y: Y0, z: Z0 + figH };
        }
        return { type: 'pyramid', basePlane, basePts: bottom, bottom, apex, H: figH, c: center, R: figR, sides: actualN, names };
      }
      if (fig.type === 'prism_reg' || fig.type === 'prism_oblique') {
        const slant = fig.type === 'prism_oblique'
          ? { x: fig.slantX ?? 2.0, y: (basePlane === 'PV' ? (fig.slantZ ?? -2.0) : 0), z: (basePlane === 'PH' ? (fig.slantZ ?? -2.0) : 0) }
          : { x: 0, y: 0, z: 0 };
        const top = bottom.map(p => ({
          x: p.x + slant.x,
          y: basePlane === 'PH' ? (p.y + figH) : (p.y + slant.y),
          z: basePlane === 'PH' ? (p.z + slant.z) : (p.z + figH)
        }));
        return { type: 'prism', basePlane, basePts: bottom, bottom, top, H: figH, c: center, slant, names };
      }
      if (fig.type === 'cylinder') {
        const topC = basePlane === 'PH' ? { x: X0, y: Y0 + figH, z: Z0 } : { x: X0, y: Y0, z: Z0 + figH };
        return { type: 'cylinder', basePlane, H: figH, c: center, topC, R: figR };
      }
      if (fig.type === 'cone') {
        const apex = basePlane === 'PH' ? { x: X0, y: Y0 + figH, z: Z0 } : { x: X0, y: Y0, z: Z0 + figH };
        return { type: 'cone', basePlane, H: figH, c: center, apex, R: figR };
      }
    }
  }

  if (cfg.solidType === 'prism_regular') {
    const bottom = []; for (let i = 0; i < 6; i++) bottom.push({ x: c.x + 3.2 * Math.cos(i * Math.PI / 3), y: 0, z: c.z + 3.2 * Math.sin(i * Math.PI / 3) });
    const top = bottom.map(p => ({ x: p.x, y: H, z: p.z }));
    return { type: 'prism', basePlane: 'PH', basePts: bottom, bottom, top, H, c, names: ['A', 'B', 'C', 'D', 'E', 'F'] };
  }
  if (cfg.solidType === 'prism_irregular') {
    const bottom = [{ x: -3, y: 0, z: 3 }, { x: -1, y: 0, z: 2 }, { x: 3, y: 0, z: 4 }, { x: 2, y: 0, z: 8 }, { x: -2, y: 0, z: 7 }];
    const top = bottom.map(p => ({ x: p.x, y: H, z: p.z }));
    return { type: 'prism', basePlane: 'PH', basePts: bottom, bottom, top, H, c, names: ['A', 'B', 'C', 'D', 'E'] };
  }
  if (cfg.solidType === 'prism_oblique') {
    const bottom = [{ x: -3, y: 0, z: 3 }, { x: -1, y: 0, z: 2 }, { x: 3, y: 0, z: 4 }, { x: 2, y: 0, z: 8 }, { x: -2, y: 0, z: 7 }];
    const slant = { x: 2.2, y: 0, z: -1.8 };
    const top = bottom.map(p => ({ x: p.x + slant.x, y: H, z: p.z + slant.z }));
    return { type: 'prism', basePlane: 'PH', basePts: bottom, bottom, top, H, c, slant, names: ['A', 'B', 'C', 'D', 'E'] };
  }
  if (cfg.solidType === 'cylinder') return { type: 'cylinder', basePlane: 'PH', H, c, R: 3.2 };
  if (cfg.solidType === 'cone') return { type: 'cone', basePlane: 'PH', H, c, apex: { x: c.x, y: H, z: c.z }, R: 3.5 };
  if (cfg.solidType === 'pyramid') {
    const bottom = []; for (let i = 0; i < 4; i++) bottom.push({ x: c.x + 3.2 * Math.cos(i * Math.PI / 2), y: 0, z: c.z + 3.2 * Math.sin(i * Math.PI / 2) });
    const apex = { x: c.x, y: H, z: c.z };
    return { type: 'pyramid', basePlane: 'PH', basePts: bottom, bottom, apex, H, c, R: 3.2, sides: 4, names: ['A', 'B', 'C', 'D'] };
  }
  return { type: 'cylinder', basePlane: 'PH', H, c, R: 3.2 };
}

// Creación de geometrías de sólidos para Three.js
function createSolidGeometry(solid) {
  let g;
  if (solid.type.startsWith('prism')) {
    const bottom = solid.bottom, top = solid.top, N = bottom.length;
    const vertices = [];
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      vertices.push(bottom[i].x, bottom[i].y, bottom[i].z);
      vertices.push(top[i].x, top[i].y, top[i].z);
      vertices.push(top[next].x, top[next].y, top[next].z);
      vertices.push(bottom[i].x, bottom[i].y, bottom[i].z);
      vertices.push(top[next].x, top[next].y, top[next].z);
      vertices.push(bottom[next].x, bottom[next].y, bottom[next].z);
    }
    for (let i = 1; i < N - 1; i++) {
      vertices.push(bottom[0].x, bottom[0].y, bottom[0].z);
      vertices.push(bottom[i + 1].x, bottom[i + 1].y, bottom[i + 1].z);
      vertices.push(bottom[i].x, bottom[i].y, bottom[i].z);
    }
    for (let i = 1; i < N - 1; i++) {
      vertices.push(top[0].x, top[0].y, top[0].z);
      vertices.push(top[i].x, top[i].y, top[i].z);
      vertices.push(top[i + 1].x, top[i + 1].y, top[i + 1].z);
    }
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
  } else if (solid.type === 'pyramid') {
    const bottom = solid.bottom, apex = solid.apex, N = bottom.length;
    const vertices = [];
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      vertices.push(bottom[i].x, bottom[i].y, bottom[i].z);
      vertices.push(bottom[next].x, bottom[next].y, bottom[next].z);
      vertices.push(apex.x, apex.y, apex.z);
    }
    for (let i = 1; i < N - 1; i++) {
      vertices.push(bottom[0].x, bottom[0].y, bottom[0].z);
      vertices.push(bottom[i + 1].x, bottom[i + 1].y, bottom[i + 1].z);
      vertices.push(bottom[i].x, bottom[i].y, bottom[i].z);
    }
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
  } else if (solid.type === 'cylinder') {
    g = new THREE.CylinderGeometry(solid.R, solid.R, solid.H, 64);
    if (solid.basePlane === 'PV') {
      g.rotateX(Math.PI / 2);
      g.translate(solid.c.x, solid.c.y, solid.c.z + solid.H / 2);
    } else {
      g.translate(solid.c.x, (solid.c.y || 0) + solid.H / 2, solid.c.z);
    }
  } else if (solid.type === 'cone') {
    g = new THREE.ConeGeometry(solid.R, solid.H, 64);
    if (solid.basePlane === 'PV') {
      g.rotateX(Math.PI / 2);
      g.translate(solid.c.x, solid.c.y, solid.c.z + solid.H / 2);
    } else {
      g.translate(solid.c.x, (solid.c.y || 0) + solid.H / 2, solid.c.z);
    }
  }
  if (g) {
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }
  return g;
}

// Representación 3D del sólido con mallas y aristas técnicas limpias
function createSolid3DRepresentation(solid, options = {}) {
  const isCurved = (solid.type === 'cylinder' || solid.type === 'cone');
  const geom = createSolidGeometry(solid);
  const group = new THREE.Group();
  const isPreview = Boolean(options.isPreview);

  let meshMat;
  if (isCurved) {
    meshMat = new THREE.MeshStandardMaterial({
      color: isPreview ? 0x60a5fa : 0xbae6fd,
      roughness: 0.22,
      metalness: 0.16,
      transparent: true,
      opacity: isPreview ? 0.65 : 0.60,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  } else {
    meshMat = new THREE.MeshStandardMaterial({
      color: isPreview ? 0x38bdf8 : 0xffffff,
      roughness: 0.40,
      metalness: 0.08,
      transparent: true,
      opacity: isPreview ? 0.50 : 0.38,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }
  const mesh = new THREE.Mesh(geom, meshMat);
  group.add(mesh);

  if (isCurved) {
    const edgeGrp = new THREE.Group();
    const isPV = (solid.basePlane === 'PV');
    const c = solid.c;
    const R = solid.R;
    const H = solid.H;
    const yBase = (c.y !== undefined) ? c.y : 0;
    const N_GEN = 8; // 8 generatrices técnicas discretas

    const genPts = [];
    if (solid.type === 'cylinder') {
      for (let k = 0; k < N_GEN; k++) {
        const th = (k * 2 * Math.PI) / N_GEN;
        if (isPV) {
          const x = c.x + R * Math.cos(th);
          const y = c.y + R * Math.sin(th);
          genPts.push(new THREE.Vector3(x, y, c.z));
          genPts.push(new THREE.Vector3(x, y, c.z + H));
        } else {
          const x = c.x + R * Math.cos(th);
          const z = c.z + R * Math.sin(th);
          genPts.push(new THREE.Vector3(x, yBase, z));
          genPts.push(new THREE.Vector3(x, yBase + H, z));
        }
      }
    } else if (solid.type === 'cone') {
      const apex = solid.apex
        ? new THREE.Vector3(solid.apex.x, solid.apex.y, solid.apex.z)
        : (isPV ? new THREE.Vector3(c.x, c.y, c.z + H) : new THREE.Vector3(c.x, yBase + H, c.z));

      for (let k = 0; k < N_GEN; k++) {
        const th = (k * 2 * Math.PI) / N_GEN;
        if (isPV) {
          const x = c.x + R * Math.cos(th);
          const y = c.y + R * Math.sin(th);
          genPts.push(new THREE.Vector3(x, y, c.z));
          genPts.push(apex.clone());
        } else {
          const x = c.x + R * Math.cos(th);
          const z = c.z + R * Math.sin(th);
          genPts.push(new THREE.Vector3(x, yBase, z));
          genPts.push(apex.clone());
        }
      }
    }

    const genMat = new THREE.LineBasicMaterial({
      color: isPreview ? 0x0369a1 : 0x0284c7,
      transparent: true,
      opacity: 0.28,
      linewidth: 1
    });
    const genGeom = new THREE.BufferGeometry().setFromPoints(genPts);
    edgeGrp.add(new THREE.LineSegments(genGeom, genMat));

    const M = 64;
    const rimBasePts = [];
    const rimTopPts = [];
    for (let i = 0; i <= M; i++) {
      const th = (i * 2 * Math.PI) / M;
      if (isPV) {
        const x = c.x + R * Math.cos(th);
        const y = c.y + R * Math.sin(th);
        rimBasePts.push(new THREE.Vector3(x, y, c.z));
        if (solid.type === 'cylinder') rimTopPts.push(new THREE.Vector3(x, y, c.z + H));
      } else {
        const x = c.x + R * Math.cos(th);
        const z = c.z + R * Math.sin(th);
        rimBasePts.push(new THREE.Vector3(x, yBase, z));
        if (solid.type === 'cylinder') rimTopPts.push(new THREE.Vector3(x, yBase + H, z));
      }
    }
    const rimMat = new THREE.LineBasicMaterial({
      color: isPreview ? 0x0369a1 : 0x0284c7,
      transparent: true,
      opacity: 0.40,
      linewidth: 1.5
    });
    edgeGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rimBasePts), rimMat));
    if (solid.type === 'cylinder') {
      edgeGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rimTopPts), rimMat));
    }

    group.add(edgeGrp);
  } else {
    const pEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geom, 15 * Math.PI / 180),
      new THREE.LineBasicMaterial({
        color: isPreview ? 0x0038a8 : 0x0284c7,
        linewidth: isPreview ? 2 : 1.5,
        transparent: true,
        opacity: 0.8
      })
    );
    group.add(pEdges);
  }

  return { group, mesh, geom };
}

// Ecuación del plano cortante activo en la pestaña Planos × Figuras
function getActivePlaneEquation() {
  const cfg = state.intersection, y0 = cfg.cutHeight, z0 = cfg.cutDist, x0 = cfg.cutX;
  const a = cfg.cutAngle * Math.PI / 180, b = cfg.cutAngleBeta * Math.PI / 180;
  let n = new THREE.Vector3(0, 1, 0), D = -y0;
  if (cfg.cuttingPlaneType === 'canto') {
    n.set(-Math.sin(a), Math.cos(a), 0).normalize();
    D = -(n.x * x0 + n.y * y0);
  } else if (cfg.cuttingPlaneType === 'proj_horizontal') {
    n.set(Math.sin(b), 0, Math.cos(b)).normalize();
    D = -(n.x * x0 + n.z * z0);
  } else if (cfg.cuttingPlaneType === 'frontal') {
    n.set(0, 0, 1); D = -z0;
  } else if (cfg.cuttingPlaneType === 'profile') {
    n.set(1, 0, 0); D = -x0;
  } else if (cfg.cuttingPlaneType === 'parallel_lt') {
    n.set(0, Math.sin(a), Math.cos(a)).normalize();
    D = -(n.y * y0 + n.z * z0);
  } else if (cfg.cuttingPlaneType === 'oblique') {
    n.set(-Math.sin(b) * Math.cos(a), Math.cos(a), Math.sin(a)).normalize();
    D = -(n.x * x0 + n.y * y0 + n.z * z0);
  }
  return { A: n.x, B: n.y, C: n.z, D };
}

// Cálculo analítico exacto de la sección producida por el plano en el sólido
function computeSolidIntersection(solid, eq) {
  const { A, B, C, D } = eq;
  function evalPt(p) { return A * p.x + B * p.y + C * p.z + D; }
  function intersectSeg(p1, p2) {
    const d1 = evalPt(p1), d2 = evalPt(p2);
    if (Math.abs(d2 - d1) < 1e-7) return null;
    const t = -d1 / (d2 - d1);
    if (t >= -1e-4 && t <= 1.0001) return new THREE.Vector3(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y), p1.z + t * (p2.z - p1.z));
    return null;
  }

  const results = [];
  let isOrderedBoundary = false;
  if (solid.type.startsWith('prism')) {
    const bottom = solid.bottom || solid.basePts.map(p => ({ x: p.x, y: 0, z: p.z }));
    const top = solid.top || solid.basePts.map(p => ({ x: p.x + (solid.slant ? solid.slant.x : 0), y: solid.H, z: p.z + (solid.slant ? solid.slant.z : 0) }));
    const n = bottom.length;

    for (let i = 0; i < n; i++) {
      const pt = intersectSeg(bottom[i], top[i]);
      if (pt) results.push({ pt, name3D: `S${solid.names[i]}`, namePV: `S${solid.names[i]}2`, namePH: `S${solid.names[i]}1`, type: 'edge' });
    }
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const ptBot = intersectSeg(bottom[i], bottom[next]);
      if (ptBot) results.push({ pt: ptBot, name3D: `S${solid.names[i]}${solid.names[next]}`, namePV: `S${solid.names[i]}${solid.names[next]}2`, namePH: `S${solid.names[i]}${solid.names[next]}1`, type: 'base' });
      const ptTop = intersectSeg(top[i], top[next]);
      if (ptTop) results.push({ pt: ptTop, name3D: `S'${solid.names[i]}${solid.names[next]}`, namePV: `S'${solid.names[i]}${solid.names[next]}2`, namePH: `S'${solid.names[i]}${solid.names[next]}1`, type: 'base' });
    }
  } else if (solid.type === 'pyramid') {
    const bottom = solid.bottom || solid.basePts.map(p => ({ x: p.x, y: 0, z: p.z }));
    const apex = solid.apex || { x: solid.c.x, y: solid.H, z: solid.c.z };
    const n = bottom.length;

    for (let i = 0; i < n; i++) {
      const pt = intersectSeg(bottom[i], apex);
      if (pt) results.push({ pt, name3D: `S${solid.names[i]}`, namePV: `S${solid.names[i]}2`, namePH: `S${solid.names[i]}1`, type: 'edge' });
    }
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const ptBot = intersectSeg(bottom[i], bottom[next]);
      if (ptBot) results.push({ pt: ptBot, name3D: `S${solid.names[i]}${solid.names[next]}`, namePV: `S${solid.names[i]}${solid.names[next]}2`, namePH: `S${solid.names[i]}${solid.names[next]}1`, type: 'base' });
    }
  } else if (solid.type === 'cone' && solid.basePlane === 'PV') {
    const c = solid.c, R = solid.R, H = solid.H;
    const apex = solid.apex || { x: c.x, y: c.y, z: c.z + H };
    const M = 96;
    for (let i = 0; i < M; i++) {
      const theta = (i * 2 * Math.PI) / M;
      const bPt = { x: c.x + R * Math.cos(theta), y: c.y + R * Math.sin(theta), z: c.z };
      const pt = intersectSeg(bPt, apex);
      if (pt) {
        const isKey = (i % 24 === 0);
        const tagIdx = Math.floor(i / 24) + 1;
        results.push({ pt, name3D: isKey ? `S${tagIdx}` : '', namePV: isKey ? `S${tagIdx}2` : '', namePH: isKey ? `S${tagIdx}1` : '', type: 'edge' });
      }
      const nextTheta = ((i + 1) * 2 * Math.PI) / M;
      const nextBPt = { x: c.x + R * Math.cos(nextTheta), y: c.y + R * Math.sin(nextTheta), z: c.z };
      const ptBase = intersectSeg(bPt, nextBPt);
      if (ptBase) results.push({ pt: ptBase, name3D: '', namePV: '', namePH: '', type: 'base' });
    }
  } else if (solid.type === 'cylinder' && solid.basePlane === 'PV') {
    const c = solid.c, R = solid.R, H = solid.H;
    const M = 96;
    for (let i = 0; i < M; i++) {
      const theta = (i * 2 * Math.PI) / M;
      const bPt = { x: c.x + R * Math.cos(theta), y: c.y + R * Math.sin(theta), z: c.z };
      const topPt = { x: c.x + R * Math.cos(theta), y: c.y + R * Math.sin(theta), z: c.z + H };
      const pt = intersectSeg(bPt, topPt);
      if (pt) {
        const isKey = (i % 24 === 0);
        const tagIdx = Math.floor(i / 24) + 1;
        results.push({ pt, name3D: isKey ? `S${tagIdx}` : '', namePV: isKey ? `S${tagIdx}2` : '', namePH: isKey ? `S${tagIdx}1` : '', type: 'edge' });
      }
      const nextTheta = ((i + 1) * 2 * Math.PI) / M;
      const nextBPt = { x: c.x + R * Math.cos(nextTheta), y: c.y + R * Math.sin(nextTheta), z: c.z };
      const nextTopPt = { x: c.x + R * Math.cos(nextTheta), y: c.y + R * Math.sin(nextTheta), z: c.z + H };
      const ptBase = intersectSeg(bPt, nextBPt);
      if (ptBase) results.push({ pt: ptBase, name3D: '', namePV: '', namePH: '', type: 'base' });
      const ptTop = intersectSeg(topPt, nextTopPt);
      if (ptTop) results.push({ pt: ptTop, name3D: '', namePV: '', namePH: '', type: 'base' });
    }
  } else if (solid.type === 'cone') {
    isOrderedBoundary = true;
    const c = solid.c, R = solid.R, H = solid.H;
    const baseY = c.y ?? 0;
    const apex = solid.apex || { x: c.x, y: baseY + H, z: c.z };
    const dApex = evalPt(apex);
    const L = Math.hypot(A, C);

    let cutsBase = false;
    let pBase1 = null, pBase2 = null;
    let a1 = 0, a2 = 0;

    if (L > 1e-7) {
      const d0 = (A * c.x + B * baseY + C * c.z + D) / L;
      if (Math.abs(d0) <= R * 0.999999) {
        cutsBase = true;
        const h0 = Math.sqrt(Math.max(0, R * R - d0 * d0));
        const nx = A / L, nz = C / L;
        const px = c.x - d0 * nx, pz = c.z - d0 * nz;
        const tx = -nz, tz = nx;

        pBase1 = new THREE.Vector3(px + h0 * tx, baseY, pz + h0 * tz);
        pBase2 = new THREE.Vector3(px - h0 * tx, baseY, pz - h0 * tz);
        a1 = Math.atan2(pBase1.z - c.z, pBase1.x - c.x);
        a2 = Math.atan2(pBase2.z - c.z, pBase2.x - c.x);
      }
    }

    if (cutsBase) {
      if (Math.abs(dApex) < 1e-6) {
        const K = 12;
        // Cuando el plano pasa por el vértice, la sección es un triángulo.
        // results también alimenta el cálculo de perímetro, por lo que sus
        // puntos deben recorrer pBase1 -> vértice -> pBase2 -> pBase1.
        for (let i = 0; i <= K; i++) {
          const s = i / K;
          results.push({
            pt: new THREE.Vector3(pBase1.x + s * (apex.x - pBase1.x), baseY + s * (apex.y - baseY), pBase1.z + s * (apex.z - pBase1.z)),
            name3D: (i === 0 ? 'S1' : (i === K ? 'SV' : '')),
            namePV: (i === 0 ? 'S12' : (i === K ? 'SV2' : '')),
            namePH: (i === 0 ? 'S11' : (i === K ? 'SV1' : '')),
            type: (i === K ? 'apex' : 'edge')
          });
        }
        for (let i = 1; i <= K; i++) {
          const s = i / K;
          results.push({
            pt: new THREE.Vector3(apex.x + s * (pBase2.x - apex.x), apex.y + s * (baseY - apex.y), apex.z + s * (pBase2.z - apex.z)),
            name3D: (i === K ? 'S2' : ''),
            namePV: (i === K ? 'S22' : ''),
            namePH: (i === K ? 'S21' : ''),
            type: 'edge'
          });
        }
        for (let i = 1; i < K; i++) {
          const s = i / K;
          results.push({
            pt: new THREE.Vector3(pBase2.x + s * (pBase1.x - pBase2.x), baseY, pBase2.z + s * (pBase1.z - pBase2.z)),
            name3D: '', namePV: '', namePH: '', type: 'edge'
          });
        }
      } else {
        let dAngle = a2 - a1;
        while (dAngle < 0) dAngle += 2 * Math.PI;
        while (dAngle >= 2 * Math.PI) dAngle -= 2 * Math.PI;

        const mid1 = a1 + dAngle / 2;
        const bPtMid1 = { x: c.x + R * Math.cos(mid1), y: baseY, z: c.z + R * Math.sin(mid1) };
        const dMid1 = evalPt(bPtMid1);

        let startAngle, sweepAngle;
        if (dMid1 * dApex < 0) {
          startAngle = a1; sweepAngle = dAngle;
        } else {
          startAngle = a2; sweepAngle = 2 * Math.PI - dAngle;
        }

        const startsAtBase1 = Math.abs(startAngle - a1) < 1e-7 || Math.abs(Math.abs(startAngle - a1) - 2 * Math.PI) < 1e-7;
        const arcStartPt = startsAtBase1 ? pBase1 : pBase2;
        const arcEndPt = startsAtBase1 ? pBase2 : pBase1;

        const M = 64;
        for (let i = 0; i <= M; i++) {
          const theta = startAngle + (i / M) * sweepAngle;
          const bPt = { x: c.x + R * Math.cos(theta), y: baseY, z: c.z + R * Math.sin(theta) };
          const pt = (i === 0) ? arcStartPt.clone() : ((i === M) ? arcEndPt.clone() : intersectSeg(bPt, apex));
          if (pt) {
            const isKey = (i === 0 || i === M || i === Math.floor(M / 2));
            let tagIdx = 1;
            if (i === M) tagIdx = 2;
            else if (i === Math.floor(M / 2)) tagIdx = 3;
            results.push({
              pt,
              name3D: isKey ? (`S${tagIdx}`) : '',
              namePV: isKey ? (`S${tagIdx}2`) : '',
              namePH: isKey ? (`S${tagIdx}1`) : '',
              type: (i === 0 || i === M) ? 'base' : 'edge'
            });
          }
        }

        const K = 12;
        for (let i = 1; i < K; i++) {
          const s = i / K;
          results.push({
            pt: new THREE.Vector3(arcEndPt.x + s * (arcStartPt.x - arcEndPt.x), baseY, arcEndPt.z + s * (arcStartPt.z - arcEndPt.z)),
            name3D: '', namePV: '', namePH: '', type: 'base'
          });
        }
      }
    } else {
      const N = 72;
      for (let i = 0; i < N; i++) {
        const angle = (i * 2 * Math.PI) / N;
        const bPt = { x: c.x + R * Math.cos(angle), y: baseY, z: c.z + R * Math.sin(angle) };
        const pt = intersectSeg(bPt, apex);
        if (pt) {
          const isKey = (i % 18 === 0);
          const tagIdx = Math.floor(i / 18) + 1;
          results.push({
            pt,
            name3D: isKey ? (`S${tagIdx}`) : '',
            namePV: isKey ? (`S${tagIdx}2`) : '',
            namePH: isKey ? (`S${tagIdx}1`) : '',
            type: 'edge'
          });
        }
      }
    }
  } else if (solid.type === 'cylinder') {
    const c = solid.c, R = solid.R, H = solid.H;
    const baseY = c.y ?? 0;
    const L = Math.hypot(A, C);

    if (Math.abs(B) < 1e-7) {
      if (L > 1e-7) {
        const d0 = (A * c.x + B * baseY + C * c.z + D) / L;
        if (Math.abs(d0) <= R * 0.999999) {
          const h0 = Math.sqrt(Math.max(0, R * R - d0 * d0));
          const nx = A / L, nz = C / L;
          const px = c.x - d0 * nx, pz = c.z - d0 * nz;
          const tx = -nz, tz = nx;
          const p1 = new THREE.Vector3(px + h0 * tx, baseY, pz + h0 * tz);
          const p2 = new THREE.Vector3(px - h0 * tx, baseY, pz - h0 * tz);
          const K = 12;
          for (let i = 0; i <= K; i++) {
            const s = i / K;
            results.push({ pt: new THREE.Vector3(p1.x + s * (p2.x - p1.x), baseY, p1.z + s * (p2.z - p1.z)), name3D: (i === 0 ? 'S1' : (i === K ? 'S2' : '')), namePV: (i === 0 ? 'S12' : (i === K ? 'S22' : '')), namePH: (i === 0 ? 'S11' : (i === K ? 'S21' : '')), type: 'base' });
            results.push({ pt: new THREE.Vector3(p1.x, baseY + s * H, p1.z), name3D: (i === K ? 'S4' : ''), namePV: (i === K ? 'S42' : ''), namePH: (i === K ? 'S41' : ''), type: 'edge' });
            results.push({ pt: new THREE.Vector3(p2.x, baseY + s * H, p2.z), name3D: (i === K ? 'S3' : ''), namePV: (i === K ? 'S32' : ''), namePH: (i === K ? 'S31' : ''), type: 'edge' });
            results.push({ pt: new THREE.Vector3(p1.x + s * (p2.x - p1.x), baseY + H, p1.z + s * (p2.z - p1.z)), name3D: '', namePV: '', namePH: '', type: 'base' });
          }
        }
      }
    } else {
      const N = 96;
      for (let i = 0; i < N; i++) {
        const theta = (i * 2 * Math.PI) / N;
        const x = c.x + R * Math.cos(theta);
        const z = c.z + R * Math.sin(theta);
        const y = -(A * x + C * z + D) / B;
        if (y >= baseY - 1e-4 && y <= baseY + H + 1e-4) {
          const isKey = (i % 24 === 0);
          const tagIdx = Math.floor(i / 24) + 1;
          results.push({
            pt: new THREE.Vector3(x, Math.max(baseY, Math.min(baseY + H, y)), z),
            name3D: isKey ? (`S${tagIdx}`) : '',
            namePV: isKey ? (`S${tagIdx}2`) : '',
            namePH: isKey ? (`S${tagIdx}1`) : '',
            type: 'edge'
          });
        }
      }
      let cutsCylinderBase = false;
      if (L > 1e-7) {
         const d0 = (A * c.x + B * baseY + C * c.z + D) / L;
        if (Math.abs(d0) <= R * 0.999999) {
          cutsCylinderBase = true;
          const h0 = Math.sqrt(Math.max(0, R * R - d0 * d0));
          const nx = A / L, nz = C / L;
          const px = c.x - d0 * nx, pz = c.z - d0 * nz;
          const tx = -nz, tz = nx;
          const p1 = new THREE.Vector3(px + h0 * tx, baseY, pz + h0 * tz);
          const p2 = new THREE.Vector3(px - h0 * tx, baseY, pz - h0 * tz);
          const K = 12;
          for (let i = 0; i <= K; i++) {
            const s = i / K;
            results.push({ pt: new THREE.Vector3(p1.x + s * (p2.x - p1.x), baseY, p1.z + s * (p2.z - p1.z)), name3D: (i === 0 ? 'S1' : (i === K ? 'S2' : '')), namePV: (i === 0 ? 'S12' : (i === K ? 'S22' : '')), namePH: (i === 0 ? 'S11' : (i === K ? 'S21' : '')), type: 'base' });
          }
        }
        const dH = (A * c.x + B * (baseY + H) + C * c.z + D) / L;
        if (Math.abs(dH) <= R * 0.999999) {
          cutsCylinderBase = true;
          const hH = Math.sqrt(Math.max(0, R * R - dH * dH));
          const nx = A / L, nz = C / L;
          const px = c.x - dH * nx, pz = c.z - dH * nz;
          const tx = -nz, tz = nx;
          const p1 = new THREE.Vector3(px + hH * tx, baseY + H, pz + hH * tz);
          const p2 = new THREE.Vector3(px - hH * tx, baseY + H, pz - hH * tz);
          const K = 12;
          for (let i = 0; i <= K; i++) {
            const s = i / K;
            results.push({ pt: new THREE.Vector3(p1.x + s * (p2.x - p1.x), baseY + H, p1.z + s * (p2.z - p1.z)), name3D: (i === 0 ? 'S3' : (i === K ? 'S4' : '')), namePV: (i === 0 ? 'S32' : (i === K ? 'S42' : '')), namePH: (i === 0 ? 'S31' : (i === K ? 'S41' : '')), type: 'base' });
          }
        }
      }
      if (!cutsCylinderBase) isOrderedBoundary = true;
    }
  }

  if (results.length < 3) return null;
  const unique = [];
  results.forEach(r => { if (!unique.some(u => u.pt.distanceTo(r.pt) < 1e-2)) unique.push(r); });
  if (unique.length < 3) return null;

  const center = new THREE.Vector3();
  unique.forEach(u => center.add(u.pt));
  center.divideScalar(unique.length);

  if (!isOrderedBoundary) {
    const normal = new THREE.Vector3(A, B, C).normalize();
    let u = new THREE.Vector3().subVectors(unique[0].pt, center).normalize();
    if (u.lengthSq() < 1e-4) u = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
    if (u.lengthSq() < 1e-4) u = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 0, 1)).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();

    unique.sort((a, b) => Math.atan2(new THREE.Vector3().subVectors(a.pt, center).dot(v), new THREE.Vector3().subVectors(a.pt, center).dot(u)) -
                         Math.atan2(new THREE.Vector3().subVectors(b.pt, center).dot(v), new THREE.Vector3().subVectors(b.pt, center).dot(u)));
  }
  return { items: unique, center };
}

function validateLineGeometry(p1, p2, type) {
  const eps = 0.2;
  const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
  if (Math.hypot(dx, dy, dz) < eps) return { title: 'Puntos coincidentes', message: 'La recta degenera en un punto.' };

  if (type === 'oblique') {
    if (Math.abs(dy) <= eps && Math.abs(dz) <= eps) return { title: 'Incoherencia', message: 'Degenera en paralela a L.T.' };
    if (Math.abs(dy) <= eps) return { title: 'Incoherencia', message: 'Se convierte en Horizontal.' };
    if (Math.abs(dz) <= eps) return { title: 'Incoherencia', message: 'Se convierte en Frontal.' };
    if (Math.abs(dx) <= eps) return { title: 'Incoherencia', message: 'Se convierte en De perfil.' };
  } else if (type === 'horizontal' && Math.abs(dy) > eps) {
    return { title: 'Incoherencia', message: 'Cota (Y) debe ser constante.' };
  } else if (type === 'frontal' && Math.abs(dz) > eps) {
    return { title: 'Incoherencia', message: 'Alejamiento (Z) debe ser constante.' };
  } else if (type === 'parallel_lt' && (Math.abs(dy) > eps || Math.abs(dz) > eps)) {
    return { title: 'Incoherencia', message: 'Cota (Y) y alejamiento (Z) deben ser constantes.' };
  } else if (type === 'point' && (Math.abs(dx) > eps || Math.abs(dy) > eps)) {
    return { title: 'Incoherencia', message: 'Una recta de punta debe tener X e Y constantes.' };
  } else if (type === 'vertical' && (Math.abs(dx) > eps || Math.abs(dz) > eps)) {
    return { title: 'Incoherencia', message: 'Una recta vertical debe tener X y Z constantes.' };
  } else if (type === 'profile' && Math.abs(dx) > eps) {
    return { title: 'Incoherencia', message: 'Una recta de perfil debe tener X constante.' };
  }
  return null;
}

// Validación geométrica de invariantes para rectas, planos e intersecciones
function validateCurrentGeometry() {
  const eps = 0.2;
  if (state.mode === 'lines') {
    const { p1, p2 } = state.line;
    return validateLineGeometry(p1, p2, state.lineType);
  } else if (state.mode === 'planes') {
    const { p1, p2, p3 } = state.plane;
    const eq = computePlaneEquation(p1, p2, p3);
    if (eq.norm < 0.05) return { title: 'Vértices colineales', message: 'Los 3 puntos están alineados y no definen un plano.' };
    
    const t = state.planeType;
    const A = eq.A, B = eq.B, C = eq.C;
    const eps = 0.05;
    const a0 = Math.abs(A) < eps;
    const b0 = Math.abs(B) < eps;
    const c0 = Math.abs(C) < eps;

    let actual = 'oblique';
    if (a0 && c0) actual = 'horizontal';
    else if (a0 && b0) actual = 'frontal';
    else if (b0 && c0) actual = 'profile';
    else if (a0) actual = 'parallel_lt';
    else if (c0) actual = 'proj_vertical';
    else if (b0) actual = 'proj_horizontal';

    const typeLabels = {
      oblique: 'Plano Cualquiera (Oblicuo)',
      horizontal: 'Plano Horizontal (cota constante)',
      frontal: 'Plano Frontal (alejamiento constante)',
      profile: 'Plano de Perfil (desviación constante)',
      parallel_lt: 'Plano Paralelo a la L.T.',
      proj_vertical: 'Plano de Canto',
      proj_horizontal: 'Plano Vertical'
    };

    if (t === 'oblique') {
      if (actual !== 'oblique') {
        return { title: 'Incoherencia', message: `El plano se convirtió en ${typeLabels[actual]}.` };
      }
    } else if (t === 'parallel_lt') {
      if (actual === 'horizontal') return { title: 'Incoherencia', message: 'El plano se volvió Horizontal (cota constante).' };
      if (actual === 'frontal') return { title: 'Incoherencia', message: 'El plano se volvió Frontal (alejamiento constante).' };
      if (actual === 'profile') return { title: 'Incoherencia', message: 'El plano se volvió de Perfil (desviación constante).' };
      if (actual === 'oblique') return { title: 'Incoherencia', message: 'El plano dejó de ser Paralelo a la L.T. (se volvió Oblicuo).' };
      if (Math.abs(p1.y - p2.y) > eps || Math.abs(p1.z - p2.z) > eps) {
        return { title: 'Incoherencia', message: 'P1 y P2 deben ser paralelos a L.T. (misma cota Y y mismo alejamiento Z).' };
      }
    } else if (t === 'proj_vertical' || t === 'canto') {
      if (actual === 'horizontal') return { title: 'Incoherencia', message: 'El plano se volvió Horizontal (cota constante).' };
      if (actual === 'profile') return { title: 'Incoherencia', message: 'El plano se volvió de Perfil (desviación constante).' };
      if (actual === 'frontal') return { title: 'Incoherencia', message: 'El plano se volvió Frontal (alejamiento constante).' };
      if (actual === 'oblique') return { title: 'Incoherencia', message: 'El plano dejó de ser de Canto (no es perpendicular al P.V.).' };
      if (Math.abs(p2.x - p3.x) > eps || Math.abs(p2.y - p3.y) > eps) {
        return { title: 'Incoherencia', message: 'P2 y P3 deben ser perpendiculares a P.V. (misma desviación X y misma cota Y).' };
      }
    } else if (t === 'proj_horizontal') {
      if (actual === 'frontal') return { title: 'Incoherencia', message: 'El plano se volvió Frontal (alejamiento constante).' };
      if (actual === 'profile') return { title: 'Incoherencia', message: 'El plano se volvió de Perfil (desviación constante).' };
      if (actual === 'horizontal') return { title: 'Incoherencia', message: 'El plano se volvió Horizontal (cota constante).' };
      if (actual === 'oblique') return { title: 'Incoherencia', message: 'El plano dejó de ser Vertical (no es perpendicular al P.H.).' };
      if (Math.abs(p2.x - p3.x) > eps || Math.abs(p2.z - p3.z) > eps) {
        return { title: 'Incoherencia', message: 'P2 y P3 deben ser perpendiculares a P.H. (misma desviación X y mismo alejamiento Z).' };
      }
    } else if (t === 'horizontal') {
      if (actual !== 'horizontal' || Math.abs(p1.y - p2.y) > eps || Math.abs(p1.y - p3.y) > eps) {
        return { title: 'Incoherencia', message: 'La cota (Y) debe ser idéntica en los 3 puntos para ser Plano Horizontal.' };
      }
    } else if (t === 'frontal') {
      if (actual !== 'frontal' || Math.abs(p1.z - p2.z) > eps || Math.abs(p1.z - p3.z) > eps) {
        return { title: 'Incoherencia', message: 'El alejamiento (Z) debe ser idéntico en los 3 puntos para ser Plano Frontal.' };
      }
    } else if (t === 'profile') {
      if (actual !== 'profile' || Math.abs(p1.x - p2.x) > eps || Math.abs(p1.x - p3.x) > eps) {
        return { title: 'Incoherencia', message: 'La desviación (X) debe ser idéntica en los 3 puntos para ser Plano de Perfil.' };
      }
    }
  } else if (state.mode === 'intersections') {
    const cfg = state.intersection, t = cfg.cuttingPlaneType;
    const epsAng = 1e-3;
    if (t === 'canto') {
      if (Math.abs(cfg.cutAngle) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Horizontal (0°).' };
      if (Math.abs(Math.abs(cfg.cutAngle) - 90) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió de Perfil (90°).' };
    } else if (t === 'proj_horizontal') {
      if (Math.abs(cfg.cutAngleBeta) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Frontal (0°).' };
      if (Math.abs(Math.abs(cfg.cutAngleBeta) - 90) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió de Perfil (90°).' };
    } else if (t === 'parallel_lt') {
      // In this parameterization α=0 gives z=constant (frontal), while
      // α=90 gives y=constant (horizontal).
      if (Math.abs(cfg.cutAngle) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Frontal (0°).' };
      if (Math.abs(Math.abs(cfg.cutAngle) - 90) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Horizontal (90°).' };
    } else if (t === 'oblique') {
      if (Math.abs(cfg.cutAngle) < epsAng && Math.abs(cfg.cutAngleBeta) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Horizontal (0°).' };
      if (Math.abs(cfg.cutAngle) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Vertical (proyectante horizontal).' };
      if (Math.abs(cfg.cutAngleBeta) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Plano de Canto.' };
    }
  } else if (state.mode === 'line_solid') {
    const { p1, p2 } = state.lineSolid;
    return validateLineGeometry(p1, p2, state.lineSolid.lineType);
  }
  return null;
}

// --- Resolución Analítica de Verdadera Magnitud (V.M.) ---

// 1. Abatimiento (Rebatimiento) sobre el Plano Horizontal (PH) alrededor de la traza α₁ (charnela)
function computePlaneAbatimiento(eq, points) {
  if (!points || points.length < 3) return null;
  const { A, B, C, D } = eq;
  const normXZ = Math.hypot(A, C);

  let uPerpX, uPerpZ;
  if (normXZ > 1e-5) {
    uPerpX = A / normXZ;
    uPerpZ = C / normXZ;
    if (uPerpZ < 0) {
      uPerpX = -uPerpX;
      uPerpZ = -uPerpZ;
    }
  } else {
    uPerpX = 0;
    uPerpZ = 1;
  }

  const uParX = -uPerpZ;
  const uParZ = uPerpX;

  const items = points.map((p, idx) => {
    const x0 = p.x, y0 = p.y, z0 = p.z;
    const isKey = (p.isKey !== undefined) ? p.isKey : (p.label !== undefined ? Boolean(p.label) : (points.length <= 8));
    let label = '';
    if (state.mode === 'planes') {
      label = p.label || (idx === 0 ? state.pointNames.p1 : idx === 1 ? state.pointNames.p2 : state.pointNames.p3);
    } else {
      label = (p.label !== undefined) ? p.label : (isKey ? `S${idx + 1}` : '');
    }

    let xf, zf, d, R, xAbat, zAbat, cotaPoint;

    if (normXZ > 1e-5) {
      const evalVal = A * x0 + C * z0 + D;
      d = Math.abs(evalVal) / normXZ;
      xf = x0 - (A * evalVal) / (normXZ * normXZ);
      zf = z0 - (C * evalVal) / (normXZ * normXZ);
      R = Math.sqrt(d * d + y0 * y0);
      xAbat = xf + R * uPerpX;
      zAbat = zf + R * uPerpZ;
      cotaPoint = {
        x: x0 + y0 * uParX,
        z: z0 + y0 * uParZ
      };
    } else {
      d = 0;
      xf = x0;
      zf = z0;
      R = y0;
      xAbat = x0;
      zAbat = z0;
      cotaPoint = { x: x0, z: z0 };
    }

    return {
      isKey,
      label,
      labelAbat: label ? `(${label})` : '',
      ptOriginal: { x: x0, y: y0, z: z0 },
      cota: y0,
      distToCharnela: d,
      foot: { x: xf, z: zf },
      radius: R,
      cotaPoint,
      ptAbat: { x: xAbat, z: zAbat }
    };
  });

  let perimeter = 0;
  const edges = [];
  for (let i = 0; i < items.length; i++) {
    const nextIdx = (i + 1) % items.length;
    const pA = items[i].ptOriginal, pB = items[nextIdx].ptOriginal;
    const len = Math.hypot(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
    edges.push({
      from: items[i].labelAbat,
      to: items[nextIdx].labelAbat,
      length: len
    });
    perimeter += len;
  }

  let areaVec = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < points.length; i++) {
    const p1 = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
    const p2 = new THREE.Vector3(points[(i + 1) % points.length].x, points[(i + 1) % points.length].y, points[(i + 1) % points.length].z);
    areaVec.add(new THREE.Vector3().crossVectors(p1, p2));
  }
  const area = 0.5 * areaVec.length();

  return {
    method: 'abatimiento',
    charnela: { type: 'PH', name: 'α₁', A, C, D },
    items,
    edges,
    perimeter,
    area
  };
}

// 2. Giro (Rotación) alrededor de un Eje en la Línea de Tierra (L.T.)
// Plano de Canto: Eje de punta en LT (E ⊥ PV), rota en PV a LT, viaja en PH (Z=cte), resuelve abajo en PH.
// Plano Vertical: Eje vertical en LT (E ⊥ PH), rota en PH a LT, viaja en PV (Y=cte), resuelve arriba en PV.
function computePlaneGiro(eq, points) {
  if (!points || points.length < 3) return null;
  const { A, B, C, D } = eq;

  // Determinar si es Plano de Canto (proyectante vertical) o Plano Vertical (proyectante horizontal)
  const isVertical = (
    (state.mode === 'planes' && state.planeType === 'proj_horizontal') ||
    (state.mode === 'intersections' && state.intersection.cuttingPlaneType === 'proj_horizontal') ||
    (Math.abs(B) < 1e-4 && Math.abs(C) > 1e-4)
  );
  const isCanto = (
    (state.mode === 'planes' && (state.planeType === 'canto' || state.planeType === 'proj_vertical')) ||
    (state.mode === 'intersections' && state.intersection.cuttingPlaneType === 'canto') ||
    (!isVertical && Math.abs(C) < 1e-4 && Math.abs(B) > 1e-4)
  );

  // Criterio: Solo Plano de Canto y Plano Vertical admiten resolución por Giro simple
  if (!isVertical && !isCanto) return null;

  // Punto de apoyo en la Línea de Tierra (LT): Vα = (-D/A, 0, 0)
  let x0 = 0;
  if (Math.abs(A) > 1e-5) {
    x0 = -D / A;
  } else {
    x0 = points[0].x;
  }
  const axis = { x: x0, y: 0, z: 0 };
  const targetPlane = isVertical ? 'PV' : 'PH';

  // Sentido de giro a lo largo de LT (mantener la figura en su lado natural respecto al vértice Vα)
  const sumDeltaX = points.reduce((acc, p) => acc + (p.x - x0), 0);
  const signDir = (sumDeltaX >= 0) ? 1 : -1;

  const items = points.map((p, idx) => {
    const isKey = (p.isKey !== undefined) ? p.isKey : (p.label !== undefined ? Boolean(p.label) : (points.length <= 8));
    let label = '';
    if (state.mode === 'planes') {
      label = p.label || (idx === 0 ? state.pointNames.p1 : idx === 1 ? state.pointNames.p2 : state.pointNames.p3);
    } else {
      label = (p.label !== undefined) ? p.label : (isKey ? `S${idx + 1}` : '');
    }

    const dx = p.x - x0;
    const deltaX = Math.abs(dx);

    let R, deltaAux, xGir, yGir, zGir;

    if (isVertical) {
      // Plano Vertical: Eje vertical E ⊥ PH apoyado en LT (x0, 0, 0).
      // Centro en PH: E1(x0, 0) sobre la LT.
      // Radio de giro en PH: R = √(Δx² + z²)
      const dz = p.z;
      deltaAux = Math.abs(dz);
      R = Math.hypot(dx, dz);

      // Rotación en PH alrededor de E1 hasta la Línea de Tierra (z=0)
      xGir = x0 + signDir * R;
      zGir = 0;

      // En PV: Como el eje es vertical (⊥ PH), la rotación ocurre en un plano ∥ al PH.
      // Cota Y estrictamente constante (y' = y)
      yGir = p.y;
    } else {
      // Plano de Canto: Eje de punta E ⊥ PV apoyado en LT (x0, 0, 0).
      // Centro en PV: E2(x0, 0) sobre la LT.
      // Radio de giro en PV: R = √(Δx² + y²)
      const dy = p.y;
      deltaAux = Math.abs(dy);
      R = Math.hypot(dx, dy);

      // Rotación en PV alrededor de E2 hasta la Línea de Tierra (y=0)
      xGir = x0 + signDir * R;
      yGir = 0;

      // En PH: Como el eje es de punta (⊥ PV), la rotación ocurre en un plano ∥ al PV.
      // Alejamiento Z estrictamente constante (z' = z)
      zGir = p.z;
    }

    return {
      isKey,
      label,
      labelGir: label ? `${label}'` : '',
      ptOriginal: { x: p.x, y: p.y, z: p.z },
      deltaX,
      deltaAux,
      deltaY: isVertical ? 0 : deltaAux,
      deltaZ: isVertical ? deltaAux : 0,
      rPV: R,
      rGiro: R,
      xGir,
      yGir,
      zGir,
      ptGirPV: { x: xGir, y: isVertical ? p.y : 0 },
      ptGirPH: { x: xGir, z: isVertical ? 0 : p.z }
    };
  });

  let perimeter = 0;
  const edges = [];
  for (let i = 0; i < items.length; i++) {
    const nextIdx = (i + 1) % items.length;
    const pA = items[i].ptOriginal, pB = items[nextIdx].ptOriginal;
    const len = Math.hypot(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
    edges.push({
      from: items[i].labelGir,
      to: items[nextIdx].labelGir,
      length: len
    });
    perimeter += len;
  }

  let areaVec = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < points.length; i++) {
    const p1 = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
    const p2 = new THREE.Vector3(points[(i + 1) % points.length].x, points[(i + 1) % points.length].y, points[(i + 1) % points.length].z);
    areaVec.add(new THREE.Vector3().crossVectors(p1, p2));
  }
  const area = 0.5 * areaVec.length();

  return {
    method: 'giro',
    targetPlane,
    isVertical,
    isCanto,
    axis,
    signDir,
    items,
    edges,
    perimeter,
    area
  };
}
