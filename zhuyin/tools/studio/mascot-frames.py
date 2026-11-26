import numpy as np
from PIL import Image, ImageFilter
import sys, json
U='/mnt/user-data/uploads/image-studio/projects/zhuyin/art'
rows={'penguin':('015046','015333'),'magpie':('015048','015335'),'rabbit':('015050','015337'),'dog':('015052','015339'),'cat':('015054','015341')}
def load(p): return np.asarray(Image.open(p).convert('RGB').resize((1024,1024),Image.LANCZOS)).astype(np.float32)
def shift(a,dx,dy):
    return np.roll(np.roll(a,dy,0),dx,1)
def align(B,F):
    b=B.mean(2)[::4,::4]; f=F.mean(2)[::4,::4]; best=None
    for dy in range(-6,7):
        for dx in range(-6,7):
            e=np.abs(b-np.roll(np.roll(f,dy,0),dx,1))[8:-8,8:-8].mean()
            if best is None or e<best[0]: best=(e,dx*4,dy*4)
    return best
def patch(B,F,kind):
    e,dx,dy=align(B,F); Fs=shift(F,dx,dy)
    d=np.abs(B-Fs).max(2)
    H=1024; m=np.zeros_like(d,bool)
    # 只看臉的中間區域
    y0,y1=(int(H*.18),int(H*.62)) if kind=='blink' else (int(H*.3),int(H*.78))
    x0,x1=int(H*.18),int(H*.82)
    m[y0:y1,x0:x1]=d[y0:y1,x0:x1]>45
    ys,xs=np.nonzero(m)
    if len(xs)<50: return None
    # 去掉離群點：取 2%～98% 的範圍
    xa,xb=np.percentile(xs,[2,98]).astype(int); ya,yb=np.percentile(ys,[2,98]).astype(int)
    pad=28; xa,ya=max(0,xa-pad),max(0,ya-pad); xb,yb=min(H,xb+pad),min(H,yb+pad)
    mask=np.zeros((H,H),np.float32); mask[ya:yb,xa:xb]=1
    mask=np.asarray(Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))).astype(np.float32)/255
    out=B*(1-mask[...,None])+Fs*mask[...,None]
    # 補丁外面的殘差（越小越好）
    resid=(np.abs(B-Fs).max(2)*(1-mask)).mean()
    return out,resid,(xa,ya,xb,yb),(dx,dy)
def key(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    gr=g-np.maximum(r,b)
    alpha=np.clip(1-(gr-30)/70,0,1)    # 綠色多 → 透明
    # 去綠邊：把殘留的綠色壓到 r、b 的最大值
    g2=np.where(gr>0,np.maximum(r,b)+np.clip(gr,0,None)*0.15,g)
    out=np.dstack([r,g2,b,alpha*255]).clip(0,255).astype(np.uint8)
    return Image.fromarray(out,'RGBA')
info={}
for c,(t,bk) in rows.items():
    B=load(f'{U}/mascot/{c}.png'); res={}
    for kind,stamp in (('talk',t),('blink',bk)):
        best=None
        for i in (1,2):
            r=patch(B,load(f'{U}/studio/20261126-{stamp}/raw-{i}.png'),kind)
            if r and (best is None or r[1]<best[1]): best=r+(i,)
        res[kind]=best
        info[f'{c}-{kind}']={'cand':best[4],'box':[int(v) for v in best[2]],'shift':best[3],'resid':round(float(best[1]),2)}
    for kind,img in (('idle',B),('talk',res['talk'][0]),('blink',res['blink'][0])):
        im=key(img)
        bb=im.getchannel('A').getbbox()
        im.save(f'{c}-{kind}-full.png')
print(json.dumps(info,indent=1))
