import numpy as np,sys,os
from PIL import Image
from scipy.ndimage import binary_fill_holes,label
mag=set('bamboo ricefield dooropen doorclosed forest peach'.split())
os.makedirs('out',exist_ok=True)
for n in sys.argv[1:]:
  im=np.asarray(Image.open(f'cards/{n}-raw.png').convert('RGB').resize((1024,1024),Image.LANCZOS)).astype(float)
  r,g,b=im[...,0],im[...,1],im[...,2]
  k = (np.minimum(r,b)-g) if n in mag else (g-np.maximum(r,b))
  c=np.concatenate([k[:20,:20].ravel(),k[:20,-20:].ravel(),k[-20:,:20].ravel(),k[-20:,-20:].ravel()])
  kb=np.median(c)
  a=np.clip((kb*0.8-k)/(kb*0.45),0,1)
  # keep only components connected — remove tiny specks
  m=a>0.5; lab,nl=label(m); 
  if nl>1:
    sz=np.bincount(lab.ravel());sz[0]=0;keep=sz>=max(200,sz.max()*0.002);a=a*keep[lab]
  edge=a<0.98
  if n in mag:
    lim=np.maximum(g, 0)+ (np.maximum(r,b)-np.minimum(r,b))
    mn=np.minimum(r,b); ex=np.clip(mn-g,0,None)
    r=np.where(edge,r-ex*0.8,r); b=np.where(edge,b-ex*0.8,b)
  else:
    g=np.where(edge,np.minimum(g,np.maximum(r,b)),g)
  out=np.dstack([r,g,b,a*255]).clip(0,255).astype(np.uint8)
  o=Image.fromarray(out); bb=o.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox()
  nocrop=n in ('tall','short','longpencil','shortpencil')
  if not nocrop: o=o.crop(bb)
  w,h=o.size; s=int(max(w,h)*(1.0 if nocrop else 1.06))
  sq=Image.new('RGBA',(s,s),(0,0,0,0)); sq.paste(o,((s-w)//2,(s-h)//2)); sq=sq.resize((320,320),Image.LANCZOS)
  sq.save(f'out/card-{n}.webp',quality=86,method=6); sq.save(f'out/card-{n}.png')
  print(n,kb,os.path.getsize(f'out/card-{n}.webp'))
