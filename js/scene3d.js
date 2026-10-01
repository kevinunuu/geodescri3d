/**
 * GeoDescri3D - Motor de Escena 3D Three.js, Luces, Cámaras y Renderizado
 */

function initThree() {
  const container = document.getElementById('canvas3dContainer');
  const width = container.clientWidth, height = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f6fb);
  const aspect = width / height, frustumSize = 25;
  camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, -100, 500);
  camera.position.set(19, 16, 23);
  camera.lookAt(0, 4.5, 4.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 4.5, 4.5);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 0.9));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
  dirLight.position.set(20, 35, 25);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x0284c7, 0.35);
  fillLight.position.set(-20, 10, -20);
  scene.add(fillLight);

  planesGroup = new THREE.Group();
  mainObjectsGroup = new THREE.Group();
  scene.add(planesGroup);
  scene.add(mainObjectsGroup);

  buildProjectionPlanes();
  epuraCanvas = document.getElementById('epuraCanvas');
  epuraCtx = epuraCanvas.getContext('2d');

  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    const aspect = w / h;
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function disposeObject(obj) {
  if (!obj) return;
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    } else {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  }
  if (obj.children && obj.children.length > 0) {
    while (obj.children.length > 0) {
      const child = obj.children[0];
      obj.remove(child);
      disposeObject(child);
    }
  }
}

function clearGroup(group) {
  if (!group) return;
  while (group.children.length > 0) {
    const obj = group.children[0];
    group.remove(obj);
    disposeObject(obj);
  }
}

function buildProjectionPlanes() {
  clearGroup(planesGroup);
  const w = state.widthLT, h = state.heightPV, d = state.depthPH;

  const matPV = new THREE.MeshStandardMaterial({
    color: 0xeaf4fc,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const pvMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matPV);
  pvMesh.position.set(0, h / 2, 0);
  pvMesh.renderOrder = 1;
  planesGroup.add(pvMesh);

  const gridPV = new THREE.GridHelper(w, 18, 0xbae6fd, 0xbae6fd);
  gridPV.rotation.x = Math.PI / 2;
  gridPV.position.set(0, h / 2, 0.01);
  gridPV.renderOrder = 2;
  planesGroup.add(gridPV);

  const phMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matPV);
  phMesh.rotation.x = -Math.PI / 2;
  phMesh.position.set(0, 0, d / 2);
  phMesh.renderOrder = 1;
  planesGroup.add(phMesh);

  const gridPH = new THREE.GridHelper(w, 18, 0xbae6fd, 0xbae6fd);
  gridPH.position.set(0, 0.01, d / 2);
  gridPH.renderOrder = 2;
  planesGroup.add(gridPH);

  const ltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, w, 24), new THREE.MeshStandardMaterial({ color: 0x0038a8 }));
  ltMesh.rotation.z = Math.PI / 2;
  planesGroup.add(ltMesh);

  planesGroup.add(createMoldedCornerBadge3D("PV", 1.6, 0.7, "rgba(240,249,255,0.95)", "#0038a8", -w / 2 + 1.2, h - 0.6, 0.02));
  planesGroup.add(createMoldedCornerBadge3D("PH", 1.6, 0.7, "rgba(224,242,254,0.95)", "#0284c7", -w / 2 + 1.2, 0.02, d - 0.6, -Math.PI / 2));
}

function createTechnicalRay(p1, p2, col, targetGroup = mainObjectsGroup) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), new THREE.LineDashedMaterial({ color: col, dashSize: 0.2, gapSize: 0.15 }));
  l.computeLineDistances();
  targetGroup.add(l);
}

function createMoldedCornerBadge3D(text, w, h, bgCol, fgCol, x, y, z, rotX = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgCol;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, 128, 64, 16); else ctx.rect(0, 0, 128, 64);
  ctx.fill();
  ctx.strokeStyle = fgCol;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.font = "bold 32px 'Century Gothic', sans-serif";
  ctx.fillStyle = fgCol;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 34);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.2, metalness: 0.1 }));
  mesh.position.set(x, y, z);
  if (rotX !== 0) mesh.rotation.x = rotX;
  return mesh;
}

function createMinimalPointTag(txt, sub, col, x, y, z) {
  const displayTxt = formatGeomLabel(txt || '');
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  const charCount = Math.max(1, displayTxt.length);
  const cWidth = Math.max(140, Math.ceil(charCount * 30 + 64));
  const cHeight = 88;
  c.width = cWidth;
  c.height = cHeight;

  const pad = 6;
  const rw = cWidth - pad * 2, rh = cHeight - pad * 2, rad = 18;

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.22)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(pad, pad, rw, rh, rad);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pad + rad, pad);
    ctx.lineTo(pad + rw - rad, pad);
    ctx.quadraticCurveTo(pad + rw, pad, pad + rw, pad + rad);
    ctx.lineTo(pad + rw, pad + rh - rad);
    ctx.quadraticCurveTo(pad + rw, pad + rh, pad + rw - rad, pad + rh);
    ctx.lineTo(pad + rad, pad + rh);
    ctx.quadraticCurveTo(pad, pad + rh, pad, pad + rh - rad);
    ctx.lineTo(pad, pad + rad);
    ctx.quadraticCurveTo(pad, pad, pad + rad, pad);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = col || "#002d72";
  ctx.lineWidth = 3.5;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(pad, pad, rw, rh, rad);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(pad + rad, pad);
    ctx.lineTo(pad + rw - rad, pad);
    ctx.quadraticCurveTo(pad + rw, pad, pad + rw, pad + rad);
    ctx.lineTo(pad + rw, pad + rh - rad);
    ctx.quadraticCurveTo(pad + rw, pad + rh, pad + rw - rad, pad + rh);
    ctx.lineTo(pad + rad, pad + rh);
    ctx.quadraticCurveTo(pad, pad + rh, pad, pad + rh - rad);
    ctx.lineTo(pad, pad + rad);
    ctx.quadraticCurveTo(pad, pad, pad + rad, pad);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.font = "bold 38px 'JetBrains Mono', 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = col || "#002d72";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(displayTxt, cWidth / 2, cHeight / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: true,
    depthWrite: false,
    transparent: true
  });
  const s = new THREE.Sprite(mat);
  s.renderOrder = 12;
  const worldH = 0.65;
  const worldW = worldH * (cWidth / cHeight);
  s.scale.set(worldW, worldH, 1);
  s.position.set(x, y, z);
  return s;
}

function animateCameraTo(targetPos, targetLookAt, duration = 380) {
  if (cameraAnimId) cancelAnimationFrame(cameraAnimId);
  camera.up.set(0, 1, 0);
  controls.enabled = false;

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(startPos, targetPos, ease);
    controls.target.lerpVectors(startTarget, targetLookAt, ease);
    controls.update();

    if (progress < 1) {
      cameraAnimId = requestAnimationFrame(step);
    } else {
      camera.position.copy(targetPos);
      controls.target.copy(targetLookAt);
      controls.update();
      controls.enabled = true;
      cameraAnimId = null;
    }
  }
  cameraAnimId = requestAnimationFrame(step);
}

function updateActiveViewBtn(activeId) {
  ['btnView3D', 'btnViewFront', 'btnViewTop'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (id === activeId) {
      btn.className = "view-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all bg-blue-600 text-white shadow-sm";
    } else {
      btn.className = "view-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all text-slate-600 hover:text-blue-700";
    }
  });
}

function renderLineGeometry() {
  const p1 = state.line.p1, p2 = state.line.p2, err = state.validationError;
  const cMain = err ? 0xef4444 : 0x0077e6, cPV = err ? 0xef4444 : 0x0038a8, cPH = err ? 0xf87171 : 0x0284c7;
  
  const v1 = new THREE.Vector3(p1.x, p1.y, p1.z), v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
  const v1_pv = new THREE.Vector3(p1.x, p1.y, 0.02), v2_pv = new THREE.Vector3(p2.x, p2.y, 0.02);
  const v1_ph = new THREE.Vector3(p1.x, 0.02, p1.z), v2_ph = new THREE.Vector3(p2.x, 0.02, p2.z);
  
  if (v1.distanceTo(v2) > 0.05) mainObjectsGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(v1, v2), 20, 0.13, 8), new THREE.MeshStandardMaterial({ color: cMain })));
  mainObjectsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([v1_pv, v2_pv]), new THREE.LineBasicMaterial({ color: cPV, linewidth: 2 })));
  mainObjectsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([v1_ph, v2_ph]), new THREE.LineBasicMaterial({ color: cPH, linewidth: 2 })));

  createTechnicalRay(v1, v1_pv, cPH); createTechnicalRay(v1, v1_ph, cPH);
  createTechnicalRay(v2, v2_pv, cPH); createTechnicalRay(v2, v2_ph, cPH);
  
  const v1_lt = new THREE.Vector3(p1.x, 0.02, 0.02), v2_lt = new THREE.Vector3(p2.x, 0.02, 0.02);
  createTechnicalRay(v1_pv, v1_lt, 0x94a3b8); createTechnicalRay(v1_ph, v1_lt, 0x94a3b8);
  createTechnicalRay(v2_pv, v2_lt, 0x94a3b8); createTechnicalRay(v2_ph, v2_lt, 0x94a3b8);

  const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), new THREE.MeshBasicMaterial({ color: cMain })); s1.position.copy(v1); mainObjectsGroup.add(s1);
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), new THREE.MeshBasicMaterial({ color: cMain })); s2.position.copy(v2); mainObjectsGroup.add(s2);
  const s1_pv = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: cPV })); s1_pv.position.copy(v1_pv); mainObjectsGroup.add(s1_pv);
  const s2_pv = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: cPV })); s2_pv.position.copy(v2_pv); mainObjectsGroup.add(s2_pv);
  const s1_ph = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: cPH })); s1_ph.position.copy(v1_ph); mainObjectsGroup.add(s1_ph);
  const s2_ph = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: cPH })); s2_ph.position.copy(v2_ph); mainObjectsGroup.add(s2_ph);

  const dz = p2.z - p1.z, dy = p2.y - p1.y, dx = p2.x - p1.x;
  if (Math.abs(dz) > 1e-4) {
    const tV = -p1.z / dz;
    const xV = p1.x + tV * dx, yV = p1.y + tV * dy;
    if (yV >= 0 && yV <= state.heightPV && Math.abs(xV) <= state.widthLT / 2) {
      const vPt = new THREE.Vector3(xV, yV, 0.02);
      const vMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0038a8 }));
      vMesh.position.copy(vPt); mainObjectsGroup.add(vMesh);
      mainObjectsGroup.add(createMinimalPointTag("V₂", "Traza PV", "#0038a8", xV, yV + 0.55, 0.08));
      createTechnicalRay(vPt, new THREE.Vector3(xV, 0.02, 0.02), 0x94a3b8);
    }
  }
  if (Math.abs(dy) > 1e-4) {
    const tH = -p1.y / dy;
    const xH = p1.x + tH * dx, zH = p1.z + tH * dz;
    if (zH >= 0 && zH <= state.depthPH && Math.abs(xH) <= state.widthLT / 2) {
      const hPt = new THREE.Vector3(xH, 0.02, zH);
      const hMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
      hMesh.position.copy(hPt); mainObjectsGroup.add(hMesh);
      mainObjectsGroup.add(createMinimalPointTag("H₁", "Traza PH", "#0284c7", xH, 0.08, zH + 0.65));
      createTechnicalRay(hPt, new THREE.Vector3(xH, 0.02, 0.02), 0x94a3b8);
    }
  }

  const nA = state.pointNames.p1, nB = state.pointNames.p2;
  mainObjectsGroup.add(createMinimalPointTag(nA, "Espacio", "#002d72", v1.x, v1.y + 0.65, v1.z));
  mainObjectsGroup.add(createMinimalPointTag(nB, "Espacio", "#002d72", v2.x, v2.y + 0.65, v2.z));
  mainObjectsGroup.add(createMinimalPointTag(`${nA}2`, "Alzado (PV)", "#0ea5e9", v1_pv.x, v1_pv.y + 0.55, 0.08));
  mainObjectsGroup.add(createMinimalPointTag(`${nB}2`, "Alzado (PV)", "#0ea5e9", v2_pv.x, v2_pv.y + 0.55, 0.08));
  mainObjectsGroup.add(createMinimalPointTag(`${nA}1`, "Planta (PH)", "#38bdf8", v1_ph.x, 0.08, v1_ph.z + 0.65));
  mainObjectsGroup.add(createMinimalPointTag(`${nB}1`, "Planta (PH)", "#38bdf8", v2_ph.x, 0.08, v2_ph.z + 0.65));

  document.getElementById('legendTitle').textContent = `Recta ${nA} — ${nB}`;
  updateLineAnalysisMetrics(p1, p2, nA, nB);
}

function renderPlaneGeometry() {
  const p1 = state.plane.p1, p2 = state.plane.p2, p3 = state.plane.p3, err = state.validationError;
  const eq = computePlaneEquation(p1, p2, p3);
  
  const v = [new THREE.Vector3(p1.x, p1.y, p1.z), new THREE.Vector3(p2.x, p2.y, p2.z), new THREE.Vector3(p3.x, p3.y, p3.z)];
  const geom = new THREE.BufferGeometry().setFromPoints(v);
  geom.setIndex([0, 1, 2]);
  geom.computeVertexNormals();
  
  const triMesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
    color: err ? 0xef4444 : 0x1e3a8a,
    emissive: err ? 0x7f1d1d : 0x0c2560,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false
  }));
  triMesh.renderOrder = 12;
  mainObjectsGroup.add(triMesh);
  mainObjectsGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(v), new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 2.5 })));

  const v_pv = v.map(p => new THREE.Vector3(p.x, p.y, 0.02));
  const v_ph = v.map(p => new THREE.Vector3(p.x, 0.02, p.z));
  mainObjectsGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(v_pv), new THREE.LineBasicMaterial({ color: 0x0ea5e9, linewidth: 2 })));
  mainObjectsGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(v_ph), new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })));
  v.forEach((pt, i) => {
    createTechnicalRay(pt, v_pv[i], 0x94a3b8);
    createTechnicalRay(pt, v_ph[i], 0x94a3b8);
    const dot3D = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), new THREE.MeshBasicMaterial({ color: 0x002d72 })); dot3D.position.copy(pt); mainObjectsGroup.add(dot3D);
    const dotPV = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0ea5e9 })); dotPV.position.copy(v_pv[i]); mainObjectsGroup.add(dotPV);
    const dotPH = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); dotPH.position.copy(v_ph[i]); mainObjectsGroup.add(dotPH);
  });

  const nA = state.pointNames.p1, nB = state.pointNames.p2, nC = state.pointNames.p3;
  const pMode = state.planeLabelsMode || 'all';
  if (pMode === 'plane' || pMode === 'all') {
    mainObjectsGroup.add(createMinimalPointTag(nA, "Espacio", "#002d72", v[0].x, v[0].y + 0.65, v[0].z));
    mainObjectsGroup.add(createMinimalPointTag(nB, "Espacio", "#002d72", v[1].x, v[1].y + 0.65, v[1].z));
    mainObjectsGroup.add(createMinimalPointTag(nC, "Espacio", "#002d72", v[2].x, v[2].y + 0.65, v[2].z));
  }
  if (pMode === 'all') {
    mainObjectsGroup.add(createMinimalPointTag(`${nA}2`, "Alzado (PV)", "#0ea5e9", v_pv[0].x, v_pv[0].y + 0.55, 0.08));
    mainObjectsGroup.add(createMinimalPointTag(`${nB}2`, "Alzado (PV)", "#0ea5e9", v_pv[1].x, v_pv[1].y + 0.55, 0.08));
    mainObjectsGroup.add(createMinimalPointTag(`${nC}2`, "Alzado (PV)", "#0ea5e9", v_pv[2].x, v_pv[2].y + 0.55, 0.08));
    mainObjectsGroup.add(createMinimalPointTag(`${nA}1`, "Planta (PH)", "#38bdf8", v_ph[0].x, 0.08, v_ph[0].z + 0.65));
    mainObjectsGroup.add(createMinimalPointTag(`${nB}1`, "Planta (PH)", "#38bdf8", v_ph[1].x, 0.08, v_ph[1].z + 0.65));
    mainObjectsGroup.add(createMinimalPointTag(`${nC}1`, "Planta (PH)", "#38bdf8", v_ph[2].x, 0.08, v_ph[2].z + 0.65));
  }

  buildPlaneTracesAndExpansion(eq);
  document.getElementById('legendTitle').textContent = `Plano Δ ${nA}${nB}${nC}`;
  updatePlaneAnalysisMetrics(eq);
}

function buildPlaneTracesAndExpansion(eq) {
  if (state.planeExpanded) {
    const cut = computePlaneBoxIntersection(eq, -state.widthLT / 2, state.widthLT / 2, 0, state.heightPV, 0, state.depthPH);
    if (cut && cut.polygon && cut.polygon.length >= 3) {
      const pos = [];
      for (let i = 0; i < cut.polygon.length; i++) {
        pos.push(cut.center.x, cut.center.y, cut.center.z);
        pos.push(cut.polygon[i].x, cut.polygon[i].y, cut.polygon[i].z);
        pos.push(cut.polygon[(i + 1) % cut.polygon.length].x, cut.polygon[(i + 1) % cut.polygon.length].y, cut.polygon[(i + 1) % cut.polygon.length].z);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        emissive: 0x0a1a45,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1
      }));
      mesh.renderOrder = 12;
      mainObjectsGroup.add(mesh);
      mainObjectsGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(cut.polygon), new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })));
    }
  }

  const tracePV = computeTraceSegment(eq.A, eq.B, eq.C, eq.D, true, state.widthLT / 2, state.heightPV);
  if (tracePV) {
    mainObjectsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tracePV), new THREE.LineBasicMaterial({ color: 0x0ea5e9, linewidth: 3.5 })));
    const midPV = new THREE.Vector3().addVectors(tracePV[0], tracePV[1]).multiplyScalar(0.5);
    if (state.planeLabelsMode !== 'off') {
      mainObjectsGroup.add(createMinimalPointTag("α₂", "Traza PV", "#0ea5e9", midPV.x, midPV.y + 0.55, 0.08));
    }
  }
  const tracePH = computeTraceSegment(eq.A, eq.B, eq.C, eq.D, false, state.widthLT / 2, state.depthPH);
  if (tracePH) {
    mainObjectsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tracePH), new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3.5 })));
    const midPH = new THREE.Vector3().addVectors(tracePH[0], tracePH[1]).multiplyScalar(0.5);
    if (state.planeLabelsMode !== 'off') {
      mainObjectsGroup.add(createMinimalPointTag("α₁", "Traza PH", "#38bdf8", midPH.x, 0.08, midPH.z + 0.65));
    }
  }
}

function renderIntersectionSection() {
  const solid = getSolidGeometryDefinition('intersection');
  const eq = getActivePlaneEquation();
  const cfg = state.intersection;
  const sGrp = new THREE.Group(), pGrp = new THREE.Group(), secGrp = new THREE.Group();

  const rep = createSolid3DRepresentation(solid);
  sGrp.add(rep.group);

  const cut = computePlaneBoxIntersection(eq, -9, 9, 0, 12, 0, 12);
  if (cut && cut.polygon && cut.polygon.length >= 3) {
    const pos = [];
    for (let i = 0; i < cut.polygon.length; i++) {
      pos.push(cut.center.x, cut.center.y, cut.center.z);
      pos.push(cut.polygon[i].x, cut.polygon[i].y, cut.polygon[i].z);
      pos.push(cut.polygon[(i + 1) % cut.polygon.length].x, cut.polygon[(i + 1) % cut.polygon.length].y, cut.polygon[(i + 1) % cut.polygon.length].z);
    }
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    const pGeom = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    pGeom.computeVertexNormals();
    const pMesh = new THREE.Mesh(pGeom, pMat);
    pMesh.renderOrder = 12;
    pGrp.add(pMesh);
    pGrp.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(cut.polygon), new THREE.LineBasicMaterial({ color: 0x0038a8, linewidth: 2 })));
  }

  const sectionData = computeSolidIntersection(solid, eq);
  if (sectionData && sectionData.items && sectionData.items.length >= 3) {
    const items = sectionData.items, pts = items.map(it => it.pt);
    const sPos = [];
    for (let i = 0; i < pts.length; i++) {
      sPos.push(sectionData.center.x, sectionData.center.y, sectionData.center.z);
      sPos.push(pts[i].x, pts[i].y, pts[i].z);
      sPos.push(pts[(i + 1) % pts.length].x, pts[(i + 1) % pts.length].y, pts[(i + 1) % pts.length].z);
    }
    const secGeom = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
    secGeom.computeVertexNormals();
    const secMesh = new THREE.Mesh(secGeom, new THREE.MeshStandardMaterial({
      color: 0x002d72,
      emissive: 0x00173d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    }));
    secMesh.renderOrder = 12;
    secGrp.add(secMesh);
    secGrp.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 3 })));

    const lMode = cfg.labelsMode || (cfg.showSectionLabels ? 'plane' : 'off');
    if (lMode !== 'off') {
      items.forEach((it, idx) => {
        const ptPV = new THREE.Vector3(it.pt.x, it.pt.y, 0.02);
        const ptPH = new THREE.Vector3(it.pt.x, 0.02, it.pt.z);
        
        if (lMode === 'all') {
          createTechnicalRay(it.pt, ptPV, 0x94a3b8, secGrp);
          createTechnicalRay(it.pt, ptPH, 0x94a3b8, secGrp);
        }

        const hasName = Boolean(it.name3D);
        if (hasName || items.length <= 8 || idx % Math.max(1, Math.floor(items.length / 6)) === 0) {
          const name3D = it.name3D || `S${idx + 1}`;
          const namePV = it.namePV || `${name3D}2`;
          const namePH = it.namePH || `${name3D}1`;

          if (lMode === 'plane' || lMode === 'all') {
            const sph = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x002d72 }));
            sph.position.copy(it.pt);
            secGrp.add(sph);
            secGrp.add(createMinimalPointTag(name3D, "Sección", "#002d72", it.pt.x, it.pt.y + 0.55, it.pt.z));
          }
          if (lMode === 'all') {
            const sphPV = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }));
            sphPV.position.copy(ptPV);
            secGrp.add(sphPV);
            const sphPH = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
            sphPH.position.copy(ptPH);
            secGrp.add(sphPH);

            secGrp.add(createMinimalPointTag(namePV, "Alzado", "#0ea5e9", ptPV.x, ptPV.y + 0.55, 0.08));
            secGrp.add(createMinimalPointTag(namePH, "Planta", "#38bdf8", ptPH.x, 0.08, ptPH.z + 0.65));
          }
        }
      });
    }
    updateSectionAnalysisMetrics(items, solid);
  }

  sGrp.visible = cfg.showSolid;
  pGrp.visible = cfg.showPlane;
  secGrp.visible = cfg.showSection;
  mainObjectsGroup.add(sGrp);
  mainObjectsGroup.add(pGrp);
  mainObjectsGroup.add(secGrp);
  document.getElementById('legendTitle').textContent = `Sección de Plano × Sólido`;
}

function renderLineSolidSection() {
  const cfg = state.lineSolid, solid = getSolidGeometryDefinition('line_solid');
  const v1 = new THREE.Vector3(cfg.p1.x, cfg.p1.y, cfg.p1.z), v2 = new THREE.Vector3(cfg.p2.x, cfg.p2.y, cfg.p2.z);
  const sGrp = new THREE.Group(), lGrp = new THREE.Group();

  const rep = createSolid3DRepresentation(solid);
  sGrp.add(rep.group);
  const sMesh = rep.mesh;
  sMesh.updateMatrixWorld();

  const dir = new THREE.Vector3().subVectors(v2, v1);
  const maxDist = dir.length();
  dir.normalize();
  const rc = new THREE.Raycaster(v1, dir, 0, maxDist);
  const hits = rc.intersectObject(sMesh, false);

  let piercePts = [];
  if (hits.length >= 2) {
    const pA = hits[0].point;
    let pB = null;
    for (let i = hits.length - 1; i >= 1; i--) {
      if (hits[i].point.distanceTo(pA) > 0.05) { pB = hits[i].point; break; }
    }
    if (pB) piercePts = [pA, pB];
  }
  state.lineSolid.lastPiercePts = piercePts;
  if (piercePts.length === 2) {
    lGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([v1, piercePts[0]]), new THREE.LineBasicMaterial({ color: 0x0077e6, linewidth: 3 })));
    lGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([piercePts[1], v2]), new THREE.LineBasicMaterial({ color: 0x0077e6, linewidth: 3 })));
    const dLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([piercePts[0], piercePts[1]]), new THREE.LineDashedMaterial({ color: 0x0077e6, dashSize: 0.3, gapSize: 0.2, linewidth: 2 }));
    dLine.computeLineDistances();
    lGrp.add(dLine);

    if (cfg.showPierce) {
      piercePts.forEach((p, idx) => {
        const sph = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        sph.position.copy(p);
        lGrp.add(sph);
        const pPV = new THREE.Vector3(p.x, p.y, 0.02), pPH = new THREE.Vector3(p.x, 0.02, p.z);
        createTechnicalRay(p, pPV, 0xef4444, lGrp);
        createTechnicalRay(p, pPH, 0xef4444, lGrp);
        const sphPV = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0038a8 }));
        sphPV.position.copy(pPV);
        lGrp.add(sphPV);
        const sphPH = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        sphPH.position.copy(pPH);
        lGrp.add(sphPH);
        lGrp.add(createMinimalPointTag(`I${idx + 1}`, "Entrada/Salida", "#ef4444", p.x, p.y + 0.55, p.z));
        lGrp.add(createMinimalPointTag(`I${idx + 1}2`, "Alzado", "#0ea5e9", pPV.x, pPV.y + 0.55, 0.08));
        lGrp.add(createMinimalPointTag(`I${idx + 1}1`, "Planta", "#38bdf8", pPH.x, 0.08, pPH.z + 0.65));
      });
    }
  } else {
    lGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([v1, v2]), new THREE.LineBasicMaterial({ color: 0x0077e6, linewidth: 3 })));
  }

  const nP1 = (state.lineSolid.names && state.lineSolid.names.p1) || 'P1';
  const nP2 = (state.lineSolid.names && state.lineSolid.names.p2) || 'P2';
  const v1_pv = new THREE.Vector3(v1.x, v1.y, 0.02), v2_pv = new THREE.Vector3(v2.x, v2.y, 0.02);
  const v1_ph = new THREE.Vector3(v1.x, 0.02, v1.z), v2_ph = new THREE.Vector3(v2.x, 0.02, v2.z);
  lGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([v1_pv, v2_pv]), new THREE.LineBasicMaterial({ color: 0x0ea5e9, linewidth: 2 })));
  lGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([v1_ph, v2_ph]), new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })));
  createTechnicalRay(v1, v1_pv, 0x94a3b8, lGrp); createTechnicalRay(v1, v1_ph, 0x94a3b8, lGrp);
  createTechnicalRay(v2, v2_pv, 0x94a3b8, lGrp); createTechnicalRay(v2, v2_ph, 0x94a3b8, lGrp);
  const sph1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), new THREE.MeshBasicMaterial({ color: 0x002d72 })); sph1.position.copy(v1); lGrp.add(sph1);
  const sph2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), new THREE.MeshBasicMaterial({ color: 0x002d72 })); sph2.position.copy(v2); lGrp.add(sph2);
  lGrp.add(createMinimalPointTag(nP1, "Espacio", "#002d72", v1.x, v1.y + 0.65, v1.z));
  lGrp.add(createMinimalPointTag(nP2, "Espacio", "#002d72", v2.x, v2.y + 0.65, v2.z));
  lGrp.add(createMinimalPointTag(`${nP1}2`, "Alzado", "#0ea5e9", v1_pv.x, v1_pv.y + 0.55, 0.08));
  lGrp.add(createMinimalPointTag(`${nP2}2`, "Alzado", "#0ea5e9", v2_pv.x, v2_pv.y + 0.55, 0.08));
  lGrp.add(createMinimalPointTag(`${nP1}1`, "Planta", "#38bdf8", v1_ph.x, 0.08, v1_ph.z + 0.65));
  lGrp.add(createMinimalPointTag(`${nP2}1`, "Planta", "#38bdf8", v2_ph.x, 0.08, v2_ph.z + 0.65));

  sGrp.visible = cfg.showSolid;
  lGrp.visible = cfg.showLine;
  mainObjectsGroup.add(sGrp);
  mainObjectsGroup.add(lGrp);
  document.getElementById('legendTitle').textContent = `Penetración Recta × Sólido`;
  updateLineSolidAnalysisMetrics(v1, v2, piercePts);
}

function updateScene() {
  clearGroup(mainObjectsGroup);
  state.validationError = validateCurrentGeometry();
  const err = document.getElementById('errorAlertBanner');
  if (state.validationError) {
    err.classList.remove('hidden');
    document.getElementById('errorMessageText').textContent = state.validationError.message;
  } else {
    err.classList.add('hidden');
  }
  
  if (state.mode === 'lines') renderLineGeometry();
  else if (state.mode === 'planes') renderPlaneGeometry();
  else if (state.mode === 'intersections') renderIntersectionSection();
  else if (state.mode === 'line_solid') renderLineSolidSection();
  drawEpura2D();
}
