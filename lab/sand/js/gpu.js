// WebGPU 引擎：格子放在顯示卡的 storage buffer，畫筆、物理、數格子、畫面全部是 shader
import { STAMP, STEP, FLOW, COUNT, DRAW } from './shaders.js';

const ORDER = [0, 3, 1, 2];   // 區塊位移輪流：(0,0) (1,1) (1,0) (0,1)

export async function createGPU(canvas, { offscreen = false, onStep = async () => {} } = {}) {
  if (!navigator.gpu) return null;
  let adapter;
  try { adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); } catch { return null; }
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  await onStep(0.3, '編譯沙子的物理規則…');
  // 著色器用非同步編譯：編譯的時候瀏覽器不會卡住，載入畫面可以一直更新
  const mod = (code) => device.createShaderModule({ code });
  const comp = (code) => device.createComputePipelineAsync({ layout: 'auto', compute: { module: mod(code), entryPoint: 'main' } });
  const pStamp = await comp(STAMP);
  await onStep(0.42, '編譯沙子的物理規則…');
  const pStep = await comp(STEP);
  await onStep(0.58, '編譯水流和計數…');
  const [pFlow, pCount] = await Promise.all([comp(FLOW), comp(COUNT)]);
  await onStep(0.7, '編譯畫面和光影…');
  const format = offscreen ? 'rgba8unorm' : navigator.gpu.getPreferredCanvasFormat();
  const dm = mod(DRAW);
  const pDraw = await device.createRenderPipelineAsync({
    layout: 'auto', vertex: { module: dm, entryPoint: 'vs' },
    fragment: { module: dm, entryPoint: 'fs', targets: [{ format }] }, primitive: { topology: 'triangle-list' },
  });
  return new GpuSim(device, canvas, offscreen, adapter, { pStamp, pStep, pFlow, pCount, pDraw, format });
}

class GpuSim {
  constructor(device, canvas, offscreen, adapter, P) {
    this.kind = 'gpu';
    this.device = device; this.canvas = canvas; this.offscreen = offscreen;
    this.info = adapter.info || {};
    this.format = P.format;
    if (!offscreen) {
      this.ctx = canvas.getContext('webgpu');
      this.ctx.configure({ device, format: this.format, alphaMode: 'opaque' });
    }
    Object.assign(this, { pStamp: P.pStamp, pStep: P.pStep, pFlow: P.pFlow, pCount: P.pCount, pDraw: P.pDraw });
    const U = GPUBufferUsage;
    this.shared = device.createBuffer({ size: 32, usage: U.UNIFORM | U.COPY_DST });
    this.stampBuf = device.createBuffer({ size: 16 * 32, usage: U.UNIFORM | U.COPY_DST });
    this.passBufs = ORDER.map((off, k) => {
      const b = device.createBuffer({ size: 16, usage: U.UNIFORM | U.COPY_DST });
      device.queue.writeBuffer(b, 0, new Uint32Array([off, 0x51ed27 * (k + 1), 0, 0]));
      return b;
    });
    this.regBuf = device.createBuffer({ size: 128 + 32 + 16, usage: U.UNIFORM | U.COPY_DST });
    this.cntBuf = device.createBuffer({ size: 32, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
    this.cntRead = device.createBuffer({ size: 32, usage: U.MAP_READ | U.COPY_DST });
    this.frameNo = 0; this.counting = false;
    this.sharedArr = new ArrayBuffer(32);
  }

  // 換格子大小（清空）
  resize(w, h) {
    this.w = w; this.h = h;
    const d = this.device, U = GPUBufferUsage;
    if (this.cells) this.cells.destroy();
    this.cells = d.createBuffer({ size: w * h * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
    const bg = (p, entries) => d.createBindGroup({ layout: p.getBindGroupLayout(0), entries: entries.map((b, i) => ({ binding: i, resource: { buffer: b } })) });
    this.gStamp = bg(this.pStamp, [this.cells, this.shared, this.stampBuf]);
    this.gSteps = this.passBufs.map((pb) => bg(this.pStep, [this.cells, this.shared, pb]));
    this.gFlows = this.passBufs.map((pb) => bg(this.pFlow, [this.cells, this.shared, pb]));
    this.gCount = bg(this.pCount, [this.cells, this.shared, this.regBuf, this.cntBuf]);
    this.gDraw = bg(this.pDraw, [this.cells, this.shared]);
  }

  load(arr) { this.device.queue.writeBuffer(this.cells, 0, arr); }

  // stamps：[{x0,y0,x1,y1,r,mat,prob,mode}]（格子座標）；passes：這一格要跑幾次物理
  frame({ stamps = [], passes = 4, time = 0, glow = 1 }) {
    const d = this.device, q = d.queue;
    const n = Math.min(stamps.length, 16);
    const su = new Uint32Array(this.sharedArr), sf = new Float32Array(this.sharedArr);
    su[0] = this.w; su[1] = this.h; su[2] = this.frameNo++; su[3] = n; sf[4] = time; sf[5] = glow;
    q.writeBuffer(this.shared, 0, this.sharedArr);
    if (n) {
      const a = new Float32Array(16 * 8);
      for (let i = 0; i < n; i++) { const s = stamps[i]; a.set([s.x0, s.y0, s.x1, s.y1, s.r, s.mat, s.prob, s.mode], i * 8); }
      q.writeBuffer(this.stampBuf, 0, a);
    }
    const enc = d.createCommandEncoder();
    const cp = enc.beginComputePass();
    if (n) { cp.setPipeline(this.pStamp); cp.setBindGroup(0, this.gStamp); cp.dispatchWorkgroups(Math.ceil(this.w / 8), Math.ceil(this.h / 8)); }
    const bx = Math.ceil((Math.ceil((this.w + 1) / 2)) / 8), by = Math.ceil((Math.ceil((this.h + 1) / 2)) / 8), fy = Math.ceil(this.h / 8);
    for (let i = 0; i < passes; i++) {
      const k = (this.frameNo + i) % 4;
      cp.setPipeline(this.pStep); cp.setBindGroup(0, this.gSteps[k]); cp.dispatchWorkgroups(bx, by);
      cp.setPipeline(this.pFlow); cp.setBindGroup(0, this.gFlows[k]); cp.dispatchWorkgroups(bx, fy);
    }
    cp.end();
    this.drawInto(enc);
    q.submit([enc.finish()]);
  }

  target() {
    if (!this.offscreen) return this.ctx.getCurrentTexture();
    const W = this.canvas.width, H = this.canvas.height;
    if (!this.off || this.off.width !== W || this.off.height !== H) {
      if (this.off) this.off.destroy();
      this.off = this.device.createTexture({ size: [W, H], format: this.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    }
    return this.off;
  }

  drawInto(enc) {
    const rp = enc.beginRenderPass({ colorAttachments: [{ view: this.target().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
    rp.setPipeline(this.pDraw); rp.setBindGroup(0, this.gDraw); rp.draw(3); rp.end();
  }

  // regions：[{x0,y0,x1,y1,mats:[…]}] → Promise<[數量…]>；上一次還沒讀回來就回 null
  count(regions) {
    if (this.counting) return null;
    this.counting = true;
    const d = this.device, q = d.queue;
    const ab = new ArrayBuffer(176), f = new Float32Array(ab), u = new Uint32Array(ab);
    regions.slice(0, 8).forEach((r, i) => { f.set([r.x0, r.y0, r.x1, r.y1], i * 4); u[32 + i] = r.mats.reduce((m, t) => m | (1 << t), 0); });
    u[40] = Math.min(regions.length, 8);
    q.writeBuffer(this.regBuf, 0, ab);
    q.writeBuffer(this.cntBuf, 0, new Uint32Array(8));
    const enc = d.createCommandEncoder();
    const cp = enc.beginComputePass();
    cp.setPipeline(this.pCount); cp.setBindGroup(0, this.gCount); cp.dispatchWorkgroups(Math.ceil(this.w / 8), Math.ceil(this.h / 8)); cp.end();
    enc.copyBufferToBuffer(this.cntBuf, 0, this.cntRead, 0, 32);
    q.submit([enc.finish()]);
    return this.cntRead.mapAsync(GPUMapMode.READ).then(() => {
      const out = Array.from(new Uint32Array(this.cntRead.getMappedRange().slice(0)));
      this.cntRead.unmap(); this.counting = false;
      return out.slice(0, regions.length);
    }, () => { this.counting = false; return null; });
  }

  // 自動測試用：把目前畫面讀回來
  async snapshot() {
    const W = this.canvas.width, H = this.canvas.height, bpr = Math.ceil(W * 4 / 256) * 256;
    const d = this.device;
    const buf = d.createBuffer({ size: bpr * H, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const enc = d.createCommandEncoder();
    this.drawInto(enc);
    enc.copyTextureToBuffer({ texture: this.target() }, { buffer: buf, bytesPerRow: bpr }, [W, H]);
    d.queue.submit([enc.finish()]);
    await buf.mapAsync(GPUMapMode.READ);
    const src = new Uint8Array(buf.getMappedRange()), px = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) px.set(src.subarray(y * bpr, y * bpr + W * 4), y * W * 4);
    buf.unmap(); buf.destroy();
    return new ImageData(px, W, H);
  }

  // 自動測試用：讀回所有格子
  async readCells() {
    const d = this.device, size = this.w * this.h * 4;
    const buf = d.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const enc = d.createCommandEncoder(); enc.copyBufferToBuffer(this.cells, 0, buf, 0, size); d.queue.submit([enc.finish()]);
    await buf.mapAsync(GPUMapMode.READ);
    const out = new Uint32Array(buf.getMappedRange().slice(0)); buf.unmap(); buf.destroy();
    return out;
  }
}
