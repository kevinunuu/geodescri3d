/**
 * GeoDescri3D - Motor de Proyección 2D (Épura Diédrica)
 * Soporta proyección en alzado (PV), planta (PH), líneas de correspondencia,
 * 3ª Proyección (Perfil - PP), Pan & Zoom interactivo y resolución didáctica de
 * Verdadera Magnitud (V.M.) paso a paso mediante Abatimiento (Rebatimiento) y Giro.
 */

function drawEpura2D() {
  if (!epuraCanvas || !epuraCtx) return;

  const isPlanesOrIntersections = (state.mode === 'planes' || state.mode === 'intersections');
  const isProfilePlane = (
    (state.mode === 'planes' && state.planeType === 'profile') ||
    (state.mode === 'intersections' && state.intersection.cuttingPlaneType === 'profile')
  );
  const isParallelLTPlane = (
    (state.mode === 'planes' && state.planeType === 'parallel_lt') ||
    (state.mode === 'intersections' && state.intersection.cuttingPlaneType === 'parallel_lt')
  );
  const has3rdProj = (
    (state.mode === 'lines' && (state.lineType === 'parallel_lt' || state.lineType === 'profile')) ||
    isProfilePlane ||
    (isParallelLTPlane && state.vmMethod === 'none') ||
    (state.mode === 'line_solid' && (state.lineSolid.lineType === 'parallel_lt' || state.lineSolid.lineType === 'profile'))
  );

  const container = document.getElementById('epuraCanvasContainer');
  const modalEl = document.getElementById('epuraModal');

  // Ajuste de tamaño de canvas y modal
  if (modalEl) modalEl.style.width = '';

  if (state.epuraFullscreen) {
    const contW = (container && container.clientWidth > 50) ? container.clientWidth : (window.innerWidth - 32);
    const contH = (container && container.clientHeight > 50) ? container.clientHeight : (window.innerHeight - 150);
    epuraCanvas.width = Math.max(260, Math.floor(contW));
    epuraCanvas.height = Math.max(180, Math.floor(contH));
  } else if (state.epuraExpanded) {
    const maxW = Math.min(640, window.innerWidth - 24);
    epuraCanvas.width = Math.floor(maxW);
    epuraCanvas.height = Math.min(420, Math.max(180, Math.floor(window.innerHeight * 0.52)));
  } else {
    const contW = (container && container.clientWidth > 50) ? container.clientWidth : 320;
    const targetW = has3rdProj ? 360 : 320;
    epuraCanvas.width = Math.min(targetW, Math.max(240, Math.floor(contW)));
    epuraCanvas.height = Math.min(220, Math.max(160, Math.floor(window.innerHeight * 0.3)));
  }

  const w = epuraCanvas.width, h = epuraCanvas.height, ctx = epuraCtx;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Malla técnica de fondo
  ctx.strokeStyle = "rgba(2, 132, 199, 0.08)";
  ctx.lineWidth = 1;
  const gridStep = (state.epuraExpanded || state.epuraFullscreen) ? 24 : 16;
  for (let x = 0; x < w; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += gridStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Base escala y orígenes
  const baseScale = (state.epuraFullscreen ? 21 : (state.epuraExpanded ? 18 : 11));
  const sc = baseScale;
  const oX = has3rdProj ? Math.round(w * 0.33) : w / 2;
  const oY = h / 2;
  const oX_pp = has3rdProj ? Math.round(w * 0.72) : 0;

  // Aplicar transformación Pan & Zoom
  ctx.save();
  ctx.translate(w / 2 + (state.epuraPan ? state.epuraPan.x : 0), h / 2 + (state.epuraPan ? state.epuraPan.y : 0));
  const currentZoom = state.epuraZoom || 1.0;
  ctx.scale(currentZoom, currentZoom);
  ctx.translate(-oX, -oY);

  window.epuraHoverTargets = [];
  function addHoverTarget(drawX, drawY, hitR, title, lines) {
    const panX = state.epuraPan ? state.epuraPan.x : 0;
    const panY = state.epuraPan ? state.epuraPan.y : 0;
    const z = currentZoom;
    const sx = (w / 2 + panX) + (drawX - oX) * z;
    const sy = (h / 2 + panY) + (drawY - oY) * z;
    window.epuraHoverTargets.push({
      x: sx,
      y: sy,
      r: (hitR || 10) * Math.max(0.8, Math.min(2.5, z)),
      title,
      lines: Array.isArray(lines) ? lines : [lines]
    });
  }

  // 1. Línea de Tierra (LT)
  const ltLeft = -Math.max(w * 2, 800), ltRight = Math.max(w * 2, 800);
  ctx.beginPath();
  ctx.strokeStyle = "#0038a8";
  ctx.lineWidth = 2.5 / currentZoom;
  ctx.moveTo(ltLeft, oY);
  ctx.lineTo(ltRight, oY);
  ctx.stroke();

  // Marcas de trazo de LT
  ctx.font = "bold 11px 'JetBrains Mono'";
  ctx.fillStyle = "#0038a8";
  ctx.fillText("LT", oX + (w / 2) - 30, oY - 6);

  // Indicadores de semiplanos
  ctx.font = "bold 9px 'JetBrains Mono'";
  ctx.fillStyle = "rgba(0, 56, 168, 0.45)";
  ctx.fillText("PV (Alzado)", oX - (w / 2) + 14, oY - (h / 2) + 20);
  ctx.fillStyle = "rgba(2, 132, 199, 0.45)";
  ctx.fillText("PH (Planta)", oX - (w / 2) + 14, oY + (h / 2) - 12);

  // Helper para 3ª Proyección (Perfil - PP)
  function projectPointToProfile(pt, label, col = "#7c3aed", isDrawPoint = true) {
    const p2X = oX + pt.x * sc, p2Y = oY - pt.y * sc;
    const p1X = oX + pt.x * sc, p1Y = oY + pt.z * sc;
    const rZ = Math.max(0, pt.z * sc);
    const p3X = oX_pp + rZ, p3Y = oY - pt.y * sc;

    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = "rgba(124, 58, 237, 0.28)";
    ctx.moveTo(p1X, p1Y); ctx.lineTo(oX_pp, p1Y); ctx.stroke();

    if (rZ > 1.5) {
      ctx.beginPath();
      ctx.arc(oX_pp, oY, rZ, Math.PI / 2, 0, true);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(p3X, oY); ctx.lineTo(p3X, p3Y);
    ctx.moveTo(p2X, p2Y); ctx.lineTo(p3X, p3Y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isDrawPoint) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(p3X, p3Y, 3, 0, Math.PI * 2); ctx.fill();
      if (label) {
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText(label, p3X + 4, p3Y - 3);
      }
    }
    return { x: p3X, y: p3Y };
  }

  if (has3rdProj) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(124, 58, 237, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.moveTo(oX_pp, oY - (h / 2) + 10);
    ctx.lineTo(oX_pp, oY + (h / 2) - 10);
    ctx.stroke();
    ctx.font = "bold 9px 'JetBrains Mono'";
    ctx.fillStyle = "#7c3aed";
    ctx.fillText("3ª Proy. (PP)", oX_pp + 4, oY - (h / 2) + 20);
  }

  // --- DIBUJADO POR MODO ---

  if (state.mode === 'lines') {
    const p1 = state.line.p1, p2 = state.line.p2, nA = state.pointNames.p1, nB = state.pointNames.p2;
    // PV Projections
    ctx.beginPath(); ctx.strokeStyle = "#0038a8"; ctx.lineWidth = 2.5;
    ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc); ctx.lineTo(oX + p2.x * sc, oY - p2.y * sc); ctx.stroke();
    // PH Projections
    ctx.beginPath(); ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 2.5;
    ctx.moveTo(oX + p1.x * sc, oY + p1.z * sc); ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc); ctx.stroke();
    // Líneas de correspondencia
    ctx.beginPath(); ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(2, 132, 199, 0.4)";
    ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc); ctx.lineTo(oX + p1.x * sc, oY + p1.z * sc);
    ctx.moveTo(oX + p2.x * sc, oY - p2.y * sc); ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc);
    ctx.stroke(); ctx.setLineDash([]);
    // Etiquetas de puntos
    ctx.font = "bold 10px 'JetBrains Mono'";
    ctx.fillStyle = "#0038a8";
    ctx.fillText(`${nA}2`, oX + p1.x * sc + 4, oY - p1.y * sc - 4);
    ctx.fillText(`${nB}2`, oX + p2.x * sc + 4, oY - p2.y * sc - 4);
    ctx.fillStyle = "#0284c7";
    ctx.fillText(`${nA}1`, oX + p1.x * sc + 4, oY + p1.z * sc + 12);
    ctx.fillText(`${nB}1`, oX + p2.x * sc + 4, oY + p2.z * sc + 12);

    // Trazas de la recta
    const dz = p2.z - p1.z, dy = p2.y - p1.y, dx = p2.x - p1.x;
    if (Math.abs(dz) > 1e-4) {
      const tV = -p1.z / dz; const xV = p1.x + tV * dx, yV = p1.y + tV * dy;
      if (yV >= 0) {
        ctx.fillStyle = "#0038a8"; ctx.beginPath(); ctx.arc(oX + xV * sc, oY - yV * sc, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("V2", oX + xV * sc + 4, oY - yV * sc - 4);
        ctx.beginPath(); ctx.arc(oX + xV * sc, oY, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("V1", oX + xV * sc + 4, oY + 10);
        ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(0, 56, 168, 0.3)";
        ctx.moveTo(oX + xV * sc, oY - yV * sc); ctx.lineTo(oX + xV * sc, oY); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (Math.abs(dy) > 1e-4) {
      const tH = -p1.y / dy; const xH = p1.x + tH * dx, zH = p1.z + tH * dz;
      if (zH >= 0) {
        ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.arc(oX + xH * sc, oY + zH * sc, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("H1", oX + xH * sc + 4, oY + zH * sc + 12);
        ctx.beginPath(); ctx.arc(oX + xH * sc, oY, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("H2", oX + xH * sc + 4, oY - 4);
        ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
        ctx.moveTo(oX + xH * sc, oY); ctx.lineTo(oX + xH * sc, oY + zH * sc); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    if (has3rdProj) {
      const pt3A = projectPointToProfile(p1, state.lineType === 'parallel_lt' ? '' : `${nA}3`);
      const pt3B = projectPointToProfile(p2, state.lineType === 'parallel_lt' ? '' : `${nB}3`);
      if (state.lineType === 'parallel_lt') {
        ctx.fillStyle = "#7c3aed"; ctx.beginPath(); ctx.arc(pt3A.x, pt3A.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono'"; ctx.fillText(`${nA}3 ≡ ${nB}3`, pt3A.x + 5, pt3A.y - 3);
      } else if (state.lineType === 'profile') {
        ctx.beginPath(); ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2.5;
        ctx.moveTo(pt3A.x, pt3A.y); ctx.lineTo(pt3B.x, pt3B.y); ctx.stroke();
        ctx.font = "8px 'JetBrains Mono'"; ctx.fillStyle = "#7c3aed";
        ctx.fillText("V.M.", (pt3A.x + pt3B.x) / 2 + 5, (pt3A.y + pt3B.y) / 2);
      }
    }
  } else if (state.mode === 'planes' || state.mode === 'intersections') {
    let p = [], names = [], eq = null;
    let solid = null, isCurved = false;

    if (state.mode === 'planes') {
      p = [state.plane.p1, state.plane.p2, state.plane.p3];
      names = [state.pointNames.p1, state.pointNames.p2, state.pointNames.p3];
      eq = computePlaneEquation(p[0], p[1], p[2]);
    } else {
      solid = getSolidGeometryDefinition('intersection');
      isCurved = (solid.type === 'cylinder' || solid.type === 'cone');
      eq = getActivePlaneEquation();
      const sData = computeSolidIntersection(solid, eq);
      if (sData && sData.items && sData.items.length >= 3) {
        p = sData.items.map(it => it.pt);
        // Preservar solo los nombres de los puntos clave (evitar saturación en curvas)
        names = sData.items.map((it, i) => {
          if (it.name3D) return it.name3D;
          if (!isCurved) return `S${i + 1}`;
          return '';
        });
      }
    }

    const showProjections = !state.vmVisibility || state.vmVisibility.projections;
    const showTraces = !state.vmVisibility || state.vmVisibility.traces;
    const showConstruction = !state.vmVisibility || state.vmVisibility.construction;
    const showResultVM = !state.vmVisibility || state.vmVisibility.resultVM;
    const step = state.vmStep || 0;
    const animProg = (state.vmAnimProgress !== undefined) ? state.vmAnimProgress : 1.0;
    const animActiveStep = state.vmAnimActiveStep || 0;
    const currentStep = (animActiveStep > 0) ? animActiveStep : (step > 0 ? step : 0);

    function getStepT(k) {
      if (animActiveStep === 0) return 1.0;
      if (animActiveStep === k) return animProg;
      if (animActiveStep > k) return 1.0;
      return 0.0;
    }

    function getStepAlpha(k) {
      if (currentStep === 0) {
        if (k === 6) return 1.0;
        if (k === 1) return 0.85;
        return 0.30; // Pasos auxiliares sutiles en modo 'Todo' para evitar empastes
      }
      if (k === currentStep) return 1.0; // Paso activo: 100% nítido, enfocado
      if (k < currentStep) {
        if (k === 1) return 0.45; // Charnela/eje se mantiene como referencia base
        return 0.20; // Pasos anteriores atenuados al 20%
      }
      return 0.0;
    }

    const t1 = getStepT(1);
    const t2 = getStepT(2);
    const t3 = getStepT(3);
    const t4 = getStepT(4);
    const t5 = getStepT(5);
    const t6 = getStepT(6);

    function drawRightAngleIndicator(context, x0, y0, dir1X, dir1Y, dir2X, dir2Y, size, color) {
      const len1 = Math.hypot(dir1X, dir1Y) || 1;
      const len2 = Math.hypot(dir2X, dir2Y) || 1;
      const u1X = (dir1X / len1) * (size || 6);
      const u1Y = (dir1Y / len1) * (size || 6);
      const u2X = (dir2X / len2) * (size || 6);
      const u2Y = (dir2Y / len2) * (size || 6);
      context.beginPath();
      context.strokeStyle = color || "rgba(234, 88, 12, 0.95)";
      context.lineWidth = 1.3;
      context.moveTo(x0 + u1X, y0 + u1Y);
      context.lineTo(x0 + u1X + u2X, y0 + u1Y + u2Y);
      context.lineTo(x0 + u2X, y0 + u2Y);
      context.stroke();
      context.fillStyle = color || "rgba(234, 88, 12, 0.95)";
      context.beginPath();
      context.arc(x0 + (u1X + u2X) * 0.45, y0 + (u1Y + u2Y) * 0.45, 1.2, 0, Math.PI * 2);
      context.fill();
    }

    function drawCenterTarget(context, x, y, radius, color, label) {
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = 1.6;
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.arc(x, y, radius * 0.45, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(x - radius - 3, y); context.lineTo(x + radius + 3, y);
      context.moveTo(x, y - radius - 3); context.lineTo(x, y + radius + 3);
      context.stroke();
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, 2.5, 0, Math.PI * 2);
      context.fill();
      if (label) {
        context.font = "bold 9px 'JetBrains Mono'";
        context.fillStyle = color;
        context.fillText(label, x + radius + 4, y - 4);
      }
    }

    // Contorno aparente del sólido en 2D diédrico (Contexto visual)
    if (state.mode === 'intersections' && solid && showProjections) {
      const c = solid.c;
      const R = solid.R;
      const H = solid.H;
      const y0 = solid.c.y || 0;

      if (solid.type === 'cylinder') {
        // PH: Círculo de la base y cruz de ejes
        ctx.beginPath();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.45)";
        ctx.lineWidth = 1.6;
        ctx.arc(oX + c.x * sc, oY + c.z * sc, R * sc, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.25)";
        ctx.setLineDash([3, 3]);
        ctx.moveTo(oX + (c.x - R - 0.6) * sc, oY + c.z * sc);
        ctx.lineTo(oX + (c.x + R + 0.6) * sc, oY + c.z * sc);
        ctx.moveTo(oX + c.x * sc, oY + (c.z - R - 0.6) * sc);
        ctx.lineTo(oX + c.x * sc, oY + (c.z + R + 0.6) * sc);
        ctx.stroke();
        ctx.setLineDash([]);

        // PV: Rectángulo de contorno aparente
        const leftX = oX + (c.x - R) * sc;
        const topY = oY - (y0 + H) * sc;
        const botY = oY - y0 * sc;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 56, 168, 0.45)";
        ctx.lineWidth = 1.6;
        ctx.strokeRect(leftX, topY, (2 * R) * sc, H * sc);

        // Eje de simetría en PV (trazo y punto)
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 56, 168, 0.35)";
        ctx.setLineDash([7, 2, 2, 2]);
        ctx.moveTo(oX + c.x * sc, botY + 6);
        ctx.lineTo(oX + c.x * sc, topY - 6);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (solid.type === 'cone') {
        // PH: Círculo de la base y vértice V1
        ctx.beginPath();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.45)";
        ctx.lineWidth = 1.6;
        ctx.arc(oX + c.x * sc, oY + c.z * sc, R * sc, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.25)";
        ctx.setLineDash([3, 3]);
        ctx.moveTo(oX + (c.x - R - 0.6) * sc, oY + c.z * sc);
        ctx.lineTo(oX + (c.x + R + 0.6) * sc, oY + c.z * sc);
        ctx.moveTo(oX + c.x * sc, oY + (c.z - R - 0.6) * sc);
        ctx.lineTo(oX + c.x * sc, oY + (c.z + R + 0.6) * sc);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.arc(oX + c.x * sc, oY + c.z * sc, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText("V1", oX + c.x * sc + 4, oY + c.z * sc + 11);

        // PV: Triángulo de contorno aparente y vértice V2
        const leftX = oX + (c.x - R) * sc;
        const rightX = oX + (c.x + R) * sc;
        const apexX = oX + (solid.apex ? solid.apex.x : c.x) * sc;
        const apexY = oY - (solid.apex ? solid.apex.y : (y0 + H)) * sc;
        const botY = oY - y0 * sc;

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 56, 168, 0.45)";
        ctx.lineWidth = 1.6;
        ctx.moveTo(leftX, botY);
        ctx.lineTo(apexX, apexY);
        ctx.lineTo(rightX, botY);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "#0038a8";
        ctx.beginPath();
        ctx.arc(apexX, apexY, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText("V2", apexX + 5, apexY - 4);

        // Eje de simetría en PV (trazo y punto)
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 56, 168, 0.35)";
        ctx.setLineDash([7, 2, 2, 2]);
        ctx.moveTo(apexX, botY + 6);
        ctx.lineTo(apexX, apexY - 6);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // A. Proyecciones diédricas básicas de la sección (PV y PH)
    if (showProjections && p.length >= 3) {
      ctx.save();
      if (state.vmMethod !== 'none') {
        ctx.globalAlpha = (currentStep > 0) ? 0.22 : 0.38;
      }

      // Curva / Polígono de la sección en PV
      ctx.beginPath();
      ctx.strokeStyle = "#1e40af";
      ctx.fillStyle = "rgba(30, 64, 175, 0.12)";
      ctx.lineWidth = 2.2;
      ctx.moveTo(oX + p[0].x * sc, oY - p[0].y * sc);
      for (let i = 1; i < p.length; i++) ctx.lineTo(oX + p[i].x * sc, oY - p[i].y * sc);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Curva / Polígono de la sección en PH
      ctx.beginPath();
      ctx.strokeStyle = "#0284c7";
      ctx.fillStyle = "rgba(2, 132, 199, 0.12)";
      ctx.lineWidth = 2.2;
      ctx.moveTo(oX + p[0].x * sc, oY + p[0].z * sc);
      for (let i = 1; i < p.length; i++) ctx.lineTo(oX + p[i].x * sc, oY + p[i].z * sc);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Líneas de correspondencia (SOLO para puntos clave notables)
      ctx.beginPath(); ctx.setLineDash([2, 3]); ctx.strokeStyle = "rgba(2, 132, 199, 0.30)";
      for (let i = 0; i < p.length; i++) {
        if (!isCurved || (names[i] && names[i] !== '')) {
          ctx.moveTo(oX + p[i].x * sc, oY - p[i].y * sc);
          ctx.lineTo(oX + p[i].x * sc, oY + p[i].z * sc);
        }
      }
      ctx.stroke(); ctx.setLineDash([]);

      // Puntos y nombres proyectados (SOLO para puntos clave)
      ctx.font = "bold 9px 'JetBrains Mono'";
      for (let i = 0; i < p.length; i++) {
        if (!isCurved || (names[i] && names[i] !== '')) {
          ctx.fillStyle = "#1e40af";
          ctx.beginPath(); ctx.arc(oX + p[i].x * sc, oY - p[i].y * sc, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(`${names[i]}2`, oX + p[i].x * sc + 4, oY - p[i].y * sc - 3);

          ctx.fillStyle = "#0284c7";
          ctx.beginPath(); ctx.arc(oX + p[i].x * sc, oY + p[i].z * sc, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(`${names[i]}1`, oX + p[i].x * sc + 4, oY + p[i].z * sc + 11);

          addHoverTarget(oX + p[i].x * sc, oY - p[i].y * sc, 8, `Punto ${names[i]}₂ (Alzado PV)`, [
            `Cota Y = ${p[i].y.toFixed(2)} u`,
            `Punto 3D: (${p[i].x.toFixed(1)}, ${p[i].y.toFixed(1)}, ${p[i].z.toFixed(1)})`
          ]);
          addHoverTarget(oX + p[i].x * sc, oY + p[i].z * sc, 8, `Punto ${names[i]}₁ (Planta PH)`, [
            `Alejamiento Z = ${p[i].z.toFixed(2)} u`,
            `Punto 3D: (${p[i].x.toFixed(1)}, ${p[i].y.toFixed(1)}, ${p[i].z.toFixed(1)})`
          ]);
        }
      }
      ctx.restore();
    }

    // B. Trazas del plano (α1 en PH, α2 en PV)
    if (showTraces && eq && (step === 0 || step >= 1) && t1 > 0) {
      ctx.save();
      ctx.globalAlpha = getStepAlpha(1);
      const isCharnelaAbat = (state.vmMethod === 'abatimiento');
      const trPV = computeTraceSegment(eq.A, eq.B, eq.C, eq.D, true, state.widthLT, state.heightPV * 1.5);
      if (trPV) {
        ctx.beginPath(); ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2.5;
        ctx.moveTo(oX + trPV[0].x * sc, oY - trPV[0].y * sc); ctx.lineTo(oX + trPV[1].x * sc, oY - trPV[1].y * sc); ctx.stroke();
        ctx.font = "bold 10px 'JetBrains Mono'"; ctx.fillStyle = "#0284c7";
        ctx.fillText("α2", oX + trPV[1].x * sc + 4, oY - trPV[1].y * sc);
      }
      const trPH = computeTraceSegment(eq.A, eq.B, eq.C, eq.D, false, state.widthLT, state.depthPH * 1.5);
      if (trPH) {
        const curEndPHX = trPH[0].x + t1 * (trPH[1].x - trPH[0].x);
        const curEndPHZ = trPH[0].z + t1 * (trPH[1].z - trPH[0].z);
        ctx.beginPath();
        ctx.strokeStyle = isCharnelaAbat ? "#0284c7" : "#7dd3fc";
        ctx.lineWidth = isCharnelaAbat ? 3.5 : 2.5;
        ctx.moveTo(oX + trPH[0].x * sc, oY + trPH[0].z * sc);
        ctx.lineTo(oX + curEndPHX * sc, oY + curEndPHZ * sc);
        ctx.stroke();

        if (t1 < 1.0 && isCharnelaAbat) {
          ctx.fillStyle = "#0038a8"; ctx.beginPath();
          ctx.arc(oX + curEndPHX * sc, oY + curEndPHZ * sc, 4, 0, Math.PI * 2); ctx.fill();
        }

        if (t1 > 0.35) {
          ctx.font = "bold 10px 'JetBrains Mono'"; ctx.fillStyle = isCharnelaAbat ? "#0038a8" : "#0284c7";
          ctx.fillText(isCharnelaAbat ? "α1 (Charnela de Abatimiento)" : "α1", oX + curEndPHX * sc + 4, oY + curEndPHZ * sc);
        }
      }
      ctx.restore();
    }

    // C. Verdadera Magnitud por ABATIMIENTO
    if (state.vmMethod === 'abatimiento' && eq && p.length >= 3) {
      const vmData = computePlaneAbatimiento(eq, p.map((pt, i) => ({
        x: pt.x,
        y: pt.y,
        z: pt.z,
        label: names[i] || '',
        isKey: Boolean(names[i])
      })));
      if (vmData && vmData.items) {
        const itemsToDraw = isCurved ? vmData.items.filter(it => it.isKey) : vmData.items;

        // Paso 2: Medición animada de Cotas en Alzado (PV) desde la Línea de Tierra (LT)
        if (showConstruction && (step === 0 || step >= 2) && t2 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(2);
          itemsToDraw.forEach(it => {
            const p2X = oX + it.ptOriginal.x * sc;
            const p2Y = oY - it.ptOriginal.y * sc;
            const ltX = p2X, ltY = oY;
            const curH = t2 * (it.cota * sc);
            const curTopY = ltY - curH;

            // Segmento vertical de cota en PV
            ctx.beginPath();
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 2.2;
            ctx.moveTo(ltX, ltY);
            ctx.lineTo(ltX, curTopY);
            ctx.stroke();

            // Marcas / ticks de cota
            ctx.beginPath();
            ctx.moveTo(ltX - 4, ltY); ctx.lineTo(ltX + 4, ltY);
            ctx.moveTo(ltX - 4, curTopY); ctx.lineTo(ltX + 4, curTopY);
            ctx.stroke();

            // Resalte en el vértice proyectado en PV
            ctx.beginPath();
            ctx.strokeStyle = `rgba(245, 158, 11, ${1 - t2 * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.arc(p2X, p2Y, 3 + 3 * t2, 0, Math.PI * 2);
            ctx.stroke();

            addHoverTarget(p2X, p2Y, 10, `Cota de ${it.label}`, [
              `Cota en PV: Y = ${it.cota.toFixed(2)} u`,
              `Punto 3D: (${it.ptOriginal.x.toFixed(1)}, ${it.ptOriginal.y.toFixed(1)}, ${it.ptOriginal.z.toFixed(1)})`
            ]);
          });
          ctx.restore();
        }

        // Paso 3: Perpendiculares desde cada punto en PH hacia la charnela α1
        if (showConstruction && (step === 0 || step >= 3) && t3 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(3);
          itemsToDraw.forEach(it => {
            const p1X = oX + it.ptOriginal.x * sc, p1Y = oY + it.ptOriginal.z * sc;
            const footX = oX + it.foot.x * sc, footY = oY + it.foot.z * sc;
            const abatX = oX + it.ptAbat.x * sc, abatY = oY + it.ptAbat.z * sc;

            let curStartX = p1X, curStartY = p1Y;
            let curEndX = p1X, curEndY = p1Y;

            if (t3 <= 0.5) {
              const subT = t3 / 0.5;
              curEndX = p1X + subT * (footX - p1X);
              curEndY = p1Y + subT * (footY - p1Y);
            } else {
              const subT = (t3 - 0.5) / 0.5;
              curEndX = footX + subT * (abatX - footX);
              curEndY = footY + subT * (abatY - footY);
            }

            ctx.beginPath();
            ctx.setLineDash([3, 2]);
            ctx.strokeStyle = "rgba(234, 88, 12, 0.9)";
            ctx.lineWidth = 1.6;
            ctx.moveTo(curStartX, curStartY);
            ctx.lineTo(curEndX, curEndY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Símbolo de escuadra (90°) en el pie de la perpendicular sobre la charnela
            if (t3 > 0.4) {
              const dirCharnelaX = it.cotaPoint.x - it.ptOriginal.x;
              const dirCharnelaY = it.cotaPoint.z - it.ptOriginal.z;
              const dirPerpX = abatX - footX;
              const dirPerpY = abatY - footY;
              drawRightAngleIndicator(ctx, footX, footY, dirCharnelaX, dirCharnelaY, dirPerpX, dirPerpY, 6, "rgba(234, 88, 12, 0.95)");

              // Punto y etiqueta del pie (solo nombre simple sin fórmulas)
              ctx.fillStyle = "#ea580c";
              ctx.beginPath(); ctx.arc(footX, footY, 2.5, 0, Math.PI * 2); ctx.fill();
              if ((currentStep === 3 || currentStep === 0) && !isCurved) {
                ctx.font = "bold 8px 'JetBrains Mono'";
                ctx.fillText(`${it.label}₀`, footX + 5, footY + 4);
              }

              addHoverTarget(footX, footY, 9, `Pie de perpendicular ${it.label}₀`, [
                `Intersección con charnela α₁ (90°)`,
                `Distancia perpendicular d = ${it.distToCharnela.toFixed(2)} u`
              ]);
            }
          });
          ctx.restore();
        }

        // Paso 4: Triángulo de Rebatimiento y traslado de cota paralela a charnela
        if (showConstruction && (step === 0 || step >= 4) && t4 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(4);
          itemsToDraw.forEach(it => {
            const p1X = oX + it.ptOriginal.x * sc, p1Y = oY + it.ptOriginal.z * sc;
            const footX = oX + it.foot.x * sc, footY = oY + it.foot.z * sc;
            const cotaX = oX + it.cotaPoint.x * sc, cotaY = oY + it.cotaPoint.z * sc;

            // 1. Paralela a charnela trazada desde A1 con longitud = cota Y
            const curCotaX = p1X + t4 * (cotaX - p1X);
            const curCotaY = p1Y + t4 * (cotaY - p1Y);
            ctx.beginPath();
            ctx.strokeStyle = "#0284c7";
            ctx.lineWidth = 2.2;
            ctx.moveTo(p1X, p1Y);
            ctx.lineTo(curCotaX, curCotaY);
            ctx.stroke();

            // Punto extremo de la cota A*
            ctx.fillStyle = "#0284c7";
            ctx.beginPath(); ctx.arc(curCotaX, curCotaY, 3, 0, Math.PI * 2); ctx.fill();
            if (t4 > 0.4 && (currentStep === 4 || currentStep === 0) && !isCurved) {
              ctx.font = "bold 8.5px 'JetBrains Mono'";
              ctx.fillText(`${it.label}*`, curCotaX + 4, curCotaY + 9);
            }

            // 2. Hipotenusa: Radio verdadero de abatimiento R = sqrt(d^2 + cota^2)
            const curHypoX = footX + t4 * (cotaX - footX);
            const curHypoY = footY + t4 * (cotaY - footY);
            ctx.beginPath();
            ctx.setLineDash([3, 2]);
            ctx.strokeStyle = "rgba(16, 185, 129, 0.95)";
            ctx.lineWidth = 1.8;
            ctx.moveTo(footX, footY);
            ctx.lineTo(curHypoX, curHypoY);
            ctx.stroke();
            ctx.setLineDash([]);

            addHoverTarget((footX + cotaX) * 0.5, (footY + cotaY) * 0.5, 11, `Radio de Abatimiento (${it.label})`, [
              `R = √(d² + cota²) = ${it.radius.toFixed(2)} u`,
              `d = ${it.distToCharnela.toFixed(2)} u | cota = ${it.cota.toFixed(2)} u`
            ]);
          });
          ctx.restore();
        }

        // Paso 5: Arcos de compás con centro en el pie de la charnela
        // Responde a: "¿Dónde se clava el compás y cómo gira?" -> Centro en A₀, radio R, gira desde A* hasta la perpendicular
        if (showConstruction && (step === 0 || step >= 5) && t5 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(5);
          itemsToDraw.forEach(it => {
            const footX = oX + it.foot.x * sc, footY = oY + it.foot.z * sc;
            const cotaX = oX + it.cotaPoint.x * sc, cotaY = oY + it.cotaPoint.z * sc;
            const abatX = oX + it.ptAbat.x * sc, abatY = oY + it.ptAbat.z * sc;
            const radPix = it.radius * sc;

            // Destacar centro de compás en el pie A0
            drawCenterTarget(ctx, footX, footY, 4.5, "#059669", (t5 > 0.4 && (currentStep === 5 || currentStep === 0) && !isCurved) ? `${it.label}₀` : null);

            if (radPix > 2) {
              const angStart = Math.atan2(cotaY - footY, cotaX - footX);
              const angEnd = Math.atan2(abatY - footY, abatX - footX);
              let diff = angEnd - angStart;
              while (diff > Math.PI) diff -= 2 * Math.PI;
              while (diff < -Math.PI) diff += 2 * Math.PI;
              const curAngle = angStart + t5 * diff;

              ctx.beginPath();
              ctx.setLineDash([3, 2]);
              ctx.strokeStyle = "rgba(16, 185, 129, 0.95)";
              ctx.lineWidth = 1.8;
              ctx.arc(footX, footY, radPix, angStart, curAngle, diff < 0);
              ctx.stroke();
              ctx.setLineDash([]);

              // Punta móvil del compás con trazo animado
              const tipX = footX + radPix * Math.cos(curAngle);
              const tipY = footY + radPix * Math.sin(curAngle);
              ctx.fillStyle = "#10b981";
              ctx.beginPath(); ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2); ctx.fill();

              // Si finaliza el arco, fijar el punto abatido (A)
              if (t5 >= 0.95) {
                ctx.fillStyle = "#047857";
                ctx.beginPath(); ctx.arc(abatX, abatY, 4, 0, Math.PI * 2); ctx.fill();
                ctx.font = "bold 10px 'JetBrains Mono'";
                ctx.fillText(it.labelAbat, abatX + 5, abatY - 4);

                addHoverTarget(abatX, abatY, 10, `${it.labelAbat} (Punto Abatido)`, [
                  `Posición en PH: (${it.ptAbat.x.toFixed(1)}, ${it.ptAbat.z.toFixed(1)})`,
                  `Radio desde charnela: ${it.radius.toFixed(2)} u`
                ]);
              }
            }
          });
          ctx.restore();
        }

        // Paso 6: Polígono abatido en Verdadera Magnitud (V.M.)
        if (showResultVM && (step === 0 || step >= 6) && t6 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(6);
          const abatPts = vmData.items.map(it => ({ x: oX + it.ptAbat.x * sc, y: oY + it.ptAbat.z * sc }));
          ctx.beginPath();
          ctx.moveTo(abatPts[0].x, abatPts[0].y);
          for (let i = 1; i < abatPts.length; i++) ctx.lineTo(abatPts[i].x, abatPts[i].y);
          ctx.closePath();
          ctx.fillStyle = `rgba(16, 185, 129, ${0.25 * t6})`;
          ctx.fill();
          ctx.strokeStyle = "#059669";
          ctx.lineWidth = 2.8;
          ctx.stroke();

          // Puntos y nombres abatidos (A), (B), (C)...
          ctx.font = "bold 10px 'JetBrains Mono'";
          const dotRad = 3.5 * Math.min(1.0, t6 * 1.3);
          vmData.items.forEach((it, i) => {
            if (!isCurved || it.isKey) {
              ctx.fillStyle = "#047857";
              ctx.beginPath(); ctx.arc(abatPts[i].x, abatPts[i].y, dotRad, 0, Math.PI * 2); ctx.fill();
              if (it.labelAbat && t6 > 0.4) ctx.fillText(it.labelAbat, abatPts[i].x + 5, abatPts[i].y - 4);
            }
          });

          // Cotas de longitud en aristas (solo polígonos simples)
          if (!isCurved && abatPts.length <= 6 && t6 > 0.5) {
            ctx.font = "bold 8.5px 'JetBrains Mono'"; ctx.fillStyle = "#065f46";
            for (let i = 0; i < abatPts.length; i++) {
              const next = (i + 1) % abatPts.length;
              const midX = (abatPts[i].x + abatPts[next].x) / 2;
              const midY = (abatPts[i].y + abatPts[next].y) / 2;
              const edgeLen = vmData.edges[i].length;
              ctx.fillText(`${edgeLen.toFixed(1)}u`, midX + 3, midY - 3);
            }
          }

          if (abatPts.length > 0) {
            addHoverTarget(abatPts[0].x, abatPts[0].y, 16, "Verdadera Magnitud (Abatimiento)", [
              `Área = ${vmData.area.toFixed(2)} u²`,
              `Perímetro = ${vmData.perimeter.toFixed(2)} u`
            ]);
          }
          ctx.restore();
        }

        // Actualizar banner explicativo de Abatimiento
        const descEl = document.getElementById('epuraVMTextDesc');
        const metEl = document.getElementById('epuraVMMetrics');
        const bannerEl = document.getElementById('epuraVMInfoBanner');
        if (bannerEl) bannerEl.classList.remove('hidden');
        if (descEl) {
          const stepNames = [
            'Resolución completa: Abatimiento sobre el Plano Horizontal (PH).',
            'Paso 1: Identificación de la traza horizontal α₁ como charnela (eje de giro).',
            'Paso 2: Medición de cotas en Alzado (PV) desde la Línea de Tierra (LT).',
            'Paso 3: Trazado de perpendiculares a la charnela α₁ desde cada punto en PH (90°).',
            'Paso 4: Construcción del triángulo de rebatimiento y radio R = √(d² + cota²).',
            'Paso 5: Trazado de arcos de compás con centro en el pie A₀ de la charnela.',
            'Paso 6: Polígono resultante en PH en Verdadera Magnitud (V.M.).'
          ];
          descEl.textContent = stepNames[step] || stepNames[0];
        }
        if (metEl) {
          metEl.textContent = `V.M.: Área = ${vmData.area.toFixed(2)} u² | Perím. = ${vmData.perimeter.toFixed(2)} u`;
        }
      } else {
        const bannerEl = document.getElementById('epuraVMInfoBanner');
        if (bannerEl) bannerEl.classList.add('hidden');
      }
    }

    // D. Verdadera Magnitud por GIRO (Rotación alrededor de eje en la Línea de Tierra)
    else if (state.vmMethod === 'giro' && eq && p.length >= 3) {
      const vmData = computePlaneGiro(eq, p.map((pt, i) => ({
        x: pt.x,
        y: pt.y,
        z: pt.z,
        label: names[i] || '',
        isKey: Boolean(names[i])
      })));
      if (vmData && vmData.items) {
        const isVert = vmData.isVertical;
        const axX = oX + vmData.axis.x * sc;
        const itemsToDraw = isCurved ? vmData.items.filter(it => it.isKey) : vmData.items;

        // Paso 1: Destacar Centro y Eje de Giro E sobre la Línea de Tierra (LT)
        if (showTraces && (step === 0 || step >= 1) && t1 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(1);
          if (isVert) {
            // Plano Vertical: Eje vertical ⊥ PH apoyado en LT
            // En PH: Centro de giro E1 sobre la Línea de Tierra
            drawCenterTarget(ctx, axX, oY, 6 + 2 * Math.sin(t1 * Math.PI), "#7c3aed", "E₁");

            // En PV: Recta vertical perpendicular a LT que asciende
            const curRise = ((h / 2) - 10) * t1;
            ctx.beginPath();
            ctx.strokeStyle = "rgba(124, 58, 237, 0.65)";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 2]);
            ctx.moveTo(axX, oY);
            ctx.lineTo(axX, oY - curRise);
            ctx.stroke();
            ctx.setLineDash([]);
            if (t1 > 0.4) {
              ctx.font = "bold 9px 'JetBrains Mono'";
              ctx.fillStyle = "#7c3aed";
              ctx.fillText("E₂", axX + 4, oY - 14);
            }

            addHoverTarget(axX, oY, 12, "Eje de Giro E₁ (en PH / LT)", [
              "Eje vertical (⊥ al Plano Horizontal)",
              `Apoyo en LT: X = ${vmData.axis.x.toFixed(2)}`
            ]);
            addHoverTarget(axX, oY - 20, 10, "Eje Vertical E₂ (en PV)", [
              "Proyección perpendicular a la Línea de Tierra",
              `X = ${vmData.axis.x.toFixed(2)} constante`
            ]);
          } else {
            // Plano de Canto: Eje de punta ⊥ PV apoyado en LT
            // En PV: Centro de giro E2 sobre la Línea de Tierra
            drawCenterTarget(ctx, axX, oY, 6 + 2 * Math.sin(t1 * Math.PI), "#7c3aed", "E₂");

            // En PH: Recta vertical perpendicular a LT que desciende
            const curDrop = ((h / 2) - 10) * t1;
            ctx.beginPath();
            ctx.strokeStyle = "rgba(124, 58, 237, 0.65)";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 2]);
            ctx.moveTo(axX, oY);
            ctx.lineTo(axX, oY + curDrop);
            ctx.stroke();
            ctx.setLineDash([]);
            if (t1 > 0.4) {
              ctx.font = "bold 9px 'JetBrains Mono'";
              ctx.fillStyle = "#7c3aed";
              ctx.fillText("E₁", axX + 4, oY + 14);
            }

            addHoverTarget(axX, oY, 12, "Eje de Giro E₂ (en PV / LT)", [
              "Eje de punta (⊥ al Plano Vertical)",
              `Apoyo en LT: X = ${vmData.axis.x.toFixed(2)}`
            ]);
            addHoverTarget(axX, oY + 20, 10, "Eje de Punta E₁ (en PH)", [
              "Proyección perpendicular a la Línea de Tierra",
              `X = ${vmData.axis.x.toFixed(2)} constante`
            ]);
          }
          ctx.restore();
        }

        // Paso 2: Medición y Cálculo del Radio de Giro R desde el eje en LT
        if (showConstruction && (step === 0 || step >= 2) && t2 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(2);
          itemsToDraw.forEach(it => {
            if (it.rGiro < 1e-4) return;
            const origX = oX + it.ptOriginal.x * sc;
            const origY = isVert ? (oY + it.ptOriginal.z * sc) : (oY - it.ptOriginal.y * sc);
            const cornerX = origX;
            const cornerY = oY; // sobre la Línea de Tierra

            // 1. Cateto horizontal Δx sobre LT
            ctx.beginPath();
            ctx.setLineDash([2, 2]);
            ctx.strokeStyle = "#0284c7";
            ctx.lineWidth = 1.4;
            ctx.moveTo(axX, oY);
            ctx.lineTo(cornerX, cornerY);
            ctx.stroke();

            // 2. Cateto perpendicular (z en PH para vertical, y en PV para canto)
            ctx.beginPath();
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.4;
            ctx.moveTo(cornerX, cornerY);
            ctx.lineTo(origX, origY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Símbolo de escuadra 90° en la Línea de Tierra
            const perpDirY = isVert ? 1 : -1;
            drawRightAngleIndicator(ctx, cornerX, cornerY, axX - cornerX, 0, 0, perpDirY, 5, "rgba(2, 132, 199, 0.85)");

            // 3. Hipotenusa: Radio de giro R desde el eje en LT
            const curArmX = axX + t2 * (origX - axX);
            const curArmY = oY + t2 * (origY - oY);
            ctx.beginPath();
            ctx.strokeStyle = "#8b5cf6";
            ctx.lineWidth = 2.2;
            ctx.moveTo(axX, oY);
            ctx.lineTo(curArmX, curArmY);
            ctx.stroke();

            // Vértice alcanzado
            ctx.fillStyle = "#7c3aed";
            ctx.beginPath(); ctx.arc(curArmX, curArmY, 3.2, 0, Math.PI * 2); ctx.fill();

            const auxName = isVert ? "z" : "y";
            addHoverTarget((axX + origX) * 0.5, (oY + origY) * 0.5, 12, `Radio de Giro (${it.label})`, [
              `R = √(Δx² + ${auxName}²) = ${it.rGiro.toFixed(2)} u`,
              `Δx = ${it.deltaX.toFixed(2)} u | ${auxName} = ${it.deltaAux.toFixed(2)} u`
            ]);
          });
          ctx.restore();
        }

        // Paso 3: Rotación física de los radios con compás hasta la Línea de Tierra
        if (showConstruction && (step === 0 || step >= 3) && t3 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(3);

          itemsToDraw.forEach(it => {
            if (it.rGiro < 1e-4) return;
            const startX = oX + it.ptOriginal.x * sc;
            const startY = isVert ? (oY + it.ptOriginal.z * sc) : (oY - it.ptOriginal.y * sc);
            const landX = oX + it.xGir * sc;
            const landY = oY; // sobre la Línea de Tierra
            const radPix = it.rGiro * sc;

            if (radPix > 2) {
              const angStart = Math.atan2(startY - oY, startX - axX);
              const angEnd = (landX >= axX) ? 0 : Math.PI;
              let diff = angEnd - angStart;
              while (diff > Math.PI) diff -= 2 * Math.PI;
              while (diff < -Math.PI) diff += 2 * Math.PI;
              const curAng = angStart + t3 * diff;

              // Arco circular exacto con compás centrado en axX, oY
              ctx.beginPath();
              ctx.setLineDash([3, 2]);
              ctx.strokeStyle = "rgba(139, 92, 246, 0.85)";
              ctx.lineWidth = 1.6;
              ctx.arc(axX, oY, radPix, angStart, curAng, diff < 0);
              ctx.stroke();
              ctx.setLineDash([]);

              // Brazo rígido rotando en tiempo real
              const tipX = axX + radPix * Math.cos(curAng);
              const tipY = oY + radPix * Math.sin(curAng);
              ctx.beginPath();
              ctx.strokeStyle = "rgba(124, 58, 237, 0.5)";
              ctx.lineWidth = 1.4;
              ctx.moveTo(axX, oY);
              ctx.lineTo(tipX, tipY);
              ctx.stroke();

              // Aguja móvil
              ctx.fillStyle = "#7c3aed";
              ctx.beginPath(); ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2); ctx.fill();

              // Punto aterrizado en la Línea de Tierra
              if (t3 >= 0.95 && (currentStep === 3 || currentStep === 0)) {
                ctx.fillStyle = "#6d28d9";
                ctx.beginPath(); ctx.arc(landX, landY, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.font = "bold 9px 'JetBrains Mono'";
                const ptLabel = isVert ? `${it.label}₁'` : `${it.label}₂'`;
                const labelYOffset = isVert ? 12 : -6;
                ctx.fillText(ptLabel, landX + 4, landY + labelYOffset);

                addHoverTarget(landX, landY, 10, `${ptLabel} (Punto en LT)`, [
                  "Rotado hasta la Línea de Tierra",
                  `X' = ${it.xGir.toFixed(2)} u`,
                  `Radio de compás R = ${it.rGiro.toFixed(2)} u`
                ]);
              }
            }
          });
          ctx.restore();
        }

        // Paso 4: Trayectorias (conservación de cota en PV o alejamiento en PH)
        if (showConstruction && (step === 0 || step >= 4) && t4 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(4);
          itemsToDraw.forEach(it => {
            if (it.rGiro < 1e-4) return;
            const startX = oX + it.ptOriginal.x * sc;
            const targetX = oX + it.xGir * sc;
            const curX = startX + t4 * (targetX - startX);

            let fixedY, planeName, paramName, paramVal;
            if (isVert) {
              // Eje vertical ⊥ PH ⟹ Cota Y constante en PV
              fixedY = oY - it.ptOriginal.y * sc;
              planeName = "PV (Alzado)";
              paramName = "Cota Y";
              paramVal = it.ptOriginal.y;
            } else {
              // Eje de punta ⊥ PV ⟹ Alejamiento Z constante en PH
              fixedY = oY + it.ptOriginal.z * sc;
              planeName = "PH (Planta)";
              paramName = "Alejamiento Z";
              paramVal = it.ptOriginal.z;
            }

            // Trayectoria horizontal paralela a LT
            ctx.beginPath();
            ctx.setLineDash([3, 2]);
            ctx.strokeStyle = "rgba(2, 132, 199, 0.85)";
            ctx.lineWidth = 1.8;
            ctx.moveTo(startX, fixedY);
            ctx.lineTo(curX, fixedY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Punta móvil de la trayectoria
            ctx.fillStyle = "#0284c7";
            ctx.beginPath(); ctx.arc(curX, fixedY, 3, 0, Math.PI * 2); ctx.fill();

            addHoverTarget((startX + targetX) * 0.5, fixedY, 10, `Trayectoria de ${it.label} en ${planeName}`, [
              `${paramName} constante: ${paramVal.toFixed(2)} u (∥ a LT)`,
              `Desplazamiento horizontal: X = ${it.ptOriginal.x.toFixed(2)} → X' = ${it.xGir.toFixed(2)} u`
            ]);
          });
          ctx.restore();
        }

        // Paso 5: Correspondencias verticales (⟂ a LT) y punto de encuentro
        if (showConstruction && (step === 0 || step >= 5) && t5 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(5);
          itemsToDraw.forEach(it => {
            const ltX = oX + it.xGir * sc;
            const ltY = oY; // en la Línea de Tierra
            let finalY, labelFinal, descFinal;

            if (isVert) {
              // Asciende verticalmente desde LT hacia arriba a PV
              finalY = oY - it.ptOriginal.y * sc;
              labelFinal = `${it.label}₂'`;
              descFinal = "Alzado Girado (PV)";
            } else {
              // Desciende verticalmente desde LT hacia abajo a PH
              finalY = oY + it.ptOriginal.z * sc;
              labelFinal = `${it.label}₁'`;
              descFinal = "Planta Girada (PH)";
            }

            const curY = ltY + t5 * (finalY - ltY);

            if (it.rGiro >= 1e-4) {
              // Línea de correspondencia perpendicular a LT
              ctx.beginPath();
              ctx.setLineDash([3, 2]);
              ctx.strokeStyle = "rgba(124, 58, 237, 0.85)";
              ctx.lineWidth = 1.8;
              ctx.moveTo(ltX, ltY);
              ctx.lineTo(ltX, curY);
              ctx.stroke();
              ctx.setLineDash([]);

              // Símbolo de escuadra 90° en la Línea de Tierra
              if (Math.abs(curY - ltY) > 5) {
                const dirY = isVert ? -1 : 1;
                drawRightAngleIndicator(ctx, ltX, ltY, 1, 0, 0, dirY, 6, "rgba(124, 58, 237, 0.95)");
              }
            }

            // Vértice resultante en el plano de llegada
            if (t5 >= 0.95) {
              ctx.fillStyle = "#6d28d9";
              ctx.beginPath(); ctx.arc(ltX, finalY, 4, 0, Math.PI * 2); ctx.fill();
              ctx.font = "bold 9.5px 'JetBrains Mono'";
              ctx.fillText(it.labelGir || labelFinal, ltX + 6, isVert ? finalY - 4 : finalY + 12);

              addHoverTarget(ltX, finalY, 10, `${it.labelGir || labelFinal} (${descFinal})`, [
                "Punto de encuentro diédrico exacto",
                `X' = ${it.xGir.toFixed(2)} u (desde radio R = ${it.rGiro.toFixed(2)} u)`,
                isVert ? `Y = ${it.ptOriginal.y.toFixed(2)} u (cota conservada)` : `Z = ${it.ptOriginal.z.toFixed(2)} u (alejamiento conservado)`
              ]);
            }
          });
          ctx.restore();
        }

        // Paso 6: Polígono girado en Verdadera Magnitud (arriba en PV para vertical, abajo en PH para canto)
        if (showResultVM && (step === 0 || step >= 6) && t6 > 0) {
          ctx.save();
          ctx.globalAlpha = getStepAlpha(6);
          const girPts = vmData.items.map(it => ({
            x: oX + it.xGir * sc,
            y: isVert ? (oY - it.ptOriginal.y * sc) : (oY + it.ptOriginal.z * sc)
          }));
          ctx.beginPath();
          ctx.moveTo(girPts[0].x, girPts[0].y);
          for (let i = 1; i < girPts.length; i++) ctx.lineTo(girPts[i].x, girPts[i].y);
          ctx.closePath();
          ctx.fillStyle = `rgba(139, 92, 246, ${0.25 * t6})`;
          ctx.fill();
          ctx.strokeStyle = "#7c3aed";
          ctx.lineWidth = 2.8;
          ctx.stroke();

          // Vértices y etiquetas giradas A', B', C'...
          ctx.font = "bold 10px 'JetBrains Mono'";
          const dotRad = 3.5 * Math.min(1.0, t6 * 1.3);
          vmData.items.forEach((it, i) => {
            if (!isCurved || it.isKey) {
              ctx.fillStyle = "#6d28d9";
              ctx.beginPath(); ctx.arc(girPts[i].x, girPts[i].y, dotRad, 0, Math.PI * 2); ctx.fill();
              if (it.labelGir && t6 > 0.4) {
                ctx.fillText(it.labelGir, girPts[i].x + 5, isVert ? girPts[i].y - 4 : girPts[i].y + 11);
              }
            }
          });

          // Cotas reales en aristas (solo polígonos simples)
          if (!isCurved && girPts.length <= 6 && t6 > 0.5) {
            ctx.font = "bold 8.5px 'JetBrains Mono'"; ctx.fillStyle = "#5b21b6";
            for (let i = 0; i < girPts.length; i++) {
              const next = (i + 1) % girPts.length;
              const midX = (girPts[i].x + girPts[next].x) / 2;
              const midY = (girPts[i].y + girPts[next].y) / 2;
              const edgeLen = vmData.edges[i].length;
              ctx.fillText(`${edgeLen.toFixed(1)}u`, midX + 3, midY - 3);
            }
          }

          if (girPts.length > 0) {
            const locName = isVert ? "PV (Alzado, arriba)" : "PH (Planta, abajo)";
            addHoverTarget(girPts[0].x, girPts[0].y, 16, `Verdadera Magnitud (Giro en ${locName})`, [
              `Área = ${vmData.area.toFixed(2)} u²`,
              `Perímetro = ${vmData.perimeter.toFixed(2)} u`
            ]);
          }
          ctx.restore();
        }

        // Actualizar banner explicativo de Giro
        const descEl = document.getElementById('epuraVMTextDesc');
        const metEl = document.getElementById('epuraVMMetrics');
        const bannerEl = document.getElementById('epuraVMInfoBanner');
        if (bannerEl) bannerEl.classList.remove('hidden');
        if (descEl) {
          const stepNames = isVert ? [
            'Resolución completa: Giro con Eje Vertical en la LT hasta posición frontal (V.M. arriba en PV).',
            'Paso 1: Eje vertical E (⊥ al PH) apoyado en la intersección del plano con la LT (Vα). E₁ en LT y E₂ vertical.',
            'Paso 2: Medición del radio de giro R: Triángulo rectángulo en PH donde R = √(Δx² + z²).',
            'Paso 3: Rotación física en PH: Con compás centrado en E₁ en la LT, los vértices giran hasta la Línea de Tierra.',
            'Paso 4: Trayectorias en PV: Como el eje es vertical (⊥ PH), la cota Y no cambia (y\'=y) y viaja // a LT.',
            'Paso 5: Correspondencias verticales (⊥ a LT): La vertical asciende desde la LT y corta la trayectoria en PV fijando A₂\'.',
            'Paso 6: Figura girada resuelta arriba en el Plano Vertical (PV) en Verdadera Magnitud (V.M.).'
          ] : [
            'Resolución completa: Giro con Eje de Punta en la LT hasta posición horizontal (V.M. abajo en PH).',
            'Paso 1: Eje de punta E (⊥ al PV) apoyado en la intersección del plano con la LT (Vα). E₂ en LT y E₁ perpendicular.',
            'Paso 2: Medición del radio de giro R: Triángulo rectángulo en PV donde R = √(Δx² + y²).',
            'Paso 3: Rotación física en PV: Con compás centrado en E₂ en la LT, los vértices giran hasta la Línea de Tierra.',
            'Paso 4: Trayectorias en PH: Como el eje es de punta (⊥ PV), el alejamiento Z no cambia (z\'=z) y viaja // a LT.',
            'Paso 5: Correspondencias verticales (⊥ a LT): La vertical desciende desde la LT y corta la trayectoria en PH fijando A₁\'.',
            'Paso 6: Figura girada resuelta abajo en el Plano Horizontal (PH) en Verdadera Magnitud (V.M.).'
          ];
          descEl.textContent = stepNames[step] || stepNames[0];
        }
        if (metEl) {
          metEl.textContent = `V.M.: Área = ${vmData.area.toFixed(2)} u² | Perím. = ${vmData.perimeter.toFixed(2)} u`;
        }
      } else {
        const bannerEl = document.getElementById('epuraVMInfoBanner');
        if (bannerEl) bannerEl.classList.add('hidden');
      }
    } else {
      // Método 'none': Casos directos de Verdadera Magnitud (Perfil, Horizontal, Frontal)
      const isProfile = (state.mode === 'planes' && state.planeType === 'profile') ||
                        (state.mode === 'intersections' && state.intersection.cuttingPlaneType === 'profile');
      const isHorizontal = (state.mode === 'planes' && state.planeType === 'horizontal') ||
                           (state.mode === 'intersections' && state.intersection.cuttingPlaneType === 'horizontal');
      const isFrontal = (state.mode === 'planes' && state.planeType === 'frontal') ||
                        (state.mode === 'intersections' && state.intersection.cuttingPlaneType === 'frontal');

      let vmDirectArea = 0, vmDirectPerimeter = 0;
      if (p.length >= 3) {
        for (let i = 0; i < p.length; i++) {
          const next = (i + 1) % p.length;
          vmDirectPerimeter += Math.hypot(p[next].x - p[i].x, p[next].y - p[i].y, p[next].z - p[i].z);
        }
        let aVec = new THREE.Vector3(0, 0, 0);
        for (let i = 0; i < p.length; i++) {
          const pA = new THREE.Vector3(p[i].x, p[i].y, p[i].z);
          const pB = new THREE.Vector3(p[(i + 1) % p.length].x, p[(i + 1) % p.length].y, p[(i + 1) % p.length].z);
          aVec.add(new THREE.Vector3().crossVectors(pA, pB));
        }
        vmDirectArea = 0.5 * aVec.length();
      }

      const descEl = document.getElementById('epuraVMTextDesc');
      const metEl = document.getElementById('epuraVMMetrics');
      const bannerEl = document.getElementById('epuraVMInfoBanner');

      if (isProfile && p.length >= 3 && has3rdProj) {
        // Plano de Perfil: Resolución directa en la 3ª Proyección (Perfil - PP)
        ctx.save();
        const pts3 = p.map((pt, i) => projectPointToProfile(pt, names[i] ? `${names[i]}3` : '', '#7c3aed', !isCurved || Boolean(names[i])));
        if (pts3.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(pts3[0].x, pts3[0].y);
          for (let i = 1; i < pts3.length; i++) ctx.lineTo(pts3[i].x, pts3[i].y);
          ctx.closePath();
          ctx.fillStyle = "rgba(124, 58, 237, 0.22)";
          ctx.fill();
          ctx.strokeStyle = "#7c3aed";
          ctx.lineWidth = 2.6;
          ctx.stroke();

          const minX3 = Math.min(...pts3.map(pt => pt.x)), maxX3 = Math.max(...pts3.map(pt => pt.x));
          const minY3 = Math.min(...pts3.map(pt => pt.y)), maxY3 = Math.max(...pts3.map(pt => pt.y));
          const cX3 = (minX3 + maxX3) / 2, cY3 = (minY3 + maxY3) / 2;

          ctx.font = "bold 11px 'JetBrains Mono'";
          ctx.fillStyle = "#6d28d9";
          ctx.fillText("V.M.", cX3 - 10, minY3 - 8);

          if (!isCurved && pts3.length <= 6) {
            ctx.font = "bold 8.5px 'JetBrains Mono'";
            ctx.fillStyle = "#5b21b6";
            for (let i = 0; i < pts3.length; i++) {
              const next = (i + 1) % pts3.length;
              const midX = (pts3[i].x + pts3[next].x) / 2;
              const midY = (pts3[i].y + pts3[next].y) / 2;
              const edgeLen = Math.hypot(p[next].x - p[i].x, p[next].y - p[i].y, p[next].z - p[i].z);
              ctx.fillText(`${edgeLen.toFixed(1)}u`, midX + 3, midY - 3);
            }
          }

          addHoverTarget(cX3, cY3, 18, "Verdadera Magnitud (3ª Proyección)", [
            "Plano de Perfil (X = constante)",
            "Proyecta directamente en V.M. en el perfil (PP)",
            `Área = ${vmDirectArea.toFixed(2)} u²`,
            `Perímetro = ${vmDirectPerimeter.toFixed(2)} u`
          ]);
        }
        ctx.restore();

        if (bannerEl) bannerEl.classList.remove('hidden');
        if (descEl) descEl.textContent = 'Plano de Perfil: Proyectado directamente en Verdadera Magnitud (V.M.) en la 3ª Proyección (Perfil - PP).';
        if (metEl) metEl.textContent = `V.M.: Área = ${vmDirectArea.toFixed(2)} u² | Perím. = ${vmDirectPerimeter.toFixed(2)} u`;
      } else if (isHorizontal && p.length >= 3) {
        // Plano Horizontal: V.M. directa en Planta (PH)
        ctx.save();
        const ptsPH = p.map(pt => ({ x: oX + pt.x * sc, y: oY + pt.z * sc }));
        const minX = Math.min(...ptsPH.map(pt => pt.x)), maxX = Math.max(...ptsPH.map(pt => pt.x));
        const minY = Math.min(...ptsPH.map(pt => pt.y)), maxY = Math.max(...ptsPH.map(pt => pt.y));
        ctx.font = "bold 11px 'JetBrains Mono'";
        ctx.fillStyle = "#0284c7";
        ctx.fillText("V.M.", (minX + maxX) / 2 - 10, minY - 8);

        addHoverTarget((minX + maxX) / 2, (minY + maxY) / 2, 18, "Verdadera Magnitud (Planta PH)", [
          "Plano Horizontal (Y = cota constante)",
          "Proyecta directamente en V.M. en Planta (PH)",
          `Área = ${vmDirectArea.toFixed(2)} u²`,
          `Perímetro = ${vmDirectPerimeter.toFixed(2)} u`
        ]);
        ctx.restore();

        if (bannerEl) bannerEl.classList.remove('hidden');
        if (descEl) descEl.textContent = 'Plano Horizontal: Proyectado directamente en Verdadera Magnitud (V.M.) en Planta (PH). No requiere rebatimiento ni giro.';
        if (metEl) metEl.textContent = `V.M.: Área = ${vmDirectArea.toFixed(2)} u² | Perím. = ${vmDirectPerimeter.toFixed(2)} u`;
      } else if (isFrontal && p.length >= 3) {
        // Plano Frontal: V.M. directa en Alzado (PV)
        ctx.save();
        const ptsPV = p.map(pt => ({ x: oX + pt.x * sc, y: oY - pt.y * sc }));
        const minX = Math.min(...ptsPV.map(pt => pt.x)), maxX = Math.max(...ptsPV.map(pt => pt.x));
        const minY = Math.min(...ptsPV.map(pt => pt.y)), maxY = Math.max(...ptsPV.map(pt => pt.y));
        ctx.font = "bold 11px 'JetBrains Mono'";
        ctx.fillStyle = "#0038a8";
        ctx.fillText("V.M.", (minX + maxX) / 2 - 10, minY - 8);

        addHoverTarget((minX + maxX) / 2, (minY + maxY) / 2, 18, "Verdadera Magnitud (Alzado PV)", [
          "Plano Frontal (Z = alejamiento constante)",
          "Proyecta directamente en V.M. en Alzado (PV)",
          `Área = ${vmDirectArea.toFixed(2)} u²`,
          `Perímetro = ${vmDirectPerimeter.toFixed(2)} u`
        ]);
        ctx.restore();

        if (bannerEl) bannerEl.classList.remove('hidden');
        if (descEl) descEl.textContent = 'Plano Frontal: Proyectado directamente en Verdadera Magnitud (V.M.) en Alzado (PV). No requiere rebatimiento ni giro.';
        if (metEl) metEl.textContent = `V.M.: Área = ${vmDirectArea.toFixed(2)} u² | Perím. = ${vmDirectPerimeter.toFixed(2)} u`;
      } else {
        if (bannerEl) bannerEl.classList.add('hidden');
        if (descEl) descEl.textContent = '';
        if (metEl) metEl.textContent = '';
      }
    }
  } else if (state.mode === 'line_solid') {
    const p1 = state.lineSolid.p1, p2 = state.lineSolid.p2;
    const nP1 = (state.lineSolid.names && state.lineSolid.names.p1) || 'P1';
    const nP2 = (state.lineSolid.names && state.lineSolid.names.p2) || 'P2';
    const solid = getSolidGeometryDefinition('line_solid');
    const piercePts = state.lineSolid.lastPiercePts || [];

    // Contorno aparente del sólido en 2D diédrico
    if (solid) {
      const c = solid.c, R = solid.R, H = solid.H, y0 = solid.c.y || 0;
      if (solid.type === 'cylinder') {
        // PH: Base circular y cruz
        ctx.beginPath();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.40)";
        ctx.lineWidth = 1.6;
        ctx.arc(oX + c.x * sc, oY + c.z * sc, R * sc, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.20)";
        ctx.setLineDash([3, 3]);
        ctx.moveTo(oX + (c.x - R - 0.6) * sc, oY + c.z * sc); ctx.lineTo(oX + (c.x + R + 0.6) * sc, oY + c.z * sc);
        ctx.moveTo(oX + c.x * sc, oY + (c.z - R - 0.6) * sc); ctx.lineTo(oX + c.x * sc, oY + (c.z + R + 0.6) * sc);
        ctx.stroke(); ctx.setLineDash([]);

        // PV: Rectángulo y eje
        const leftX = oX + (c.x - R) * sc, topY = oY - (y0 + H) * sc, botY = oY - y0 * sc;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 56, 168, 0.40)";
        ctx.lineWidth = 1.6;
        ctx.strokeRect(leftX, topY, (2 * R) * sc, H * sc);

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 56, 168, 0.30)";
        ctx.setLineDash([7, 2, 2, 2]);
        ctx.moveTo(oX + c.x * sc, botY + 6); ctx.lineTo(oX + c.x * sc, topY - 6);
        ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // PV line (con tramo interior discontinuo si hay penetración)
    if (piercePts.length === 2) {
      ctx.beginPath(); ctx.strokeStyle = "#0038a8"; ctx.lineWidth = 2.2;
      ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc); ctx.lineTo(oX + piercePts[0].x * sc, oY - piercePts[0].y * sc); ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = "rgba(0, 56, 168, 0.5)"; ctx.setLineDash([3, 2]); ctx.lineWidth = 1.8;
      ctx.moveTo(oX + piercePts[0].x * sc, oY - piercePts[0].y * sc); ctx.lineTo(oX + piercePts[1].x * sc, oY - piercePts[1].y * sc); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.strokeStyle = "#0038a8"; ctx.lineWidth = 2.2;
      ctx.moveTo(oX + piercePts[1].x * sc, oY - piercePts[1].y * sc); ctx.lineTo(oX + p2.x * sc, oY - p2.y * sc); ctx.stroke();

      // PH line (con tramo interior discontinuo)
      ctx.beginPath(); ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 2.2;
      ctx.moveTo(oX + p1.x * sc, oY + p1.z * sc); ctx.lineTo(oX + piercePts[0].x * sc, oY + piercePts[0].z * sc); ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = "rgba(2, 132, 199, 0.5)"; ctx.setLineDash([3, 2]); ctx.lineWidth = 1.8;
      ctx.moveTo(oX + piercePts[0].x * sc, oY + piercePts[0].z * sc); ctx.lineTo(oX + piercePts[1].x * sc, oY + piercePts[1].z * sc); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 2.2;
      ctx.moveTo(oX + piercePts[1].x * sc, oY + piercePts[1].z * sc); ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.strokeStyle = "#0038a8"; ctx.lineWidth = 2.2;
      ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc); ctx.lineTo(oX + p2.x * sc, oY - p2.y * sc); ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 2.2;
      ctx.moveTo(oX + p1.x * sc, oY + p1.z * sc); ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc); ctx.stroke();
    }

    // Correspondencia de extremos
    ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
    ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc); ctx.lineTo(oX + p1.x * sc, oY + p1.z * sc);
    ctx.moveTo(oX + p2.x * sc, oY - p2.y * sc); ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc);
    ctx.stroke(); ctx.setLineDash([]);

    // Etiquetas de puntos extremos
    ctx.font = "bold 10px 'JetBrains Mono'";
    ctx.fillStyle = "#0038a8";
    ctx.fillText(`${nP1}2`, oX + p1.x * sc + 4, oY - p1.y * sc - 4);
    ctx.fillText(`${nP2}2`, oX + p2.x * sc + 4, oY - p2.y * sc - 4);
    ctx.fillStyle = "#0284c7";
    ctx.fillText(`${nP1}1`, oX + p1.x * sc + 4, oY + p1.z * sc + 12);
    ctx.fillText(`${nP2}1`, oX + p1.x * sc + 4, oY + p1.z * sc + 12);

    // Puntos de penetración
    if (piercePts.length > 0) {
      piercePts.forEach((ip, idx) => {
        const num = idx + 1;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(oX + ip.x * sc, oY - ip.y * sc, 3, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText(`I${num}2`, oX + ip.x * sc + 4, oY - ip.y * sc - 4);

        ctx.beginPath(); ctx.arc(oX + ip.x * sc, oY + ip.z * sc, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillText(`I${num}1`, oX + ip.x * sc + 4, oY + ip.z * sc + 11);

        ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.moveTo(oX + ip.x * sc, oY - ip.y * sc); ctx.lineTo(oX + ip.x * sc, oY + ip.z * sc);
        ctx.stroke(); ctx.setLineDash([]);
      });
    }

    if (has3rdProj) {
      const pt3A = projectPointToProfile(p1, state.lineSolid.lineType === 'parallel_lt' ? '' : `${nP1}3`);
      const pt3B = projectPointToProfile(p2, state.lineSolid.lineType === 'parallel_lt' ? '' : `${nP2}3`);
      if (state.lineSolid.lineType === 'parallel_lt') {
        ctx.fillStyle = "#7c3aed"; ctx.beginPath(); ctx.arc(pt3A.x, pt3A.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono'"; ctx.fillText(`${nP1}3 ≡ ${nP2}3`, pt3A.x + 5, pt3A.y - 3);
      } else if (state.lineSolid.lineType === 'profile') {
        ctx.beginPath(); ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2.5;
        ctx.moveTo(pt3A.x, pt3A.y); ctx.lineTo(pt3B.x, pt3B.y); ctx.stroke();
        ctx.font = "8px 'JetBrains Mono'"; ctx.fillStyle = "#7c3aed";
        ctx.fillText("V.M.", (pt3A.x + pt3B.x) / 2 + 5, (pt3A.y + pt3B.y) / 2);
      }
      if (piercePts.length > 0) {
        piercePts.forEach((ip, idx) => {
          projectPointToProfile(ip, `I${idx + 1}3`, "#ef4444");
        });
      }
    }

    const bannerEl = document.getElementById('epuraVMInfoBanner');
    if (bannerEl) bannerEl.classList.add('hidden');
  }

  // Restaurar transformación de pan y zoom
  ctx.restore();
}
