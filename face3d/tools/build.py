#!/usr/bin/env python3
"""Build the realistic character data for face3d from MakeHuman assets.

Usage:
  python3 build.py <makehuman data dir> <out dir> [asset dir ...]

  <makehuman data dir>  makehuman/data from github.com/makehumancommunity/makehuman
  [asset dir ...]       extracted asset packs (makehuman_system_assets, hair01, shirts01, ...).
                        Every *.mhclo below hair/, eyebrows/, eyelashes/, teeth/, tongue/ or clothes/
                        becomes a selectable proxy; skins/ provide skin textures.

Produces in <out dir>:
  head.json         metadata (counts, morph table, proxy list, skins)
  head.bin          body mesh, subdivision map, uvs, triangles, morph deltas, region masks
  px-*.bin          one file per proxy (hair, clothes, ...) loaded on demand by the page
  *.webp / *.jpg    textures and thumbnails
"""
import sys, os, re, json, glob
import numpy as np
from PIL import Image, ImageFilter

MH, OUT = sys.argv[1], sys.argv[2]
ASSET_DIRS = [a for a in sys.argv[3:] if a]
os.makedirs(OUT, exist_ok=True)
PROXY_KINDS = ('eyebrows', 'eyelashes', 'hair', 'teeth', 'tongue', 'clothes')


# ---------------------------------------------------------------- helpers
def bleed(im):
    """Give transparent pixels the colour of nearby opaque ones, so filtering at card edges
    doesn't pull white/black fringes into hair, brows and lace."""
    if im.mode != 'RGBA': return im
    a = np.asarray(im).astype(np.float32) / 255
    rgb, al = a[..., :3], a[..., 3:4]
    w = (al > .5).astype(np.float32)
    num = rgb * w
    out = rgb.copy()
    blur = lambda x, r: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(r))).astype(np.float32) / 255
    for r in (2, 6, 16, 48):
        bn = np.stack([blur(num[..., c], r) for c in range(3)], -1); bd = blur(w[..., 0], r)[..., None]
        fill = (al < .5) & (bd > 1e-3) & (out == rgb)
        out = np.where(fill, bn / np.maximum(bd, 1e-3), out)
    mean = (rgb * w).sum((0, 1)) / max(w.sum(), 1)
    out = np.where((al < .5) & (out == rgb), mean, out)
    return Image.fromarray((np.concatenate([out, al], -1) * 255).clip(0, 255).astype(np.uint8), 'RGBA')

_tex_cache = {}
def webp(src, name, size, alpha_bleed=True):
    key = (os.path.abspath(src), size)
    if key in _tex_cache: return _tex_cache[key]
    im = Image.open(src)
    if im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA' if 'A' in im.mode or im.mode == 'P' else 'RGB')
    if max(im.size) > size: im = im.resize((size, size), Image.LANCZOS)
    if alpha_bleed: im = bleed(im)
    dst = re.sub(r'[^A-Za-z0-9_.-]', '_', name) + '.webp'
    im.save(os.path.join(OUT, dst), 'WEBP', quality=85, method=4)
    _tex_cache[key] = dst
    return dst

def parse_mhmat(path):
    m = {}
    if not path or not os.path.exists(path): return m
    for l in open(path, errors='replace'):
        s = l.strip()
        if not s or s.startswith('#'): continue
        k = s.split()[0]; m[k] = s[len(k):].strip()
    return m

def read_obj(path):
    pv, pt, pf = [], [], []
    for l in open(path, errors='replace'):
        if l.startswith('v '): pv.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('vt '): pt.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('f '):
            pf.append([tuple(int(a) - 1 if a else -1 for a in (p.split('/') + [''])[:2]) for p in l.split()[1:]])
    return np.array(pv), (np.array(pt) if pt else np.zeros((0, 2))), pf

def read_mhclo(path):
    meta, refs, tags, delete = {}, [], [], []
    mode, seen_verts = None, False
    for l in open(path, errors='replace').read().splitlines():
        s = l.strip()
        if not s or s.startswith('#'): continue
        parts = s.split()
        if mode != 'delete' and seen_verts and re.match(r'^-?\d', parts[0]):
            if len(parts) == 1: refs.append(([int(parts[0])] * 3, [1, 0, 0], [0, 0, 0]))
            elif len(parts) >= 9:
                refs.append(([int(x) for x in parts[:3]], [float(x) for x in parts[3:6]], [float(x) for x in parts[6:9]]))
            continue
        if mode == 'delete' and re.match(r'^\d', parts[0]):
            i = 0
            while i < len(parts):
                if i + 2 < len(parts) and parts[i + 1] == '-':
                    delete.extend(range(int(parts[i]), int(parts[i + 2]) + 1)); i += 3
                else:
                    delete.append(int(parts[i])); i += 1
            continue
        k = parts[0]
        if k == 'verts': mode = 'verts'; seen_verts = True; continue
        if k == 'delete_verts': mode = 'delete'; continue
        mode = None
        if k == 'tag': tags.append(s[4:].strip().lower()); continue
        meta.setdefault(k, s[len(k):].strip())
    return meta, refs, tags, delete


# ---------------------------------------------------------------- base mesh (full body)
V, VT, F = [], [], []
g = None
for l in open(os.path.join(MH, '3dobjs/base.obj')):
    if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
    elif l.startswith('vt '): VT.append([float(x) for x in l.split()[1:3]])
    elif l.startswith('g '): g = l.split()[1]
    elif l.startswith('f '):
        F.append((g, [tuple(int(a) - 1 for a in p.split('/')[:2]) for p in l.split()[1:]]))
V = np.array(V, dtype=np.float64); VT = np.array(VT, dtype=np.float64)
faces = [f[1] for f in F if f[0] == 'body']
nK = len(V)                          # keep every base vertex (helpers are needed for proxy fitting)
print('body quads', len(faces), 'base verts', nK)

# ---------------------------------------------------------------- Catmull-Clark (1 level) as a sparse linear map
quads = [[p[0] for p in f] for f in faces]
quv = [[p[1] for p in f] for f in faces]
edge_faces, vert_faces, vert_edges = {}, {}, {}
for fi, q in enumerate(quads):
    for k in range(4):
        e = tuple(sorted((q[k], q[(k + 1) % 4]))); edge_faces.setdefault(e, []).append(fi)
    for v in q: vert_faces.setdefault(v, []).append(fi)
for e in edge_faces:
    for v in e: vert_edges.setdefault(v, []).append(e)

rows = []
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
for v in sorted(vert_faces):
    es, fs = vert_edges[v], vert_faces[v]
    bnd = [e for e in es if len(edge_faces[e]) == 1]
    d = {}
    if bnd:
        addw(d, v, .75)
        for e in bnd[:2]: addw(d, e[0] if e[1] == v else e[1], .125)
    else:
        n = len(fs)
        for fi in fs:
            for u, w in rows[face_pt[fi]].items(): addw(d, u, w / n / n)
        for e in es:
            for u in e: addw(d, u, 1 / n / n)
        addw(d, v, (n - 3) / n)
    vert_pt[v] = len(rows); rows.append(d)
nS = len(rows)

render_key, render_src, render_uv = {}, [], []
def rvert(si, uv):
    key = (si, round(uv[0], 6), round(uv[1], 6))
    if key not in render_key:
        render_key[key] = len(render_src); render_src.append(si); render_uv.append(uv)
    return render_key[key]
tris = []                             # 8 triangles per base quad, in quad order (lets the page hide quads)
for fi, q in enumerate(quads):
    uvs = VT[quv[fi]]; fuv = uvs.mean(0)
    for k in range(4):
        a, b, pm = q[k], q[(k + 1) % 4], q[(k - 1) % 4]
        ea, ep = tuple(sorted((a, b))), tuple(sorted((pm, a)))
        ua, ub, up = uvs[k], uvs[(k + 1) % 4], uvs[(k - 1) % 4]
        r0 = rvert(vert_pt[a], ua); r1 = rvert(edge_pt[ea], (ua + ub) / 2)
        r2 = rvert(face_pt[fi], fuv); r3 = rvert(edge_pt[ep], (up + ua) / 2)
        tris += [r0, r1, r2, r0, r2, r3]
nR = len(render_src)
print('subdiv verts', nS, 'render verts', nR, 'tris', len(tris) // 3)

# ---------------------------------------------------------------- targets
def read_target(rel):
    out = []
    for l in open(os.path.join(MH, 'targets', rel)):
        s = l.split()
        if not s or s[0].startswith('#'): continue
        out.append((int(s[0]), float(s[1]), float(s[2]), float(s[3])))
    return out

M = json.load(open(os.path.join(MH, 'modifiers/modeling_modifiers.json')))
want_groups = ['head', 'forehead', 'eyebrows', 'eyes', 'nose', 'mouth', 'ears', 'chin', 'cheek', 'neck',
               'torso', 'hip', 'armslegs']
skip_targets = re.compile(r'^(stomach-pregnant|stomach-navel)')
targets = []
for grp in M:
    if grp['group'] not in want_groups: continue
    for m in grp['modifiers']:
        if 'target' not in m: continue
        t = m['target']
        names = [t + '-' + m['min'], t + '-' + m['max']] if m.get('min') else [t]
        for n in names:
            rel = f"{grp['group']}/{n}.target"
            if not skip_targets.match(n) and os.path.exists(os.path.join(MH, 'targets', rel)): targets.append((n, rel))
for rel in ['stomach/stomach-tone-decr.target', 'stomach/stomach-tone-incr.target']:
    targets.append((os.path.basename(rel)[:-7], rel))
AGES, GENS = ['child', 'young', 'old'], ['female', 'male']
for eth in ['african', 'asian', 'caucasian']:
    for gen in GENS:
        for age in AGES:
            targets.append((f'macro-{eth}-{gen}-{age}', f'macrodetails/{eth}-{gen}-{age}.target'))
for gen in GENS:
    for age in AGES:
        for v in ['minweight', 'maxweight']:
            targets.append((f'univ-{gen}-{age}-{v}', f'macrodetails/universal-{gen}-{age}-averagemuscle-{v}.target'))
        for v in ['minmuscle', 'maxmuscle']:
            targets.append((f'univ-{gen}-{age}-{v}', f'macrodetails/universal-{gen}-{age}-{v}-averageweight.target'))
        for v in ['minheight', 'maxheight']:
            targets.append((f'height-{gen}-{age}-{v}', f'macrodetails/height/{gen}-{age}-averagemuscle-averageweight-{v}.target'))
for eth in ['african', 'asian', 'caucasian']:
    for p in sorted(glob.glob(os.path.join(MH, f'targets/expression/units/{eth}/*.target'))):
        n = os.path.basename(p)[:-7]
        targets.append((f'expr-{eth}-{n}', f'expression/units/{eth}/{n}.target'))

QS = 4000.0
morph_meta, morph_idx, morph_d = [], [], []
for n, rel in targets:
    if not os.path.exists(os.path.join(MH, 'targets', rel)): print('missing target', rel); continue
    arr = np.array(read_target(rel))
    if not len(arr): continue
    q = np.round(arr[:, 1:] * QS)
    scale = 1.0
    if np.abs(q).max() > 32767: scale = np.abs(q).max() / 32767; q = np.round(q / scale)
    morph_meta.append({'name': n, 'off': sum(len(x) for x in morph_idx), 'n': len(arr), **({'s': scale} if scale != 1 else {})})
    morph_idx.append(arr[:, 0].astype(np.uint16)); morph_d.append(q.astype(np.int16))
print('morphs', len(morph_meta), 'entries', sum(len(x) for x in morph_idx))

# ---------------------------------------------------------------- blob
class Blob:
    def __init__(s): s.b = bytearray(); s.sect = {}
    def put(s, name, arr):
        while len(s.b) % 4: s.b += b'\0'
        raw = np.ascontiguousarray(arr).tobytes(); s.sect[name] = [len(s.b), len(raw)]; s.b += raw

blob = Blob()
blob.put('base', V.astype(np.float32))
ptr, idx, wts = [0], [], []
for d in rows:
    for i, w in d.items(): idx.append(i); wts.append(w)
    ptr.append(len(idx))
blob.put('sPtr', np.array(ptr, np.uint32)); blob.put('sIdx', np.array(idx, np.uint16)); blob.put('sW', np.array(wts, np.float32))
blob.put('rSrc', np.array(render_src, np.uint32)); blob.put('rUV', np.array(render_uv, np.float32))
blob.put('tri', np.array(tris, np.uint32))
blob.put('mIdx', np.concatenate(morph_idx)); blob.put('mD', np.concatenate(morph_d))

# mouth cavity mask: flood fill from the throat wall, stopping at the outer lip surface
adj = {}
for q in quads:
    for k in range(4):
        a, b = q[k], q[(k + 1) % 4]; adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
inside = lambda i: abs(V[i, 0]) < .26 and 6.4 < V[i, 1] < 6.86 and V[i, 2] < 1.47
seed = [i for i in adj if abs(V[i, 0]) < .15 and 6.5 < V[i, 1] < 6.75 and V[i, 2] < .8]
seen = set(seed); stack = list(seed)
while stack:
    i = stack.pop()
    for j in adj[i]:
        if j not in seen and inside(j): seen.add(j); stack.append(j)
mouth = np.zeros(nK, np.float32)
for i in seen: mouth[i] = float(np.clip((1.5 - V[i, 2]) / .25, 0, 1))
blob.put('mouth', mouth)

# ---------------------------------------------------------------- proxies (one file each)
def proxy_kind(path, root):
    rel = os.path.relpath(path, root).replace('\\', '/').split('/')
    for part in rel:
        if part in PROXY_KINDS: return part
    return None

found = {}
eye_mhclo = os.path.join(MH, 'eyes/high-poly/high-poly.mhclo')
proxy_src = [('eyes', 'high-poly', eye_mhclo, 'MakeHuman')]
for root in ASSET_DIRS:
    pack = os.path.basename(os.path.normpath(root))
    for p in sorted(glob.glob(os.path.join(root, '**', '*.mhclo'), recursive=True)):
        kind = proxy_kind(p, root)
        if not kind: continue
        pid = re.sub(r'[^A-Za-z0-9_-]', '_', os.path.splitext(os.path.basename(p))[0])
        if kind == 'teeth' and pid != 'teeth_base': continue
        if (kind, pid) in found: continue
        found[(kind, pid)] = p
        proxy_src.append((kind, pid, p, pack))

quad_of_vert = {}
for fi, q in enumerate(quads):
    for v in q: quad_of_vert.setdefault(v, []).append(fi)

proxy_meta = []
for kind, pid, path, pack in proxy_src:
    try:
        meta, refs, tags, delete = read_mhclo(path)
        pdir = os.path.dirname(path)
        objp = os.path.join(pdir, meta.get('obj_file', ''))
        if not os.path.exists(objp): print('skip (no obj)', pid); continue
        pv, pt, pf = read_obj(objp)
        if len(pv) != len(refs) or not len(pv): print('skip (vert mismatch)', kind, pid, len(pv), len(refs)); continue
        if max(max(r[0]) for r in refs) >= nK: print('skip (bad ref)', pid); continue
        rk, rs, ru, pt3 = {}, [], [], []
        for f in pf:
            ids = []
            for (vi, ti) in f:
                uv = tuple(pt[ti]) if ti >= 0 and len(pt) else (0.0, 0.0)
                key = (vi, round(uv[0], 6), round(uv[1], 6))
                if key not in rk: rk[key] = len(rs); rs.append(vi); ru.append(uv)
                ids.append(rk[key])
            for k in range(1, len(ids) - 1): pt3 += [ids[0], ids[k], ids[k + 1]]
        if kind in ('eyes', 'teeth', 'tongue'):
            # closed parts: make every connected piece wind outward
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
                cen = pv[src[tt].ravel()].mean(0)
                vol = np.einsum('ij,ij->i', pv[src[tt[:, 0]]] - cen, np.cross(pv[src[tt[:, 1]]] - cen, pv[src[tt[:, 2]]] - cen)).sum()
                if vol < 0: T[sel] = tt[:, [0, 2, 1]]
            pt3 = T.ravel().tolist()
        # body quads hidden while this is worn (all four corners deleted)
        hide = []
        if delete:
            ds = set(delete)
            cand = set(fi for v in ds for fi in quad_of_vert.get(v, ()))
            hide = sorted(fi for fi in cand if all(v in ds for v in quads[fi]))
        pb = Blob()
        pb.put('ri', np.array([r[0] for r in refs], np.uint16))
        pb.put('rw', np.array([r[1] for r in refs], np.float32))
        pb.put('ro', np.array([r[2] for r in refs], np.float32))
        pb.put('src', np.array(rs, np.uint32)); pb.put('uv', np.array(ru, np.float32)); pb.put('tri', np.array(pt3, np.uint32))
        pb.put('hide', np.array(hide, np.uint16))
        fname = f'px-{kind}-{pid}.bin'
        open(os.path.join(OUT, fname), 'wb').write(pb.b)
        scale = {}
        for ax in ('x_scale', 'y_scale', 'z_scale'):
            if ax in meta:
                a, b, d = meta[ax].split(); scale[ax[0]] = [int(a), int(b), float(d)]
        matp = os.path.normpath(os.path.join(pdir, meta['material'])) if meta.get('material') else ''
        mat = parse_mhmat(matp)
        tex = {}
        size = {'hair': 1024, 'clothes': 1024, 'eyes': 1024}.get(kind, 512)
        for key in ('diffuseTexture', 'normalmapTexture'):
            if key in mat:
                src_tex = os.path.normpath(os.path.join(os.path.dirname(matp), mat[key]))
                if not os.path.exists(src_tex):   # some packs reference textures beside the mhclo
                    alt = os.path.join(pdir, os.path.basename(mat[key]))
                    src_tex = alt if os.path.exists(alt) else ''
                if src_tex:
                    if kind == 'eyes':
                        dst = f'{kind}-{pid}.png'; Image.open(src_tex).save(os.path.join(OUT, dst))
                    else:
                        dst = webp(src_tex, f'{kind}-{pid}-{key[:4]}', size, alpha_bleed=(key == 'diffuseTexture'))
                    tex[key] = dst
        thumb = os.path.join(pdir, os.path.splitext(os.path.basename(path))[0] + '.thumb')
        if not os.path.exists(thumb):
            th = glob.glob(os.path.join(pdir, '*.thumb')); thumb = th[0] if th else ''
        if thumb and kind in ('hair', 'eyebrows', 'eyelashes', 'clothes'):
            try:
                im = Image.open(thumb).convert('RGB'); im.thumbnail((96, 96))
                tdst = re.sub(r'[^A-Za-z0-9_.-]', '_', f'thumb-{kind}-{pid}.jpg'); im.save(os.path.join(OUT, tdst), quality=82); tex['thumb'] = tdst
            except Exception as e: print('thumb fail', pid, e)
        fit_y = float(np.mean([V[r[0][0], 1] for r in refs]))
        proxy_meta.append({'kind': kind, 'id': pid, 'name': meta.get('name', pid), 'file': fname, 'sect': pb.sect,
                           'nV': len(pv), 'nR': len(rs), 'nT': len(pt3) // 3, 'scale': scale, 'tex': tex,
                           'tags': tags, 'pack': pack, 'zd': int(meta.get('z_depth', '50') or 50), 'y': round(fit_y, 2),
                           'author': meta.get('author', ''), 'license': meta.get('license', ''),
                           'transparent': mat.get('transparent', 'False') == 'True' or 'transparencyMapTexture' in mat})
        print('proxy', kind, pid, len(pv), 'v', len(pt3) // 3, 't', 'hide', len(hide), 'KB', len(pb.b) // 1024)
    except Exception as e:
        print('skip (error)', kind, pid, e)

# ---------------------------------------------------------------- skins
skins = []
for root in ASSET_DIRS:
    for p in sorted(glob.glob(os.path.join(root, 'skins', '*', '*.mhmat'))):
        sid = os.path.basename(os.path.dirname(p))
        if not re.match(r'(young|middleage|old)_(african|asian|caucasian)_(female|male)$', sid): continue
        if any(s['id'] == sid for s in skins): continue
        mat = parse_mhmat(p)
        src = os.path.normpath(os.path.join(os.path.dirname(p), mat['diffuseTexture']))
        dst = f'skin-{sid}.jpg'
        if not os.path.exists(os.path.join(OUT, dst)):
            Image.open(src).convert('RGB').save(os.path.join(OUT, dst), quality=86)
        skins.append({'id': sid, 'tex': dst})

open(os.path.join(OUT, 'head.bin'), 'wb').write(blob.b)
json.dump({'nK': nK, 'nS': nS, 'nR': nR, 'nT': len(tris) // 3, 'nQ': len(quads), 'QS': QS, 'sect': blob.sect,
           'morphs': morph_meta, 'proxies': proxy_meta, 'skins': skins, 'uvRect': [0, 0, 1, 1]},
          open(os.path.join(OUT, 'head.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('head.bin MB', round(len(blob.b) / 1e6, 2), 'proxies', len(proxy_meta))
