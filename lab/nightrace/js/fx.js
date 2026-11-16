// 雨與水花（GPU compute 粒子）
// - 雨：雨滴在鏡頭附近 50 m 的方塊裡循環落下，打到地面變成漣漪
// - 水花：每台車的兩個後輪是「噴口」，車越快、地越濕噴越多；粒子被車甩出去、往上噴、再掉下來
import * as THREE from 'three';
import {
  Fn, uniform, uniformArray, float, vec3, vec4, mix, smoothstep, hash, instancedArray, instanceIndex, If, uv, billboarding,
  positionGeometry, mod, min, abs, time, cameraPosition, int, max, select,
} from 'three/tsl';

export class FX {
  constructor(scene, renderer, { high, webgpu, cars }) {
    this.scene = scene; this.renderer = renderer;
    this.rain = uniform(1);
    const deltaTime = this.dt = uniform(1 / 60);   // 自己給時間差（模擬的步長），不用渲染器的
    this.camU = uniform(new THREE.Vector3());
    // ---------------- 雨
    const N = webgpu ? (high ? 26000 : 10000) : 4000, B = 50, H = 22;
    const pos = instancedArray(N, 'vec4'), rip = instancedArray(N, 'vec4');
    const camU = this.camU;
    this.rainInit = Fn(() => {
      const p = pos.element(instanceIndex);
      p.assign(vec4(hash(instanceIndex).mul(B), hash(instanceIndex.add(7919)).mul(H), hash(instanceIndex.add(104729)).mul(B), 0));
      rip.element(instanceIndex).assign(vec4(0, -50, 0, 99));
    })().compute(N);
    this.rainUpdate = Fn(() => {
      const p = pos.element(instanceIndex), r = rip.element(instanceIndex);
      const sp = hash(instanceIndex.add(3)).mul(4).add(13);
      const np = p.toVar(), nr = r.toVar();
      np.y.subAssign(sp.mul(deltaTime));
      np.x.addAssign(deltaTime.mul(1.2));
      nr.w.addAssign(deltaTime);
      If(np.y.lessThan(0), () => {
        const wx = camU.x.add(mod(np.x.sub(camU.x).add(B / 2), B)).sub(B / 2);
        const wz = camU.z.add(mod(np.z.sub(camU.z).add(B / 2), B)).sub(B / 2);
        If(hash(instanceIndex.add(time.mul(60).floor())).lessThan(0.5), () => { nr.assign(vec4(wx, 0.03, wz, 0)); });
        np.y.addAssign(H);
        np.x.assign(hash(instanceIndex.add(time.mul(17.3).floor())).mul(B).add(camU.x));
        np.z.assign(hash(instanceIndex.add(time.mul(29.1).floor()).add(51)).mul(B).add(camU.z));
      });
      p.assign(np); r.assign(nr);
    })().compute(N);
    const drop = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const world = Fn(() => {
      const p = pos.element(instanceIndex);
      return vec3(camU.x.add(mod(p.x.sub(camU.x).add(B / 2), B)).sub(B / 2), p.y, camU.z.add(mod(p.z.sub(camU.z).add(B / 2), B)).sub(B / 2));
    });
    drop.positionNode = positionGeometry.add(world());
    drop.vertexNode = billboarding({ horizontalRotation: true });
    drop.colorNode = vec3(0.75, 0.82, 0.95);
    const wp = world();
    drop.opacityNode = uv().y.mul(0.28).mul(this.rain).mul(smoothstep(2.0, 5.0, wp.distance(cameraPosition)));
    this.rainMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.65), drop);
    this.rainMesh.count = N; this.rainMesh.frustumCulled = false; scene.add(this.rainMesh);
    const ring = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const rg = new THREE.PlaneGeometry(0.26, 0.26); rg.rotateX(-Math.PI / 2);
    const R = rip.element(instanceIndex);
    ring.positionNode = positionGeometry.mul(R.w.mul(1.3).add(0.15)).add(R.xyz);
    const d = uv().sub(0.5).length().mul(2), k = R.w.mul(2.4);
    ring.colorNode = vec3(0.86, 0.9, 0.96);
    ring.opacityNode = smoothstep(0.12, 0, abs(d.sub(min(k, 1)))).mul(float(1).sub(k).max(0)).mul(0.25).mul(this.rain);
    this.ripMesh = new THREE.Mesh(rg, ring); this.ripMesh.count = Math.floor(N / 2); this.ripMesh.frustumCulled = false; scene.add(this.ripMesh);
    renderer.compute(this.rainInit);

    // ---------------- 水花
    const E = cars * 2, SN = webgpu ? (high ? 7000 : 3500) : 1500;
    this.E = E;
    this.emit = uniformArray(Array.from({ length: E }, () => new THREE.Vector4()), 'vec4');    // 位置 xyz、強度
    this.emitV = uniformArray(Array.from({ length: E }, () => new THREE.Vector4()), 'vec4');   // 車速 xyz
    const P = instancedArray(SN, 'vec4'), V = instancedArray(SN, 'vec4');   // P.w：剩下的壽命
    const em = this.emit, ev = this.emitV;
    this.sprayStep = Fn(() => {
      const i = instanceIndex, p = P.element(i), v = V.element(i);
      const np = p.toVar(), nv = v.toVar();
      np.w.subAssign(deltaTime);
      If(np.w.lessThan(0), () => {
        // 重生：選一個噴口；強度決定這顆要不要出現
        const e = min(int(hash(i.add(time.mul(131).floor())).mul(E)), int(E - 1));
        const src = em.element(e), sv = ev.element(e);
        const live = hash(i.add(time.mul(77.7).floor()).add(9)).lessThan(src.w);
        const h1 = hash(i.add(time.mul(31).floor()).add(1)), h2 = hash(i.add(time.mul(37).floor()).add(2)), h3 = hash(i.add(time.mul(41).floor()).add(3));
        np.assign(vec4(src.xyz.add(vec3(h1.sub(0.5).mul(0.4), 0, h2.sub(0.5).mul(0.4))), select(live, h3.mul(0.35).add(0.25), float(-0.01))));
        nv.assign(vec4(sv.xyz.mul(0.6).add(vec3(h1.sub(0.5).mul(3), h2.mul(2.6).add(1.2), h3.sub(0.5).mul(3))), 0));
      }).Else(() => {
        nv.y.subAssign(deltaTime.mul(9.8));
        nv.xyz.mulAssign(float(1).sub(deltaTime.mul(1.2)));
        np.xyz.addAssign(nv.xyz.mul(deltaTime));
        If(np.y.lessThan(0.02), () => { np.w.assign(-1); });   // 掉回地上就消失
      });
      p.assign(np); v.assign(nv);
    })().compute(SN);
    const sm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const sp = P.element(instanceIndex);
    const alive = smoothstep(0, 0.15, sp.w);
    sm.positionNode = positionGeometry.mul(mix(0.26, 0.07, alive)).add(sp.xyz);
    sm.vertexNode = billboarding();
    sm.colorNode = vec3(0.55, 0.6, 0.68);
    sm.opacityNode = smoothstep(0.5, 0.1, uv().sub(0.5).length()).mul(alive).mul(0.07);
    this.spray = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sm); this.spray.count = SN; this.spray.frustumCulled = false; scene.add(this.spray);
    // 一開始全部都是死的
    this.renderer.compute(Fn(() => { P.element(instanceIndex).assign(vec4(0, -10, 0, -1)); })().compute(SN));
  }

  setEmitters(list) {   // [{ pos, vel, k }]
    list.forEach((e, i) => { if (i < this.E) { this.emit.array[i].set(e.pos.x, e.pos.y, e.pos.z, e.k); this.emitV.array[i].set(e.vel.x, e.vel.y, e.vel.z, 0); } });
  }
  update(camera, rain, dt = 1 / 60) {
    this.dt.value = Math.min(0.05, dt);
    this.rain.value = rain; this.camU.value.copy(camera.position);
    this.rainMesh.visible = this.ripMesh.visible = rain > 0.01;
    if (rain > 0.01) this.renderer.compute(this.rainUpdate);
    this.renderer.compute(this.sprayStep);
  }
}
