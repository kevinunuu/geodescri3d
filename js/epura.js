/**
 * GeoDescri3D - Motor de Proyección 2D (Épura Diédrica)
 * Soporta proyección en alzado (PV), planta (PH), líneas de correspondencia
 * y abatimiento para la 3ª Proyección (Perfil - PP) con trazas y secciones.
 */

function drawEpura2D() {
  if (!epuraCanvas || !epuraCtx) return;

  const has3rdProj = (
    (state.mode === 'lines' && (state.lineType === 'parallel_lt' || state.lineType === 'profile')) ||
    (state.mode === 'planes' && (state.planeType === 'parallel_lt' || state.planeType === 'profile')) ||
    (state.mode === 'intersections' && (state.intersection.cuttingPlaneType === 'parallel_lt' || state.intersection.cuttingPlaneType === 'profile')) ||
    (state.mode === 'line_solid' && (state.lineSolid.lineType === 'parallel_lt' || state.lineSolid.lineType === 'profile'))
  );

  const modalEl = document.getElementById('epuraModal');
  if (modalEl && !state.epuraExpanded) {
    modalEl.style.width = has3rdProj ? '360px' : '';
  }

  epuraCanvas.width = state.epuraExpanded ? 640 : (has3rdProj ? 340 : 280);
  epuraCanvas.height = state.epuraExpanded ? 420 : 190;
  const w = epuraCanvas.width, h = epuraCanvas.height, ctx = epuraCtx;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(2, 132, 199, 0.08)";
  ctx.lineWidth = 1;
  const step = state.epuraExpanded ? 22 : 15;
  for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  
  const sc = state.epuraExpanded ? 19 : 11;
  const oX = has3rdProj ? Math.round(w * 0.35) : w / 2;
  const oY = h / 2;
  const oX_pp = has3rdProj ? Math.round(w * 0.74) : 0;

  // Ground line (LT)
  ctx.beginPath();
  ctx.strokeStyle = "#0038a8";
  ctx.lineWidth = 2.5;
  ctx.moveTo(12, oY);
  ctx.lineTo(w - 12, oY);
  ctx.stroke();
  ctx.font = "bold 11px 'JetBrains Mono'";
  ctx.fillStyle = "#0038a8";
  ctx.fillText("LT", w - 25, oY - 6);

  // Semiplanes indicators
  ctx.font = "bold 9px 'JetBrains Mono'";
  ctx.fillStyle = "rgba(0, 56, 168, 0.4)";
  ctx.fillText("PV (Alzado)", 12, 16);
  ctx.fillStyle = "rgba(2, 132, 199, 0.4)";
  ctx.fillText("PH (Planta)", 12, h - 8);

  // Helper function to project a point P(x, y, z) into the 3rd projection (PP)
  function projectPointToProfile(pt, label, col = "#7c3aed", isDrawPoint = true) {
    const p2X = oX + pt.x * sc, p2Y = oY - pt.y * sc;
    const p1X = oX + pt.x * sc, p1Y = oY + pt.z * sc;
    const rZ = Math.max(0, pt.z * sc);
    const p3X = oX_pp + rZ, p3Y = oY - pt.y * sc;

    // 1. Ray from P1 (PH) to PP axis on PH
    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = "rgba(124, 58, 237, 0.28)";
    ctx.moveTo(p1X, p1Y);
    ctx.lineTo(oX_pp, p1Y);
    ctx.stroke();

    // 2. Abatimiento arc 90 degrees around (oX_pp, oY)
    if (rZ > 1.5) {
      ctx.beginPath();
      ctx.arc(oX_pp, oY, rZ, Math.PI / 2, 0, true);
      ctx.stroke();
    }

    // 3. Vertical ray from LT up to P3
    ctx.beginPath();
    ctx.moveTo(p3X, oY);
    ctx.lineTo(p3X, p3Y);
    ctx.stroke();

    // 4. Horizontal ray from P2 across to P3
    ctx.beginPath();
    ctx.moveTo(p2X, p2Y);
    ctx.lineTo(p3X, p3Y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isDrawPoint) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p3X, p3Y, 3, 0, Math.PI * 2);
      ctx.fill();
      if (label) {
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText(label, p3X + 4, p3Y - 3);
      }
    }
    return { x: p3X, y: p3Y };
  }

  if (has3rdProj) {
    // Vertical PP axis
    ctx.beginPath();
    ctx.strokeStyle = "rgba(124, 58, 237, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.moveTo(oX_pp, 12);
    ctx.lineTo(oX_pp, h - 12);
    ctx.stroke();

    ctx.font = "bold 9px 'JetBrains Mono'";
    ctx.fillStyle = "#7c3aed";
    ctx.fillText("3ª Proy. (PP)", oX_pp + 4, 16);
  }

  if (state.mode === 'lines') {
    const p1 = state.line.p1, p2 = state.line.p2, nA = state.pointNames.p1, nB = state.pointNames.p2;
    // PV Projections (Y > 0 up)
    ctx.beginPath();
    ctx.strokeStyle = "#0038a8";
    ctx.lineWidth = 2.5;
    ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc);
    ctx.lineTo(oX + p2.x * sc, oY - p2.y * sc);
    ctx.stroke();

    // PH Projections (Z > 0 down)
    ctx.beginPath();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2.5;
    ctx.moveTo(oX + p1.x * sc, oY + p1.z * sc);
    ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc);
    ctx.stroke();

    // Vertical dashed correspondence rays
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(2, 132, 199, 0.4)";
    ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc);
    ctx.lineTo(oX + p1.x * sc, oY + p1.z * sc);
    ctx.moveTo(oX + p2.x * sc, oY - p2.y * sc);
    ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc);
    ctx.stroke();
    ctx.setLineDash([]);

    // Point labels
    ctx.font = "bold 10px 'JetBrains Mono'";
    ctx.fillStyle = "#0038a8";
    ctx.fillText(`${nA}2`, oX + p1.x * sc + 4, oY - p1.y * sc - 4);
    ctx.fillText(`${nB}2`, oX + p2.x * sc + 4, oY - p2.y * sc - 4);
    ctx.fillStyle = "#0284c7";
    ctx.fillText(`${nA}1`, oX + p1.x * sc + 4, oY + p1.z * sc + 12);
    ctx.fillText(`${nB}1`, oX + p2.x * sc + 4, oY + p2.z * sc + 12);

    // Traces in epura
    const dz = p2.z - p1.z, dy = p2.y - p1.y, dx = p2.x - p1.x;
    if (Math.abs(dz) > 1e-4) {
      const tV = -p1.z / dz;
      const xV = p1.x + tV * dx, yV = p1.y + tV * dy;
      if (yV >= 0) {
        ctx.fillStyle = "#0038a8";
        ctx.beginPath(); ctx.arc(oX + xV * sc, oY - yV * sc, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("V2", oX + xV * sc + 4, oY - yV * sc - 4);
        ctx.beginPath(); ctx.arc(oX + xV * sc, oY, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("V1", oX + xV * sc + 4, oY + 10);
        ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(0, 56, 168, 0.3)";
        ctx.moveTo(oX + xV * sc, oY - yV * sc); ctx.lineTo(oX + xV * sc, oY); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (Math.abs(dy) > 1e-4) {
      const tH = -p1.y / dy;
      const xH = p1.x + tH * dx, zH = p1.z + tH * dz;
      if (zH >= 0) {
        ctx.fillStyle = "#0284c7";
        ctx.beginPath(); ctx.arc(oX + xH * sc, oY + zH * sc, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("H1", oX + xH * sc + 4, oY + zH * sc + 12);
        ctx.beginPath(); ctx.arc(oX + xH * sc, oY, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("H2", oX + xH * sc + 4, oY - 4);
        ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
        ctx.moveTo(oX + xH * sc, oY); ctx.lineTo(oX + xH * sc, oY + zH * sc); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // 3rd Projection for lines
    if (has3rdProj) {
      const pt3A = projectPointToProfile(p1, state.lineType === 'parallel_lt' ? '' : `${nA}3`);
      const pt3B = projectPointToProfile(p2, state.lineType === 'parallel_lt' ? '' : `${nB}3`);
      if (state.lineType === 'parallel_lt') {
        ctx.fillStyle = "#7c3aed";
        ctx.beginPath(); ctx.arc(pt3A.x, pt3A.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText(`${nA}3 ≡ ${nB}3`, pt3A.x + 5, pt3A.y - 3);
        ctx.font = "8px 'JetBrains Mono'"; ctx.fillStyle = "#94a3b8";
        ctx.fillText("(Puntual)", pt3A.x + 5, pt3A.y + 8);
      } else if (state.lineType === 'profile') {
        ctx.beginPath(); ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2.5;
        ctx.moveTo(pt3A.x, pt3A.y); ctx.lineTo(pt3B.x, pt3B.y); ctx.stroke();
        ctx.font = "8px 'JetBrains Mono'"; ctx.fillStyle = "#7c3aed";
        ctx.fillText("V.M.", (pt3A.x + pt3B.x) / 2 + 5, (pt3A.y + pt3B.y) / 2);
      }
    }
  } else if (state.mode === 'planes') {
    const p = [state.plane.p1, state.plane.p2, state.plane.p3];
    const names = [state.pointNames.p1, state.pointNames.p2, state.pointNames.p3];
    // Triangle in PV
    ctx.beginPath();
    ctx.strokeStyle = "#1e40af";
    ctx.fillStyle = "rgba(30, 64, 175, 0.12)";
    ctx.lineWidth = 2;
    ctx.moveTo(oX + p[0].x * sc, oY - p[0].y * sc);
    ctx.lineTo(oX + p[1].x * sc, oY - p[1].y * sc);
    ctx.lineTo(oX + p[2].x * sc, oY - p[2].y * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Triangle in PH
    ctx.beginPath();
    ctx.strokeStyle = "#0284c7";
    ctx.fillStyle = "rgba(2, 132, 199, 0.12)";
    ctx.lineWidth = 2;
    ctx.moveTo(oX + p[0].x * sc, oY + p[0].z * sc);
    ctx.lineTo(oX + p[1].x * sc, oY + p[1].z * sc);
    ctx.lineTo(oX + p[2].x * sc, oY + p[2].z * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Correspondence rays
    ctx.beginPath();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(oX + p[i].x * sc, oY - p[i].y * sc);
      ctx.lineTo(oX + p[i].x * sc, oY + p[i].z * sc);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Point labels
    ctx.font = "bold 10px 'JetBrains Mono'";
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#1e40af";
      ctx.fillText(`${names[i]}2`, oX + p[i].x * sc + 4, oY - p[i].y * sc - 4);
      ctx.fillStyle = "#0284c7";
      ctx.fillText(`${names[i]}1`, oX + p[i].x * sc + 4, oY + p[i].z * sc + 12);
    }

    // Traces in 2D projection (colores más claros)
    const eq = computePlaneEquation(p[0], p[1], p[2]);
    const trPV = computeTraceSegment(eq.A, eq.B, eq.C, eq.D, true, state.widthLT / 2, state.heightPV);
    if (trPV) {
      ctx.beginPath(); ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2.5;
      ctx.moveTo(oX + trPV[0].x * sc, oY - trPV[0].y * sc);
      ctx.lineTo(oX + trPV[1].x * sc, oY - trPV[1].y * sc);
      ctx.stroke();
      ctx.font = "bold 10px 'JetBrains Mono'"; ctx.fillStyle = "#38bdf8";
      ctx.fillText("α2", oX + trPV[1].x * sc + 4, oY - trPV[1].y * sc);
    }
    const trPH = computeTraceSegment(eq.A, eq.B, eq.C, eq.D, false, state.widthLT / 2, state.depthPH);
    if (trPH) {
      ctx.beginPath(); ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = 2.5;
      ctx.moveTo(oX + trPH[0].x * sc, oY + trPH[0].z * sc);
      ctx.lineTo(oX + trPH[1].x * sc, oY + trPH[1].z * sc);
      ctx.stroke();
      ctx.font = "bold 10px 'JetBrains Mono'"; ctx.fillStyle = "#7dd3fc";
      ctx.fillText("α1", oX + trPH[1].x * sc + 4, oY + trPH[1].z * sc);
    }

    // 3rd Projection for planes
    if (has3rdProj) {
      const pts3 = p.map((pt, i) => projectPointToProfile(pt, `${names[i]}3`));
      if (state.planeType === 'parallel_lt') {
        const minZ = Math.min(...p.map(pt => pt.z)), maxZ = Math.max(...p.map(pt => pt.z));
        const minY = Math.min(...p.map(pt => pt.y)), maxY = Math.max(...p.map(pt => pt.y));
        const pStart = projectPointToProfile({ x: 0, y: Math.max(0, minY - 1.5), z: Math.max(0, maxZ + 1.5) }, '', "#7c3aed", false);
        const pEnd = projectPointToProfile({ x: 0, y: maxY + 1.5, z: Math.max(0, minZ - 1.5) }, '', "#7c3aed", false);
        ctx.beginPath(); ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2.5;
        ctx.moveTo(pStart.x, pStart.y); ctx.lineTo(pEnd.x, pEnd.y); ctx.stroke();
        ctx.font = "bold 10px 'JetBrains Mono'"; ctx.fillStyle = "#7c3aed";
        ctx.fillText("α3", pEnd.x + 4, pEnd.y);
      } else if (state.planeType === 'profile') {
        ctx.beginPath(); ctx.strokeStyle = "#7c3aed"; ctx.fillStyle = "rgba(124, 58, 237, 0.15)"; ctx.lineWidth = 2;
        ctx.moveTo(pts3[0].x, pts3[0].y); ctx.lineTo(pts3[1].x, pts3[1].y); ctx.lineTo(pts3[2].x, pts3[2].y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.font = "8px 'JetBrains Mono'"; ctx.fillStyle = "#7c3aed";
        ctx.fillText("V.M. (Perfil)", (pts3[0].x + pts3[1].x + pts3[2].x) / 3 - 15, (pts3[0].y + pts3[1].y + pts3[2].y) / 3);
      }
    }
  } else if (state.mode === 'intersections') {
    const solid = getSolidGeometryDefinition('intersection');
    const eq = getActivePlaneEquation();
    const sectionData = computeSolidIntersection(solid, eq);
    if (sectionData && sectionData.items && sectionData.items.length >= 3) {
      const pts = sectionData.items.map(it => it.pt);
      // Alzado (PV)
      ctx.beginPath(); ctx.strokeStyle = "#0038a8"; ctx.fillStyle = "rgba(0, 56, 168, 0.15)"; ctx.lineWidth = 2;
      ctx.moveTo(oX + pts[0].x * sc, oY - pts[0].y * sc);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(oX + pts[i].x * sc, oY - pts[i].y * sc);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Planta (PH)
      ctx.beginPath(); ctx.strokeStyle = "#0284c7"; ctx.fillStyle = "rgba(2, 132, 199, 0.15)"; ctx.lineWidth = 2;
      ctx.moveTo(oX + pts[0].x * sc, oY + pts[0].z * sc);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(oX + pts[i].x * sc, oY + pts[i].z * sc);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Correspondence lines for first few key points
      ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
      for (let i = 0; i < Math.min(pts.length, 6); i++) {
        ctx.moveTo(oX + pts[i].x * sc, oY - pts[i].y * sc);
        ctx.lineTo(oX + pts[i].x * sc, oY + pts[i].z * sc);
      }
      ctx.stroke(); ctx.setLineDash([]);

      // Point dots and labels in PV & PH
      ctx.font = "bold 9px 'JetBrains Mono'";
      sectionData.items.forEach((it, idx) => {
        const hasName = Boolean(it.name3D);
        if (hasName || sectionData.items.length <= 12 || idx % Math.max(1, Math.floor(sectionData.items.length / 8)) === 0) {
          const labelPV = it.namePV || `S${idx + 1}2`;
          const labelPH = it.namePH || `S${idx + 1}1`;

          // PV dot & label
          ctx.fillStyle = "#0038a8";
          ctx.beginPath(); ctx.arc(oX + it.pt.x * sc, oY - it.pt.y * sc, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(labelPV, oX + it.pt.x * sc + 3, oY - it.pt.y * sc - 3);

          // PH dot & label
          ctx.fillStyle = "#0284c7";
          ctx.beginPath(); ctx.arc(oX + it.pt.x * sc, oY + it.pt.z * sc, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(labelPH, oX + it.pt.x * sc + 3, oY + it.pt.z * sc + 10);
        }
      });

      // 3rd Projection for intersections
      if (has3rdProj) {
        if (state.intersection.cuttingPlaneType === 'parallel_lt') {
          const stepPts = Math.max(1, Math.floor(pts.length / 8));
          const pts3 = [];
          for (let i = 0; i < pts.length; i += stepPts) {
            const lbl = sectionData.items[i].name3D ? `${sectionData.items[i].name3D}3` : '';
            pts3.push(projectPointToProfile(pts[i], lbl, "#7c3aed", true));
          }
          if (pts3.length >= 2) {
            const minX = Math.min(...pts3.map(p => p.x)), maxX = Math.max(...pts3.map(p => p.x));
            const minY = Math.min(...pts3.map(p => p.y)), maxY = Math.max(...pts3.map(p => p.y));
            ctx.beginPath(); ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2.5;
            ctx.moveTo(minX - 4, maxY + 4); ctx.lineTo(maxX + 4, minY - 4); ctx.stroke();
            ctx.font = "bold 9px 'JetBrains Mono'"; ctx.fillStyle = "#7c3aed";
            ctx.fillText("α3 (Sección)", maxX + 5, minY - 2);
          }
        } else if (state.intersection.cuttingPlaneType === 'profile') {
          const pts3 = pts.map((pt, i) => projectPointToProfile(pt, sectionData.items[i].name3D ? `${sectionData.items[i].name3D}3` : '', "#7c3aed", i % Math.max(1, Math.floor(pts.length / 8)) === 0));
          ctx.beginPath(); ctx.strokeStyle = "#7c3aed"; ctx.fillStyle = "rgba(124, 58, 237, 0.18)"; ctx.lineWidth = 2;
          ctx.moveTo(pts3[0].x, pts3[0].y);
          for (let i = 1; i < pts3.length; i++) ctx.lineTo(pts3[i].x, pts3[i].y);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.font = "bold 8px 'JetBrains Mono'"; ctx.fillStyle = "#7c3aed";
          ctx.fillText("V.M. Sección", pts3[0].x - 10, pts3[0].y - 8);
        }
      }
    }
  } else if (state.mode === 'line_solid') {
    const p1 = state.lineSolid.p1, p2 = state.lineSolid.p2;
    const nP1 = (state.lineSolid.names && state.lineSolid.names.p1) || 'P1';
    const nP2 = (state.lineSolid.names && state.lineSolid.names.p2) || 'P2';
    // PV line
    ctx.beginPath(); ctx.strokeStyle = "#0038a8"; ctx.lineWidth = 2;
    ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc); ctx.lineTo(oX + p2.x * sc, oY - p2.y * sc); ctx.stroke();
    // PH line
    ctx.beginPath(); ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 2;
    ctx.moveTo(oX + p1.x * sc, oY + p1.z * sc); ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc); ctx.stroke();
    // Correspondence
    ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
    ctx.moveTo(oX + p1.x * sc, oY - p1.y * sc); ctx.lineTo(oX + p1.x * sc, oY + p1.z * sc);
    ctx.moveTo(oX + p2.x * sc, oY - p2.y * sc); ctx.lineTo(oX + p2.x * sc, oY + p2.z * sc);
    ctx.stroke(); ctx.setLineDash([]);
    // Point labels in epura
    ctx.font = "bold 10px 'JetBrains Mono'";
    ctx.fillStyle = "#0038a8";
    ctx.fillText(`${nP1}2`, oX + p1.x * sc + 4, oY - p1.y * sc - 4);
    ctx.fillText(`${nP2}2`, oX + p2.x * sc + 4, oY - p2.y * sc - 4);
    ctx.fillStyle = "#0284c7";
    ctx.fillText(`${nP1}1`, oX + p1.x * sc + 4, oY + p1.z * sc + 12);
    ctx.fillText(`${nP2}1`, oX + p2.x * sc + 4, oY + p2.z * sc + 12);

    // Piercing / Intersection points in epura
    const piercePts = state.lineSolid.lastPiercePts || [];
    if (piercePts.length > 0) {
      piercePts.forEach((ip, idx) => {
        const num = idx + 1;
        // PV
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(oX + ip.x * sc, oY - ip.y * sc, 3, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText(`I${num}2`, oX + ip.x * sc + 4, oY - ip.y * sc - 4);
        // PH
        ctx.beginPath(); ctx.arc(oX + ip.x * sc, oY + ip.z * sc, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillText(`I${num}1`, oX + ip.x * sc + 4, oY + ip.z * sc + 11);
        // Correspondence dashed line
        ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.moveTo(oX + ip.x * sc, oY - ip.y * sc); ctx.lineTo(oX + ip.x * sc, oY + ip.z * sc);
        ctx.stroke(); ctx.setLineDash([]);
      });
    }

    // 3rd Projection for line_solid
    if (has3rdProj) {
      const pt3A = projectPointToProfile(p1, state.lineSolid.lineType === 'parallel_lt' ? '' : `${nP1}3`);
      const pt3B = projectPointToProfile(p2, state.lineSolid.lineType === 'parallel_lt' ? '' : `${nP2}3`);
      if (state.lineSolid.lineType === 'parallel_lt') {
        ctx.fillStyle = "#7c3aed";
        ctx.beginPath(); ctx.arc(pt3A.x, pt3A.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText(`${nP1}3 ≡ ${nP2}3`, pt3A.x + 5, pt3A.y - 3);
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
  }
}
