// 深海研究潛艇（參考真實的載人潛水器：白色耐壓艇身、橘色頂部整流罩、前面透明壓克力觀景球、
// 底下的滑橇骨架、後方導管推進器、兩側燈臂、收起來的機械手臂）。臉朝 +z。
import * as THREE from 'three';
import { vec3, uniform, mx_noise_float, positionLocal, mix, smoothstep, uv, float } from 'three/tsl';

function label(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.font = '900 64px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#1b2430'; x.fillText(text, 128, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildSub(high) {
  const sub = new THREE.Group();
  // 有一點點髒污和刮痕的白漆（真的潛艇不會是純白的）
  const white = new THREE.MeshStandardNodeMaterial({ roughness: 0.42, metalness: 0.05 });
  const grime = mx_noise_float(positionLocal.mul(3.5)).mul(0.5).add(0.5);
  const streak = mx_noise_float(positionLocal.mul(vec3(1.5, 9, 1.5))).mul(0.5).add(0.5);
  white.colorNode = mix(vec3(0.93, 0.93, 0.9), vec3(0.72, 0.74, 0.7), smoothstep(0.55, 0.9, grime).mul(0.6).add(smoothstep(0.6, 0.95, streak).mul(0.25)));
  const orange = new THREE.MeshStandardNodeMaterial({ color: 0xf2611c, roughness: 0.38, metalness: 0.05 });
  const frameM = new THREE.MeshStandardNodeMaterial({ color: 0x5d646d, roughness: 0.45, metalness: 0.75 });
  const darkM = new THREE.MeshStandardNodeMaterial({ color: 0x22272e, roughness: 0.6, metalness: 0.3 });
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0xb8bec6, roughness: 0.3, metalness: 0.9 });

  // ---- 艇身：用旋轉體做出前圓後尖的耐壓殼，再壓扁一點
  const prof = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, z = -1.75 + t * 3.2;
    const r = t < 0.38 ? 0.8 * Math.pow(Math.sin(t / 0.38 * Math.PI / 2), 0.75) : t > 0.86 ? 0.8 - (t - 0.86) / 0.14 * 0.17 : 0.8;   // 後面收尖、中段圓筒、前面接觀景球
    prof.push(new THREE.Vector2(Math.max(0.02, r), z));
  }
  const hullG = new THREE.LatheGeometry(prof, 28); hullG.rotateX(Math.PI / 2); hullG.scale(1.05, 0.88, 1);
  const hull = new THREE.Mesh(hullG, white);
  // ---- 頂部橘色整流罩（像潛艇的帆）
  const sailG = new THREE.CapsuleGeometry(0.34, 1.7, 6, 16); sailG.rotateX(Math.PI / 2); sailG.scale(1.25, 0.7, 1);
  const sail = new THREE.Mesh(sailG, orange); sail.position.set(0, 0.68, -0.2);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.7), orange); fin.position.set(0, 0.95, -1.15); fin.rotation.x = -0.25;
  // 編號
  const num = new THREE.MeshBasicNodeMaterial({ map: label('MW-1'), transparent: true });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.28), num); p.position.set(s * 0.435, 0.7, -0.1); p.rotation.y = s * Math.PI / 2; sub.add(p); }
  // ---- 前面的壓克力觀景球＋金屬環
  const glassM = new THREE.MeshPhysicalNodeMaterial({ color: 0xbfe8ff, roughness: 0.02, metalness: 0, transmission: 0, transparent: true, opacity: 0.38, clearcoat: 1 });
  glassM.emissiveNode = vec3(0.02, 0.07, 0.09);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), glassM); dome.rotation.x = Math.PI / 2; dome.position.set(0, 0.02, 1.38);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.06, 10, 32), steel); ring.position.set(0, 0.02, 1.4);
  // 觀景球裡面：駕駛座椅背和兩個發亮的螢幕
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.12), darkM); seat.position.set(0, -0.05, 1.1);
  const screenM = new THREE.MeshStandardNodeMaterial({ color: 0x000000 }); screenM.emissiveNode = vec3(0.2, 0.75, 1).mul(1.4);
  const scr = [-0.22, 0.22].map((x) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.13), screenM); m.position.set(x, -0.18, 1.55); m.rotation.x = -0.6; return m; });
  // ---- 底下的滑橇骨架（兩根長管＋支撐）
  const skidG = new THREE.CylinderGeometry(0.05, 0.05, 3.0, 8); skidG.rotateX(Math.PI / 2);
  const parts = [];
  for (const s of [-1, 1]) {
    const sk = new THREE.Mesh(skidG, frameM); sk.position.set(s * 0.55, -0.88, -0.1); parts.push(sk);
    const tip = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12, Math.PI / 2), frameM); tip.rotation.y = -Math.PI / 2; tip.position.set(s * 0.55, -0.72, 1.4); parts.push(tip);
    for (const z of [-1.1, 0.0, 1.0]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 6), frameM); st.position.set(s * 0.5, -0.66, z); st.rotation.z = s * 0.25; parts.push(st); }
  }
  // 底下的儀器箱和電池艙
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 1.5), darkM); box.position.set(0, -0.7, -0.35); parts.push(box);
  // ---- 後方：導管推進器（主推進）＋兩側小推進器
  const duct = (r, len) => { const g = new THREE.CylinderGeometry(r, r * 0.92, len, 20, 1, true); g.rotateX(Math.PI / 2); return g; };
  const ductM = darkM.clone(); ductM.side = THREE.DoubleSide;
  const mainDuct = new THREE.Mesh(duct(0.42, 0.42), ductM); mainDuct.position.set(0, 0.05, -1.95);
  const prop = new THREE.Group(); prop.position.set(0, 0.05, -1.95);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.05), steel); b.position.y = 0.19; b.rotation.y = 0.5; const p = new THREE.Group(); p.rotation.z = i * Math.PI / 2; p.add(b); prop.add(p); }
  prop.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), steel));
  const sideThr = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.set(s * 1.0, -0.15, -0.9); g.add(new THREE.Mesh(duct(0.2, 0.32), ductM)); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), frameM); arm.rotation.z = Math.PI / 2; arm.position.x = -s * 0.25; g.add(arm); return g; });
  const vThr = new THREE.Mesh(duct(0.17, 0.25), ductM); vThr.rotation.x = Math.PI / 2; vThr.position.set(0, 0.62, -1.25);
  // ---- 燈臂（左右各一個燈頭）
  const lampM = new THREE.MeshStandardNodeMaterial({ color: 0xfff7d0, roughness: 0.2 });
  const lampOn = uniform(0);
  lampM.emissiveNode = vec3(1, 0.95, 0.75).mul(lampOn.mul(6));
  const lamps = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 6), frameM); arm.rotation.z = Math.PI / 2; arm.position.set(s * 0.75, -0.4, 1.05); parts.push(arm);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 14), darkM); head.rotation.x = Math.PI / 2; head.position.set(s * 1.08, -0.4, 1.1); parts.push(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), lampM); lens.position.set(s * 1.08, -0.4, 1.215); lamps.push(lens);
  }
  // ---- 機械手臂（收在右前方）
  const armG = new THREE.Group(); armG.position.set(0.48, -0.55, 1.15);
  const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8), steel); seg1.position.set(0, 0, 0.2); seg1.rotation.x = Math.PI / 2 - 0.3;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), darkM); joint.position.set(0, -0.08, 0.46);
  const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.45, 8), steel); seg2.position.set(0, -0.25, 0.42); seg2.rotation.x = 0.2;
  const claw = [-1, 1].map((s) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.04), darkM); c.position.set(s * 0.04, -0.5, 0.38); c.rotation.z = s * 0.3; return c; });
  armG.add(seg1, joint, seg2, ...claw);
  // ---- 天線、閃燈
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 5), darkM); ant.position.set(0.18, 1.2, -0.7);
  const strobeM = new THREE.MeshStandardNodeMaterial({ color: 0xff3020 }); const strobeU = uniform(0.3); strobeM.emissiveNode = vec3(1, 0.15, 0.08).mul(strobeU);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), strobeM); strobe.position.set(-0.15, 0.95, 0.35);

  sub.add(hull, sail, fin, dome, ring, seat, ...scr, ...parts, mainDuct, prop, ...sideThr, vThr, ...lamps, armG, ant, strobe);
  sub.traverse((m) => { if (m.isMesh) { m.castShadow = high; m.receiveShadow = high; } });
  dome.castShadow = false;
  sub.userData = { prop, lampOn, strobe: strobeU };
  void uv; void float;
  return sub;
}
