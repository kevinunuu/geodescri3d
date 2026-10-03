/**
 * GeoDescri3D - Estado Global y Ajustes Predefinidos
 */

const state = {
  mode: 'lines', // 'lines', 'planes', 'intersections', 'line_solid'
  lineType: 'oblique',
  planeType: 'oblique',
  planeExpanded: true,
  planeLabelsMode: 'plane',
  epuraExpanded: false,
  epuraFullscreen: false,
  epuraPan: { x: 0, y: 0 },
  epuraZoom: 1.0,
  vmMethod: 'none', // 'none', 'abatimiento', 'giro'
  vmStep: 0, // 0 = Todos, 1 = Charnela/Eje, 2 = Auxiliares, 3 = Arcos, 4 = V.M.
  vmAnimProgress: 1.0,
  vmAnimActiveStep: 0,
  vmIsPlaying: false,
  vmVisibility: {
    projections: true,
    traces: true,
    construction: true,
    resultVM: true
  },
  lockCoupledSliders: false,
  validationError: null,

  intersection: {
    solidType: 'prism_regular',
    cuttingPlaneType: 'oblique',
    cutHeight: 5.0,
    cutDist: 5.5,
    cutX: 0.0,
    cutAngle: 35,
    cutAngleBeta: 30,
    solidHeight: 8.0,
    showSolid: true,
    showPlane: true,
    showSection: true,
    showSectionLabels: true,
    labelsMode: 'plane'
  },
  lineSolid: {
    solidType: 'cylinder',
    solidHeight: 8.0,
    lineType: 'oblique',
    names: { p1: 'P1', p2: 'P2' },
    p1: { x: -6, y: 7, z: 2 },
    p2: { x: 6, y: 3, z: 9 },
    showSolid: true,
    showLine: true,
    showPierce: true
  },
  customFigures: [],
  figureModalManualPoints: false,
  figureModalManualApex: false,
  pointNames: { p1: 'A', p2: 'B', p3: 'C' },
  line: { p1: { x: -5.0, y: 7.5, z: 3.0 }, p2: { x: 5.0, y: 2.5, z: 8.5 } },
  plane: { p1: { x: -4.0, y: 7.0, z: 2.5 }, p2: { x: 3.0, y: 8.5, z: 4.0 }, p3: { x: 1.0, y: 2.0, z: 8.5 } },
  widthLT: 18,
  heightPV: 12,
  depthPH: 12
};

const linePresets = {
  oblique: { name: "Recta cualquiera", p1: { x: -5, y: 7.5, z: 3 }, p2: { x: 5, y: 2.5, z: 8.5 } },
  horizontal: { name: "Recta horizontal", p1: { x: -5, y: 5, z: 3 }, p2: { x: 5, y: 5, z: 8 } },
  frontal: { name: "Recta frontal", p1: { x: -5, y: 3, z: 5 }, p2: { x: 5, y: 8, z: 5 } },
  parallel_lt: { name: "Recta paralela a la L.T.", p1: { x: -6, y: 5.5, z: 5 }, p2: { x: 6, y: 5.5, z: 5 } },
  point: { name: "Recta de punta", p1: { x: 1, y: 6, z: 2 }, p2: { x: 1, y: 6, z: 8.5 } },
  vertical: { name: "Recta vertical", p1: { x: 1, y: 2, z: 5.5 }, p2: { x: 1, y: 8.5, z: 5.5 } },
  profile: { name: "Recta de perfil", p1: { x: 0, y: 7.5, z: 2.5 }, p2: { x: 0, y: 2.5, z: 7.5 } }
};

const lineSolidPresets = {
  oblique: { name: "Recta cualquiera", p1: { x: -6, y: 7, z: 2 }, p2: { x: 6, y: 3, z: 9 } },
  horizontal: { name: "Recta horizontal", p1: { x: -6, y: 4.5, z: 2.5 }, p2: { x: 6, y: 4.5, z: 8.5 } },
  frontal: { name: "Recta frontal", p1: { x: -6, y: 2, z: 5.5 }, p2: { x: 6, y: 7, z: 5.5 } },
  parallel_lt: { name: "Recta paralela a la L.T.", p1: { x: -6, y: 4.5, z: 5.5 }, p2: { x: 6, y: 4.5, z: 5.5 } },
  point: { name: "Recta de punta", p1: { x: 0, y: 4.5, z: 1 }, p2: { x: 0, y: 4.5, z: 10 } },
  vertical: { name: "Recta vertical", p1: { x: 0, y: 10, z: 5.5 }, p2: { x: 0, y: 0.5, z: 5.5 } },
  profile: { name: "Recta de perfil", p1: { x: 0, y: 7.5, z: 2.5 }, p2: { x: 0, y: 1.5, z: 8.5 } }
};

const planePresets = {
  canto: { name: "Plano de Canto", p1: { x: -3, y: 2, z: 2 }, p2: { x: 3, y: 8, z: 2 }, p3: { x: 3, y: 8, z: 8 } },
  proj_vertical: { name: "Plano de Canto", p1: { x: -3, y: 2, z: 2 }, p2: { x: 3, y: 8, z: 2 }, p3: { x: 3, y: 8, z: 8 } },
  proj_horizontal: { name: "Plano Vertical", p1: { x: -3, y: 2, z: 2 }, p2: { x: 3, y: 2, z: 8 }, p3: { x: 3, y: 8, z: 8 } },
  horizontal: { name: "Plano Horizontal", p1: { x: -4, y: 6, z: 2 }, p2: { x: 4, y: 6, z: 3.5 }, p3: { x: 0, y: 6, z: 8.5 } },
  frontal: { name: "Plano Frontal", p1: { x: -4, y: 2.5, z: 5 }, p2: { x: 4, y: 3, z: 5 }, p3: { x: 0, y: 8, z: 5 } },
  profile: { name: "Plano de Perfil", p1: { x: 0, y: 7, z: 2.5 }, p2: { x: 0, y: 2, z: 8 }, p3: { x: 0, y: 3, z: 3 } },
  parallel_lt: { name: "Plano Paralelo a L.T.", p1: { x: -4, y: 7, z: 2 }, p2: { x: 4, y: 7, z: 2 }, p3: { x: 0, y: 2, z: 8 } },
  oblique: { name: "Plano Oblicuo", p1: { x: -4, y: 7, z: 2.5 }, p2: { x: 3, y: 8.5, z: 4 }, p3: { x: 1, y: 2, z: 8.5 } }
};

// Referencias de escena y cámaras 3D principales
let scene, camera, renderer, controls, mainObjectsGroup, planesGroup, epuraCanvas, epuraCtx;
// Allow the state module to load even if the external Three.js dependency fails.
const DIHEDRAL_CENTER = typeof THREE !== 'undefined'
  ? new THREE.Vector3(0, 4.5, 4.5)
  : { x: 0, y: 4.5, z: 4.5 };
let cameraAnimId = null;

// Conversor de subíndices diédricos
function formatGeomLabel(str) {
  if (!str) return '';
  const subs = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  return str
    .replace(/([A-Za-zα-ωΑ-Ω])([0-9])([123])$/, (_, p, d, s) => p + (subs[d] || d) + (subs[s] || s))
    .replace(/([A-Za-zα-ωΑ-Ω])([123])$/, (_, p, s) => p + (subs[s] || s))
    .replace(/([A-Za-zα-ωΑ-Ω])([0-9])$/, (_, p, s) => p + (subs[s] || s));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}
