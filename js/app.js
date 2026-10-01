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
      <li><span class="text-blue-700 font-bold">${nA}:</span> (${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}, ${p1.z.toFixed(1)})</li>
      <li><span class="text-blue-700 font-bold">${nB}:</span> (${p2.x.toFixed(1)}, ${p2.y.toFixed(1)}, ${p2.z.toFixed(1)})</li>
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
      <li><span class="text-blue-700 font-bold">${nA}:</span> (${state.plane.p1.x.toFixed(1)}, ${state.plane.p1.y.toFixed(1)}, ${state.plane.p1.z.toFixed(1)})</li>
      <li><span class="text-blue-700 font-bold">${nB}:</span> (${state.plane.p2.x.toFixed(1)}, ${state.plane.p2.y.toFixed(1)}, ${state.plane.p2.z.toFixed(1)})</li>
      <li><span class="text-blue-700 font-bold">${nC}:</span> (${state.plane.p3.x.toFixed(1)}, ${state.plane.p3.y.toFixed(1)}, ${state.plane.p3.z.toFixed(1)})</li>
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
    leg.innerHTML = listToShow.map(it => `<li><span class="text-blue-700 font-bold">${it.name3D || 'P'}:</span> (${it.pt.x.toFixed(1)}, ${it.pt.y.toFixed(1)}, ${it.pt.z.toFixed(1)})</li>`).join('');
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
    <li><span class="text-blue-700 font-bold">${nP1}:</span> (${v1.x.toFixed(1)}, ${v1.y.toFixed(1)}, ${v1.z.toFixed(1)})</li>
    <li><span class="text-blue-700 font-bold">${nP2}:</span> (${v2.x.toFixed(1)}, ${v2.y.toFixed(1)}, ${v2.z.toFixed(1)})</li>
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
  state.mode = m;
  ['btnModeLines', 'btnModePlanes', 'btnModeIntersections', 'btnModeLineSolid'].forEach(id => {
    const active = id.includes(m === 'lines' ? 'Lines' : m === 'planes' ? 'Planes' : m === 'intersections' ? 'Intersections' : 'LineSolid');
    const el = document.getElementById(id);
    if (el) {
      el.className = `mode-btn px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'}`;
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
  initThree();
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

  // Epura controls
  const btnTogEpura = document.getElementById('btnToggleEpura');
  if (btnTogEpura) {
    btnTogEpura.addEventListener('click', () => {
      document.getElementById('epuraModal').classList.toggle('hidden');
    });
  }

  const btnExpEpura = document.getElementById('btnExpandEpura');
  if (btnExpEpura) {
    btnExpEpura.addEventListener('click', () => {
      state.epuraExpanded = !state.epuraExpanded;
      const em = document.getElementById('epuraModal');
      if (state.epuraExpanded) {
        em.classList.replace('top-3', 'top-1/2');
        em.classList.replace('right-3', 'left-1/2');
        em.classList.add('-translate-x-1/2', '-translate-y-1/2', 'w-[94vw]', 'max-w-2xl');
      } else {
        em.classList.replace('top-1/2', 'top-3');
        em.classList.replace('left-1/2', 'right-3');
        em.classList.remove('-translate-x-1/2', '-translate-y-1/2', 'w-[94vw]', 'max-w-2xl');
      }
      drawEpura2D();
    });
  }

  const btnCloseEpura = document.getElementById('btnCloseEpura');
  if (btnCloseEpura) {
    btnCloseEpura.addEventListener('click', () => {
      document.getElementById('epuraModal').classList.add('hidden');
    });
  }

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
      updateScene();
    });
  }

  // Panels Collapse/Expand
  const cHead = document.getElementById('coordsHeader');
  if (cHead) {
    cHead.addEventListener('click', () => {
      document.getElementById('coordsContent').classList.toggle('hidden');
      document.getElementById('iconToggleCoords').classList.toggle('fa-chevron-down');
      document.getElementById('iconToggleCoords').classList.toggle('fa-chevron-up');
    });
  }
  const lHead = document.getElementById('legendHeader');
  if (lHead) {
    lHead.addEventListener('click', () => {
      document.getElementById('legendContent').classList.toggle('hidden');
      document.getElementById('iconToggleLegend').classList.toggle('fa-chevron-up');
      document.getElementById('iconToggleLegend').classList.toggle('fa-chevron-down');
    });
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
