// Pagina de prezentare a tractorului 3D (tractor.html): îl vezi de aproape, îl rotești, îi schimbi culoarea.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildTractor } from './game/tractor3d.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe3f5);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .01, 50);
camera.position.set(.75, .45, .85);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-.02, .1, 0);
controls.enableDamping = true;
controls.autoRotate = !location.search.includes('still');
controls.autoRotateSpeed = 1.2;

scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8f4a, 1.3));
const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
sun.position.set(2, 3, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1, near: .1, far: 10 });
sun.shadow.bias = -.0005;
scene.add(sun);

// ogor sub tractor: pământ cu brazde
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshLambertMaterial({ color: 0x7a5233 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
for (let k = -10; k <= 10; k++) {
  const f = new THREE.Mesh(new THREE.BoxGeometry(4, .012, .05), new THREE.MeshLambertMaterial({ color: 0x5b3a20 }));
  f.position.set(0, .006, k * .12); f.receiveShadow = true; scene.add(f);
}

let cur = null;
const COLORS = [['Verde', 0x2e7d32], ['Roșu', 0xd32f2f], ['Albastru', 0x1e6fd6], ['Portocaliu', 0xf57c00]];
const q = new URLSearchParams(location.search);
const state = { col: COLORS[0][1], mode: q.get('mode') || 'plough' };
if (q.get('cam') === 'back') camera.position.set(-1.1, .5, -.7);
function show() {
  if (cur) { scene.remove(cur.grp); cur.grp.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); }
  cur = buildTractor(state.col, { plough: state.mode === 'plough', trailer: state.mode === 'trailer' });
  cur.grp.scale.setScalar(1.4);
  scene.add(cur.grp);
}
const btns = document.getElementById('btns');
const button = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { fn(); show(); }; btns.appendChild(b); };
for (const [name, c] of COLORS) button(name, () => { state.col = c; });
button('Cu plug', () => { state.mode = 'plough'; });
button('Cu remorcă', () => { state.mode = 'trailer'; });
button('Doar tractorul', () => { state.mode = 'none'; });
show();

let drive = 0, last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
  // roțile se învârt încet, ca și cum ar merge
  drive += dt;
  for (const w of cur.wheels) w.m.rotation.z -= .15 * dt / (w.r * 1.4);
  controls.update();
  renderer.render(scene, camera);
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
