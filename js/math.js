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
      const figH = fig.H || H, figR = fig.R || 3.2, N = fig.sides || 4;
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
          ? { x: fig.slantX || 2.0, y: (basePlane === 'PV' ? (fig.slantZ || -2.0) : 0), z: (basePlane === 'PH' ? (fig.slantZ || -2.0) : 0) }
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
    const c = solid.c, R = solid.R, H = solid.H;
    const apex = { x: c.x, y: H, z: c.z };
    const dApex = evalPt(apex);
    const L = Math.hypot(A, C);

    let cutsBase = false;
    let pBase1 = null, pBase2 = null;
    let a1 = 0, a2 = 0;

    if (L > 1e-7) {
      const d0 = (A * c.x + C * c.z + D) / L;
      if (Math.abs(d0) <= R * 0.999999) {
        cutsBase = true;
        const h0 = Math.sqrt(Math.max(0, R * R - d0 * d0));
        const nx = A / L, nz = C / L;
        const px = c.x - d0 * nx, pz = c.z - d0 * nz;
        const tx = -nz, tz = nx;

        pBase1 = new THREE.Vector3(px + h0 * tx, 0, pz + h0 * tz);
        pBase2 = new THREE.Vector3(px - h0 * tx, 0, pz - h0 * tz);
        a1 = Math.atan2(pBase1.z - c.z, pBase1.x - c.x);
        a2 = Math.atan2(pBase2.z - c.z, pBase2.x - c.x);
      }
    }

    if (cutsBase) {
      if (Math.abs(dApex) < 1e-6) {
        const K = 12;
        for (let i = 0; i <= K; i++) {
          const s = i / K;
          results.push({
            pt: new THREE.Vector3(pBase1.x + s * (pBase2.x - pBase1.x), 0, pBase1.z + s * (pBase2.z - pBase1.z)),
            name3D: (i === 0 ? 'S1' : (i === K ? 'S2' : '')),
            namePV: (i === 0 ? 'S12' : (i === K ? 'S22' : '')),
            namePH: (i === 0 ? 'S11' : (i === K ? 'S21' : '')),
            type: 'base'
          });
        }
        for (let i = 1; i <= K; i++) {
          const s = i / K;
          results.push({
            pt: new THREE.Vector3(pBase1.x + s * (apex.x - pBase1.x), s * H, pBase1.z + s * (apex.z - pBase1.z)),
            name3D: (i === K ? 'SV' : ''),
            namePV: (i === K ? 'SV2' : ''),
            namePH: (i === K ? 'SV1' : ''),
            type: (i === K ? 'apex' : 'edge')
          });
        }
        for (let i = 1; i < K; i++) {
          const s = i / K;
          results.push({
            pt: new THREE.Vector3(pBase2.x + s * (apex.x - pBase2.x), s * H, pBase2.z + s * (apex.z - pBase2.z)),
            name3D: '', namePV: '', namePH: '', type: 'edge'
          });
        }
      } else {
        let dAngle = a2 - a1;
        while (dAngle < 0) dAngle += 2 * Math.PI;
        while (dAngle >= 2 * Math.PI) dAngle -= 2 * Math.PI;

        const mid1 = a1 + dAngle / 2;
        const bPtMid1 = { x: c.x + R * Math.cos(mid1), y: 0, z: c.z + R * Math.sin(mid1) };
        const dMid1 = evalPt(bPtMid1);

        let startAngle, sweepAngle;
        if (dMid1 * dApex < 0) {
          startAngle = a1; sweepAngle = dAngle;
        } else {
          startAngle = a2; sweepAngle = 2 * Math.PI - dAngle;
        }

        const M = 64;
        for (let i = 0; i <= M; i++) {
          const theta = startAngle + (i / M) * sweepAngle;
          const bPt = { x: c.x + R * Math.cos(theta), y: 0, z: c.z + R * Math.sin(theta) };
          const pt = (i === 0) ? pBase1.clone() : ((i === M) ? pBase2.clone() : intersectSeg(bPt, apex));
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
            pt: new THREE.Vector3(pBase2.x + s * (pBase1.x - pBase2.x), 0, pBase2.z + s * (pBase1.z - pBase2.z)),
            name3D: '', namePV: '', namePH: '', type: 'base'
          });
        }
      }
    } else {
      const N = 72;
      for (let i = 0; i < N; i++) {
        const angle = (i * 2 * Math.PI) / N;
        const bPt = { x: c.x + R * Math.cos(angle), y: 0, z: c.z + R * Math.sin(angle) };
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
    const L = Math.hypot(A, C);

    if (Math.abs(B) < 1e-7) {
      if (L > 1e-7) {
        const d0 = (A * c.x + C * c.z + D) / L;
        if (Math.abs(d0) <= R * 0.999999) {
          const h0 = Math.sqrt(Math.max(0, R * R - d0 * d0));
          const nx = A / L, nz = C / L;
          const px = c.x - d0 * nx, pz = c.z - d0 * nz;
          const tx = -nz, tz = nx;
          const p1 = new THREE.Vector3(px + h0 * tx, 0, pz + h0 * tz);
          const p2 = new THREE.Vector3(px - h0 * tx, 0, pz - h0 * tz);
          const K = 12;
          for (let i = 0; i <= K; i++) {
            const s = i / K;
            results.push({ pt: new THREE.Vector3(p1.x + s * (p2.x - p1.x), 0, p1.z + s * (p2.z - p1.z)), name3D: (i === 0 ? 'S1' : (i === K ? 'S2' : '')), namePV: (i === 0 ? 'S12' : (i === K ? 'S22' : '')), namePH: (i === 0 ? 'S11' : (i === K ? 'S21' : '')), type: 'base' });
            results.push({ pt: new THREE.Vector3(p1.x, s * H, p1.z), name3D: (i === K ? 'S4' : ''), namePV: (i === K ? 'S42' : ''), namePH: (i === K ? 'S41' : ''), type: 'edge' });
            results.push({ pt: new THREE.Vector3(p2.x, s * H, p2.z), name3D: (i === K ? 'S3' : ''), namePV: (i === K ? 'S32' : ''), namePH: (i === K ? 'S31' : ''), type: 'edge' });
            results.push({ pt: new THREE.Vector3(p1.x + s * (p2.x - p1.x), H, p1.z + s * (p2.z - p1.z)), name3D: '', namePV: '', namePH: '', type: 'base' });
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
        if (y >= -1e-4 && y <= H + 1e-4) {
          const isKey = (i % 24 === 0);
          const tagIdx = Math.floor(i / 24) + 1;
          results.push({
            pt: new THREE.Vector3(x, Math.max(0, Math.min(H, y)), z),
            name3D: isKey ? (`S${tagIdx}`) : '',
            namePV: isKey ? (`S${tagIdx}2`) : '',
            namePH: isKey ? (`S${tagIdx}1`) : '',
            type: 'edge'
          });
        }
      }
      if (L > 1e-7) {
        const d0 = (A * c.x + C * c.z + D) / L;
        if (Math.abs(d0) <= R * 0.999999) {
          const h0 = Math.sqrt(Math.max(0, R * R - d0 * d0));
          const nx = A / L, nz = C / L;
          const px = c.x - d0 * nx, pz = c.z - d0 * nz;
          const tx = -nz, tz = nx;
          const p1 = new THREE.Vector3(px + h0 * tx, 0, pz + h0 * tz);
          const p2 = new THREE.Vector3(px - h0 * tx, 0, pz - h0 * tz);
          const K = 12;
          for (let i = 0; i <= K; i++) {
            const s = i / K;
            results.push({ pt: new THREE.Vector3(p1.x + s * (p2.x - p1.x), 0, p1.z + s * (p2.z - p1.z)), name3D: (i === 0 ? 'S1' : (i === K ? 'S2' : '')), namePV: (i === 0 ? 'S12' : (i === K ? 'S22' : '')), namePH: (i === 0 ? 'S11' : (i === K ? 'S21' : '')), type: 'base' });
          }
        }
        const dH = (A * c.x + B * H + C * c.z + D) / L;
        if (Math.abs(dH) <= R * 0.999999) {
          const hH = Math.sqrt(Math.max(0, R * R - dH * dH));
          const nx = A / L, nz = C / L;
          const px = c.x - dH * nx, pz = c.z - dH * nz;
          const tx = -nz, tz = nx;
          const p1 = new THREE.Vector3(px + hH * tx, H, pz + hH * tz);
          const p2 = new THREE.Vector3(px - hH * tx, H, pz - hH * tz);
          const K = 12;
          for (let i = 0; i <= K; i++) {
            const s = i / K;
            results.push({ pt: new THREE.Vector3(p1.x + s * (p2.x - p1.x), H, p1.z + s * (p2.z - p1.z)), name3D: (i === 0 ? 'S3' : (i === K ? 'S4' : '')), namePV: (i === 0 ? 'S32' : (i === K ? 'S42' : '')), namePH: (i === 0 ? 'S31' : (i === K ? 'S41' : '')), type: 'base' });
          }
        }
      }
    }
  }

  if (results.length < 3) return null;
  const unique = [];
  results.forEach(r => { if (!unique.some(u => u.pt.distanceTo(r.pt) < 1e-2)) unique.push(r); });
  if (unique.length < 3) return null;

  const center = new THREE.Vector3();
  unique.forEach(u => center.add(u.pt));
  center.divideScalar(unique.length);

  const normal = new THREE.Vector3(A, B, C).normalize();
  let u = new THREE.Vector3().subVectors(unique[0].pt, center).normalize();
  if (u.lengthSq() < 1e-4) u = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
  if (u.lengthSq() < 1e-4) u = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 0, 1)).normalize();
  const v = new THREE.Vector3().crossVectors(normal, u).normalize();

  unique.sort((a, b) => Math.atan2(new THREE.Vector3().subVectors(a.pt, center).dot(v), new THREE.Vector3().subVectors(a.pt, center).dot(u)) -
                       Math.atan2(new THREE.Vector3().subVectors(b.pt, center).dot(v), new THREE.Vector3().subVectors(b.pt, center).dot(u)));
  return { items: unique, center };
}

// Validación geométrica de invariantes para rectas, planos e intersecciones
function validateCurrentGeometry() {
  const eps = 0.2;
  if (state.mode === 'lines') {
    const { p1, p2 } = state.line;
    const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z, t = state.lineType;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < eps) return { title: 'Puntos coincidentes', message: 'La recta degenera en un punto.' };
    if (t === 'oblique') {
      if (Math.abs(dy) <= eps && Math.abs(dz) <= eps) return { title: 'Incoherencia', message: 'Degenera en paralela a L.T.' };
      if (Math.abs(dy) <= eps) return { title: 'Incoherencia', message: 'Se convierte en Horizontal.' };
      if (Math.abs(dz) <= eps) return { title: 'Incoherencia', message: 'Se convierte en Frontal.' };
      if (Math.abs(dx) <= eps) return { title: 'Incoherencia', message: 'Se convierte en De perfil.' };
    }
    if (t === 'horizontal' && Math.abs(dy) > eps) return { title: 'Incoherencia', message: 'Cota (Y) debe ser constante.' };
    if (t === 'frontal' && Math.abs(dz) > eps) return { title: 'Incoherencia', message: 'Alejamiento (Z) debe ser constante.' };
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
      if (Math.abs(cfg.cutAngle) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Horizontal (0°).' };
      if (Math.abs(Math.abs(cfg.cutAngle) - 90) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Frontal (90°).' };
    } else if (t === 'oblique') {
      if (Math.abs(cfg.cutAngle) < epsAng && Math.abs(cfg.cutAngleBeta) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Horizontal (0°).' };
      if (Math.abs(cfg.cutAngle) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Vertical (proyectante horizontal).' };
      if (Math.abs(cfg.cutAngleBeta) < epsAng) return { title: 'Incoherencia', message: 'El plano se volvió Plano de Canto.' };
    }
  }
  return null;
}

