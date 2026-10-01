/**
 * GeoDescri3D - Creador y Personalizador de Figuras 3D
 * Permite diseñar pirámides (regulares e irregulares con vértice móvil),
 * prismas (rectos y oblicuos), cilindros y conos con ajuste de coordenadas por vértice
 * y previsualización 3D interactiva en tiempo real.
 */

// Custom Figures System
function saveCustomFigures() {
  try {
    localStorage.setItem('geoweb_custom_figures', JSON.stringify(state.customFigures));
  } catch (e) {}
  const badge = document.getElementById('badgeCustomCount');
  if (badge) badge.textContent = state.customFigures.length;
}

function loadCustomFigures() {
  try {
    const saved = localStorage.getItem('geoweb_custom_figures');
    if (saved) {
      state.customFigures = JSON.parse(saved);
    }
  } catch (e) {
    state.customFigures = [];
  }
  const badge = document.getElementById('badgeCustomCount');
  if (badge) badge.textContent = (state.customFigures || []).length;
}

function updateSolidDropdowns() {
  ['selectSolidType', 'selectLSSolidType'].forEach(selectId => {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const currVal = sel.value;
    let optGroup = sel.querySelector('optgroup[data-custom="true"]');
    if (optGroup) optGroup.remove();
    if (state.customFigures && state.customFigures.length > 0) {
      optGroup = document.createElement('optgroup');
      optGroup.label = "Figuras Creadas";
      optGroup.setAttribute('data-custom', 'true');
      state.customFigures.forEach(fig => {
        const opt = document.createElement('option');
        opt.value = fig.id;
        opt.textContent = `★ ${fig.name}`;
        optGroup.appendChild(opt);
      });
      sel.appendChild(optGroup);
    }
    if (currVal) sel.value = currVal;
  });
}

function renderCustomFiguresList() {
  const listEl = document.getElementById('customFiguresList');
  if (!listEl) return;
  if (!state.customFigures || state.customFigures.length === 0) {
    listEl.innerHTML = '<p class="text-slate-400 text-center text-[11px] py-2">No has guardado figuras aún.</p>';
    return;
  }
  const typeMap = {
    pyramid_reg: 'Pirámide Regular',
    pyramid_irregular: 'Pirámide Irregular',
    prism_reg: 'Prisma Recto',
    prism_oblique: 'Prisma Oblicuo',
    cylinder: 'Cilindro Recto',
    cone: 'Cono Recto'
  };
  listEl.innerHTML = state.customFigures.map(fig => {
    const planeBadge = fig.basePlane === 'PV' ? '<span class="text-blue-700 font-bold">Base: PV</span>' : '<span class="text-sky-600 font-bold">Base: PH</span>';
    const desc = fig.type === 'cylinder' || fig.type === 'cone'
      ? `${typeMap[fig.type] || fig.type} | ${planeBadge} | H:${fig.H}u R:${fig.R}u`
      : `${typeMap[fig.type] || fig.type} (${fig.sides}L) | ${planeBadge} | H:${fig.H}u R:${fig.R}u`;
    return `
      <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-blue-100 hover:border-blue-300 transition">
        <div class="overflow-hidden pr-2">
          <div class="font-bold text-slate-800 text-xs truncate">${fig.name}</div>
          <div class="text-[10px] text-slate-500 font-mono">${desc}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="useCustomFigure('${fig.id}')" class="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shadow-sm transition">Usar</button>
          <button onclick="deleteCustomFigure('${fig.id}')" class="w-6 h-6 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition" title="Eliminar"><i class="fa-solid fa-trash text-[10px]"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

window.useCustomFigure = function(id) {
  if (state.mode === 'intersections') {
    state.intersection.solidType = id;
    const sel = document.getElementById('selectSolidType');
    if (sel) sel.value = id;
  } else {
    state.lineSolid.solidType = id;
    const sel = document.getElementById('selectLSSolidType');
    if (sel) sel.value = id;
  }
  document.getElementById('figureModal').classList.add('hidden');
  updateScene();
};

window.deleteCustomFigure = function(id) {
  state.customFigures = (state.customFigures || []).filter(f => f.id !== id);
  saveCustomFigures();
  updateSolidDropdowns();
  renderCustomFiguresList();
  if (state.intersection.solidType === id) {
    state.intersection.solidType = 'prism_regular';
    const sel = document.getElementById('selectSolidType');
    if (sel) sel.value = 'prism_regular';
  }
  if (state.lineSolid.solidType === id) {
    state.lineSolid.solidType = 'prism_regular';
    const sel = document.getElementById('selectLSSolidType');
    if (sel) sel.value = 'prism_regular';
  }
  updateScene();
};

let prevScene = null, prevCamera = null, prevRenderer = null, prevControls = null;
let prevMeshGroup = null, prevAnimId = null;

function getModalFigureDefinition() {
  const type = document.getElementById('newFigType')?.value || 'pyramid_reg';
  const basePlane = document.getElementById('newFigBasePlane')?.value || 'PH';
  const sides = parseInt(document.getElementById('newFigSides')?.value) || 4;
  const R = parseFloat(document.getElementById('newFigRadius')?.value) || 3.2;
  const H = parseFloat(document.getElementById('newFigHeight')?.value) || 8.0;
  const slantX = parseFloat(document.getElementById('newFigSlantX')?.value) || 0.0;
  const slantZ = parseFloat(document.getElementById('newFigSlantZ')?.value) || 0.0;
  const posX = parseFloat(document.getElementById('newFigPosX')?.value) || 0.0;
  const posY = parseFloat(document.getElementById('newFigPosY')?.value) || 0.0;
  const posZ = parseFloat(document.getElementById('newFigPosZ')?.value) || (basePlane === 'PV' ? 0.0 : 5.5);

  let customPoints = null;
  if (type !== 'cylinder' && type !== 'cone') {
    const ptRows = document.querySelectorAll('#figBasePointsTable .pt-row');
    if (ptRows.length > 0) {
      customPoints = [];
      ptRows.forEach(row => {
        const in1 = row.querySelector('.coord-1');
        const in2 = row.querySelector('.coord-2');
        const v1 = in1 ? parseFloat(in1.value) : 0;
        const v2 = in2 ? parseFloat(in2.value) : 0;
        if (basePlane === 'PH') {
          customPoints.push({ x: isNaN(v1) ? 0 : v1, y: posY, z: isNaN(v2) ? 0 : v2 });
        } else {
          customPoints.push({ x: isNaN(v1) ? 0 : v1, y: isNaN(v2) ? 0 : v2, z: posZ });
        }
      });
    }
  }

  let apex = null;
  if (type === 'pyramid_irregular') {
    const ax = parseFloat(document.getElementById('newFigApexX')?.value);
    const ay = parseFloat(document.getElementById('newFigApexY')?.value);
    const az = parseFloat(document.getElementById('newFigApexZ')?.value);
    apex = {
      x: isNaN(ax) ? posX : ax,
      y: isNaN(ay) ? (basePlane === 'PH' ? posY + H : posY) : ay,
      z: isNaN(az) ? (basePlane === 'PV' ? posZ + H : posZ) : az
    };
  } else if (type === 'pyramid_reg') {
    apex = basePlane === 'PH' ? { x: posX, y: posY + H, z: posZ } : { x: posX, y: posY, z: posZ + H };
  }

  return { type, basePlane, sides, R, H, slantX, slantZ, posX, posY, posZ, customPoints, apex };
}

function buildSolidFromFigDef(fig) {
  const { type, basePlane, sides: N, R: figR, H: figH, slantX, slantZ, posX: X0, posY: Y0, posZ: Z0, customPoints, apex: figApex } = fig;
  const center = { x: X0, y: Y0, z: Z0 };
  const bottom = [];

  if (customPoints && Array.isArray(customPoints) && customPoints.length >= 3) {
    customPoints.forEach(p => bottom.push({ x: p.x, y: p.y, z: p.z }));
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
  const names = ['A','B','C','D','E','F','G','H','I','J','K','L'].slice(0, actualN);

  if (type === 'pyramid_reg' || type === 'pyramid_irregular') {
    let apex;
    if (type === 'pyramid_irregular' && figApex) {
      apex = { x: figApex.x, y: figApex.y, z: figApex.z };
    } else if (basePlane === 'PH') {
      apex = { x: X0, y: Y0 + figH, z: Z0 };
    } else {
      apex = { x: X0, y: Y0, z: Z0 + figH };
    }
    return { type: 'pyramid', basePlane, basePts: bottom, bottom, apex, H: figH, c: center, R: figR, sides: actualN, names };
  }
  if (type === 'prism_reg' || type === 'prism_oblique') {
    const slant = type === 'prism_oblique'
      ? { x: slantX, y: (basePlane === 'PV' ? slantZ : 0), z: (basePlane === 'PH' ? slantZ : 0) }
      : { x: 0, y: 0, z: 0 };
    const top = bottom.map(p => ({
      x: p.x + slant.x,
      y: basePlane === 'PH' ? (p.y + figH) : (p.y + slant.y),
      z: basePlane === 'PH' ? (p.z + slant.z) : (p.z + figH)
    }));
    return { type: 'prism', basePlane, basePts: bottom, bottom, top, H: figH, c: center, slant, names };
  }
  if (type === 'cylinder') {
    const topC = basePlane === 'PH' ? { x: X0, y: Y0 + figH, z: Z0 } : { x: X0, y: Y0, z: Z0 + figH };
    return { type: 'cylinder', basePlane, H: figH, c: center, topC, R: figR };
  }
  if (type === 'cone') {
    const apex = basePlane === 'PH' ? { x: X0, y: Y0 + figH, z: Z0 } : { x: X0, y: Y0, z: Z0 + figH };
    return { type: 'cone', basePlane, H: figH, c: center, apex, R: figR };
  }
  return { type: 'cylinder', basePlane, H: figH, c: center, R: figR };
}

function initFigurePreview() {
  const container = document.getElementById('figPreviewContainer');
  if (!container || prevRenderer) return;

  prevScene = new THREE.Scene();
  prevScene.background = new THREE.Color(0xf1f5f9);

  const w = container.clientWidth || 360, h = container.clientHeight || 340;
  const aspect = w / h;
  const frustum = 22;
  prevCamera = new THREE.OrthographicCamera(
    -frustum * aspect / 2,
    frustum * aspect / 2,
    frustum / 2,
    -frustum / 2,
    -100,
    200
  );
  prevCamera.position.set(18, 15, 20);

  prevRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  prevRenderer.setSize(w, h);
  prevRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(prevRenderer.domElement);

  prevControls = new THREE.OrbitControls(prevCamera, prevRenderer.domElement);
  prevControls.target.set(0, 3.8, 3.8);
  prevControls.enableDamping = true;
  prevControls.dampingFactor = 0.08;
  prevControls.minZoom = 0.4;
  prevControls.maxZoom = 4.0;

  const btnReset = document.getElementById('btnResetFigPreviewCam');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      prevCamera.position.set(18, 15, 20);
      prevCamera.zoom = 1.0;
      const curW = container.clientWidth || 360, curH = container.clientHeight || 340;
      const curAsp = curW / curH;
      prevCamera.left = -frustum * curAsp / 2;
      prevCamera.right = frustum * curAsp / 2;
      prevCamera.top = frustum / 2;
      prevCamera.bottom = -frustum / 2;
      prevCamera.updateProjectionMatrix();
      prevControls.target.set(0, 3.8, 3.8);
      prevControls.update();
    });
  }

  prevScene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 0.9));
  const dL = new THREE.DirectionalLight(0xffffff, 0.95);
  dL.position.set(16, 26, 20);
  prevScene.add(dL);
  const fL = new THREE.DirectionalLight(0x0284c7, 0.35);
  fL.position.set(-16, 10, -16);
  prevScene.add(fL);

  // Mini Dihedral reference planes
  const planesGrp = new THREE.Group();
  const matPlane = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });

  const ph = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), matPlane);
  ph.rotation.x = -Math.PI / 2;
  ph.position.set(0, 0, 6);
  planesGrp.add(ph);
  const gridPH = new THREE.GridHelper(16, 16, 0x93c5fd, 0xbae6fd);
  gridPH.position.set(0, 0.01, 6);
  planesGrp.add(gridPH);

  const pv = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), matPlane);
  pv.position.set(0, 6, 0);
  planesGrp.add(pv);
  const gridPV = new THREE.GridHelper(16, 16, 0x93c5fd, 0xbae6fd);
  gridPV.rotation.x = Math.PI / 2;
  gridPV.position.set(0, 6, 0.01);
  planesGrp.add(gridPV);

  const lt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 16, 16), new THREE.MeshStandardMaterial({ color: 0x0038a8 }));
  lt.rotation.z = Math.PI / 2;
  planesGrp.add(lt);

  planesGrp.add(createMoldedCornerBadge3D("PV", 1.2, 0.55, "rgba(240,249,255,0.95)", "#0038a8", -6.5, 10.5, 0.02));
  planesGrp.add(createMoldedCornerBadge3D("PH", 1.2, 0.55, "rgba(224,242,254,0.95)", "#0284c7", -6.5, 0.02, 10.5, -Math.PI / 2));

  prevScene.add(planesGrp);

  prevMeshGroup = new THREE.Group();
  prevScene.add(prevMeshGroup);

  window.addEventListener('resize', () => {
    if (container && prevRenderer && prevCamera) {
      const curW = container.clientWidth, curH = container.clientHeight;
      if (curW > 0 && curH > 0) {
        const curAspect = curW / curH;
        const curFrustum = 22;
        prevCamera.left = -curFrustum * curAspect / 2;
        prevCamera.right = curFrustum * curAspect / 2;
        prevCamera.top = curFrustum / 2;
        prevCamera.bottom = -curFrustum / 2;
        prevCamera.updateProjectionMatrix();
        prevRenderer.setSize(curW, curH);
      }
    }
  });

  const animPrev = () => {
    prevAnimId = requestAnimationFrame(animPrev);
    if (prevControls) prevControls.update();
    if (prevRenderer && prevScene && prevCamera) prevRenderer.render(prevScene, prevCamera);
  };
  animPrev();
}

function updateFigurePreview() {
  if (!prevMeshGroup) return;
  clearGroup(prevMeshGroup);

  const figDef = getModalFigureDefinition();
  const badge = document.getElementById('badgeFigPreviewBase');
  if (badge) {
    if (figDef.basePlane === 'PV') {
      badge.textContent = 'Base en P.V. (Frontal)';
      badge.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold border border-blue-700 shadow-sm';
    } else {
      badge.textContent = 'Base en P.H. (Horiz.)';
      badge.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold border border-sky-300 shadow-sm';
    }
  }

  const solid = buildSolidFromFigDef(figDef);
  const rep = createSolid3DRepresentation(solid, { isPreview: true });
  prevMeshGroup.add(rep.group);

  // Base highlight in amber
  if (solid.bottom && solid.bottom.length > 0) {
    const bPts = solid.bottom.map(p => new THREE.Vector3(p.x, p.y, p.z));
    bPts.push(bPts[0].clone());
    const bLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(bPts), new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2.5 }));
    prevMeshGroup.add(bLine);

    // Add vertex points & labels for each base point
    solid.bottom.forEach((pt, i) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      dot.position.set(pt.x, pt.y, pt.z);
      prevMeshGroup.add(dot);
      const tag = createMinimalPointTag(solid.names[i] || `P${i + 1}`, '', '#d97706', pt.x, pt.y + 0.55, pt.z);
      prevMeshGroup.add(tag);
    });
  } else if (solid.type === 'cylinder' || solid.type === 'cone') {
    const ringPts = [];
    const N = 64;
    for (let i = 0; i <= N; i++) {
      const th = (i * 2 * Math.PI) / N;
      if (solid.basePlane === 'PV') {
        ringPts.push(new THREE.Vector3(solid.c.x + solid.R * Math.cos(th), solid.c.y + solid.R * Math.sin(th), solid.c.z));
      } else {
        ringPts.push(new THREE.Vector3(solid.c.x + solid.R * Math.cos(th), solid.c.y, solid.c.z + solid.R * Math.sin(th)));
      }
    }
    const bLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2.5 }));
    prevMeshGroup.add(bLine);
  }

  // Apex marker and label for pyramids
  if (solid.type === 'pyramid' && solid.apex) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshBasicMaterial({ color: 0x9333ea }));
    dot.position.set(solid.apex.x, solid.apex.y, solid.apex.z);
    prevMeshGroup.add(dot);
    const tag = createMinimalPointTag('V', '', '#9333ea', solid.apex.x, solid.apex.y + 0.65, solid.apex.z);
    prevMeshGroup.add(tag);
  }
}

function initFigureModal() {
  const modal = document.getElementById('figureModal');
  const btnOpen = document.getElementById('btnOpenFigureModal');
  const btnClose = document.getElementById('btnCloseFigureModal');
  const typeSelect = document.getElementById('newFigType');
  const basePlaneSelect = document.getElementById('newFigBasePlane');
  const grpSides = document.getElementById('grpFigSides');
  const grpSlant = document.getElementById('grpFigSlant');
  const grpApex = document.getElementById('grpFigApex');
  const grpBasePoints = document.getElementById('grpFigBasePoints');
  const btnResetBasePoints = document.getElementById('btnResetBasePoints');
  const btnCenterApex = document.getElementById('btnCenterApex');
  const btnSave = document.getElementById('btnSaveFigure');

  if (!modal) return;
  loadCustomFigures();
  updateSolidDropdowns();

  function updateModalGroupsVisibility(type) {
    if (type === 'cylinder' || type === 'cone') {
      if (grpSides) grpSides.classList.add('hidden');
      if (grpSlant) grpSlant.classList.add('hidden');
      if (grpApex) grpApex.classList.add('hidden');
      if (grpBasePoints) grpBasePoints.classList.add('hidden');
    } else if (type === 'prism_oblique') {
      if (grpSides) grpSides.classList.remove('hidden');
      if (grpSlant) grpSlant.classList.remove('hidden');
      if (grpApex) grpApex.classList.add('hidden');
      if (grpBasePoints) grpBasePoints.classList.remove('hidden');
    } else if (type === 'pyramid_irregular') {
      if (grpSides) grpSides.classList.remove('hidden');
      if (grpSlant) grpSlant.classList.add('hidden');
      if (grpApex) grpApex.classList.remove('hidden');
      if (grpBasePoints) grpBasePoints.classList.remove('hidden');
    } else {
      if (grpSides) grpSides.classList.remove('hidden');
      if (grpSlant) grpSlant.classList.add('hidden');
      if (grpApex) grpApex.classList.add('hidden');
      if (grpBasePoints) grpBasePoints.classList.remove('hidden');
    }
  }

  function populateBasePointsInputs(forceReset = false) {
    const table = document.getElementById('figBasePointsTable');
    const badge = document.getElementById('badgeBaseCoordLabels');
    if (!table) return;

    const basePlane = basePlaneSelect?.value || 'PH';
    const N = parseInt(document.getElementById('newFigSides')?.value) || 4;
    const R = parseFloat(document.getElementById('newFigRadius')?.value) || 3.2;
    const X0 = parseFloat(document.getElementById('newFigPosX')?.value) || 0.0;
    const Y0 = parseFloat(document.getElementById('newFigPosY')?.value) || 0.0;
    const Z0 = parseFloat(document.getElementById('newFigPosZ')?.value) || (basePlane === 'PV' ? 0.0 : 5.5);

    if (badge) {
      badge.textContent = basePlane === 'PH' ? `(X, Z) en PH [Cota Y₀ = ${Y0}]` : `(X, Y) en PV [Alej. Z₀ = ${Z0}]`;
    }

    const letters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    const existingRows = table.querySelectorAll('.pt-row');

    if (existingRows.length !== N || forceReset) {
      table.innerHTML = '';
      for (let i = 0; i < N; i++) {
        const angle = (i * 2 * Math.PI) / N;
        const letter = letters[i] || `P${i + 1}`;
        let val1, val2, lbl1 = 'X', lbl2;
        if (basePlane === 'PH') {
          val1 = (X0 + R * Math.cos(angle)).toFixed(2);
          val2 = (Z0 + R * Math.sin(angle)).toFixed(2);
          lbl2 = 'Z';
        } else {
          val1 = (X0 + R * Math.cos(angle)).toFixed(2);
          val2 = (Y0 + R * Math.sin(angle)).toFixed(2);
          lbl2 = 'Y';
        }

        const row = document.createElement('div');
        row.className = 'pt-row flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs';
        row.innerHTML = `
          <span class="w-5 text-center font-bold text-[10px] text-blue-800 bg-blue-100/80 rounded py-0.5 font-mono">${letter}</span>
          <div class="flex items-center gap-1 flex-1">
            <span class="text-[9px] font-mono text-slate-400">${lbl1}</span>
            <input type="number" step="0.2" value="${val1}" class="coord-1 w-full px-1 py-0.5 text-[11px] rounded border border-slate-200 font-mono text-right focus:border-blue-500 focus:outline-none">
          </div>
          <div class="flex items-center gap-1 flex-1">
            <span class="text-[9px] font-mono text-slate-400">${lbl2}</span>
            <input type="number" step="0.2" value="${val2}" class="coord-2 w-full px-1 py-0.5 text-[11px] rounded border border-slate-200 font-mono text-right focus:border-blue-500 focus:outline-none">
          </div>
        `;
        table.appendChild(row);

        row.querySelectorAll('input').forEach(inp => {
          inp.addEventListener('input', () => {
            state.figureModalManualPoints = true;
            updateFigurePreview();
          });
          inp.addEventListener('change', () => {
            state.figureModalManualPoints = true;
            updateFigurePreview();
          });
        });
      }
    } else {
      existingRows.forEach(row => {
        const spans = row.querySelectorAll('span.text-\\[9px\\]');
        if (spans.length >= 2) {
          spans[0].textContent = 'X';
          spans[1].textContent = basePlane === 'PH' ? 'Z' : 'Y';
        }
      });
    }
  }

  function syncApexInputs(forceReset = false) {
    const ax = document.getElementById('newFigApexX');
    const ay = document.getElementById('newFigApexY');
    const az = document.getElementById('newFigApexZ');
    if (!ax || !ay || !az) return;

    const basePlane = basePlaneSelect?.value || 'PH';
    const H = parseFloat(document.getElementById('newFigHeight')?.value) || 8.0;
    const X0 = parseFloat(document.getElementById('newFigPosX')?.value) || 0.0;
    const Y0 = parseFloat(document.getElementById('newFigPosY')?.value) || 0.0;
    const Z0 = parseFloat(document.getElementById('newFigPosZ')?.value) || (basePlane === 'PV' ? 0.0 : 5.5);

    if (forceReset || !state.figureModalManualApex) {
      ax.value = X0.toFixed(2);
      if (basePlane === 'PH') {
        ay.value = (Y0 + H).toFixed(2);
        az.value = Z0.toFixed(2);
      } else {
        ay.value = Y0.toFixed(2);
        az.value = (Z0 + H).toFixed(2);
      }
    }
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      modal.classList.remove('hidden');
      renderCustomFiguresList();
      state.figureModalManualPoints = false;
      state.figureModalManualApex = false;
      const currType = typeSelect ? typeSelect.value : 'pyramid_reg';
      updateModalGroupsVisibility(currType);
      populateBasePointsInputs(true);
      syncApexInputs(true);
      initFigurePreview();
      requestAnimationFrame(() => {
        const container = document.getElementById('figPreviewContainer');
        if (container && prevRenderer && prevCamera) {
          const w = container.clientWidth, h = container.clientHeight;
          if (w > 0 && h > 0) {
            const aspect = w / h;
            const frustum = 22;
            prevCamera.left = -frustum * aspect / 2;
            prevCamera.right = frustum * aspect / 2;
            prevCamera.top = frustum / 2;
            prevCamera.bottom = -frustum / 2;
            prevCamera.updateProjectionMatrix();
            prevRenderer.setSize(w, h);
          }
        }
        updateFigurePreview();
      });
    });
  }
  if (btnClose) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      updateModalGroupsVisibility(val);
      if (val === 'pyramid_irregular') {
        syncApexInputs(false);
      }
      if (val !== 'cylinder' && val !== 'cone') {
        const table = document.getElementById('figBasePointsTable');
        if (table && table.children.length === 0) {
          populateBasePointsInputs(true);
        }
      }
      updateFigurePreview();
    });
  }

  if (basePlaneSelect) {
    basePlaneSelect.addEventListener('change', (e) => {
      const bp = e.target.value;
      const posY = document.getElementById('newFigPosY');
      const posZ = document.getElementById('newFigPosZ');
      if (bp === 'PV') {
        if (posY && parseFloat(posY.value) === 0) posY.value = '5.0';
        if (posZ && parseFloat(posZ.value) === 5.5) posZ.value = '0.0';
      } else {
        if (posY && parseFloat(posY.value) === 5.0) posY.value = '0.0';
        if (posZ && parseFloat(posZ.value) === 0) posZ.value = '5.5';
      }
      if (!state.figureModalManualApex) syncApexInputs(true);
      if (!state.figureModalManualPoints) {
        populateBasePointsInputs(true);
      } else {
        populateBasePointsInputs(false);
      }
      updateFigurePreview();
    });
  }

  const sidesEl = document.getElementById('newFigSides');
  if (sidesEl) {
    sidesEl.addEventListener('change', () => {
      state.figureModalManualPoints = false;
      populateBasePointsInputs(true);
      updateFigurePreview();
    });
  }

  if (btnResetBasePoints) {
    btnResetBasePoints.addEventListener('click', () => {
      state.figureModalManualPoints = false;
      populateBasePointsInputs(true);
      updateFigurePreview();
    });
  }

  if (btnCenterApex) {
    btnCenterApex.addEventListener('click', () => {
      state.figureModalManualApex = false;
      syncApexInputs(true);
      updateFigurePreview();
    });
  }

  ['newFigApexX', 'newFigApexY', 'newFigApexZ'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        state.figureModalManualApex = true;
        updateFigurePreview();
      });
      el.addEventListener('change', () => {
        state.figureModalManualApex = true;
        updateFigurePreview();
      });
    }
  });

  ['newFigRadius', 'newFigHeight', 'newFigSlantX', 'newFigSlantZ', 'newFigPosX', 'newFigPosY', 'newFigPosZ'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (!state.figureModalManualPoints && (id === 'newFigRadius' || id === 'newFigPosX' || id === 'newFigPosY' || id === 'newFigPosZ')) {
          populateBasePointsInputs(false);
        }
        if (!state.figureModalManualApex && (id === 'newFigHeight' || id === 'newFigPosX' || id === 'newFigPosY' || id === 'newFigPosZ')) {
          syncApexInputs(false);
        }
        updateFigurePreview();
      });
      el.addEventListener('change', () => {
        if (!state.figureModalManualPoints && (id === 'newFigRadius' || id === 'newFigPosX' || id === 'newFigPosY' || id === 'newFigPosZ')) {
          populateBasePointsInputs(false);
        }
        if (!state.figureModalManualApex && (id === 'newFigHeight' || id === 'newFigPosX' || id === 'newFigPosY' || id === 'newFigPosZ')) {
          syncApexInputs(false);
        }
        updateFigurePreview();
      });
    }
  });

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const def = getModalFigureDefinition();
      const name = (document.getElementById('newFigName').value || '').trim() || `Figura ${state.customFigures.length + 1}`;
      const fig = {
        id: `custom_${Date.now()}`,
        name,
        type: def.type,
        basePlane: def.basePlane,
        sides: def.sides,
        R: def.R,
        H: def.H,
        slantX: def.slantX,
        slantZ: def.slantZ,
        posX: def.posX,
        posY: def.posY,
        posZ: def.posZ,
        customPoints: def.customPoints,
        apex: def.apex
      };
      state.customFigures.push(fig);
      saveCustomFigures();
      updateSolidDropdowns();
      renderCustomFiguresList();

      if (state.mode === 'intersections') {
        state.intersection.solidType = fig.id;
        const sel = document.getElementById('selectSolidType');
        if (sel) sel.value = fig.id;
      } else {
        state.lineSolid.solidType = fig.id;
        const sel = document.getElementById('selectLSSolidType');
        if (sel) sel.value = fig.id;
      }
      modal.classList.add('hidden');
      updateScene();
    });
  }
}
