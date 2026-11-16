// 日夜與天氣（WebGPU 版大街）
// - 時間：自動循環（8 分鐘一天）或固定白天／黃昏／夜晚。太陽、月亮、天空（含星星）、霧、環境光一起變。
// - 夜晚：路燈、招牌亮起來；路燈是真的點光源（WebGPU 用 ClusteredLighting，上百盞燈也只算照得到的那幾盞）。
// - 下雨：雨滴和地上的漣漪都是 GPU compute 粒子；地面材質依「濕度」變暗、變亮滑，低窪處形成水窪（高畫質再加螢幕空間反射）。
import * as THREE from 'three';
import {
  Fn, uniform, float, vec2, vec3, vec4, mix, smoothstep, step, hash, floor, positionWorld, normalWorld, cameraPosition,
  materialRoughness, materialColor, mx_fractal_noise_float, instancedArray, instanceIndex, deltaTime, If, uv, billboarding,
  positionGeometry, mod, max, min, abs, time,
} from 'three/tsl';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const TIME_PRESETS = { day: 13.5, dusk: 17.85, night: 21.5 };

export class Env {
  constructor({ renderer, scene, camera, sun, sunDir, sky, hemi, world, high, webgpu, sound }) {
    Object.assign(this, { renderer, scene, camera, sun, sunDir, sky, hemi, world, high, webgpu, sound });
    this.hour = 15.5; this.mode = 'auto'; this.weather = 'sun';
    this.u = { night: uniform(0), wet: uniform(0), rain: uniform(0), skyK: uniform(1), dusk: uniform(0) };
    this.rainK = 0; this.wetK = 0;
    this.fogDay = new THREE.Color(0xc9d6e3); this.fogDusk = new THREE.Color(0xe7a27a); this.fogNight = new THREE.Color(0x0d1222); this.fogRain = new THREE.Color(0x8d969f);
    this.sunCol = new THREE.Color(0xfff0dc); this.sunLow = new THREE.Color(0xff8a4a); this.moonCol = new THREE.Color(0x9fb4ff);
    this._c = new THREE.Color();
    this.setupSky();
    this.setupGround();
    this.setupLamps();
    this.setupRain();
    this.collectEmissive();
  }

  // 天空：原本的物理天空 × 亮度，晚上加星星
  setupSky() {
    const m = this.sky.material, base = m.colorNode, u = this.u;
    m.colorNode = Fn(() => {
      const c = vec4(base);
      const dir = positionWorld.sub(cameraPosition).normalize();
      const cell = floor(dir.mul(420));
      const star = step(0.9975, hash(cell.x.add(cell.y.mul(57.1)).add(cell.z.mul(113.7)))).mul(smoothstep(0.02, 0.2, dir.y));
      const tw = hash(cell.x.add(time.mul(3).floor())).mul(0.5).add(0.5);
      return vec4(c.rgb.mul(u.skyK).add(vec3(star.mul(tw).mul(u.night).mul(1.6))), c.a);
    })();
    m.needsUpdate = true;
  }

  // 地面：濕度讓顏色變暗、粗糙度降低；水窪的位置用雜訊決定，只在朝上的面
  setupGround() {
    const u = this.u;
    const puddle = smoothstep(0.05, 0.3, mx_fractal_noise_float(positionWorld.xz.mul(0.18), 3, 2.0, 0.5).add(0.08));
    const up = smoothstep(0.75, 0.95, normalWorld.y);
    const wetUp = u.wet.mul(up);
    for (const m of new Set(this.world.gpu.ground)) {
      if (!m.isNodeMaterial) continue;
      m.roughnessNode = mix(materialRoughness, mix(float(0.32), float(0.04), puddle), wetUp);
      m.colorNode = materialColor.mul(mix(float(1), mix(float(0.62), float(0.42), puddle), wetUp));
      m.needsUpdate = true;
    }
  }

  // 路燈：每盞一個點光源（白天關掉）
  setupLamps() {
    this.lamps = [];
    const list = this.world.gpu.lamps;
    for (const p of list) {
      const l = new THREE.PointLight(0xffd59a, 0, 13, 1.7);
      l.position.copy(p); this.scene.add(l); this.lamps.push(l);
    }
  }

  // 自發光材質（招牌、燈、螢幕）：晚上更亮
  collectEmissive() {
    this.emis = [];
    const seen = new Set();
    this.world.root.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        if (seen.has(m) || !m.emissive || m.emissiveIntensity <= 0 || (m.emissive.r + m.emissive.g + m.emissive.b === 0 && !m.emissiveMap)) continue;
        seen.add(m);
        const lamp = m.emissive.getHex() === 0xffe2a8;
        this.emis.push({ m, base: m.emissiveIntensity, k: lamp ? 7 : 0.9 });
      }
    });
  }

  // 雨：N 顆雨滴在鏡頭附近 34m × 34m 的範圍循環落下；打到地面的位置變成漣漪
  setupRain() {
    const N = this.webgpu ? (this.high ? 24000 : 9000) : 4000;
    const B = 34, H = 16;
    this.rainN = N;
    const pos = instancedArray(N, 'vec3'), rip = instancedArray(N, 'vec4');   // rip: xyz 位置, w 經過時間
    const u = this.u, camU = this.camU = uniform(new THREE.Vector3());
    // 在大街、廣場露天的地方才下得到（大樓裡、店裡不下）
    const outdoor = (p) => {
      const street = step(abs(p.x), 7.9).mul(step(6, p.z));
      const plaza = step(abs(p.x), 14.8).mul(step(-1.8, p.z)).mul(step(p.z, 6.2));
      return max(street, plaza);
    };
    this.rainInit = Fn(() => {
      const p = pos.element(instanceIndex);
      p.x = hash(instanceIndex).mul(B);
      p.y = hash(instanceIndex.add(7919)).mul(H);
      p.z = hash(instanceIndex.add(104729)).mul(B);
      rip.element(instanceIndex).w = 99;
    })().compute(N);
    this.rainUpdate = Fn(() => {
      const p = pos.element(instanceIndex), r = rip.element(instanceIndex);
      const sp = hash(instanceIndex.add(3)).mul(3).add(11);
      p.y = p.y.sub(sp.mul(deltaTime));
      p.x = p.x.add(deltaTime.mul(0.8));
      r.w = r.w.add(deltaTime);
      If(p.y.lessThan(0), () => {
        // 打到地面：記下漣漪位置（世界座標），雨滴回到上面
        const wx = camU.x.add(mod(p.x.sub(camU.x).add(B / 2), B)).sub(B / 2);
        const wz = camU.z.add(mod(p.z.sub(camU.z).add(B / 2), B)).sub(B / 2);
        If(hash(instanceIndex.add(time.mul(60).floor())).lessThan(0.5), () => { r.xyz = vec3(wx, 0.02, wz); r.w = 0; });
        p.y = p.y.add(H);
        p.x = hash(instanceIndex.add(time.mul(17.3).floor())).mul(B).add(camU.x);
        p.z = hash(instanceIndex.add(time.mul(29.1).floor()).add(51)).mul(B).add(camU.z);
      });
    })().compute(N);

    // 雨滴：細長、面向鏡頭的條紋
    const drop = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const world = Fn(() => {
      const p = pos.element(instanceIndex);
      const wx = camU.x.add(mod(p.x.sub(camU.x).add(B / 2), B)).sub(B / 2);
      const wz = camU.z.add(mod(p.z.sub(camU.z).add(B / 2), B)).sub(B / 2);
      return vec3(wx, p.y, wz);
    });
    drop.positionNode = positionGeometry.add(world());
    drop.vertexNode = billboarding({ horizontalRotation: true });
    drop.colorNode = vec3(0.78, 0.84, 0.92);
    const wp = world();
    // 離鏡頭太近的雨滴會變成一條大白線：淡掉
    drop.opacityNode = uv().y.mul(0.26).mul(u.rain).mul(outdoor(wp)).mul(smoothstep(0, 0.6, wp.y)).mul(smoothstep(2.0, 5.0, wp.distance(cameraPosition)));
    this.rainMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.55), drop);
    this.rainMesh.count = N; this.rainMesh.frustumCulled = false; this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);

    // 漣漪：地上擴散的小圓圈
    const ring = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const rg = new THREE.PlaneGeometry(0.34, 0.34); rg.rotateX(-Math.PI / 2);
    const R = rip.element(instanceIndex);
    ring.positionNode = positionGeometry.mul(R.w.mul(2.2).add(0.2)).add(R.xyz);
    const d = uv().sub(0.5).length().mul(2);
    const k = R.w.mul(2.4);
    const band = smoothstep(0.12, 0, abs(d.sub(min(k, 1))));
    ring.colorNode = vec3(0.86, 0.9, 0.96);
    ring.opacityNode = band.mul(float(1).sub(k).max(0)).mul(0.55).mul(u.rain).mul(outdoor(R.xyz));
    this.ripMesh = new THREE.Mesh(rg, ring);
    this.ripMesh.count = this.high ? N : Math.floor(N / 2); this.ripMesh.frustumCulled = false; this.ripMesh.visible = false;
    this.scene.add(this.ripMesh);
    this.renderer.compute(this.rainInit);
  }

  setTime(mode) { this.mode = mode; if (TIME_PRESETS[mode] !== undefined) this.hour = TIME_PRESETS[mode]; }
  setWeather(w) { this.weather = w; }
  get label() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  update(dt, playerPos) {
    if (this.mode === 'auto') this.hour = (this.hour + dt * 24 / 480) % 24;
    // 太陽：6 點升起、18 點落下
    const f = (this.hour - 6) / 12;
    const sinEl = Math.sin(f * Math.PI);
    const az = -1.15 + f * 2.3;
    const el = Math.asin(clamp(sinEl, -1, 1)) * 0.95;
    const sd = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el) * 0.6 + 0.35).normalize();
    const day = sstep(-0.06, 0.22, sinEl), night = 1 - sstep(-0.18, 0.04, sinEl), dusk = clamp(1 - Math.abs(sinEl) / 0.32, 0, 1) * (sinEl > -0.2 ? 1 : 0);
    // 雨、濕度慢慢變
    const rainT = this.weather === 'rain' ? 1 : 0;
    this.rainK += (rainT - this.rainK) * Math.min(1, dt * 0.6);
    this.wetK += ((rainT ? 1 : 0) - this.wetK) * Math.min(1, dt * (rainT ? 0.25 : 0.05));
    const rain = this.rainK, overcast = rain * 0.75;

    // 光：白天用太陽，晚上換成月光
    const sun = this.sun;
    if (sinEl > -0.02) {
      this.sunDir.copy(sd);
      this._c.copy(this.sunLow).lerp(this.sunCol, sstep(0.02, 0.4, sinEl));
      sun.color.copy(this._c);
      sun.intensity = 4.6 * sstep(-0.02, 0.2, sinEl) * (1 - overcast * 0.8);
    } else {
      this.sunDir.set(-0.35, 0.75, -0.5).normalize();
      sun.color.copy(this.moonCol);
      sun.intensity = 0.3 * night * (1 - overcast * 0.7);
    }
    this.hemi.intensity = (0.33 * day + 0.05) * (1 - overcast * 0.3);
    this.hemi.color.setRGB(0.81 - 0.4 * night, 0.89 - 0.35 * night, 1);
    this.scene.environmentIntensity = (0.025 + 0.975 * day) * (1 - overcast * 0.45);
    this.renderer.toneMappingExposure = 0.95 + night * 0.15;
    // 天空與霧
    this.sky.sunPosition.value.copy(sd);
    this.sky.cloudCoverage.value = 0.4 + rain * 0.5; this.sky.cloudDensity.value = 0.4 + rain * 0.5;
    this.u.skyK.value = (0.06 + 0.94 * day) * (1 - overcast * 0.55);
    this.u.night.value = night * (1 - rain); this.u.dusk.value = dusk;
    const fog = this.scene.fog;
    this._c.copy(this.fogDay).lerp(this.fogDusk, dusk * 0.6).lerp(this.fogNight, night).lerp(this.fogRain.clone().multiplyScalar(0.25 + 0.75 * day), rain * 0.8);
    fog.color.copy(this._c);
    fog.near = 60 - rain * 45; fog.far = 190 - rain * 120;
    // 路燈與招牌
    const lampOn = sstep(0.25, 0.02, sinEl);
    for (const l of this.lamps) l.intensity = lampOn * 16;
    for (const e of this.emis) e.m.emissiveIntensity = e.base * (1 + lampOn * e.k);
    // 雨
    this.u.rain.value = rain; this.u.wet.value = this.wetK;
    const raining = rain > 0.01;
    this.rainMesh.visible = this.ripMesh.visible = raining;
    if (raining) {
      this.camU.value.copy(this.camera.position);
      this.renderer.compute(this.rainUpdate);
    }
    this.night = night; this.lampOn = lampOn;
    if (this.sound && this.sound.setRain) this.sound.setRain(rain);
  }
}
