#!/usr/bin/env python3
"""Build the realistic head data for face3d from MakeHuman CC0 assets.

Usage: python3 build.py <makehuman data dir> <system assets dir or ''> <out dir>

Produces:
  head.json  - metadata (counts, morph table, proxies, material info)
  head.bin   - binary blob (positions, subdivision map, uvs, indices, morph deltas, proxies)
  *.png/jpg  - textures copied from the assets
"""
import sys, os, re, json, glob, struct, shutil
import numpy as np
from PIL import Image

def bleed(im):
    # give transparent pixels the colour of nearby opaque ones (normalised convolution),
    # so texture filtering at card edges doesn't pull in white/black fringes
    from PIL import ImageFilter
    if im.mode != 'RGBA': return im
    a = np.asarray(im).astype(np.float32) / 255
    rgb, al = a[..., :3], a[..., 3:4]
    w = (al > .5).astype(np.float32)
    num, den = rgb * w, w.copy()
    out = rgb.copy()
    for r in (2, 6, 16, 48):
        k = lambda x: np.asarray(Image.fromarray((x * 255).astype(np.uint8).squeeze()).filter(ImageFilter.BoxBlur(r))).astype(np.float32) / 255
        bn = np.stack([k(num[..., c]) for c in range(3)], -1); bd = k(den[..., 0])[..., None]
        fill = (al < .5) & (bd > 1e-3)
        out = np.where(fill, bn / np.maximum(bd, 1e-3), out)
        den = np.where(bd > 1e-3, 1.0, den[..., :1]) if False else den
    mean = (rgb * w).sum((0, 1)) / max(w.sum(), 1)
    out = np.where((al < .5) & (out == rgb) , mean, out)
    res = np.concatenate([out, al], -1)
    return Image.fromarray((res * 255).clip(0, 255).astype(np.uint8), 'RGBA')

def webp(src, name, size):
    im = Image.open(src)
    if max(im.size) > size: im = im.resize((size, size), Image.LANCZOS)
    im = bleed(im)
    dst = name + '.webp'
    im.save(os.path.join(OUT, dst), 'WEBP', quality=85, method=6)
    return dst

MH, ASSETS, OUT = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else ''), sys.argv[3] if len(sys.argv) > 3 else 'out'
os.makedirs(OUT, exist_ok=True)
Y_CUT, X_CUT = 4.35, 2.4          # keep the bust: head, neck, shoulders, upper chest

# ---------------------------------------------------------------- base mesh
V, VT, F = [], [], []
g = None
for l in open(os.path.join(MH, '3dobjs/base.obj')):
    if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
    elif l.startswith('vt '): VT.append([float(x) for x in l.split()[1:3]])
    elif l.startswith('g '): g = l.split()[1]
    elif l.startswith('f '):
        F.append((g, [tuple(int(a) - 1 for a in p.split('/')[:2]) for p in l.split()[1:]]))
V = np.array(V, dtype=np.float64); VT = np.array(VT, dtype=np.float64)

faces = [f[1] for f in F if f[0] == 'body'
         and all(V[p[0], 1] > Y_CUT and abs(V[p[0], 0]) < X_CUT for p in f[1])]
print('bust quads', len(faces))

# ---------------------------------------------------------------- proxies (mhclo)
def read_mhclo(path):
    meta, refs, seen_verts = {}, [], False
    for l in open(path).read().splitlines():
        s = l.strip()
        if not s or s.startswith('#'): continue
        parts = s.split()
        if seen_verts and re.match(r'^-?\d', parts[0]):
            if len(parts) == 1: refs.append(([int(parts[0])] * 3, [1, 0, 0], [0, 0, 0]))
            elif len(parts) >= 9:
                refs.append(([int(x) for x in parts[:3]], [float(x) for x in parts[3:6]], [float(x) for x in parts[6:9]]))
            continue
        k = parts[0]
        if k == 'verts': seen_verts = True; continue
        if k == 'delete_verts': break
        meta.setdefault(k, s[len(k):].strip())
    return meta, refs

def read_obj(path):
    pv, pt, pf = [], [], []
    for l in open(path):
        if l.startswith('v '): pv.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('vt '): pt.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('f '):
            pf.append([tuple(int(a) - 1 if a else -1 for a in (p.split('/') + [''])[:2]) for p in l.split()[1:]])
    return np.array(pv), np.array(pt) if pt else np.zeros((0, 2)), pf

def parse_mhmat(path):
    m = {}
    if not os.path.exists(path): return m
    for l in open(path):
        s = l.strip()
        if not s or s.startswith('#'): continue
        k = s.split()[0]; m[k] = s[len(k):].strip()
    return m

proxies = []   # filled below: (kind, id, mhclo_path)
def add_proxy(kind, pid, mhclo):
    if os.path.exists(mhclo): proxies.append((kind, pid, mhclo))

add_proxy('eyes', 'high-poly', os.path.join(MH, 'eyes/high-poly/high-poly.mhclo'))
if ASSETS:
    for kind in ['eyebrows', 'eyelashes', 'hair', 'teeth', 'tongue']:
        for p in sorted(glob.glob(os.path.join(ASSETS, kind, '*', '*.mhclo'))):
            pid = os.path.basename(os.path.dirname(p))
            if kind == 'teeth' and pid != 'teeth_base': continue
            add_proxy(kind, pid, p)
    # high-poly eyes from the pack override the repo copy (same file anyway)

# ---------------------------------------------------------------- kept base verts
K = set(p[0] for f in faces for p in f)
proxy_data = []
for kind, pid, path in proxies:
    meta, refs = read_mhclo(path)
    for r in refs: K.update(r[0])
    sc = {}
    for ax in ('x_scale', 'y_scale', 'z_scale'):
        if ax in meta:
            a, b, d = meta[ax].split(); a, b = int(a), int(b); K.update([a, b]); sc[ax] = (a, b, float(d))
    proxy_data.append((kind, pid, path, meta, refs, sc))
K = sorted(K)
loc = {v: i for i, v in enumerate(K)}
nK = len(K)
print('kept base verts', nK)

# ---------------------------------------------------------------- Catmull-Clark (1 level) as a sparse linear map
quads = [[loc[p[0]] for p in f] for f in faces]
quv = [[p[1] for p in f] for f in faces]
edge_faces = {}
for fi, q in enumerate(quads):
    for k in range(4):
        e = tuple(sorted((q[k], q[(k + 1) % 4])))
        edge_faces.setdefault(e, []).append(fi)
vert_faces, vert_edges = {}, {}
for fi, q in enumerate(quads):
    for v in q: vert_faces.setdefault(v, []).append(fi)
for e in edge_faces:
    for v in e: vert_edges.setdefault(v, []).append(e)
used = sorted(vert_faces)

rows = []           # each row: dict old_local_idx -> weight
def addw(d, i, w): d[i] = d.get(i, 0) + w

face_pt = []
for q in quads:
    d = {}
    for v in q: addw(d, v, .25)
    face_pt.append(len(rows)); rows.append(d)
edge_pt = {}
for e, fs in edge_faces.items():
    d = {}
    if len(fs) == 2:
        for v in e: addw(d, v, .25)
        for fi in fs:
            for v, w in rows[face_pt[fi]].items(): addw(d, v, w * .25)
    else:
        for v in e: addw(d, v, .5)
    edge_pt[e] = len(rows); rows.append(d)
vert_pt = {}
for v in used:
    es = vert_edges[v]; fs = vert_faces[v]
    bnd = [e for e in es if len(edge_faces[e]) == 1]
    d = {}
    if bnd:  # boundary rule
        addw(d, v, .75)
        for e in bnd[:2]:
            o = e[0] if e[1] == v else e[1]; addw(d, o, .125)
    else:
        n = len(fs)
        # (F + 2R + (n-3)P)/n
        for fi in fs:
            for u, w in rows[face_pt[fi]].items(): addw(d, u, w / n / n)
        for e in es:
            for u in e: addw(d, u, .5 * 2 / n / n)
        addw(d, v, (n - 3) / n)
    vert_pt[v] = len(rows); rows.append(d)
nS = len(rows)

# subdivided faces with face-varying uvs
render_key, render_src, render_uv = {}, [], []
def rvert(si, uv):
    key = (si, round(uv[0], 6), round(uv[1], 6))
    if key not in render_key:
        render_key[key] = len(render_src); render_src.append(si); render_uv.append(uv)
    return render_key[key]
tris = []
for fi, q in enumerate(quads):
    uvs = VT[quv[fi]]
    fuv = uvs.mean(0)
    for k in range(4):
        a, b, pm = q[k], q[(k + 1) % 4], q[(k - 1) % 4]
        ea = tuple(sorted((a, b))); ep = tuple(sorted((pm, a)))
        ua, ub, up = uvs[k], uvs[(k + 1) % 4], uvs[(k - 1) % 4]
        r0 = rvert(vert_pt[a], ua)
        r1 = rvert(edge_pt[ea], (ua + ub) / 2)
        r2 = rvert(face_pt[fi], fuv)
        r3 = rvert(edge_pt[ep], (up + ua) / 2)
        tris += [r0, r1, r2, r0, r2, r3]
nR = len(render_src)
print('subdiv verts', nS, 'render verts', nR, 'tris', len(tris) // 3)

# ---------------------------------------------------------------- targets
def read_target(rel):
    p = os.path.join(MH, 'targets', rel)
    out = []
    for l in open(p):
        s = l.split()
        if not s or s[0].startswith('#'): continue
        i = int(s[0])
        if i in loc: out.append((loc[i], float(s[1]), float(s[2]), float(s[3])))
    return out

M = json.load(open(os.path.join(MH, 'modifiers/modeling_modifiers.json')))
want_groups = ['head', 'forehead', 'eyebrows', 'eyes', 'nose', 'mouth', 'ears', 'chin', 'cheek', 'neck']
targets = []   # (name, rel)
for grp in M:
    if grp['group'] not in want_groups: continue
    for m in grp['modifiers']:
        t = m['target']
        names = [t + '-' + m['min'], t + '-' + m['max']] if m.get('min') else [t]
        for n in names:
            rel = f"{grp['group']}/{n}.target"
            if os.path.exists(os.path.join(MH, 'targets', rel)): targets.append((n, rel))
for eth in ['african', 'asian', 'caucasian']:
    for gen in ['female', 'male']:
        for age in ['child', 'young', 'old']:
            targets.append((f'macro-{eth}-{gen}-{age}', f'macrodetails/{eth}-{gen}-{age}.target'))
for gen in ['female', 'male']:
    for age in ['child', 'young', 'old']:
        for wt in ['minweight', 'maxweight']:
            for mu in ['averagemuscle']:
                targets.append((f'univ-{gen}-{age}-{wt}', f'macrodetails/universal-{gen}-{age}-{mu}-{wt}.target'))
for eth in ['african', 'asian', 'caucasian']:
    for p in sorted(glob.glob(os.path.join(MH, f'targets/expression/units/{eth}/*.target'))):
        n = os.path.basename(p)[:-7]
        targets.append((f'expr-{eth}-{n}', f'expression/units/{eth}/{n}.target'))

QS = 4000.0  # int16 quantisation: 1 unit = 1/4000 dm (0.025 mm)
morph_meta, morph_idx, morph_d = [], [], []
for n, rel in targets:
    d = read_target(rel)
    if not d: continue
    arr = np.array(d)
    q = np.clip(np.round(arr[:, 1:] * QS), -32767, 32767).astype(np.int16)
    morph_meta.append({'name': n, 'off': sum(len(x) for x in morph_idx), 'n': len(d)})
    morph_idx.append(arr[:, 0].astype(np.uint16)); morph_d.append(q)
print('morphs', len(morph_meta), 'entries', sum(len(x) for x in morph_idx))

# ---------------------------------------------------------------- blob
blob = bytearray(); sect = {}
def put(name, arr):
    global blob
    while len(blob) % 4: blob += b'\0'
    b = arr.tobytes(); sect[name] = [len(blob), len(b)]; blob += b

put('base', V[K].astype(np.float32))
# subdivision map as CSR
ptr, idx, wts = [0], [], []
for d in rows:
    for i, w in d.items(): idx.append(i); wts.append(w)
    ptr.append(len(idx))
put('sPtr', np.array(ptr, np.uint32)); put('sIdx', np.array(idx, np.uint16)); put('sW', np.array(wts, np.float32))
put('rSrc', np.array(render_src, np.uint32))
put('rUV', np.array(render_uv, np.float32))
put('tri', np.array(tris, np.uint32))
put('mIdx', np.concatenate(morph_idx)); put('mD', np.concatenate(morph_d))

# mouth cavity mask: flood fill from the throat wall, stopping at the outer lip surface
adj = {}
for f in faces:
    ids = [p[0] for p in f]
    for k in range(4):
        a, b = ids[k], ids[(k + 1) % 4]
        adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
inside = lambda i: abs(V[i, 0]) < .26 and 6.4 < V[i, 1] < 6.86 and V[i, 2] < 1.47
seed = [i for i in adj if abs(V[i, 0]) < .15 and 6.5 < V[i, 1] < 6.75 and V[i, 2] < .8]
seen = set(seed); stack = list(seed)
while stack:
    i = stack.pop()
    for j in adj[i]:
        if j not in seen and inside(j): seen.add(j); stack.append(j)
mouth = np.zeros(nK, np.float32)
for i in seen: mouth[loc[i]] = float(np.clip((1.5 - V[i, 2]) / .25, 0, 1))
print('mouth cavity verts', len(seen))
put('mouth', mouth)

# proxies
proxy_meta = []
for kind, pid, path, meta, refs, sc in proxy_data:
    pdir = os.path.dirname(path)
    pv, pt, pf = read_obj(os.path.join(pdir, meta['obj_file']))
    if len(pv) != len(refs):
        print('skip proxy (vert mismatch)', pid, len(pv), len(refs)); continue
    ri = np.array([[loc[i] for i in r[0]] for r in refs], np.uint16)
    rw = np.array([r[1] for r in refs], np.float32)
    ro = np.array([r[2] for r in refs], np.float32)
    # face-varying uv -> render verts
    rk, rs, ru, pt3 = {}, [], [], []
    for f in pf:
        ids = []
        for (vi, ti) in f:
            uv = tuple(pt[ti]) if ti >= 0 and len(pt) else (0, 0)
            key = (vi, round(uv[0], 6), round(uv[1], 6))
            if key not in rk: rk[key] = len(rs); rs.append(vi); ru.append(uv)
            ids.append(rk[key])
        for k in range(1, len(ids) - 1): pt3 += [ids[0], ids[k], ids[k + 1]]
    if kind in ('eyes', 'teeth', 'tongue'):
        # closed parts: make every connected piece wind outward (positive signed volume)
        T = np.array(pt3).reshape(-1, 3); src = np.array(rs)
        parent = list(range(len(pv)))
        def fnd(a):
            while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
            return a
        for t in T:
            a = fnd(src[t[0]])
            for b in (src[t[1]], src[t[2]]): parent[fnd(b)] = a
        comp = np.array([fnd(src[t[0]]) for t in T])
        for c in set(comp):
            sel = comp == c; tt = T[sel]
            P0, P1, P2 = pv[src[tt[:, 0]]], pv[src[tt[:, 1]]], pv[src[tt[:, 2]]]
            cen = pv[src[tt].ravel()].mean(0)
            vol = np.einsum('ij,ij->i', P0 - cen, np.cross(P1 - cen, P2 - cen)).sum()
            if vol < 0: T[sel] = tt[:, [0, 2, 1]]
        pt3 = T.ravel().tolist()
    pre = f'p{len(proxy_meta)}'
    put(pre + 'ri', ri); put(pre + 'rw', rw); put(pre + 'ro', ro)
    put(pre + 'src', np.array(rs, np.uint32)); put(pre + 'uv', np.array(ru, np.float32)); put(pre + 'tri', np.array(pt3, np.uint32))
    scale = {ax[0]: [loc[a], loc[b], d] for ax, (a, b, d) in sc.items()}
    mat = parse_mhmat(os.path.normpath(os.path.join(pdir, meta.get('material', '')))) if meta.get('material') else {}
    tex = {}
    for key in ('diffuseTexture', 'normalmapTexture'):
        if key in mat:
            src = os.path.normpath(os.path.join(os.path.dirname(os.path.normpath(os.path.join(pdir, meta['material']))), mat[key]))
            if os.path.exists(src):
                size = {'hair': 1024, 'teeth': 512, 'tongue': 512, 'eyes': 1024}.get(kind, 512)
                if kind == 'eyes': dst = f'{kind}-{pid}.png'; Image.open(src).save(os.path.join(OUT, dst))
                else: dst = webp(src, f'{kind}-{pid}-{key[:4]}', size)
                tex[key] = dst
    thumb = os.path.join(pdir, os.path.splitext(meta['obj_file'])[0] + '.thumb')
    if os.path.exists(thumb) and kind in ('hair', 'eyebrows', 'eyelashes'):
        im = Image.open(thumb).convert('RGB'); im.thumbnail((96, 96)); tdst = f'thumb-{kind}-{pid}.jpg'; im.save(os.path.join(OUT, tdst), quality=82); tex['thumb'] = tdst
    proxy_meta.append({'kind': kind, 'id': pid, 'name': meta.get('name', pid), 'pre': pre, 'nV': len(pv), 'nR': len(rs),
                       'nT': len(pt3) // 3, 'scale': scale, 'tex': tex,
                       'mat': {k: mat[k] for k in mat if k in ('diffuseColor', 'specularColor', 'shininess', 'opacity', 'transparent', 'backfaceCull', 'alphaToCoverage', 'diffuseIntensity')}})
    print('proxy', kind, pid, len(pv), 'verts', len(pt3) // 3, 'tris', tex)

# skins: crop each body texture to the bust's UV rectangle (keeps full face resolution)
skins = []
ruv = np.array(render_uv)
u0, v0 = ruv.min(0) - .004; u1, v1 = ruv.max(0) + .004
u0, v0, u1, v1 = max(0, u0), max(0, v0), min(1, u1), min(1, v1)
if ASSETS:
    for p in sorted(glob.glob(os.path.join(ASSETS, 'skins', '*', '*.mhmat'))):
        sid = os.path.basename(os.path.dirname(p))
        if not re.match(r'(young|middleage|old)_(african|asian|caucasian)_(female|male)$', sid): continue
        mat = parse_mhmat(p)
        src = os.path.normpath(os.path.join(os.path.dirname(p), mat['diffuseTexture']))
        im = Image.open(src).convert('RGB'); W_, H_ = im.size
        box = (int(u0 * W_), int((1 - v1) * H_), int(np.ceil(u1 * W_)), int(np.ceil((1 - v0) * H_)))
        dst = f'skin-{sid}.jpg'; im.crop(box).save(os.path.join(OUT, dst), quality=88)
        skins.append({'id': sid, 'tex': dst})
    print('skin crop px', box)
uvRect = [box[0] / W_, 1 - box[3] / H_, box[2] / W_, 1 - box[1] / H_] if skins else None
eyes = []

open(os.path.join(OUT, 'head.bin'), 'wb').write(blob)
json.dump({'nK': nK, 'nS': nS, 'nR': nR, 'nT': len(tris) // 3, 'QS': QS, 'sect': sect,
           'morphs': morph_meta, 'proxies': proxy_meta, 'skins': skins, 'uvRect': uvRect, 'eyes': eyes},
          open(os.path.join(OUT, 'head.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('blob MB', round(len(blob) / 1e6, 2))
