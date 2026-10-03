/**
 * GeoDescri3D - Controlador Principal de Aplicación
 * Enlace bidireccional (Sliders + Inputs numéricos), acoplamientos geométricos,
 * métricas analíticas, conmutación de modos e inicialización.
 */

// --- Métricas Analíticas del Panel de Control ---

function updateLineAnalysisMetrics(p1, p2, nA, nB) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
  const vm = Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2);
  const det = document.getElementById('analysisDetails');
  if (det) {
    det.innerHTML = `
      <div class="flex justify-between font-mono"><span>Longitud (V.M.):</span><b>${vm} u</b></div>
      <div class="flex justify-between font-mono text-slate-500"><span>ΔX: ${Math.abs(dx).toFixed(1)}</span><span>ΔY: ${Math.abs(dy).toFixed(1)}</span><span>ΔZ: ${Math.abs(dz).toFixed(1)}</span></div>
    `;
  }
  const leg = document.getElementById('legendList');
  if (leg) {
    leg.innerHTML = `
      <li><span class="text-blue-700 font-bold">${escapeHtml(nA)}:</span> (${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}, ${p1.z.toFixed(1)})</li>
      <li><span class="text-blue-700 font-bold">${escapeHtml(nB)}:</span> (${p2.x.toFixed(1)}, ${p2.y.toFixed(1)}, ${p2.z.toFixed(1)})</li>
    `;
  }
}

function updatePlaneAnalysisMetrics(eq) {
  const nA = state.pointNames.p1, nB = state.pointNames.p2, nC = state.pointNames.p3;
  const det = document.getElementById('analysisDetails');
  if (det) {
    det.innerHTML = `
      <div class="font-mono text-[10px] break-all">Ecuación: <b>${eq.A.toFixed(2)}X + ${eq.B.toFixed(2)}Y + ${eq.C.toFixed(2)}Z + ${eq.D.toFixed(2)} = 0</b></div>
    `;
  }
  const leg = document.getElementById('legendList');
  if (leg) {
    leg.innerHTML = `
      <li><span class="text-blue-700 font-bold">${escapeHtml(nA)}:</span> (${state.plane.p1.x.toFixed(1)}, ${state.plane.p1.y.toFixed(1)}, ${state.plane.p1.z.toFixed(1)})</li>
      <li><span class="text-blue-700 font-bold">${escapeHtml(nB)}:</span> (${state.plane.p2.x.toFixed(1)}, ${state.plane.p2.y.toFixed(1)}, ${state.plane.p2.z.toFixed(1)})</li>
      <li><span class="text-blue-700 font-bold">${escapeHtml(nC)}:</span> (${state.plane.p3.x.toFixed(1)}, ${state.plane.p3.y.toFixed(1)}, ${state.plane.p3.z.toFixed(1)})</li>
    `;
  }
}

function updateSectionAnalysisMetrics(items, solid) {
  let perim = 0;
  for (let i = 0; i < items.length; i++) {
    perim += items[i].pt.distanceTo(items[(i + 1) % items.length].pt);
  }
  const det = document.getElementById('analysisDetails');
  if (det) {
    det.innerHTML = `
      <div class="flex justify-between font-mono"><span>Puntos contorno:</span><b>${items.length}</b></div>
      <div class="flex justify-between font-mono"><span>Perímetro sección:</span><b>${perim.toFixed(2)} u</b></div>
    `;
  }
  const keyItems = items.filter(it => it.name3D);
  const listToShow = keyItems.length > 0 ? keyItems : items.slice(0, 6);
  const leg = document.getElementById('legendList');
  if (leg) {
     leg.innerHTML = listToShow.map(it => `<li><span class="text-blue-700 font-bold">${escapeHtml(it.name3D || 'P')}:</span> (${it.pt.x.toFixed(1)}, ${it.pt.y.toFixed(1)}, ${it.pt.z.toFixed(1)})</li>`).join('');
  }
}

function updateLineSolidAnalysisMetrics(v1, v2, piercePts) {
  const len = v1.distanceTo(v2).toFixed(2);
  const inLen = piercePts.length >= 2 ? piercePts[0].distanceTo(piercePts[1]).toFixed(2) : '0.00';
  const nP1 = (state.lineSolid.names && state.lineSolid.names.p1) || 'P1';
  const nP2 = (state.lineSolid.names && state.lineSolid.names.p2) || 'P2';
  const det = document.getElementById('analysisDetails');
  if (det) {
    det.innerHTML = `
      <div class="flex justify-between font-mono"><span>Longitud Total:</span><b>${len} u</b></div>
      <div class="flex justify-between font-mono"><span>Tramo Interior:</span><b>${inLen} u</b></div>
    `;
  }
  let legendHtml = `
     <li><span class="text-blue-700 font-bold">${escapeHtml(nP1)}:</span> (${v1.x.toFixed(1)}, ${v1.y.toFixed(1)}, ${v1.z.toFixed(1)})</li>
     <li><span class="text-blue-700 font-bold">${escapeHtml(nP2)}:</span> (${v2.x.toFixed(1)}, ${v2.y.toFixed(1)}, ${v2.z.toFixed(1)})</li>
  `;
  if (piercePts.length >= 2) {
    legendHtml += `
      <li><span class="text-red-600 font-bold">I1:</span> (${piercePts[0].x.toFixed(1)}, ${piercePts[0].y.toFixed(1)}, ${piercePts[0].z.toFixed(1)})</li>
      <li><span class="text-red-600 font-bold">I2:</span> (${piercePts[1].x.toFixed(1)}, ${piercePts[1].y.toFixed(1)}, ${piercePts[1].z.toFixed(1)})</li>
    `;
  } else {
    legendHtml += `<li><span class="text-slate-500">Sin penetración completa</span></li>`;
  }
  const leg = document.getElementById('legendList');
  if (leg) leg.innerHTML = legendHtml;
}

// --- Visibilidad de Sliders de Intersección según Tipo de Plano ---

function updateIntersectionSliderVisibility() {
  const t = state.intersection.cuttingPlaneType;
  ['grpCutHeight', 'grpCutDist', 'grpCutX', 'grpCutAngle', 'grpCutAngleBeta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  if (t === 'horizontal' || t === 'canto' || t === 'parallel_lt' || t === 'oblique') {
    const el = document.getElementById('grpCutHeight');
    if (el) el.classList.remove('hidden');
  }
  if (t === 'frontal' || t === 'proj_horizontal' || t === 'parallel_lt') {
    const el = document.getElementById('grpCutDist');
    if (el) el.classList.remove('hidden');
  }
  if (t === 'profile' || t === 'canto' || t === 'proj_horizontal' || t === 'oblique') {
    const el = document.getElementById('grpCutX');
    if (el) el.classList.remove('hidden');
  }
  if (t === 'canto' || t === 'parallel_lt' || t === 'oblique') {
    const el = document.getElementById('grpCutAngle');
    if (el) el.classList.remove('hidden');
  }
  if (t === 'proj_horizontal' || t === 'oblique') {
    const el = document.getElementById('grpCutAngleBeta');
    if (el) el.classList.remove('hidden');
  }
}

// --- Insignias de Acoplamiento de Coordenadas en la Interfaz ---

function updateCoupledBadges() {
  const locked = state.lockCoupledSliders;
  const t = state.lineType;
  const showY = (locked || t === 'parallel_lt') && (t === 'horizontal' || t === 'parallel_lt' || t === 'point');
  const showZ = (locked || t === 'parallel_lt') && (t === 'frontal' || t === 'parallel_lt' || t === 'vertical');
  ['linkBadgeA1Y', 'linkBadgeA2Y'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !showY);
  });
  ['linkBadgeA1Z', 'linkBadgeA2Z'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !showZ);
  });

  const tLS = state.lineSolid.lineType;
  const showLSY = (locked || tLS === 'parallel_lt') && (tLS === 'horizontal' || tLS === 'parallel_lt' || tLS === 'point');
  const showLSZ = (locked || tLS === 'parallel_lt') && (tLS === 'frontal' || tLS === 'parallel_lt' || tLS === 'vertical');
  ['linkBadgeLSP1Y', 'linkBadgeLSP2Y'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !showLSY);
  });
  ['linkBadgeLSP1Z', 'linkBadgeLSP2Z'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !showLSZ);
  });

  // Plane link badges
  const tP = state.planeType;
  const isHoriz = (tP === 'horizontal');
  const isFront = (tP === 'frontal');
  const isProf = (tP === 'profile');
  const isParLT = (tP === 'parallel_lt');
  const isProjV = (tP === 'proj_vertical' || tP === 'canto');
  const isProjH = (tP === 'proj_horizontal');

  ['linkBadgeP1X', 'linkBadgeP2X', 'linkBadgeP3X'].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) {
      const show = isProf || (isProjV && idx > 0) || (isProjH && idx > 0);
      el.classList.toggle('hidden', !show);
    }
  });
  ['linkBadgeP1Y', 'linkBadgeP2Y', 'linkBadgeP3Y'].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) {
      const show = isHoriz || (isParLT && idx < 2) || (isProjV && idx > 0);
      el.classList.toggle('hidden', !show);
    }
  });
  ['linkBadgeP1Z', 'linkBadgeP2Z', 'linkBadgeP3Z'].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) {
      const show = isFront || (isParLT && idx < 2) || (isProjH && idx > 0);
      el.classList.toggle('hidden', !show);
    }
  });
}

// --- Sincronización de Controles Deslizantes y Cuadros Numéricos ---

function syncLineSliders() {
  const s1X = document.getElementById('sliderA1X'); if (s1X) s1X.value = state.line.p1.x;
  const s1Y = document.getElementById('sliderA1Y'); if (s1Y) s1Y.value = state.line.p1.y;
  const s1Z = document.getElementById('sliderA1Z'); if (s1Z) s1Z.value = state.line.p1.z;
  const s2X = document.getElementById('sliderA2X'); if (s2X) s2X.value = state.line.p2.x;
  const s2Y = document.getElementById('sliderA2Y'); if (s2Y) s2Y.value = state.line.p2.y;
  const s2Z = document.getElementById('sliderA2Z'); if (s2Z) s2Z.value = state.line.p2.z;
  const n1X = document.getElementById('numA1X'); if (n1X) n1X.value = state.line.p1.x;
  const n1Y = document.getElementById('numA1Y'); if (n1Y) n1Y.value = state.line.p1.y;
  const n1Z = document.getElementById('numA1Z'); if (n1Z) n1Z.value = state.line.p1.z;
  const n2X = document.getElementById('numA2X'); if (n2X) n2X.value = state.line.p2.x;
  const n2Y = document.getElementById('numA2Y'); if (n2Y) n2Y.value = state.line.p2.y;
  const n2Z = document.getElementById('numA2Z'); if (n2Z) n2Z.value = state.line.p2.z;
  const n1 = document.getElementById('inputNameP1'); if (n1) n1.value = state.pointNames.p1;
  const n2 = document.getElementById('inputNameP2'); if (n2) n2.value = state.pointNames.p2;
  syncLineLabels();
  updateCoupledBadges();
}

function syncLineLabels() {
  const bA1 = document.getElementById('coordBadgeA1');
  if (bA1) bA1.textContent = `(${state.line.p1.x.toFixed(1)}, ${state.line.p1.y.toFixed(1)}, ${state.line.p1.z.toFixed(1)})`;
  const bA2 = document.getElementById('coordBadgeA2');
  if (bA2) bA2.textContent = `(${state.line.p2.x.toFixed(1)}, ${state.line.p2.y.toFixed(1)}, ${state.line.p2.z.toFixed(1)})`;
}

function syncPlaneSliders() {
  [['sliderP1', 'numP1', state.plane.p1], ['sliderP2', 'numP2', state.plane.p2], ['sliderP3', 'numP3', state.plane.p3]].forEach(([sPrefix, nPrefix, pt]) => {
    ['x', 'y', 'z'].forEach(c => {
      const s = document.getElementById(`${sPrefix}${c.toUpperCase()}`); if (s) s.value = pt[c];
      const n = document.getElementById(`${nPrefix}${c.toUpperCase()}`); if (n) n.value = pt[c];
    });
  });
  const n1 = document.getElementById('inputNamePlaneP1'); if (n1) n1.value = state.pointNames.p1;
  const n2 = document.getElementById('inputNamePlaneP2'); if (n2) n2.value = state.pointNames.p2;
  const n3 = document.getElementById('inputNamePlaneP3'); if (n3) n3.value = state.pointNames.p3;
  const selPT = document.getElementById('selectPlaneType'); if (selPT) selPT.value = state.planeType;
  syncPlaneLabels();
}

function syncPlaneLabels() {
  const p1 = state.plane.p1, p2 = state.plane.p2, p3 = state.plane.p3;
  const b1 = document.getElementById('badgeP1'), b2 = document.getElementById('badgeP2'), b3 = document.getElementById('badgeP3');
  if (b1) b1.textContent = `(${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}, ${p1.z.toFixed(1)})`;
  if (b2) b2.textContent = `(${p2.x.toFixed(1)}, ${p2.y.toFixed(1)}, ${p2.z.toFixed(1)})`;
  if (b3) b3.textContent = `(${p3.x.toFixed(1)}, ${p3.y.toFixed(1)}, ${p3.z.toFixed(1)})`;
}

function syncIntersectionSliders() {
  const cfg = state.intersection;
  const sH = document.getElementById('sliderCutHeight'); if (sH) sH.value = cfg.cutHeight;
  const sD = document.getElementById('sliderCutDist'); if (sD) sD.value = cfg.cutDist;
  const sX = document.getElementById('sliderCutX'); if (sX) sX.value = cfg.cutX;
  const sA = document.getElementById('sliderCutAngle'); if (sA) sA.value = cfg.cutAngle;
  const sB = document.getElementById('sliderCutAngleBeta'); if (sB) sB.value = cfg.cutAngleBeta;
  const nH = document.getElementById('numCutHeight'); if (nH) nH.value = cfg.cutHeight;
  const nD = document.getElementById('numCutDist'); if (nD) nD.value = cfg.cutDist;
  const nX = document.getElementById('numCutX'); if (nX) nX.value = cfg.cutX;
  const nA = document.getElementById('numCutAngle'); if (nA) nA.value = cfg.cutAngle;
  const nB = document.getElementById('numCutAngleBeta'); if (nB) nB.value = cfg.cutAngleBeta;
  const selCPT = document.getElementById('selectCuttingPlaneType'); if (selCPT) selCPT.value = cfg.cuttingPlaneType;
  const selST = document.getElementById('selectSolidType'); if (selST) selST.value = cfg.solidType;
}

function syncLineSolidSliders() {
  [['sliderLSP1', 'numLSP1', state.lineSolid.p1], ['sliderLSP2', 'numLSP2', state.lineSolid.p2]].forEach(([sPrefix, nPrefix, pt]) => {
    ['x', 'y', 'z'].forEach(c => {
      const s = document.getElementById(`${sPrefix}${c.toUpperCase()}`); if (s) s.value = pt[c];
      const n = document.getElementById(`${nPrefix}${c.toUpperCase()}`); if (n) n.value = pt[c];
    });
  });
  const n1 = document.getElementById('inputNameLSP1'); if (n1) n1.value = (state.lineSolid.names && state.lineSolid.names.p1) || 'P1';
  const n2 = document.getElementById('inputNameLSP2'); if (n2) n2.value = (state.lineSolid.names && state.lineSolid.names.p2) || 'P2';
  const selLT = document.getElementById('selectLSLineType'); if (selLT) selLT.value = state.lineSolid.lineType || 'oblique';
  const selLSS = document.getElementById('selectLSSolidType'); if (selLSS) selLSS.value = state.lineSolid.solidType || 'cylinder';
  syncLineSolidLabels();
  updateCoupledBadges();
}

function syncLineSolidLabels() {
  const p1 = state.lineSolid.p1, p2 = state.lineSolid.p2;
  const b1 = document.getElementById('badgeLSP1'), b2 = document.getElementById('badgeLSP2');
  if (b1) b1.textContent = `(${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}, ${p1.z.toFixed(1)})`;
  if (b2) b2.textContent = `(${p2.x.toFixed(1)}, ${p2.y.toFixed(1)}, ${p2.z.toFixed(1)})`;
}

// --- Conmutación de Modos de la Aplicación ---

function switchMode(m) {
  if (typeof stopVMAnimation === 'function') stopVMAnimation();
  state.mode = m;
  ['btnModeLines', 'btnModePlanes', 'btnModeIntersections', 'btnModeLineSolid'].forEach(id => {
    const active = id.includes(m === 'lines' ? 'Lines' : m === 'planes' ? 'Planes' : m === 'intersections' ? 'Intersections' : 'LineSolid');
    const el = document.getElementById(id);
    if (el) {
      el.className = `mode-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'}`;
    }
  });
  ['lineSelectorContainer', 'planeSelectorContainer', 'intersectionSelectorContainer', 'lineSolidSelectorContainer'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  ['lineSlidersGrid', 'planeSlidersGrid', 'intersectionSlidersGrid', 'lineSolidSlidersGrid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  
  const sMap = { lines: 'line', planes: 'plane', intersections: 'intersection', line_solid: 'lineSolid' };
  const selEl = document.getElementById(`${sMap[m]}SelectorContainer`);
  const gridEl = document.getElementById(`${sMap[m]}SlidersGrid`);
  if (selEl) {
    selEl.classList.remove('hidden');
    selEl.classList.remove('animate-fade-slide');
    void selEl.offsetWidth;
    selEl.classList.add('animate-fade-slide');
  }
  if (gridEl) {
    gridEl.classList.remove('hidden');
    gridEl.classList.remove('animate-fade-slide');
    void gridEl.offsetWidth;
    gridEl.classList.add('animate-fade-slide');
  }
  if (m === 'lines') syncLineSliders();
  else if (m === 'planes') syncPlaneSliders();
  else if (m === 'intersections') { syncIntersectionSliders(); updateIntersectionSliderVisibility(); }
  else if (m === 'line_solid') syncLineSolidSliders();

  const vmCtrl = document.getElementById('epuraVMControls');
  const modeBadge = document.getElementById('epuraModeBadge');
  if (vmCtrl) vmCtrl.classList.toggle('hidden', m !== 'planes' && m !== 'intersections');
  if (modeBadge) {
    modeBadge.classList.remove('hidden');
    modeBadge.textContent = m === 'planes' ? 'Planos' : (m === 'intersections' ? 'Sección Sólido' : (m === 'lines' ? 'Rectas' : 'Recta × Sólido'));
  }

  if (typeof window.updateVMMethodButtons === 'function') window.updateVMMethodButtons();
  updateScene();
}

// --- Botones Cíclicos de Etiquetas (A -> A, A1, A2 -> Off) ---

function updateSectionLabelsButtonUI() {
  const btn = document.getElementById('toggleVisSectionLabels');
  const txt = document.getElementById('textSectionLabels');
  const icon = document.getElementById('iconSectionLabels');
  if (!btn || !txt) return;
  const mode = state.intersection.labelsMode || 'plane';
  if (mode === 'plane') {
    txt.textContent = 'Etiquetas: (A)';
    btn.className = 'btn-interactive px-2.5 py-1 rounded-lg text-[10px] font-semibold transition bg-blue-600 text-white flex items-center gap-1 shadow-sm';
    if (icon) icon.className = 'fa-solid fa-tag text-[9px]';
  } else if (mode === 'all') {
    txt.textContent = 'Etiquetas: (A, A₁, A₂)';
    btn.className = 'btn-interactive px-2.5 py-1 rounded-lg text-[10px] font-semibold transition bg-indigo-600 text-white flex items-center gap-1 shadow-sm';
    if (icon) icon.className = 'fa-solid fa-tags text-[9px]';
  } else {
    txt.textContent = 'Etiquetas: Desactivadas';
    btn.className = 'btn-interactive px-2.5 py-1 rounded-lg text-[10px] font-semibold transition bg-slate-400 text-white flex items-center gap-1 shadow-sm';
    if (icon) icon.className = 'fa-solid fa-tag text-[9px] opacity-60';
  }
}

function updatePlaneLabelsButtonUI() {
  const btn = document.getElementById('togglePlaneLabels');
  const txt = document.getElementById('textPlaneLabels');
  const icon = document.getElementById('iconPlaneLabels');
  if (!btn || !txt) return;
  const mode = state.planeLabelsMode || 'plane';
  if (mode === 'plane') {
    txt.textContent = 'Etiquetas: (A)';
    btn.className = 'btn-interactive px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-400 text-xs font-semibold flex items-center gap-1 transition shadow-sm';
    if (icon) icon.className = 'fa-solid fa-tag text-[10px]';
  } else if (mode === 'all') {
    txt.textContent = 'Etiquetas: (A, A₁, A₂)';
    btn.className = 'btn-interactive px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-400 text-xs font-semibold flex items-center gap-1 transition shadow-sm';
    if (icon) icon.className = 'fa-solid fa-tags text-[10px]';
  } else {
    txt.textContent = 'Etiquetas: Desactivadas';
    btn.className = 'btn-interactive px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-slate-500 border border-slate-300 text-xs font-normal flex items-center gap-1 transition shadow-sm';
    if (icon) icon.className = 'fa-solid fa-tag text-[10px] opacity-60';
  }
}

// --- Vinculación Dual Universal (Slider + Input numérico) ---

function bindPair(sliderId, numId, target, propOrSet, onUpdate, couplingFn) {
  const sEl = document.getElementById(sliderId);
  const nEl = document.getElementById(numId);
  const isFn = typeof target === 'function';
  const setVal = isFn ? propOrSet : (v) => { target[propOrSet] = v; };

  const updateVal = (val) => {
    if (isNaN(val)) return;
    const prevVal = isFn ? target() : target[propOrSet];
    setVal(val);
    if (sEl && parseFloat(sEl.value) !== val) sEl.value = val;
    if (nEl && parseFloat(nEl.value) !== val) nEl.value = val;
    if (couplingFn) couplingFn(val, prevVal);
    if (onUpdate) onUpdate();
  };
  if (sEl) {
    sEl.addEventListener('input', (e) => updateVal(parseFloat(e.target.value)));
  }
  if (nEl) {
    nEl.addEventListener('input', (e) => updateVal(parseFloat(e.target.value)));
    nEl.addEventListener('change', (e) => updateVal(parseFloat(e.target.value)));
  }
}

// --- Restricciones y Acoplamientos Geométricos ---

const lineCoupling = (val, prop, isP1) => {
  const t = state.lineType;
  const otherPt = isP1 ? state.line.p2 : state.line.p1;
  const otherPrefix = isP1 ? 'A2' : 'A1';
  const shouldCouple = state.lockCoupledSliders || t === 'parallel_lt';
  if (!shouldCouple) return;

  if ((t === 'horizontal' && prop === 'y') ||
      (t === 'frontal' && prop === 'z') ||
      (t === 'parallel_lt' && (prop === 'y' || prop === 'z')) ||
      (t === 'point' && (prop === 'x' || prop === 'y')) ||
      (t === 'vertical' && (prop === 'x' || prop === 'z')) ||
      (t === 'profile' && prop === 'x')) {
    otherPt[prop] = val;
    const otherS = document.getElementById(`slider${otherPrefix}${prop.toUpperCase()}`);
    if (otherS) otherS.value = val;
    const otherN = document.getElementById(`num${otherPrefix}${prop.toUpperCase()}`);
    if (otherN) otherN.value = val;
  }
};

const lineSolidCoupling = (val, prop, isP1) => {
  const t = state.lineSolid.lineType;
  const otherPt = isP1 ? state.lineSolid.p2 : state.lineSolid.p1;
  const otherPrefix = isP1 ? 'LSP2' : 'LSP1';
  const shouldCouple = state.lockCoupledSliders || t === 'parallel_lt';
  if (!shouldCouple) return;

  if ((t === 'horizontal' && prop === 'y') ||
      (t === 'frontal' && prop === 'z') ||
      (t === 'parallel_lt' && (prop === 'y' || prop === 'z')) ||
      (t === 'point' && (prop === 'x' || prop === 'y')) ||
      (t === 'vertical' && (prop === 'x' || prop === 'z')) ||
      (t === 'profile' && prop === 'x')) {
    otherPt[prop] = val;
    const otherS = document.getElementById(`slider${otherPrefix}${prop.toUpperCase()}`);
    if (otherS) otherS.value = val;
    const otherN = document.getElementById(`num${otherPrefix}${prop.toUpperCase()}`);
    if (otherN) otherN.value = val;
  }
};

const planeCoupling = (val, prop, ptKey, prevVal) => {
  const t = state.planeType;
  if (t === 'oblique') return;
  const locked = state.lockCoupledSliders;
  const delta = isNaN(prevVal) ? 0 : val - prevVal;

  function setCoord(key, p, v) {
    state.plane[key][p] = v;
    const s = document.getElementById(`slider${key.toUpperCase()}${p.toUpperCase()}`);
    if (s && parseFloat(s.value) !== v) s.value = v;
    const n = document.getElementById(`num${key.toUpperCase()}${p.toUpperCase()}`);
    if (n && parseFloat(n.value) !== v) n.value = v;
  }

  if (t === 'horizontal') {
    if (prop === 'y') {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, 'y', val);
      });
    } else if (locked && Math.abs(delta) > 1e-4) {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, prop, state.plane[k][prop] + delta);
      });
    }
  } else if (t === 'frontal') {
    if (prop === 'z') {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, 'z', val);
      });
    } else if (locked && Math.abs(delta) > 1e-4) {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, prop, state.plane[k][prop] + delta);
      });
    }
  } else if (t === 'profile') {
    if (prop === 'x') {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, 'x', val);
      });
    } else if (locked && Math.abs(delta) > 1e-4) {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, prop, state.plane[k][prop] + delta);
      });
    }
  } else if (t === 'parallel_lt') {
    if (prop === 'y') {
      if (ptKey === 'p1') {
        setCoord('p2', 'y', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p3', 'y', state.plane.p3.y + delta);
      } else if (ptKey === 'p2') {
        setCoord('p1', 'y', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p3', 'y', state.plane.p3.y + delta);
      }
    } else if (prop === 'z') {
      if (ptKey === 'p1') {
        setCoord('p2', 'z', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p3', 'z', state.plane.p3.z + delta);
      } else if (ptKey === 'p2') {
        setCoord('p1', 'z', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p3', 'z', state.plane.p3.z + delta);
      }
    } else if (prop === 'x' && locked && Math.abs(delta) > 1e-4) {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, 'x', state.plane[k].x + delta);
      });
    }
  } else if (t === 'proj_vertical' || t === 'canto') {
    if (prop === 'x') {
      if (ptKey === 'p2') {
        setCoord('p3', 'x', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p1', 'x', state.plane.p1.x + delta);
      } else if (ptKey === 'p3') {
        setCoord('p2', 'x', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p1', 'x', state.plane.p1.x + delta);
      }
    } else if (prop === 'y') {
      if (ptKey === 'p2') {
        setCoord('p3', 'y', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p1', 'y', state.plane.p1.y + delta);
      } else if (ptKey === 'p3') {
        setCoord('p2', 'y', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p1', 'y', state.plane.p1.y + delta);
      }
    } else if (prop === 'z' && locked && Math.abs(delta) > 1e-4) {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, 'z', state.plane[k].z + delta);
      });
    }
  } else if (t === 'proj_horizontal') {
    if (prop === 'x') {
      if (ptKey === 'p2') {
        setCoord('p3', 'x', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p1', 'x', state.plane.p1.x + delta);
      } else if (ptKey === 'p3') {
        setCoord('p2', 'x', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p1', 'x', state.plane.p1.x + delta);
      }
    } else if (prop === 'z') {
      if (ptKey === 'p2') {
        setCoord('p3', 'z', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p1', 'z', state.plane.p1.z + delta);
      } else if (ptKey === 'p3') {
        setCoord('p2', 'z', val);
        if (locked && Math.abs(delta) > 1e-4) setCoord('p1', 'z', state.plane.p1.z + delta);
      }
    } else if (prop === 'y' && locked && Math.abs(delta) > 1e-4) {
      ['p1', 'p2', 'p3'].forEach(k => {
        if (k !== ptKey) setCoord(k, 'y', state.plane[k].y + delta);
      });
    }
  }
};

// --- Inicialización Principal (Window OnLoad) ---

window.onload = function() {
  const errorBanner = document.getElementById('errorAlertBanner');
  const errorText = document.getElementById('errorMessageText');
  const showStartupError = (message) => {
    if (errorBanner) errorBanner.classList.remove('hidden');
    if (errorText) errorText.textContent = message;
    const autoCorrect = document.getElementById('btnAutoCorrect');
    if (autoCorrect) autoCorrect.classList.add('hidden');
  };

  if (!window.THREE || typeof THREE.WebGLRenderer !== 'function' || typeof THREE.OrbitControls !== 'function') {
    showStartupError('No se pudo cargar el motor 3D. Comprueba tu conexión y recarga la página.');
    return;
  }

  try {
    initThree();
  } catch (error) {
    console.error('GeoDescri3D: no se pudo inicializar la escena 3D.', error);
    showStartupError('No se pudo iniciar la escena 3D. El navegador puede no admitir WebGL.');
    return;
  }
  updateSectionLabelsButtonUI();
  updatePlaneLabelsButtonUI();

  // Mode Switchers
  ['btnModeLines', 'btnModePlanes', 'btnModeIntersections', 'btnModeLineSolid'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => switchMode(['lines', 'planes', 'intersections', 'line_solid'][i]));
    }
  });

  // Type Selectors
  const selLT = document.getElementById('selectLineType');
  if (selLT) {
    selLT.addEventListener('change', (e) => {
      state.lineType = e.target.value;
      const p = linePresets[state.lineType];
      if (p) {
        Object.assign(state.line.p1, p.p1);
        Object.assign(state.line.p2, p.p2);
        syncLineSliders();
      }
      updateCoupledBadges();
      updateScene();
    });
  }

  const selPT = document.getElementById('selectPlaneType');
  if (selPT) {
    selPT.addEventListener('change', (e) => {
      state.planeType = e.target.value;
      const p = planePresets[state.planeType];
      if (p) {
        Object.assign(state.plane.p1, p.p1);
        Object.assign(state.plane.p2, p.p2);
        Object.assign(state.plane.p3, p.p3);
        syncPlaneSliders();
      }
      updateCoupledBadges();
      if (typeof window.updateVMMethodButtons === 'function') window.updateVMMethodButtons();
      updateScene();
    });
  }

  const selSolid = document.getElementById('selectSolidType');
  if (selSolid) {
    selSolid.addEventListener('change', (e) => {
      state.intersection.solidType = e.target.value;
      updateScene();
    });
  }

  const selCutPlane = document.getElementById('selectCuttingPlaneType');
  if (selCutPlane) {
    selCutPlane.addEventListener('change', (e) => {
      state.intersection.cuttingPlaneType = e.target.value;
      updateIntersectionSliderVisibility();
      if (typeof window.updateVMMethodButtons === 'function') window.updateVMMethodButtons();
      updateScene();
    });
  }

  const selLSSolid = document.getElementById('selectLSSolidType');
  if (selLSSolid) {
    selLSSolid.addEventListener('change', (e) => {
      state.lineSolid.solidType = e.target.value;
      updateScene();
    });
  }

  // Visibility Toggles
  const btnVisSolid = document.getElementById('toggleVisSolid');
  if (btnVisSolid) {
    btnVisSolid.addEventListener('click', (e) => {
      state.intersection.showSolid = !state.intersection.showSolid;
      e.currentTarget.classList.toggle('bg-blue-600');
      e.currentTarget.classList.toggle('bg-slate-400');
      updateScene();
    });
  }

  const btnVisPlane = document.getElementById('toggleVisPlane');
  if (btnVisPlane) {
    btnVisPlane.addEventListener('click', (e) => {
      state.intersection.showPlane = !state.intersection.showPlane;
      e.currentTarget.classList.toggle('bg-blue-600');
      e.currentTarget.classList.toggle('bg-slate-400');
      updateScene();
    });
  }

  const btnVisSection = document.getElementById('toggleVisSection');
  if (btnVisSection) {
    btnVisSection.addEventListener('click', (e) => {
      state.intersection.showSection = !state.intersection.showSection;
      e.currentTarget.classList.toggle('bg-blue-600');
      e.currentTarget.classList.toggle('bg-slate-400');
      updateScene();
    });
  }

  const btnSecLbls = document.getElementById('toggleVisSectionLabels');
  if (btnSecLbls) {
    btnSecLbls.addEventListener('click', () => {
      const curr = state.intersection.labelsMode || 'plane';
      if (curr === 'plane') {
        state.intersection.labelsMode = 'all';
        state.intersection.showSectionLabels = true;
      } else if (curr === 'all') {
        state.intersection.labelsMode = 'off';
        state.intersection.showSectionLabels = false;
      } else {
        state.intersection.labelsMode = 'plane';
        state.intersection.showSectionLabels = true;
      }
      updateSectionLabelsButtonUI();
      updateScene();
    });
  }

  const btnPlaneLbls = document.getElementById('togglePlaneLabels');
  if (btnPlaneLbls) {
    btnPlaneLbls.addEventListener('click', () => {
      const curr = state.planeLabelsMode || 'plane';
      if (curr === 'plane') {
        state.planeLabelsMode = 'all';
      } else if (curr === 'all') {
        state.planeLabelsMode = 'off';
      } else {
        state.planeLabelsMode = 'plane';
      }
      updatePlaneLabelsButtonUI();
      updateScene();
    });
  }

  const btnLSVisSolid = document.getElementById('toggleLSVisSolid');
  if (btnLSVisSolid) {
    btnLSVisSolid.addEventListener('click', (e) => {
      state.lineSolid.showSolid = !state.lineSolid.showSolid;
      e.currentTarget.classList.toggle('bg-blue-600');
      e.currentTarget.classList.toggle('bg-slate-400');
      updateScene();
    });
  }

  const btnLSVisLine = document.getElementById('toggleLSVisLine');
  if (btnLSVisLine) {
    btnLSVisLine.addEventListener('click', (e) => {
      state.lineSolid.showLine = !state.lineSolid.showLine;
      e.currentTarget.classList.toggle('bg-blue-600');
      e.currentTarget.classList.toggle('bg-slate-400');
      updateScene();
    });
  }

  const btnLSVisPierce = document.getElementById('toggleLSVisPierce');
  if (btnLSVisPierce) {
    btnLSVisPierce.addEventListener('click', (e) => {
      state.lineSolid.showPierce = !state.lineSolid.showPierce;
      e.currentTarget.classList.toggle('bg-blue-600');
      e.currentTarget.classList.toggle('bg-slate-400');
      updateScene();
    });
  }

  // Views with smooth animated transition and unified dihedral pivot center
  if (controls) {
    controls.addEventListener('start', () => {
      updateActiveViewBtn('btnView3D');
    });
  }

  const btnV3D = document.getElementById('btnView3D');
  if (btnV3D) {
    btnV3D.addEventListener('click', () => {
      updateActiveViewBtn('btnView3D');
      animateCameraTo(new THREE.Vector3(19, 16, 23), DIHEDRAL_CENTER);
    });
  }

  const btnVFront = document.getElementById('btnViewFront');
  if (btnVFront) {
    btnVFront.addEventListener('click', () => {
      updateActiveViewBtn('btnViewFront');
      animateCameraTo(new THREE.Vector3(0, 4.5, 30), DIHEDRAL_CENTER);
    });
  }

  const btnVTop = document.getElementById('btnViewTop');
  if (btnVTop) {
    btnVTop.addEventListener('click', () => {
      updateActiveViewBtn('btnViewTop');
      animateCameraTo(new THREE.Vector3(0, 30, 4.505), DIHEDRAL_CENTER);
    });
  }

  // Epura controls & Fullscreen
  const btnTogEpura = document.getElementById('btnToggleEpura');
  if (btnTogEpura) {
    btnTogEpura.addEventListener('click', () => {
      const em = document.getElementById('epuraModal');
      if (em) {
        em.classList.toggle('hidden');
        if (!em.classList.contains('hidden')) {
          drawEpura2D();
        }
      }
    });
  }

  const btnCloseEpura = document.getElementById('btnCloseEpura');
  if (btnCloseEpura) {
    btnCloseEpura.addEventListener('click', () => {
      document.getElementById('epuraModal').classList.add('hidden');
    });
  }

  // Gestor unificado de tamaño y posición de la ventana del Épura (evita conflictos al combinar modos)
  function setEpuraWindowMode(targetMode) {
    const em = document.getElementById('epuraModal');
    const icFull = document.getElementById('iconFullscreenEpura');
    const icExp = document.getElementById('iconExpandEpura');
    const btnExp = document.getElementById('btnExpandEpura');
    const btnFull = document.getElementById('btnFullscreenEpura');
    if (!em) return;

    em.style.width = '';
    em.style.height = '';

    if (targetMode === 'fullscreen') {
      state.epuraFullscreen = true;
      state.epuraExpanded = false;

      em.classList.remove('-translate-x-1/2', '-translate-y-1/2', 'top-1/2', 'left-1/2', 'w-[94vw]', 'max-w-2xl', 'top-2', 'right-2', 'top-3', 'right-3');
      em.classList.add('epura-fullscreen');

      if (icFull) { icFull.classList.remove('fa-maximize'); icFull.classList.add('fa-minimize'); }
      if (icExp) { icExp.classList.remove('fa-down-left-and-up-right-to-center'); icExp.classList.add('fa-up-right-and-down-left-from-center'); }
      if (btnFull) btnFull.title = 'Salir de pantalla casi completa';
      if (btnExp) btnExp.title = 'Cambiar a ventana mediana';
    } else if (targetMode === 'expanded') {
      state.epuraFullscreen = false;
      state.epuraExpanded = true;

      em.classList.remove('epura-fullscreen');
      em.classList.remove('top-2', 'right-2', 'top-3', 'right-3');
      em.classList.add('top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'w-[94vw]', 'max-w-2xl');

      if (icFull) { icFull.classList.remove('fa-minimize'); icFull.classList.add('fa-maximize'); }
      if (icExp) { icExp.classList.remove('fa-up-right-and-down-left-from-center'); icExp.classList.add('fa-down-left-and-up-right-to-center'); }
      if (btnFull) btnFull.title = 'Pantalla casi completa';
      if (btnExp) btnExp.title = 'Restaurar ventana compacta';
    } else {
      state.epuraFullscreen = false;
      state.epuraExpanded = false;

      em.classList.remove('epura-fullscreen');
      em.classList.remove('top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'w-[94vw]', 'max-w-2xl');
      em.classList.add('top-2', 'right-2', 'sm:top-3', 'sm:right-3');

      if (icFull) { icFull.classList.remove('fa-minimize'); icFull.classList.add('fa-maximize'); }
      if (icExp) { icExp.classList.remove('fa-down-left-and-up-right-to-center'); icExp.classList.add('fa-up-right-and-down-left-from-center'); }
      if (btnFull) btnFull.title = 'Pantalla casi completa';
      if (btnExp) btnExp.title = 'Ampliar ventana';
    }

    drawEpura2D();
    setTimeout(() => { drawEpura2D(); }, 120);
  }

  const btnExpEpura = document.getElementById('btnExpandEpura');
  if (btnExpEpura) {
    btnExpEpura.addEventListener('click', () => {
      setEpuraWindowMode(state.epuraExpanded ? 'compact' : 'expanded');
    });
  }

  // Fullscreen casi completa
  const btnFullEpura = document.getElementById('btnFullscreenEpura');
  if (btnFullEpura) {
    btnFullEpura.addEventListener('click', () => {
      setEpuraWindowMode(state.epuraFullscreen ? 'compact' : 'fullscreen');
    });
  }

  window.addEventListener('resize', () => {
    if (state.epuraFullscreen || state.epuraExpanded) {
      drawEpura2D();
    }
  });

  // Zoom buttons
  const zoomBadge = document.getElementById('epuraZoomBadge');
  const updateZoomUI = () => {
    if (zoomBadge) zoomBadge.textContent = `${Math.round(state.epuraZoom * 100)}%`;
    drawEpura2D();
  };

  const btnZIn = document.getElementById('btnEpuraZoomIn');
  if (btnZIn) {
    btnZIn.addEventListener('click', () => {
      state.epuraZoom = Math.min(4.5, (state.epuraZoom || 1.0) * 1.2);
      updateZoomUI();
    });
  }

  const btnZOut = document.getElementById('btnEpuraZoomOut');
  if (btnZOut) {
    btnZOut.addEventListener('click', () => {
      state.epuraZoom = Math.max(0.35, (state.epuraZoom || 1.0) / 1.2);
      updateZoomUI();
    });
  }

  const btnZReset = document.getElementById('btnEpuraResetView');
  if (btnZReset) {
    btnZReset.addEventListener('click', () => {
      state.epuraZoom = 1.0;
      state.epuraPan = { x: 0, y: 0 };
      updateZoomUI();
    });
  }

  // Canvas Drag to Pan
  const cCanvas = document.getElementById('epuraCanvas');
  if (cCanvas) {
    let isPanning = false, panStart = { x: 0, y: 0 };
    cCanvas.addEventListener('mousedown', (e) => {
      isPanning = true;
      panStart = { x: e.clientX - (state.epuraPan ? state.epuraPan.x : 0), y: e.clientY - (state.epuraPan ? state.epuraPan.y : 0) };
      const tooltip = document.getElementById('epuraHoverTooltip');
      if (tooltip) tooltip.classList.add('hidden');
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      if (!state.epuraPan) state.epuraPan = { x: 0, y: 0 };
      state.epuraPan.x = e.clientX - panStart.x;
      state.epuraPan.y = e.clientY - panStart.y;
      drawEpura2D();
    });
    window.addEventListener('mouseup', () => { isPanning = false; });

    // Interactive Hover Tooltip for Geometric Details & Measurements
    cCanvas.addEventListener('mousemove', (e) => {
      if (isPanning) return;
      const tooltip = document.getElementById('epuraHoverTooltip');
      if (!tooltip) return;
      const rect = cCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const targets = window.epuraHoverTargets || [];
      let best = null, bestDist = Infinity;
      for (const t of targets) {
        const d = Math.hypot(mx - t.x, my - t.y);
        if (d <= t.r && d < bestDist) {
          best = t;
          bestDist = d;
        }
      }
      if (best) {
        tooltip.innerHTML = `<div class="font-bold text-sky-300 text-[11px] mb-0.5">${escapeHtml(best.title)}</div><div class="text-slate-200 text-[10px] leading-tight">${best.lines.map(escapeHtml).join('<br>')}</div>`;
        const tipW = 220, tipH = 65;
        const left = Math.max(10, Math.min(rect.width - tipW, mx + 14));
        const top = Math.max(10, Math.min(rect.height - tipH, my + 14));
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.remove('hidden');
      } else {
        tooltip.classList.add('hidden');
      }
    });
    cCanvas.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('epuraHoverTooltip');
      if (tooltip) tooltip.classList.add('hidden');
    });

    // Wheel to Zoom
    cCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      state.epuraZoom = Math.max(0.35, Math.min(4.5, (state.epuraZoom || 1.0) * factor));
      updateZoomUI();
    }, { passive: false });

    // Touch support (Pan & Pinch-to-Zoom en pantallas móviles y táctiles)
    let touchStart = { x: 0, y: 0 }, initDist = 0, touchMoved = false, touchStartTime = 0;
    cCanvas.addEventListener('touchstart', (e) => {
      touchMoved = false;
      touchStartTime = Date.now();
      if (!state.epuraPan) state.epuraPan = { x: 0, y: 0 };
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX - state.epuraPan.x, y: e.touches[0].clientY - state.epuraPan.y };
      } else if (e.touches.length === 2) {
        initDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: false });

    cCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Evita scroll o rebote nativo de la página
      touchMoved = true;
      if (!state.epuraPan) state.epuraPan = { x: 0, y: 0 };
      if (e.touches.length === 1) {
        state.epuraPan.x = e.touches[0].clientX - touchStart.x;
        state.epuraPan.y = e.touches[0].clientY - touchStart.y;
        drawEpura2D();
      } else if (e.touches.length === 2 && initDist > 0) {
        const curDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const factor = curDist / initDist;
        state.epuraZoom = Math.max(0.35, Math.min(4.5, (state.epuraZoom || 1.0) * factor));
        initDist = curDist;
        updateZoomUI();
      }
    }, { passive: false });

    cCanvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        // Detector de toques/taps rápidos para mostrar tooltip en dispositivos móviles
        if (!touchMoved && (Date.now() - touchStartTime < 350) && e.changedTouches.length === 1) {
          const t = e.changedTouches[0];
          const rect = cCanvas.getBoundingClientRect();
          const mx = t.clientX - rect.left;
          const my = t.clientY - rect.top;
          const targets = window.epuraHoverTargets || [];
          let best = null, bestDist = Infinity;
          for (const target of targets) {
            const d = Math.hypot(mx - target.x, my - target.y);
            if (d <= (target.r + 10) && d < bestDist) {
              best = target;
              bestDist = d;
            }
          }
          const tooltip = document.getElementById('epuraHoverTooltip');
          if (tooltip) {
            if (best) {
              tooltip.innerHTML = `<div class="font-bold text-sky-300 text-[11px] mb-0.5">${escapeHtml(best.title)}</div><div class="text-slate-200 text-[10px] leading-tight">${best.lines.map(escapeHtml).join('<br>')}</div>`;
              const tipW = 200, tipH = 60;
              const left = Math.max(6, Math.min(rect.width - tipW - 6, mx - tipW / 2));
              const top = Math.max(6, my - tipH - 12);
              tooltip.style.left = `${left}px`;
              tooltip.style.top = `${top}px`;
              tooltip.classList.remove('hidden');
              setTimeout(() => { if (tooltip) tooltip.classList.add('hidden'); }, 3500);
            } else {
              tooltip.classList.add('hidden');
            }
          }
        }
        initDist = 0;
      } else if (e.touches.length === 1) {
        initDist = 0;
        if (!state.epuraPan) state.epuraPan = { x: 0, y: 0 };
        touchStart = { x: e.touches[0].clientX - state.epuraPan.x, y: e.touches[0].clientY - state.epuraPan.y };
      }
    });
  }

  // --- Verdadera Magnitud (V.M.) Animation Controller ---
  let vmAnimRAF = null;
  let vmAnimTimeout = null;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function updatePlayAnimButtonUI(isPlaying) {
    const btn = document.getElementById('btnVMPlayAnim');
    const icon = document.getElementById('iconVMPlayAnim');
    const text = document.getElementById('textVMPlayAnim');
    if (!btn || !icon || !text) return;
    if (isPlaying) {
      btn.className = "pill-btn px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1 shadow-2xs transition active:scale-95";
      icon.className = "fa-solid fa-stop text-[8px]";
      text.textContent = "Detener";
    } else {
      btn.className = "pill-btn px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition active:scale-95";
      icon.className = "fa-solid fa-play text-[8px]";
      text.textContent = "Animar (1 al 6)";
    }
  }

  function stopVMAnimation() {
    if (vmAnimRAF) {
      cancelAnimationFrame(vmAnimRAF);
      vmAnimRAF = null;
    }
    if (vmAnimTimeout) {
      clearTimeout(vmAnimTimeout);
      vmAnimTimeout = null;
    }
    state.vmIsPlaying = false;
    state.vmAnimProgress = 1.0;
    state.vmAnimActiveStep = 0;
    updatePlayAnimButtonUI(false);
  }

  function animateVMStep(targetStep, onComplete) {
    if (vmAnimRAF) {
      cancelAnimationFrame(vmAnimRAF);
      vmAnimRAF = null;
    }
    state.vmAnimActiveStep = targetStep;
    state.vmAnimProgress = 0.0;
    state.vmStep = targetStep;

    // Actualizar estilo visual de los botones de pasos
    [0, 1, 2, 3, 4, 5, 6].forEach(i => {
      const el = document.getElementById(i === 0 ? 'btnVMStepAll' : `btnVMStep${i}`);
      if (el) {
        el.className = `pill-btn px-1.5 py-0.5 rounded-md text-[9px] ${targetStep === i ? 'font-bold bg-blue-600 text-white shadow-2xs ring-1 ring-blue-300' : 'font-medium bg-slate-100 text-slate-600 hover:bg-blue-50'}`;
      }
    });

    const duration = 900;
    const startTime = performance.now();

    function frame(now) {
      const raw = Math.min(1.0, (now - startTime) / duration);
      state.vmAnimProgress = easeOutCubic(raw);
      drawEpura2D();
      if (raw < 1.0) {
        vmAnimRAF = requestAnimationFrame(frame);
      } else {
        state.vmAnimProgress = 1.0;
        drawEpura2D();
        vmAnimRAF = null;
        if (onComplete) onComplete();
      }
    }
    vmAnimRAF = requestAnimationFrame(frame);
  }

  function playVMFullSequence() {
    stopVMAnimation();
    const isPlaneMode = (state.mode === 'planes');
    const isInterMode = (state.mode === 'intersections');
    const currentType = isPlaneMode ? state.planeType : (isInterMode ? state.intersection.cuttingPlaneType : null);
    const allowsAbat = (currentType === 'canto' || currentType === 'proj_horizontal' || currentType === 'proj_vertical' || currentType === 'oblique' || currentType === 'parallel_lt');
    const allowsGiro = (currentType === 'canto' || currentType === 'proj_horizontal' || currentType === 'proj_vertical');
    if (!allowsAbat && !allowsGiro) return;

    if (state.vmMethod === 'none') {
      setVMMethod(allowsAbat ? 'abatimiento' : (allowsGiro ? 'giro' : 'none'));
    }
    state.vmIsPlaying = true;
    updatePlayAnimButtonUI(true);

    const runStep = (stepIdx) => {
      if (!state.vmIsPlaying) return;
      animateVMStep(stepIdx, () => {
        if (!state.vmIsPlaying) return;
        if (stepIdx < 6) {
          vmAnimTimeout = setTimeout(() => {
            runStep(stepIdx + 1);
          }, 350);
        } else {
          // Secuencia completa terminada: pausa breve y muestra todo
          vmAnimTimeout = setTimeout(() => {
            stopVMAnimation();
            setVMStep(0);
          }, 700);
        }
      });
    };

    runStep(1);
  }

  // VM Method Selection
  const updateStepPillLabels = (m) => {
    const s1 = document.getElementById('btnVMStep1');
    const s2 = document.getElementById('btnVMStep2');
    const s3 = document.getElementById('btnVMStep3');
    const s4 = document.getElementById('btnVMStep4');
    const s5 = document.getElementById('btnVMStep5');
    const s6 = document.getElementById('btnVMStep6');
    if (!s1 || !s2 || !s3 || !s4 || !s5 || !s6) return;
    const currentType = (state.mode === 'planes') ? state.planeType : state.intersection.cuttingPlaneType;
    const isVertical = (currentType === 'proj_horizontal');

    if (m === 'giro') {
      if (isVertical) {
        s1.textContent = '1. Centro E (LT)';
        s2.textContent = '2. Cálculo R (PH)';
        s3.textContent = '3. Rotación PH';
        s4.textContent = '4. Cota Y // LT';
        s5.textContent = '5. Subida PV';
        s6.textContent = '6. V.M. (arriba)';
        s1.title = 'Paso 1: Elección del eje vertical E (⊥ al PH) apoyado en la Línea de Tierra (LT)';
        s2.title = 'Paso 2: Cálculo del radio R = √(Δx² + z²) mediante triángulo rectángulo en PH';
        s3.title = 'Paso 3: Rotación física en PH con compás desde los puntos hasta la Línea de Tierra';
        s4.title = 'Paso 4: Trayectorias en PV. Como el eje es vertical, la cota Y es constante (y\'=y)';
        s5.title = 'Paso 5: Líneas de correspondencia verticales que suben desde LT y fijan los vértices en PV';
        s6.title = 'Paso 6: Polígono girado en Verdadera Magnitud (V.M.) arriba en el Plano Vertical (PV)';
      } else {
        s1.textContent = '1. Centro E (LT)';
        s2.textContent = '2. Cálculo R (PV)';
        s3.textContent = '3. Rotación PV';
        s4.textContent = '4. Alej. Z // LT';
        s5.textContent = '5. Caída PH';
        s6.textContent = '6. V.M. (abajo)';
        s1.title = 'Paso 1: Elección del eje de punta E (⊥ al PV) apoyado en la Línea de Tierra (LT)';
        s2.title = 'Paso 2: Cálculo del radio R = √(Δx² + y²) mediante triángulo rectángulo en PV';
        s3.title = 'Paso 3: Rotación física en PV con compás desde los puntos hasta la Línea de Tierra';
        s4.title = 'Paso 4: Trayectorias en PH. Como el eje es de punta, el alejamiento Z es constante (z\'=z)';
        s5.title = 'Paso 5: Líneas de correspondencia verticales que caen desde LT y fijan los vértices en PH';
        s6.title = 'Paso 6: Polígono girado en Verdadera Magnitud (V.M.) abajo en el Plano Horizontal (PH)';
      }
    } else {
      s1.textContent = '1. Charnela';
      s2.textContent = '2. Cotas PV';
      s3.textContent = '3. Perpendiculares';
      s4.textContent = '4. Triángulo V.M.';
      s5.textContent = '5. Arcos';
      s6.textContent = '6. V.M.';
      s1.title = 'Paso 1: Traza horizontal α₁ como charnela';
      s2.title = 'Paso 2: Medición de cotas verticales en PV desde la Línea de Tierra (LT)';
      s3.title = 'Paso 3: Perpendiculares desde cada punto en PH hacia la charnela (90°)';
      s4.title = 'Paso 4: Triángulo de rebatimiento y radio R = √(d² + cota²)';
      s5.title = 'Paso 5: Arcos de compás con centro en el pie A₀';
      s6.title = 'Paso 6: Polígono en Verdadera Magnitud (V.M.)';
    }
  };

  const updateVMMethodButtons = () => {
    const isPlaneMode = (state.mode === 'planes');
    const isInterMode = (state.mode === 'intersections');
    const btnNone = document.getElementById('btnVMMethodNone');
    const btnAbat = document.getElementById('btnVMMethodAbat');
    const btnGiro = document.getElementById('btnVMMethodGiro');
    const stepsRow = document.getElementById('epuraVMStepsRow');
    if (!btnNone || !btnAbat || !btnGiro) return;

    if (!isPlaneMode && !isInterMode) return;

    const currentType = isPlaneMode ? state.planeType : state.intersection.cuttingPlaneType;

    // Reglas de disponibilidad de métodos de V.M. por tipo de plano:
    // 1. Horizontal, Frontal y Perfil: NO admiten ni Abatimiento ni Giro (V.M. directa en PH, PV o PP)
    // 2. Oblicuo y Paralelo a LT: SOLO admiten Abatimiento (Giro deshabilitado)
    // 3. Canto y Vertical: admiten tanto Abatimiento como Giro
    const allowsAbat = (currentType === 'canto' || currentType === 'proj_horizontal' || currentType === 'proj_vertical' || currentType === 'oblique' || currentType === 'parallel_lt');
    const allowsGiro = (currentType === 'canto' || currentType === 'proj_horizontal' || currentType === 'proj_vertical');

    // Validación y degradación segura del método activo si no está permitido
    if (state.vmMethod === 'giro' && !allowsGiro) {
      state.vmMethod = allowsAbat ? 'abatimiento' : 'none';
    } else if (state.vmMethod === 'abatimiento' && !allowsAbat) {
      state.vmMethod = 'none';
    }

    const m = state.vmMethod;

    // Control estricto de visibilidad (clase 'hidden')
    btnAbat.classList.toggle('hidden', !allowsAbat);
    btnGiro.classList.toggle('hidden', !allowsGiro);

    // Actualizar estilos activos/inactivos preservando estrictamente la clase 'hidden'
    btnNone.className = `pill-btn px-2 py-0.5 rounded-lg text-[10px] font-bold ${m === 'none' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'}`;

    btnAbat.className = `pill-btn px-2 py-0.5 rounded-lg text-[10px] font-bold ${m === 'abatimiento' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'}${allowsAbat ? '' : ' hidden'}`;

    btnGiro.className = `pill-btn px-2 py-0.5 rounded-lg text-[10px] font-bold ${m === 'giro' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'}${allowsGiro ? '' : ' hidden'}`;

    // Fila de paso a paso: visible solo si el método activo es abatimiento o giro y está permitido
    if (stepsRow) {
      const showSteps = (m === 'abatimiento' && allowsAbat) || (m === 'giro' && allowsGiro);
      stepsRow.classList.toggle('hidden', !showSteps);
    }

    updateStepPillLabels(state.vmMethod);
  };
  window.updateVMMethodButtons = updateVMMethodButtons;

  const setVMMethod = (m) => {
    stopVMAnimation();
    state.vmMethod = m;
    updateVMMethodButtons();
    setVMStep(0);
  };

  const btnVMNone = document.getElementById('btnVMMethodNone');
  if (btnVMNone) btnVMNone.addEventListener('click', () => setVMMethod('none'));
  const btnVMAbat = document.getElementById('btnVMMethodAbat');
  if (btnVMAbat) btnVMAbat.addEventListener('click', () => setVMMethod('abatimiento'));
  const btnVMGiro = document.getElementById('btnVMMethodGiro');
  if (btnVMGiro) btnVMGiro.addEventListener('click', () => setVMMethod('giro'));

  // Step Pills
  const setVMStep = (s) => {
    stopVMAnimation();
    state.vmStep = s;
    state.vmAnimActiveStep = 0;
    state.vmAnimProgress = 1.0;
    [0, 1, 2, 3, 4, 5, 6].forEach(i => {
      const el = document.getElementById(i === 0 ? 'btnVMStepAll' : `btnVMStep${i}`);
      if (el) {
        el.className = `pill-btn px-1.5 py-0.5 rounded-md text-[9px] ${state.vmStep === i ? 'font-bold bg-blue-600 text-white' : 'font-medium bg-slate-100 text-slate-600 hover:bg-blue-50'}`;
      }
    });
    drawEpura2D();
  };
  const stepAll = document.getElementById('btnVMStepAll'); if (stepAll) stepAll.addEventListener('click', () => setVMStep(0));
  const step1 = document.getElementById('btnVMStep1'); if (step1) step1.addEventListener('click', () => animateVMStep(1));
  const step2 = document.getElementById('btnVMStep2'); if (step2) step2.addEventListener('click', () => animateVMStep(2));
  const step3 = document.getElementById('btnVMStep3'); if (step3) step3.addEventListener('click', () => animateVMStep(3));
  const step4 = document.getElementById('btnVMStep4'); if (step4) step4.addEventListener('click', () => animateVMStep(4));
  const step5 = document.getElementById('btnVMStep5'); if (step5) step5.addEventListener('click', () => animateVMStep(5));
  const step6 = document.getElementById('btnVMStep6'); if (step6) step6.addEventListener('click', () => animateVMStep(6));

  const btnPlayAnim = document.getElementById('btnVMPlayAnim');
  if (btnPlayAnim) {
    btnPlayAnim.addEventListener('click', () => {
      if (state.vmIsPlaying) {
        stopVMAnimation();
      } else {
        playVMFullSequence();
      }
    });
  }

  // Layer switches
  const setupToggle = (id, key, activeBg, activeText, activeBorder) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      state.vmVisibility[key] = !state.vmVisibility[key];
      const on = state.vmVisibility[key];
      el.className = `pill-btn px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${on ? `${activeBg} ${activeText} ${activeBorder}` : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'}`;
      drawEpura2D();
    });
  };
  setupToggle('toggleVMProjections', 'projections', 'bg-blue-100', 'text-blue-800', 'border-blue-300');
  setupToggle('toggleVMTraces', 'traces', 'bg-blue-100', 'text-blue-800', 'border-blue-300');
  setupToggle('toggleVMConstruction', 'construction', 'bg-amber-100', 'text-amber-800', 'border-amber-300');
  setupToggle('toggleVMResult', 'resultVM', 'bg-emerald-100', 'text-emerald-800', 'border-emerald-300');

  // Expand Plane
  const btnExpPlane = document.getElementById('btnExpandPlane');
  if (btnExpPlane) {
    btnExpPlane.addEventListener('click', () => {
      state.planeExpanded = !state.planeExpanded;
      if (state.planeExpanded) {
        btnExpPlane.className = "px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-400 text-xs font-semibold flex items-center gap-1 transition shadow-sm";
      } else {
        btnExpPlane.className = "px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-slate-600 border border-slate-300 text-xs font-normal flex items-center gap-1 transition shadow-sm";
      }
      updateScene();
    });
  }

  // Line x Solid Line Type Selector
  const selLSLineType = document.getElementById('selectLSLineType');
  if (selLSLineType) {
    selLSLineType.addEventListener('change', (e) => {
      state.lineSolid.lineType = e.target.value;
      const p = lineSolidPresets[state.lineSolid.lineType];
      if (p) {
        Object.assign(state.lineSolid.p1, p.p1);
        Object.assign(state.lineSolid.p2, p.p2);
        syncLineSolidSliders();
      }
      updateCoupledBadges();
      updateScene();
    });
  }

  // Point Names (Lines)
  const inP1 = document.getElementById('inputNameP1');
  if (inP1) inP1.addEventListener('input', (e) => { state.pointNames.p1 = e.target.value.toUpperCase() || 'A'; updateScene(); });
  const inP2 = document.getElementById('inputNameP2');
  if (inP2) inP2.addEventListener('input', (e) => { state.pointNames.p2 = e.target.value.toUpperCase() || 'B'; updateScene(); });

  // Point Names (Planes)
  ['inputNamePlaneP1', 'inputNamePlaneP2', 'inputNamePlaneP3'].forEach((id, idx) => {
    const key = ['p1', 'p2', 'p3'][idx];
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        state.pointNames[key] = e.target.value.toUpperCase() || ['A', 'B', 'C'][idx];
        updateScene();
      });
    }
  });

  // Point Names (Line × Solid)
  const elLSP1 = document.getElementById('inputNameLSP1');
  if (elLSP1) {
    elLSP1.addEventListener('input', (e) => {
      if (!state.lineSolid.names) state.lineSolid.names = {};
      state.lineSolid.names.p1 = e.target.value.toUpperCase() || 'P1';
      updateScene();
    });
  }
  const elLSP2 = document.getElementById('inputNameLSP2');
  if (elLSP2) {
    elLSP2.addEventListener('input', (e) => {
      if (!state.lineSolid.names) state.lineSolid.names = {};
      state.lineSolid.names.p2 = e.target.value.toUpperCase() || 'P2';
      updateScene();
    });
  }

  // Line Sliders & Number inputs with geometric coupling
  ['x', 'y', 'z'].forEach(c => {
    bindPair(`sliderA1${c.toUpperCase()}`, `numA1${c.toUpperCase()}`, () => state.line.p1[c], (v) => { state.line.p1[c] = v; }, () => { syncLineLabels(); updateScene(); }, (val) => lineCoupling(val, c, true));
    bindPair(`sliderA2${c.toUpperCase()}`, `numA2${c.toUpperCase()}`, () => state.line.p2[c], (v) => { state.line.p2[c] = v; }, () => { syncLineLabels(); updateScene(); }, (val) => lineCoupling(val, c, false));
  });

  // Plane Sliders & Number inputs with geometric coupling
  [['sliderP1', 'numP1', 'p1'], ['sliderP2', 'numP2', 'p2'], ['sliderP3', 'numP3', 'p3']].forEach(([sPrefix, nPrefix, ptKey]) => {
    ['x', 'y', 'z'].forEach(c => {
      bindPair(
        `${sPrefix}${c.toUpperCase()}`,
        `${nPrefix}${c.toUpperCase()}`,
        () => state.plane[ptKey][c],
        (v) => { state.plane[ptKey][c] = v; },
        () => { syncPlaneLabels(); updateScene(); },
        (val, prevVal) => planeCoupling(val, c, ptKey, prevVal)
      );
    });
  });

  // Line-Solid Sliders & Number inputs
  ['x', 'y', 'z'].forEach(c => {
    bindPair(`sliderLSP1${c.toUpperCase()}`, `numLSP1${c.toUpperCase()}`, () => state.lineSolid.p1[c], (v) => { state.lineSolid.p1[c] = v; }, () => { syncLineSolidLabels(); updateScene(); }, (val) => lineSolidCoupling(val, c, true));
    bindPair(`sliderLSP2${c.toUpperCase()}`, `numLSP2${c.toUpperCase()}`, () => state.lineSolid.p2[c], (v) => { state.lineSolid.p2[c] = v; }, () => { syncLineSolidLabels(); updateScene(); }, (val) => lineSolidCoupling(val, c, false));
  });

  // Intersection Sliders & Number inputs
  bindPair('sliderCutHeight', 'numCutHeight', state.intersection, 'cutHeight', () => updateScene());
  bindPair('sliderCutDist', 'numCutDist', state.intersection, 'cutDist', () => updateScene());
  bindPair('sliderCutX', 'numCutX', state.intersection, 'cutX', () => updateScene());
  bindPair('sliderCutAngle', 'numCutAngle', state.intersection, 'cutAngle', () => updateScene());
  bindPair('sliderCutAngleBeta', 'numCutAngleBeta', state.intersection, 'cutAngleBeta', () => updateScene());

  // Auto-correct button
  const btnAutoCorrect = document.getElementById('btnAutoCorrect');
  if (btnAutoCorrect) {
    btnAutoCorrect.addEventListener('click', () => {
      if (state.mode === 'lines') {
        const p = linePresets[state.lineType];
        if (p) { Object.assign(state.line.p1, p.p1); Object.assign(state.line.p2, p.p2); syncLineSliders(); }
      } else if (state.mode === 'planes') {
        const p = planePresets[state.planeType];
        if (p) { Object.assign(state.plane.p1, p.p1); Object.assign(state.plane.p2, p.p2); Object.assign(state.plane.p3, p.p3); syncPlaneSliders(); }
      } else if (state.mode === 'intersections') {
        state.intersection.cutAngle = 35; state.intersection.cutAngleBeta = 30; syncIntersectionSliders();
      } else if (state.mode === 'line_solid') {
        const p = lineSolidPresets[state.lineSolid.lineType] || lineSolidPresets.oblique;
        if (p) { Object.assign(state.lineSolid.p1, p.p1); Object.assign(state.lineSolid.p2, p.p2); syncLineSolidSliders(); }
      }
      updateCoupledBadges();
      if (typeof window.updateVMMethodButtons === 'function') window.updateVMMethodButtons();
      updateScene();
    });
  }

  // Lock button
  const btnToggleLock = document.getElementById('btnToggleCoordLock');
  if (btnToggleLock) {
    btnToggleLock.addEventListener('click', () => {
      state.lockCoupledSliders = !state.lockCoupledSliders;
      const icon = document.getElementById('lockStatusIcon');
      const txt = document.getElementById('lockStatusText');
      if (state.lockCoupledSliders) {
        if (icon) icon.textContent = '🔒';
        if (txt) txt.textContent = 'Restricción activa';
        btnToggleLock.className = 'text-[10px] px-2 py-0.5 rounded-lg bg-blue-600 text-white font-semibold transition flex items-center gap-1 shadow-sm';
      } else {
        if (icon) icon.textContent = '🔓';
        if (txt) txt.textContent = 'Ajuste libre';
        btnToggleLock.className = 'text-[10px] px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold transition flex items-center gap-1';
      }
      updateCoupledBadges();
    });
  }

  // Reset button
  const btnReset = document.getElementById('btnResetCoords');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (state.mode === 'lines') {
        const p = linePresets[state.lineType] || linePresets.oblique;
        Object.assign(state.line.p1, p.p1); Object.assign(state.line.p2, p.p2);
        syncLineSliders();
      } else if (state.mode === 'planes') {
        const p = planePresets[state.planeType] || planePresets.oblique;
        Object.assign(state.plane.p1, p.p1); Object.assign(state.plane.p2, p.p2); Object.assign(state.plane.p3, p.p3);
        syncPlaneSliders();
      } else if (state.mode === 'intersections') {
        state.intersection.cutHeight = 5.0; state.intersection.cutDist = 5.5; state.intersection.cutX = 0.0;
        state.intersection.cutAngle = 35; state.intersection.cutAngleBeta = 30;
        syncIntersectionSliders();
      } else if (state.mode === 'line_solid') {
        const p = lineSolidPresets[state.lineSolid.lineType] || lineSolidPresets.oblique;
        Object.assign(state.lineSolid.p1, p.p1); Object.assign(state.lineSolid.p2, p.p2);
        syncLineSolidSliders();
      }
      updateCoupledBadges();
      if (typeof window.updateVMMethodButtons === 'function') window.updateVMMethodButtons();
      updateScene();
    });
  }

  // Panels Collapse/Expand
  const cHead = document.getElementById('coordsHeader');
  if (cHead) {
    cHead.addEventListener('click', (e) => {
      // Don't toggle if clicking a specific action button inside header
      if (e.target.closest('#btnToggleCoordLock') || e.target.closest('#btnResetCoords')) return;
      const cContent = document.getElementById('coordsContent');
      if (cContent) {
        cContent.classList.toggle('hidden');
        const icon = document.getElementById('iconToggleCoords');
        if (icon) {
          const isHidden = cContent.classList.contains('hidden');
          icon.classList.toggle('fa-chevron-down', isHidden);
          icon.classList.toggle('fa-chevron-up', !isHidden);
        }
      }
    });
  }
  const lHead = document.getElementById('legendHeader');
  if (lHead) {
    lHead.addEventListener('click', () => {
      const lContent = document.getElementById('legendContent');
      if (lContent) {
        lContent.classList.toggle('hidden');
        const icon = document.getElementById('iconToggleLegend');
        if (icon) {
          const isHidden = lContent.classList.contains('hidden');
          icon.classList.toggle('fa-chevron-down', isHidden);
          icon.classList.toggle('fa-chevron-up', !isHidden);
        }
      }
    });
  }

  // Mobile initial state: collapse Legend and Coords by default so 3D scene is clean and visible
  if (window.innerWidth < 768) {
    const lCont = document.getElementById('legendContent');
    const lIcon = document.getElementById('iconToggleLegend');
    if (lCont && !lCont.classList.contains('hidden')) {
      lCont.classList.add('hidden');
      if (lIcon) { lIcon.classList.remove('fa-chevron-up'); lIcon.classList.add('fa-chevron-down'); }
    }
    const cCont = document.getElementById('coordsContent');
    const cIcon = document.getElementById('iconToggleCoords');
    if (cCont && !cCont.classList.contains('hidden')) {
      cCont.classList.add('hidden');
      if (cIcon) { cIcon.classList.remove('fa-chevron-up'); cIcon.classList.add('fa-chevron-down'); }
    }
  }

  // Custom Figures Modal System
  initFigureModal();

  // Initialize defaults
  syncLineSliders();
  switchMode('lines');

  const animate = () => {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  };
  animate();
};
