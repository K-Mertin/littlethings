// 戰鬥模擬（CPU，用 typed array，幾千個士兵也跑得動）
// 每格：重建空間格子 → 每隊算中心 → 每個士兵找敵人、移動、閃開隊友、攻擊 → 箭飛行與落地 → 判斷勝負
// 畫面（顯示卡）只負責把結果畫出來：見 units.js。
export const T = { SWORD: 0, ARCHER: 1, CAV: 2, SPEAR: 3 };
export const STATS = [
  { name: '劍盾兵', hp: 100, dmg: 11, cd: 1.0, range: 1.15, speed: 3.2, look: 10, spacing: 1.3 },
  { name: '弓箭手', hp: 70, dmg: 6, cd: 1.0, range: 1.1, speed: 3.0, look: 34, spacing: 1.4, shoot: 15, shootCd: 3.2 },
  { name: '騎兵', hp: 200, dmg: 18, cd: 1.0, range: 1.6, speed: 7.2, look: 14, spacing: 2.3 },
  // 長槍兵：槍很長（打得到比較遠），專門剋騎兵：打騎兵傷害 ×3，騎兵衝過來會被槍尖頂住（衝鋒加成沒了，還會被刺傷）；沒有盾，怕箭
  { name: '長槍兵', hp: 110, dmg: 8, cd: 1.15, range: 2.0, speed: 2.9, look: 10, spacing: 1.2 },
];
const CELL = 2, GW = 200, GH = 140, GOX = 200, GOZ = 140;   // 格子覆蓋 x −200～200、z −140～140
const G = 9.8;

export class Battle {
  constructor(terrain, max = 4000) {
    this.ter = terrain; this.MAX = max;
    const F = (n = max) => new Float32Array(n), I = (n = max) => new Int32Array(n), U = (n = max) => new Uint8Array(n);
    Object.assign(this, {
      x: F(), z: F(), y: F(), vx: F(), vz: F(), hd: F(), hp: F(), team: U(), type: U(), squad: I(), alive: U(),
      tgt: I(), cd: F(), atk: F(), ph: F(), death: F(), rt: F(), slot: I(), shotCd: F(),
    });
    this.n = 0; this.squads = []; this.arrows = []; this.t = 0;
    this.head = new Int32Array(GW * GH); this.next = new Int32Array(max);
    this.events = { clash: 0, volley: 0, deaths: [0, 0] };
    this.start = [0, 0];
  }

  // ---------------------------------------------------------------- 建立
  addSquad({ team, type, n, x, z, fx = 0, fz = team === 0 ? -1 : 1, behavior = 'hold', width }) {
    const sq = { id: this.squads.length, team, type, units: [], n0: n, behavior, mode: 'hold', order: null, cx: x, cz: z, alive: n, engaged: false, sel: false };
    for (let k = 0; k < n && this.n < this.MAX; k++) {
      const i = this.n++;
      this.team[i] = team; this.type[i] = type; this.squad[i] = sq.id; this.alive[i] = 1; this.hp[i] = STATS[type].hp;
      this.tgt[i] = -1; this.cd[i] = Math.random(); this.atk[i] = 0; this.ph[i] = Math.random() * 6; this.death[i] = 0; this.rt[i] = Math.random() * 0.3;
      this.slot[i] = k; this.shotCd[i] = Math.random() * 2; sq.units.push(i);
    }
    this.squads.push(sq);
    this.orderSquad(sq, x, z, fx, fz, width);
    for (const i of sq.units) { const s = this.slotPos(sq, this.slot[i]); this.x[i] = s.x + (Math.random() - 0.5) * 0.3; this.z[i] = s.z + (Math.random() - 0.5) * 0.3; this.hd[i] = Math.atan2(fx, fz); }
    this.start[team] += sq.units.length;
    return sq;
  }

  // 下命令：走到 (x,z)、面向 (fx,fz)、橫排寬度 width（公尺）
  // move：玩家下的移動命令——走到之前不停下來打架（除非敵人貼在身上）
  orderSquad(sq, x, z, fx, fz, width, move = false) {
    const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
    const st = STATS[sq.type], n = Math.max(1, sq.alive);
    const cols = width ? Math.max(3, Math.round(width / st.spacing)) : Math.max(4, Math.ceil(Math.sqrt(n * (sq.type === T.ARCHER ? 4 : 2.6))));
    sq.order = { x, z, fx, fz, cols, move, t: this.t };
    // 重新排隊：活著的人依照離新位置的遠近重新分配位置
    const live = sq.units.filter((i) => this.alive[i]);
    live.forEach((i, k) => { this.slot[i] = k; });
  }
  slotPos(sq, k) {
    const o = sq.order, st = STATS[sq.type], cols = o.cols, rows = Math.ceil(Math.max(1, sq.alive) / cols);
    const c = k % cols, r = Math.floor(k / cols);
    const lx = (c - (cols - 1) / 2) * st.spacing, lz = (r - (rows - 1) / 2) * st.spacing;
    // 右手方向 = (−fz, fx)；往後 = −f
    return { x: o.x + -o.fz * lx - o.fx * lz, z: o.z + o.fx * lx - o.fz * lz };
  }

  // ---------------------------------------------------------------- 空間格子
  cellOf(x, z) { const cx = Math.floor((x + GOX) / CELL), cz = Math.floor((z + GOZ) / CELL); return cx < 0 || cz < 0 || cx >= GW || cz >= GH ? -1 : cz * GW + cx; }
  buildGrid() {
    this.head.fill(-1);
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      const c = this.cellOf(this.x[i], this.z[i]); if (c < 0) continue;
      this.next[i] = this.head[c]; this.head[c] = i;
    }
  }
  // 半徑 R 內最近的敵人
  nearestEnemy(i, R) {
    const x = this.x[i], z = this.z[i], tm = this.team[i];
    const cx = Math.floor((x + GOX) / CELL), cz = Math.floor((z + GOZ) / CELL), rc = Math.ceil(R / CELL);
    let best = -1, bd = R * R;
    // 由近到遠一圈一圈找，找到後再多找一圈就停
    let found = -1;
    for (let ring = 0; ring <= rc; ring++) {
      if (found >= 0 && ring > found + 1) break;
      for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const gx = cx + dx, gz = cz + dz; if (gx < 0 || gz < 0 || gx >= GW || gz >= GH) continue;
        for (let j = this.head[gz * GW + gx]; j >= 0; j = this.next[j]) {
          if (this.team[j] === tm) continue;
          const d = (this.x[j] - x) ** 2 + (this.z[j] - z) ** 2;
          if (d < bd) { bd = d; best = j; if (found < 0) found = ring; }
        }
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- 每一格
  step(dt) {
    this.t += dt;
    this.buildGrid();
    const ter = this.ter;
    // 每隊：中心、剩幾人；電腦的隊伍下命令
    for (const sq of this.squads) {
      let sx = 0, sz = 0, c = 0;
      for (const i of sq.units) if (this.alive[i]) { sx += this.x[i]; sz += this.z[i]; c++; }
      sq.alive = c; if (c) { sq.cx = sx / c; sq.cz = sz / c; }
    }
    for (const sq of this.squads) {
      if (sq.order && sq.order.move && (Math.hypot(sq.cx - sq.order.x, sq.cz - sq.order.z) < 4 || this.t - sq.order.t > 40)) sq.order.move = false;
      if (sq.alive) this.think(sq, dt);
    }

    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) { if (this.death[i] < 2.2) this.death[i] += dt * (this.death[i] < 1 ? 1.6 : 0.12); continue; }
      const sq = this.squads[this.squad[i]], st = STATS[this.type[i]], ty = this.type[i];
      this.atk[i] = Math.max(0, this.atk[i] - dt * 2.2);
      if (ty === T.CAV) this.shotCd[i] -= dt;
      // 找敵人（每 0.3 秒一次，錯開）
      this.rt[i] -= dt;
      let look = st.look;
      if (sq.mode === 'charge') look = Math.max(look, 22);
      if (ty === T.ARCHER && this.y[i] > 2) look *= 1.25;   // 站在山丘上射得比較遠
      if (this.rt[i] <= 0) { this.rt[i] = 0.3; this.tgt[i] = this.nearestEnemy(i, look); }
      let t = this.tgt[i]; if (t >= 0 && !this.alive[t]) { t = this.tgt[i] = -1; this.rt[i] = 0; }
      // 要往哪裡走
      let gx, gz, stop = false, face = null;
      const s = this.slotPos(sq, this.slot[i]);
      // 移動命令還沒走到：只理會貼在身上的敵人
      if (sq.order.move && t >= 0 && (this.x[t] - this.x[i]) ** 2 + (this.z[t] - this.z[i]) ** 2 > 9) t = -1;
      if (t >= 0) {
        const dx = this.x[t] - this.x[i], dz = this.z[t] - this.z[i], d = Math.hypot(dx, dz);
        face = Math.atan2(dx, dz);
        if (ty === T.ARCHER && d > 4) {
          // 弓箭手：在射程內就停下來射
          stop = true;
          this.shotCd[i] -= dt;
          if (this.shotCd[i] <= 0) { this.shoot(i, t, d); this.shotCd[i] = st.shootCd * (0.8 + Math.random() * 0.4); this.atk[i] = 1; }
          gx = this.x[i]; gz = this.z[i];
        } else if (d <= st.range + 0.4) {
          stop = true; gx = this.x[i]; gz = this.z[i];
          this.cd[i] -= dt;
          if (this.cd[i] <= 0) {
            const sp = Math.hypot(this.vx[i], this.vz[i]);
            let dmg = st.dmg * (0.8 + Math.random() * 0.4);
            const tt = this.type[t];
            if (ty === T.CAV && sp > 4.5 && this.shotCd[i] <= 0) {
              this.shotCd[i] = 5;
              if (tt === T.SPEAR) this.hurt(i, 30 * (0.8 + Math.random() * 0.4));   // 衝進槍陣：自己被槍尖刺到，衝鋒也沒用
              else dmg *= 2.5;   // 騎兵衝鋒：第一下特別痛，之後要跑開再衝才有
            }
            if (ty === T.SPEAR && tt === T.CAV) dmg *= 3;   // 長槍剋騎兵
            this.hurt(t, dmg, i);
            this.cd[i] = st.cd * (0.85 + Math.random() * 0.3); this.atk[i] = 1; this.events.clash++;
          }
        } else { gx = this.x[t]; gz = this.z[t]; }
      } else { gx = s.x; gz = s.z; }
      // 速度
      let dx = gx - this.x[i], dz = gz - this.z[i]; const dist = Math.hypot(dx, dz);
      let speed = st.speed * ter.speedAt(this.x[i], this.z[i]);
      if (t < 0 && sq.mode !== 'charge') speed *= Math.min(1, dist / 1.5 + 0.15);   // 快到位置就放慢
      let wx = 0, wz = 0;
      if (!stop && dist > 0.15) { wx = dx / dist * speed; wz = dz / dist * speed; }
      // 閃開旁邊的人
      const cx = Math.floor((this.x[i] + GOX) / CELL), cz = Math.floor((this.z[i] + GOZ) / CELL);
      const rad = ty === T.CAV ? 1.35 : 0.75;
      for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
        const gxx = cx + ox, gzz = cz + oz; if (gxx < 0 || gzz < 0 || gxx >= GW || gzz >= GH) continue;
        for (let j = this.head[gzz * GW + gxx]; j >= 0; j = this.next[j]) {
          if (j === i) continue;
          const ex = this.x[i] - this.x[j], ez = this.z[i] - this.z[j], d2 = ex * ex + ez * ez;
          const rr = rad + (this.type[j] === T.CAV ? 1.35 : 0.75);
          if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d * 6; wx += ex * k; wz += ez * k; }
        }
      }
      const acc = ty === T.CAV ? 4 : 8;
      this.vx[i] += (wx - this.vx[i]) * Math.min(1, dt * acc); this.vz[i] += (wz - this.vz[i]) * Math.min(1, dt * acc);
      this.x[i] = Math.max(-118, Math.min(118, this.x[i] + this.vx[i] * dt)); this.z[i] = Math.max(-78, Math.min(78, this.z[i] + this.vz[i] * dt));
      this.y[i] = ter.height(this.x[i], this.z[i]);
      // 朝向
      const sp = Math.hypot(this.vx[i], this.vz[i]);
      let want = face ?? (sp > 0.4 ? Math.atan2(this.vx[i], this.vz[i]) : Math.atan2(sq.order.fx, sq.order.fz));
      let dh = want - this.hd[i]; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      this.hd[i] += dh * Math.min(1, dt * 6);
      this.ph[i] += dt * sp * (ty === T.CAV ? 1.6 : 2.8);
    }
    this.stepArrows(dt);
  }

  hurt(t, dmg) {
    if (!this.alive[t]) return;
    this.hp[t] -= dmg;
    if (this.hp[t] <= 0) { this.alive[t] = 0; this.death[t] = 0.001; this.events.deaths[this.team[t]]++; }
  }

  // ---------------------------------------------------------------- 弓箭
  shoot(i, t, d) {
    // 預測目標位置，算出拋物線的初速度
    const T0 = Math.max(0.8, d / 24);
    const px = this.x[t] + this.vx[t] * T0 + (Math.random() - 0.5) * (1 + d * 0.05), pz = this.z[t] + this.vz[t] * T0 + (Math.random() - 0.5) * (1 + d * 0.05);
    const py = this.ter.height(px, pz) + 0.9;
    const sx = this.x[i], sy = this.y[i] + 1.5, sz = this.z[i];
    this.arrows.push({ x: sx, y: sy, z: sz, vx: (px - sx) / T0, vy: (py - sy + 0.5 * G * T0 * T0) / T0, vz: (pz - sz) / T0, team: this.team[i], stuck: 0, life: 0 });
    this.events.volley++;
  }
  stepArrows(dt) {
    const keep = [];
    for (const a of this.arrows) {
      if (a.stuck) { a.stuck += dt; if (a.stuck < 4) keep.push(a); continue; }
      a.life += dt;
      a.vy -= G * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
      // 打到人：箭的位置附近（身高範圍內）有敵人
      if (a.vy < 0 && a.y < this.ter.height(a.x, a.z) + 2) {
        const c = this.cellOf(a.x, a.z);
        let hit = -1;
        if (c >= 0) {
          const cx = c % GW, cz = (c / GW) | 0;
          for (let oz = -1; oz <= 1 && hit < 0; oz++) for (let ox = -1; ox <= 1 && hit < 0; ox++) {
            const gx = cx + ox, gz = cz + oz; if (gx < 0 || gz < 0 || gx >= GW || gz >= GH) continue;
            for (let j = this.head[gz * GW + gx]; j >= 0; j = this.next[j]) {
              if (this.team[j] === a.team || !this.alive[j]) continue;
              if ((this.x[j] - a.x) ** 2 + (this.z[j] - a.z) ** 2 < 0.55 && a.y < this.y[j] + 2 && a.y > this.y[j]) { hit = j; break; }
            }
          }
        }
        if (hit >= 0) {
          let dmg = STATS[T.ARCHER].shoot * (0.8 + Math.random() * 0.4);
          if (this.type[hit] === T.SWORD) dmg *= 0.5;                 // 盾牌擋掉一部分的箭
          if (this.ter.forestAt(this.x[hit], this.z[hit])) dmg *= 0.5;   // 樹林擋箭
          this.hurt(hit, dmg);
          continue;   // 射中的箭就消失
        }
      }
      if (a.y < this.ter.height(a.x, a.z)) { a.stuck = 0.001; a.y = this.ter.height(a.x, a.z) + 0.1; }
      if (a.life < 8) keep.push(a);
    }
    this.arrows = keep;
  }

  // ---------------------------------------------------------------- 隊伍的大腦
  nearestSquad(sq, team) {
    let best = null, bd = Infinity;
    for (const o of this.squads) { if (o.team !== team || !o.alive) continue; const d = (o.cx - sq.cx) ** 2 + (o.cz - sq.cz) ** 2; if (d < bd) { bd = d; best = o; } }
    return best ? { sq: best, d: Math.sqrt(bd) } : null;
  }
  think(sq, dt) {
    sq.thinkT = (sq.thinkT || 0) - dt;
    if (sq.thinkT > 0) return;
    sq.thinkT = 0.5;
    const enemy = this.nearestSquad(sq, 1 - sq.team);
    if (!enemy) return;
    const e = enemy.sq, d = enemy.d;
    sq.engaged = d < 18;
    if (sq.mode === 'charge') {
      // 衝鋒：一直往最近的敵隊走
      this.orderSquad(sq, e.cx, e.cz, e.cx - sq.cx, e.cz - sq.cz, sq.order.cols * STATS[sq.type].spacing);
      return;
    }
    if (sq.team === 0) return;   // 玩家的隊伍只照命令
    // 電腦
    const b = sq.behavior;
    if (b === 'hold') { if (d < (sq.type === T.ARCHER ? 30 : 26)) sq.mode = 'charge'; return; }
    if (b === 'wait') { if (this.t > (sq.waitT || 20)) sq.mode = 'charge'; return; }
    if (b === 'advance') { sq.mode = 'charge'; return; }
    if (b === 'flank') {
      // 騎兵：先繞到側邊，再衝弓箭手（沒有弓箭手就衝最近的）
      const archers = this.squads.filter((o) => o.team !== sq.team && o.alive && o.type === T.ARCHER);
      const tgt = archers[0] || e;
      if (!sq.flankDone) {
        const side = sq.cx < 0 ? -1 : 1;
        const fx = tgt.cx + side * 38, fz = tgt.cz;
        if (Math.hypot(sq.cx - fx, sq.cz - fz) < 10 || this.t > 30) sq.flankDone = true;
        else this.orderSquad(sq, fx, fz, tgt.cx - fx, tgt.cz - fz);
      } else this.orderSquad(sq, tgt.cx, tgt.cz, tgt.cx - sq.cx, tgt.cz - sq.cz);
    }
  }

  count(team) { let c = 0; for (const sq of this.squads) if (sq.team === team) c += sq.alive; return c; }
}
