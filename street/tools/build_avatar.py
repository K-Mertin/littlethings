#!/usr/bin/env python3
"""Build the MW 大街 player avatars (rigged + animated glb) from MakeHuman CC0 data
and CMU motion capture.

Usage: python3 build_avatar.py <makehuman/data> <system assets dir> <cmu dir> <out dir>

Output: avatar-boy.glb, avatar-girl.glb  (meters, Y up, facing +Z, in-place clips:
idle / walk / run; clip speeds stored in scene.extras.speeds)
"""
import sys, os, re, json, struct, io, math
import numpy as np
from PIL import Image

MH, ASSETS, CMU, OUT = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)

# ============================================================ helpers: obj / target / mhclo
def read_base():
    V, VT, F = [], [], []
    g = None
    for l in open(os.path.join(MH, '3dobjs/base.obj')):
        if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('vt '): VT.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('g '): g = l.split()[1]
        elif l.startswith('f '):
            F.append((g, [tuple(int(a) - 1 for a in p.split('/')[:2]) for p in l.split()[1:]]))
    return np.array(V), np.array(VT), F

def read_target(rel, n):
    d = np.zeros((n, 3))
    for l in open(os.path.join(MH, 'targets', rel)):
        s = l.split()
        if not s or s[0].startswith('#'): continue
        d[int(s[0])] = [float(x) for x in s[1:4]]
    return d

def read_obj(path):
    pv, pt, pf = [], [], []
    for l in open(path):
        if l.startswith('v '): pv.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('vt '): pt.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('f '):
            pf.append([tuple(int(a) - 1 if a else -1 for a in (p.split('/') + [''])[:2]) for p in l.split()[1:]])
    return np.array(pv), np.array(pt) if pt else np.zeros((0, 2)), pf

def read_mhclo(path):
    meta, refs, dele, mode = {}, [], [], None
    for l in open(path).read().splitlines():
        s = l.strip()
        if not s or s.startswith('#'): continue
        parts = s.split()
        if mode == 'verts' and re.match(r'^-?\d', parts[0]):
            if len(parts) == 1: refs.append(([int(parts[0])] * 3, [1, 0, 0], [0, 0, 0]))
            else: refs.append(([int(x) for x in parts[:3]], [float(x) for x in parts[3:6]], [float(x) for x in parts[6:9]]))
            continue
        if mode == 'del' and re.match(r'^\d', parts[0]):
            i = 0
            while i < len(parts):
                if i + 2 < len(parts) and parts[i + 1] == '-':
                    dele += list(range(int(parts[i]), int(parts[i + 2]) + 1)); i += 3
                else: dele.append(int(parts[i])); i += 1
            continue
        k = parts[0]
        if k == 'verts': mode = 'verts'; continue
        if k == 'delete_verts': mode = 'del'; continue

        meta.setdefault(k, s[len(k):].strip())
    return meta, refs, dele

def parse_mhmat(path):
    m = {}
    if not os.path.exists(path): return m
    for l in open(path):
        s = l.strip()
        if not s or s.startswith('#'): continue
        k = s.split()[0]; m[k] = s[len(k):].strip()
    return m

# ============================================================ quaternion / rotation helpers
def rx(a): c, s = math.cos(a), math.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def ry(a): c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rz(a): c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def axis_angle(ax, a):
    ax = np.asarray(ax, float); ax = ax / np.linalg.norm(ax)
    K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]])
    return np.eye(3) + math.sin(a) * K + (1 - math.cos(a)) * K @ K
def arc(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v = np.cross(a, b); c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-9: return np.eye(3)
    return axis_angle(v, math.atan2(np.linalg.norm(v), c))
def m2q(m):
    t = np.trace(m)
    if t > 0:
        s = math.sqrt(t + 1) * 2; w = .25 * s
        x = (m[2, 1] - m[1, 2]) / s; y = (m[0, 2] - m[2, 0]) / s; z = (m[1, 0] - m[0, 1]) / s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        w = (m[2, 1] - m[1, 2]) / s; x = .25 * s; y = (m[0, 1] + m[1, 0]) / s; z = (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        w = (m[0, 2] - m[2, 0]) / s; x = (m[0, 1] + m[1, 0]) / s; y = .25 * s; z = (m[1, 2] + m[2, 1]) / s
    else:
        s = math.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        w = (m[1, 0] - m[0, 1]) / s; x = (m[0, 2] + m[2, 0]) / s; y = (m[1, 2] + m[2, 1]) / s; z = .25 * s
    q = np.array([x, y, z, w]); return q / np.linalg.norm(q)
def q2m(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
def m2qm(q): return q2m(q)
def slerp(a, b, t):
    d = np.dot(a, b)
    if d < 0: b = -b; d = -d
    if d > .9995: r = a + t * (b - a); return r / np.linalg.norm(r)
    th = math.acos(d); return (math.sin((1 - t) * th) * a + math.sin(t * th) * b) / math.sin(th)

# ============================================================ CMU ASF/AMC
def read_asf(path):
    bones, hier, cur, sec = {}, {}, None, None
    root_axis = 'XYZ'
    for l in open(path):
        s = l.strip()
        if not s or s.startswith('#'): continue
        if s.startswith(':'):
            sec = s.split()[0][1:]; continue
        if sec == 'bonedata':
            p = s.split()
            if p[0] == 'begin': cur = {'dof': []}
            elif p[0] == 'end': bones[cur['name']] = cur
            elif p[0] == 'name': cur['name'] = p[1]
            elif p[0] == 'direction': cur['dir'] = np.array([float(x) for x in p[1:4]])
            elif p[0] == 'length': cur['len'] = float(p[1])
            elif p[0] == 'axis': cur['axis'] = [math.radians(float(x)) for x in p[1:4]]
            elif p[0] == 'dof': cur['dof'] = p[1:]
        elif sec == 'hierarchy':
            p = s.split()
            if p[0] in ('begin', 'end'): continue
            for c in p[1:]: hier[c] = p[0]
    for b in bones.values():
        a = b['axis']; b['C'] = rz(a[2]) @ ry(a[1]) @ rx(a[0])
    return bones, hier

def read_amc(path):
    frames, cur = [], None
    for l in open(path):
        s = l.strip()
        if not s or s.startswith('#') or s.startswith(':'): continue
        p = s.split()
        if p[0].isdigit() and len(p) == 1:
            cur = {}; frames.append(cur); continue
        cur[p[0]] = [float(x) for x in p[1:]]
    return frames

def cmu_fk(bones, hier, fr):
    """world rotation matrices + joint end positions for one frame"""
    order = []
    def visit(n):
        order.append(n)
        for c, p in hier.items():
            if p == n: visit(c)
    visit('root')
    R, P = {}, {}
    rv = fr['root']
    R['root'] = rz(math.radians(rv[5])) @ ry(math.radians(rv[4])) @ rx(math.radians(rv[3]))
    P['root'] = np.array(rv[:3])
    for n in order[1:]:
        b = bones[n]; par = hier[n]
        vals = fr.get(n, [])
        ang = {'rx': 0, 'ry': 0, 'rz': 0}
        for d, v in zip(b['dof'], vals): ang[d] = math.radians(v)
        M = rz(ang['rz']) @ ry(ang['ry']) @ rx(ang['rx'])
        R[n] = R[par] @ b['C'] @ M @ b['C'].T
        P[n] = P[par] + b['len'] * (R[n] @ b['dir'])
    return R, P

# ============================================================ skeleton (simplified from MakeHuman default)
SK = json.load(open(os.path.join(MH, 'rigs/default.mhskel')))
WTS = json.load(open(os.path.join(MH, 'rigs/default_weights.mhw')))['weights']
SIDES = ['L', 'R']
KEEP = ['root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'head']
for s in SIDES:
    KEEP += [f'clavicle.{s}', f'upperarm01.{s}', f'lowerarm01.{s}', f'wrist.{s}']
    for f in range(1, 6):
        KEEP += [f'finger{f}-{k}.{s}' for k in (1, 2, 3)]
    KEEP += [f'upperleg01.{s}', f'lowerleg01.{s}', f'foot.{s}']
B = SK['bones']
def kept_of(n):
    while n not in KEEP: n = B[n]['parent']
    return n
PARENT = {}
for n in KEEP:
    if n == 'root': PARENT[n] = None; continue
    PARENT[n] = kept_of(B[n]['parent'])
NAMES = {'root': 'Hips', 'spine05': 'Spine0', 'spine04': 'Spine1', 'spine03': 'Spine2', 'spine02': 'Chest',
         'spine01': 'UpperChest', 'neck01': 'Neck', 'head': 'Head'}
def nice(n):
    if n in NAMES: return NAMES[n]
    base, s = n.split('.')
    m = {'clavicle': 'Shoulder', 'upperarm01': 'UpperArm', 'lowerarm01': 'LowerArm', 'wrist': 'Hand',
         'upperleg01': 'UpperLeg', 'lowerleg01': 'LowerLeg', 'foot': 'Foot'}
    if base in m: return m[base] + s
    mm = re.match(r'finger(\d)-(\d)', base)
    return f'Finger{mm.group(1)}_{mm.group(2)}{s}'

# end point used as the "aim" of a bone (for retarget alignment)
def tail_joint(n):
    s = n.split('.')[-1] if '.' in n else ''
    t = {'upperarm01': f'lowerarm01.{s}____head', 'lowerarm01': f'wrist.{s}____head', 'clavicle': f'upperarm01.{s}____head',
         'wrist': f'finger3-1.{s}____head', 'upperleg01': f'lowerleg01.{s}____head', 'lowerleg01': f'foot.{s}____head',
         'foot': f'foot.{s}____tail'}
    return t.get(n.split('.')[0], n + '____tail')

CMUMAP = {'root': 'root', 'spine05': 'lowerback', 'spine04': 'lowerback', 'spine03': 'upperback', 'spine02': 'thorax',
          'spine01': 'thorax', 'neck01': 'lowerneck', 'head': 'head'}
for s, c in (('L', 'l'), ('R', 'r')):
    CMUMAP.update({f'clavicle.{s}': c + 'clavicle', f'upperarm01.{s}': c + 'humerus', f'lowerarm01.{s}': c + 'radius',
                   f'wrist.{s}': c + 'hand', f'upperleg01.{s}': c + 'femur', f'lowerleg01.{s}': c + 'tibia',
                   f'foot.{s}': c + 'foot'})
ALIGN = {k for k in CMUMAP if k.split('.')[0] in ('clavicle', 'upperarm01', 'lowerarm01', 'wrist', 'upperleg01', 'lowerleg01', 'foot')}

# ============================================================ build one avatar
V0, VT, F = read_base()
NV = len(V0)
SCALE = 0.1  # dm -> m

def build(cfg):
    V = V0.copy()
    for rel, w in cfg['targets']:
        V += w * read_target(rel, NV)
    J = {k: V[idx].mean(0) for k, idx in SK['joints'].items()}
    head = {n: J[n + '____head'] for n in KEEP}
    aim = {n: J[tail_joint(n)] - head[n] for n in KEEP}

    # ---------- per-vertex weights mapped to kept bones
    bw = [dict() for _ in range(NV)]
    for bn, lst in WTS.items():
        k = KEEP.index(kept_of(bn))
        for vi, w in lst:
            bw[vi][k] = bw[vi].get(k, 0) + w
    def top4(d):
        it = sorted(d.items(), key=lambda x: -x[1])[:4]
        s = sum(w for _, w in it) or 1
        j = [i for i, _ in it] + [0] * (4 - len(it)); w = [w / s for _, w in it] + [0] * (4 - len(it))
        return j, w

    prims = []  # dict(name, pos, nrm?, uv, tri, joints, weights, material)
    deleted = set()

    # ---------- proxies
    def proxy(path, matkey, kind):
        meta, refs, dele = read_mhclo(path)
        deleted.update(dele)
        pdir = os.path.dirname(path)
        pv, pt, pf = read_obj(os.path.join(pdir, meta['obj_file']))
        sc = []
        for ax_i, ax in enumerate(('x_scale', 'y_scale', 'z_scale')):
            if ax in meta:
                a, b, d = meta[ax].split(); sc.append(abs(V[int(a), ax_i] - V[int(b), ax_i]) / float(d))
            else: sc.append(1.0)
        sc = np.array(sc)
        ri = np.array([r[0] for r in refs]); rw = np.array([r[1] for r in refs]); ro = np.array([r[2] for r in refs])
        pos = (V[ri] * rw[..., None]).sum(1) + ro * sc
        # weights
        J4, W4 = [], []
        for r in refs:
            d = {}
            for vi, w in zip(r[0], r[1]):
                for k, x in bw[vi].items(): d[k] = d.get(k, 0) + w * x
            j, w = top4(d); J4.append(j); W4.append(w)
        J4, W4 = np.array(J4), np.array(W4)
        rk, rs, ru, tri = {}, [], [], []
        for f in pf:
            if kind == 'eyes' and all(ti >= 0 and pt[ti][0] > .85 and pt[ti][1] < .15 for _, ti in f): continue  # cornea shell
            ids = []
            for (vi, ti) in f:
                uv = tuple(pt[ti]) if ti >= 0 and len(pt) else (0, 0)
                key = (vi, round(uv[0], 6), round(uv[1], 6))
                if key not in rk: rk[key] = len(rs); rs.append(vi); ru.append(uv)
                ids.append(rk[key])
            for k in range(1, len(ids) - 1): tri += [ids[0], ids[k], ids[k + 1]]
        rs = np.array(rs)
        mat = parse_mhmat(os.path.normpath(os.path.join(pdir, meta['material']))) if 'material' in meta else {}
        prims.append({'name': kind, 'pos': pos[rs], 'uv': np.array(ru), 'tri': np.array(tri),
                      'j': J4[rs], 'w': W4[rs], 'mat': matkey, 'mhmat': mat, 'dir': os.path.dirname(os.path.normpath(os.path.join(pdir, meta.get('material', '')))),
                      'src': rs})

    proxy(os.path.join(ASSETS, 'eyes/high-poly/high-poly.mhclo'), 'eyes', 'eyes')
    proxy(os.path.join(ASSETS, 'eyebrows', cfg['brow'], cfg['brow'] + '.mhclo'), 'brow', 'brows')
    proxy(os.path.join(ASSETS, 'eyelashes', cfg['lash'], cfg['lash'] + '.mhclo'), 'lash', 'lashes')
    proxy(os.path.join(ASSETS, 'hair', cfg['hair'], cfg['hair'] + '.mhclo'), 'hair', 'hair')
    for c in cfg['clothes']:
        proxy(os.path.join(ASSETS, 'clothes', c, c + '.mhclo'), 'cloth:' + c, 'cloth')

    # ---------- body (body group, minus verts hidden by clothes)
    faces = [f[1] for f in F if f[0] == 'body' and not any(p[0] in deleted for p in f[1])]
    rk, rs, ru, tri = {}, [], [], []
    for f in faces:
        ids = []
        for vi, ti in f:
            key = (vi, ti)
            if key not in rk: rk[key] = len(rs); rs.append(vi); ru.append(VT[ti])
            ids.append(rk[key])
        tri += [ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]] if len(ids) == 4 else ids
    rs = np.array(rs)
    J4 = np.array([top4(bw[v])[0] for v in rs]); W4 = np.array([top4(bw[v])[1] for v in rs])
    prims.insert(0, {'name': 'body', 'pos': V[rs], 'uv': np.array(ru), 'tri': np.array(tri), 'j': J4, 'w': W4,
                     'mat': 'skin', 'src': rs})

    # ---------- smooth normals (shared by source vertex so uv seams don't crease)
    for p in prims:
        P = p['pos']; T = p['tri'].reshape(-1, 3)
        fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
        acc = np.zeros((p['src'].max() + 1, 3))
        for k in range(3): np.add.at(acc, p['src'][T[:, k]], fn)
        n = acc[p['src']]; n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        p['nrm'] = n

    # ground: lowest point (shoe soles) to y = 0
    ymin = min(p['pos'][:, 1].min() for p in prims)
    off = np.array([0, -ymin, 0])
    for p in prims: p['pos'] = (p['pos'] + off) * SCALE
    for n in KEEP: head[n] = (head[n] + off) * SCALE; aim[n] = aim[n] * SCALE

    anims = make_anims(head, aim)
    write_glb(cfg, prims, head, anims)

import os as _os
TWIST = float(_os.environ.get('TWIST', '-0.9'))
# ============================================================ animation retarget
def make_anims(head, aim):
    bones, hier = read_asf(os.path.join(CMU, '35.asf'))
    # rest (zero) pose positions for scale: hip height
    zero = {'root': [0] * 6}
    R0, P0 = cmu_fk(bones, hier, zero)
    cmu_leg = np.linalg.norm(P0['lfemur'] - P0['lhipjoint']) + np.linalg.norm(P0['ltibia'] - P0['lfemur'])
    mh_leg = np.linalg.norm(head['lowerleg01.L'] - head['upperleg01.L']) + np.linalg.norm(head['foot.L'] - head['lowerleg01.L'])
    k = mh_leg / cmu_leg
    Q = {}
    for n in ALIGN:
        Q[n] = arc(aim[n], bones[CMUMAP[n]]['dir'])
    out = {}
    for clip, fn, rng in (('walk', '35_01.amc', None), ('run', '35_17.amc', None)):
        frames = read_amc(os.path.join(CMU, fn))
        W, ROOT = [], []
        for fr in frames:
            R, P = cmu_fk(bones, hier, fr)
            w = {}
            for n in KEEP:
                if n in CMUMAP:
                    w[n] = R[CMUMAP[n]] @ Q[n] if n in Q else R[CMUMAP[n]]
            for s_, sg in (('L', 1), ('R', -1)):
                ch = w['spine01']
                # clavicle: follow the chest with only a little of the captured shrug
                loc = ch.T @ R['lclavicle' if s_ == 'L' else 'rclavicle']
                w[f'clavicle.{s_}'] = ch @ m2qm(slerp(np.array([0, 0, 0, 1.0]), m2q(loc), .35))
                # arms a little closer to the body than the CMU subject
                add = ch @ rz(-sg * .13) @ ch.T
                w[f'upperarm01.{s_}'] = add @ w[f'upperarm01.{s_}']
                w[f'lowerarm01.{s_}'] = add @ w[f'lowerarm01.{s_}']
                # hands: CMU hand data is noisy; keep the hand in line with the forearm
                w[f'wrist.{s_}'] = w[f'lowerarm01.{s_}']
            # head: soften the captured head/neck motion (subject looks down a lot)
            for n_, p_ in (('neck01', 'spine01'), ('head', 'neck01')):
                loc = w[p_].T @ w[n_]
                w[n_] = w[p_] @ m2qm(slerp(np.array([0, 0, 0, 1.0]), m2q(loc), .35))
            W.append(w); ROOT.append(P['root'])
        ROOT = np.array(ROOT)
        # heading: rotate so the subject walks along +Z
        disp = ROOT[-1] - ROOT[0]
        yaw = math.atan2(disp[0], disp[2])
        Y = ry(-yaw)
        W = [{n: Y @ m for n, m in w.items()} for w in W]
        ROOT = (Y @ ROOT.T).T
        # locals
        L = []
        for w in W:
            l = {}
            for n in KEEP:
                if n not in w: continue
                p = PARENT[n]
                while p is not None and p not in w: p = PARENT[p]
                l[n] = (w[p].T @ w[n]) if p else w[n]
            L.append(l)
        feat = np.array([np.concatenate([m2q(l[n]) * (1 if m2q(l[n])[3] >= 0 else -1) for n in sorted(l)]) for l in L])
        fps = 120
        # find the best loop: start i, period p
        best = None
        lo, hi = (int(.8 * fps), int(1.5 * fps)) if clip == 'walk' else (int(.45 * fps), int(.9 * fps))
        for i in range(10, len(L) - hi - 1, 4):
            for p in range(lo, hi):
                d = np.linalg.norm(feat[i] - feat[i + p]) + np.linalg.norm(feat[i + 2] - feat[i + p + 2])
                if best is None or d < best[0]: best = (d, i, p)
        _, i0, per = best
        dur = per / fps
        speed = np.linalg.norm((ROOT[i0 + per] - ROOT[i0])[[0, 2]]) * k / dur
        nf = int(round(dur * 30))
        times = np.arange(nf + 1) / 30.0
        tracks = {n: [] for n in KEEP if n in L[0]}
        rooty = []
        for t in times:
            x = i0 + t * fps; a = int(math.floor(x)); b = min(a + 1, len(L) - 1); f = x - a
            for n in tracks:
                qa, qb = m2q(L[a][n]), m2q(L[b][n])
                tracks[n].append(slerp(qa, qb, f))
            rooty.append(ROOT[a][1] * (1 - f) + ROOT[b][1] * f)
        # make the loop seamless: blend end into start over the last few frames
        for n in tracks:
            tr = tracks[n]; q0 = tr[0]
            m = len(tr) - 1
            for j in range(max(0, m - 5), m + 1):
                tt = (j - (m - 5)) / 5.0
                tr[j] = slerp(tr[j], q0, tt)
        rooty = np.array(rooty) * k
        rooty[-1] = rooty[0]
        out[clip] = {'times': times, 'tracks': tracks, 'rooty': rooty, 'speed': speed}
        print(clip, 'frames', len(frames), 'loop start', i0, 'period', per, 'dur', round(dur, 3), 'speed m/s', round(speed, 2))
    # ground the clips: lowest ankle over the cycle sits at the rest ankle height
    for clip, a in out.items():
        ys = []
        for fi in range(len(a['times'])):
            Wd = {}
            pos = {}
            for n in KEEP:
                p = PARENT[n]
                l = q2m(a['tracks'][n][fi]) if n in a['tracks'] else np.eye(3)
                if p is None:
                    Wd[n] = l; pos[n] = np.array([0, a['rooty'][fi], 0])
                else:
                    Wd[n] = Wd[p] @ l; pos[n] = pos[p] + Wd[p] @ (head[n] - head[p])
            # lowest point of both feet: ankle and toe tip
            yy = []
            for s in SIDES:
                yy.append(pos[f'foot.{s}'][1]); yy.append((pos[f'foot.{s}'] + Wd[f'foot.{s}'] @ aim[f'foot.{s}'])[1])
            ys.append(min(yy))
        rest_low = min(head['foot.L'][1], (head['foot.L'] + aim['foot.L'])[1])
        shift = rest_low - min(ys)
        a['rooty'] = a['rooty'] + shift
    # idle: hand-made from the rest pose (arms lowered to the sides, gentle breathing)
    T = 4.0; times = np.arange(int(T * 30) + 1) / 30.0
    tracks = {n: [] for n in KEEP}; rooty = []
    for t in times:
        ph = 2 * math.pi * t / T
        w = {n: np.eye(3) for n in KEEP}
        w['root'] = rz(0.012 * math.sin(ph)) @ ry(0.02 * math.sin(ph))
        for n in ('spine05', 'spine04', 'spine03', 'spine02', 'spine01'): w[n] = w['root'] @ rx(-0.01 * math.sin(2 * ph))
        w['neck01'] = w['spine01'] @ rx(0.02)
        w['head'] = w['neck01'] @ ry(0.04 * math.sin(ph * .5)) @ rx(.03)
        for s, sg in (('L', 1), ('R', -1)):
            down = np.array([sg * 0.12, -1, 0.03])
            ua = arc(aim[f'upperarm01.{s}'], down)
            w[f'clavicle.{s}'] = w['spine01'] @ rz(sg * -0.05)
            w[f'upperarm01.{s}'] = ua
            fa = arc(aim[f'lowerarm01.{s}'], np.array([sg * 0.05, -1, 0.28]))
            w[f'lowerarm01.{s}'] = fa
            w[f'wrist.{s}'] = fa
            for f in range(1, 6):
                for kk in (1, 2, 3): w[f'finger{f}-{kk}.{s}'] = w[f'wrist.{s}']
        for n in KEEP:
            p = PARENT[n]
            tracks[n].append(m2q(w[p].T @ w[n]) if p else m2q(w[n]))
        rooty.append(head['root'][1] - 0.004 * (1 - math.cos(2 * ph)))
    out['idle'] = {'times': times, 'tracks': tracks, 'rooty': np.array(rooty), 'speed': 0}
    # run: CMU 35_17 keeps the arms almost still, so drive a proper running arm swing from the legs
    a = out['run']
    nF = len(a['times'])
    def fk(fi):
        Wd = {}
        for n in KEEP:
            p = PARENT[n]
            l = q2m(a['tracks'][n][fi]) if n in a['tracks'] else np.eye(3)
            Wd[n] = l if p is None else Wd[p] @ l
        return Wd
    Ws = [fk(fi) for fi in range(nF)]
    pitch = {s: np.array([(lambda d: math.atan2(d[2], -d[1]))(Ws[fi]['root'].T @ (Ws[fi][f'upperleg01.{s}'] @ aim[f'upperleg01.{s}'])) for fi in range(nF)]) for s in SIDES}
    for s, sg, other in (('L', 1, 'R'), ('R', -1, 'L')):
        pt = pitch[other]; mid = (pt.max() + pt.min()) / 2; half = max(1e-3, (pt.max() - pt.min()) / 2)
        A0 = arc(aim[f'upperarm01.{s}'], np.array([sg * 0.18, -1, 0.0]))
        A1 = arc(aim[f'lowerarm01.{s}'], np.array([sg * 0.18, -1, 0.0]))
        for fi in range(nF):
            W = Ws[fi]; ch = W['spine01']
            sw = 0.62 * (pt[fi] - mid) / half          # + = arm forward
            el = 1.45 + 0.25 * max(0.0, (pt[fi] - mid) / half)   # elbow bends more on the forward swing
            Wu = ch @ ry(-sg * 0.08) @ rx(-sw + 0.12) @ A0
            Wl = ch @ ry(-sg * (0.32 + 0.1 * max(0.0, sw))) @ rx(-sw + 0.12 - el) @ A1 @ axis_angle(aim[f'lowerarm01.{s}'], TWIST * sg)
            Wc = W[f'clavicle.{s}']
            a['tracks'][f'upperarm01.{s}'][fi] = m2q(Wc.T @ Wu)
            a['tracks'][f'lowerarm01.{s}'][fi] = m2q(Wu.T @ Wl)
            a['tracks'][f'wrist.{s}'][fi] = m2q(rx(-0.15))
    # small torso counter-rotation so the shoulders turn against the hips
    for fi in range(nF):
        tw = 0.10 * (pitch['L'][fi] - pitch['R'][fi]) / max(1e-3, np.abs(pitch['L'] - pitch['R']).max())
        q = q2m(a['tracks']['spine02'][fi]) @ ry(tw)
        a['tracks']['spine02'][fi] = m2q(q)
    # fingers: a relaxed curl on top of every clip
    for clip, a in out.items():
        for s, sg in (('L', 1), ('R', -1)):
            for f in range(1, 6):
                for kk in (1, 2, 3):
                    n = f'finger{f}-{kk}.{s}'
                    d = aim[n] / np.linalg.norm(aim[n])
                    # curl axis: perpendicular to the finger in the horizontal-ish plane
                    ax = np.cross(d, np.array([0, 0, 1.0]))
                    ang = (0.25 if f > 1 else 0.12) * (1.2 if kk == 1 else 1.0) * (3.6 if clip == 'run' and f > 1 else 2.0 if clip == 'run' else 1.0)
                    q = m2q(axis_angle(ax, ang))
                    a['tracks'][n] = [q] * len(a['times'])
    return out

# ============================================================ GLB writer
def write_glb(cfg, prims, head, anims):
    gl = {'asset': {'version': '2.0', 'generator': 'mw-street build_avatar.py'}, 'scene': 0,
          'buffers': [], 'bufferViews': [], 'accessors': [], 'meshes': [], 'nodes': [], 'skins': [],
          'materials': [], 'textures': [], 'images': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
          'animations': [], 'extensionsUsed': ['EXT_texture_webp'], 'extensionsRequired': ['EXT_texture_webp']}
    blob = bytearray()
    def view(b, target=None):
        while len(blob) % 4: blob.append(0)
        v = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(b)}
        if target: v['target'] = target
        blob.extend(b); gl['bufferViews'].append(v); return len(gl['bufferViews']) - 1
    def acc(arr, ctype, typ, target=None, minmax=False, normalized=False):
        arr = np.ascontiguousarray(arr)
        a = {'bufferView': view(arr.tobytes(), target), 'componentType': ctype, 'count': len(arr), 'type': typ}
        if normalized: a['normalized'] = True
        if minmax:
            a['min'] = arr.reshape(len(arr), -1).min(0).tolist(); a['max'] = arr.reshape(len(arr), -1).max(0).tolist()
        gl['accessors'].append(a); return len(gl['accessors']) - 1
    texcache = {}
    def tex(path, size, alpha=False, q=86):
        key = (path, size)
        if key in texcache: return texcache[key]
        im = Image.open(path)
        im = im.convert('RGBA' if alpha else 'RGB')
        if max(im.size) > size: im = im.resize((size, size), Image.LANCZOS)
        bio = io.BytesIO(); im.save(bio, 'WEBP', quality=q, method=6)
        gl['images'].append({'bufferView': view(bio.getvalue()), 'mimeType': 'image/webp'})
        gl['textures'].append({'sampler': 0, 'extensions': {'EXT_texture_webp': {'source': len(gl['images']) - 1}}})
        texcache[key] = len(gl['textures']) - 1
        return texcache[key]
    def material(p):
        m = p['mat']
        if m == 'skin':
            d = os.path.join(ASSETS, 'skins', cfg['skin']); mm = parse_mhmat(os.path.join(d, cfg['skin'] + '.mhmat'))
            return {'name': 'skin', 'pbrMetallicRoughness': {'baseColorTexture': {'index': tex(os.path.join(d, mm['diffuseTexture']), 2048)},
                    'metallicFactor': 0, 'roughnessFactor': .62}, 'extras': {'kind': 'skin'}}
        mm = p['mhmat']; d = p['dir']
        out = {'name': m, 'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': .85}}
        alpha = m in ('brow', 'lash', 'hair')
        size = {'eyes': 512, 'brow': 512, 'lash': 512, 'hair': 1024}.get(m, 1024)
        if m == 'eyes':
            mm = parse_mhmat(os.path.join(ASSETS, 'eyes/materials', cfg['eyes'] + '.mhmat')); d = os.path.join(ASSETS, 'eyes/materials')
            out['pbrMetallicRoughness']['roughnessFactor'] = .15
        if 'diffuseTexture' in mm:
            out['pbrMetallicRoughness']['baseColorTexture'] = {'index': tex(os.path.join(d, mm['diffuseTexture']), size, alpha)}
        if 'normalmapTexture' in mm and m.startswith('cloth') and os.path.exists(os.path.join(d, mm['normalmapTexture'])):
            out['normalTexture'] = {'index': tex(os.path.join(d, mm['normalmapTexture']), 512, False, 80)}
        if alpha:
            out['alphaMode'] = 'MASK' if m != 'hair' else 'BLEND'; out['alphaCutoff'] = .35; out['doubleSided'] = True
            if m == 'hair': out['pbrMetallicRoughness']['roughnessFactor'] = .55
        if m == 'hair' and cfg.get('hairTint'):
            out['pbrMetallicRoughness']['baseColorFactor'] = cfg['hairTint'] + [1]
        out['extras'] = {'kind': m.split(':')[0]}
        return out

    # nodes: 0 = avatar root, 1 = mesh, 2.. = joints
    jn0 = 2
    gl['nodes'].append({'name': 'Avatar', 'children': [1, jn0]})
    gl['nodes'].append({'name': 'AvatarMesh', 'mesh': 0, 'skin': 0})
    for i, n in enumerate(KEEP):
        p = PARENT[n]
        t = head[n] - (head[p] if p else 0)
        node = {'name': nice(n), 'translation': [float(x) for x in t]}
        ch = [jn0 + j for j, c in enumerate(KEEP) if PARENT[c] == n]
        if ch: node['children'] = ch
        gl['nodes'].append(node)
    ibm = np.zeros((len(KEEP), 4, 4), np.float32)
    for i, n in enumerate(KEEP):
        m = np.eye(4); m[:3, 3] = -head[n]; ibm[i] = m.T  # column-major
    gl['skins'].append({'joints': [jn0 + i for i in range(len(KEEP))], 'skeleton': jn0,
                        'inverseBindMatrices': acc(ibm.reshape(len(KEEP), 16), 5126, 'MAT4')})
    mesh = {'name': 'avatar', 'primitives': []}
    for p in prims:
        gl['materials'].append(material(p))
        idx = p['tri'].astype(np.uint16 if len(p['pos']) < 65535 else np.uint32)
        mesh['primitives'].append({'attributes': {
            'POSITION': acc(p['pos'].astype(np.float32), 5126, 'VEC3', 34962, True),
            'NORMAL': acc(p['nrm'].astype(np.float32), 5126, 'VEC3', 34962),
            'TEXCOORD_0': acc(np.column_stack([p['uv'][:, 0], 1 - p['uv'][:, 1]]).astype(np.float32), 5126, 'VEC2', 34962),
            'JOINTS_0': acc(p['j'].astype(np.uint8), 5121, 'VEC4', 34962),
            'WEIGHTS_0': acc(p['w'].astype(np.float32), 5126, 'VEC4', 34962)},
            'indices': acc(idx, 5125 if idx.dtype == np.uint32 else 5123, 'SCALAR', 34963),
            'material': len(gl['materials']) - 1})
        print('  prim', p['name'], p['mat'], len(p['pos']), 'verts', len(p['tri']) // 3, 'tris')
    gl['meshes'].append(mesh)
    # animations
    speeds = {}
    for clip, a in anims.items():
        an = {'name': clip, 'samplers': [], 'channels': []}
        tacc = acc(a['times'].astype(np.float32), 5126, 'SCALAR', None, True)
        for i, n in enumerate(KEEP):
            if n not in a['tracks']: continue
            qs = np.array(a['tracks'][n], np.float32)
            for j in range(1, len(qs)):
                if np.dot(qs[j], qs[j - 1]) < 0: qs[j] = -qs[j]
            an['samplers'].append({'input': tacc, 'output': acc(qs, 5126, 'VEC4'), 'interpolation': 'LINEAR'})
            an['channels'].append({'sampler': len(an['samplers']) - 1, 'target': {'node': jn0 + i, 'path': 'rotation'}})
        tr = np.zeros((len(a['times']), 3), np.float32); tr[:, 1] = a['rooty']; tr[:, 0] = head['root'][0]; tr[:, 2] = head['root'][2]
        an['samplers'].append({'input': tacc, 'output': acc(tr, 5126, 'VEC3'), 'interpolation': 'LINEAR'})
        an['channels'].append({'sampler': len(an['samplers']) - 1, 'target': {'node': jn0, 'path': 'translation'}})
        gl['animations'].append(an)
        speeds[clip] = round(float(a['speed']), 3)
    gl['scenes'] = [{'nodes': [0], 'extras': {'speeds': speeds, 'height': float(max(p['pos'][:, 1].max() for p in prims))}}]
    while len(blob) % 4: blob.append(0)
    gl['buffers'].append({'byteLength': len(blob)})
    js = json.dumps(gl, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    path = os.path.join(OUT, f"avatar-{cfg['id']}.glb")
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    print('wrote', path, round(os.path.getsize(path) / 1e6, 2), 'MB', speeds)

# teen-ish proportions: mostly "young" with some "child"
CFGS = [
    {'id': 'boy', 'targets': [('macrodetails/universal-male-young-averagemuscle-averageweight.target', .65),
                              ('macrodetails/universal-male-child-averagemuscle-averageweight.target', .35),
                              ('macrodetails/asian-male-young.target', .65), ('macrodetails/asian-male-child.target', .35)],
     'skin': 'young_asian_male', 'hair': 'short02', 'brow': 'eyebrow001', 'lash': 'eyelashes01', 'eyes': 'brown',
     'clothes': ['male_casualsuit06', 'shoes06']},
    {'id': 'girl', 'targets': [('macrodetails/universal-female-young-averagemuscle-averageweight.target', .65),
                               ('macrodetails/universal-female-child-averagemuscle-averageweight.target', .35),
                               ('macrodetails/asian-female-young.target', .65), ('macrodetails/asian-female-child.target', .35)],
     'skin': 'young_asian_female', 'hair': 'ponytail01', 'brow': 'eyebrow010', 'lash': 'eyelashes02', 'eyes': 'brown',
     'clothes': ['female_casualsuit01', 'shoes05']},
]
only = os.environ.get('ONLY')
for c in CFGS:
    if only and c['id'] != only: continue
    build(c)
