// 寫實角色：載入 MakeHuman 角色 glb，處理材質與 待機／走路／跑步 動畫切換
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = {};
export function loadAvatar(id, onProgress) {
  if (!cache[id]) cache[id] = new Promise((res, rej) => loader.load(`assets/avatar-${id}.glb`, (g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const m = o.material, kind = m.userData.kind;
      m.envMapIntensity = 0.55;
      if (kind === 'hair') { m.transparent = false; m.alphaTest = 0.42; m.alphaToCoverage = true; m.depthWrite = true; m.roughness = .55; }
      if (kind === 'brow' || kind === 'lash') { m.alphaTest = 0.3; m.alphaToCoverage = true; o.castShadow = false; }
      if (kind === 'skin') { m.roughness = .58; }
      if (kind === 'eyes') { m.roughness = .12; o.castShadow = false; }
    });
    res(g);
  }, onProgress, rej));
  return cache[id];
}

export class Character {
  constructor(gltf, { tint = null } = {}) {
    this.root = SkeletonUtils.clone(gltf.scene);
    if (tint) this.root.traverse((o) => {
      if (o.isMesh && o.material.userData.kind === 'cloth' && !/shoes/.test(o.material.name)) { o.material = o.material.clone(); o.material.color.copy(tint); }
      if (o.isMesh && o.material.userData.kind === 'hair' && tint.hair) { o.material = o.material.clone(); o.material.color.copy(tint.hair); }
    });
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    this.speeds = gltf.scene.userData.speeds || { walk: 1.1, run: 2.7 };
    this.height = gltf.scene.userData.height || 1.65;
    this.mixer = new THREE.AnimationMixer(this.root);
    this.actions = {};
    for (const clip of gltf.animations) {
      const a = this.mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play();
      this.actions[clip.name] = a;
    }
    this.state = 'idle';
    this.actions.idle.setEffectiveWeight(1);
    this.actions.idle.time = Math.random() * 3;
    this.footL = this.root.getObjectByName('FootL'); this.footR = this.root.getObjectByName('FootR');
    this._fy = [0, 0]; this._fv = [0, 0];
    this.onStep = null;
  }
  setMotion(speed) {
    const want = speed < 0.12 ? "idle" : speed < 3.3 ? 'walk' : 'run';
    if (want !== this.state) {
      const from = this.actions[this.state], to = this.actions[want];
      if ((want === 'walk' || want === 'run') && (this.state === 'walk' || this.state === 'run')) {
        to.time = (from.time / from.getClip().duration) * to.getClip().duration; // keep the gait phase
      } else if (want !== 'idle') to.time = 0;
      to.enabled = true; to.setEffectiveTimeScale(1); to.setEffectiveWeight(1);
      from.crossFadeTo(to, want === 'idle' || this.state === 'idle' ? 0.28 : 0.2, false);
      this.state = want;
    }
    if (want === 'walk') this.actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / this.speeds.walk, 0.55, 2.45));
    if (want === 'run') this.actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / this.speeds.run, 0.7, 2.0));
  }
  update(dt) {
    this.mixer.update(dt);
    if (this.onStep && this.state !== 'idle') {
      this.root.updateMatrixWorld(true);
      [this.footL, this.footR].forEach((f, i) => {
        if (!f) return;
        const y = f.getWorldPosition(_v).y - this.root.position.y;
        const v = y - this._fy[i];
        if (this._fv[i] < 0 && v >= 0 && y < 0.16) this.onStep(i);
        this._fv[i] = v; this._fy[i] = y;
      });
    }
  }
}
const _v = new THREE.Vector3();
