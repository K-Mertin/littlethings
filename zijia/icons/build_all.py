import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from sprites import S,grid,ALIAS
from PIL import Image,ImageDraw,ImageFont
here=os.path.dirname(os.path.abspath(__file__))
def hexc(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))+(255,)
out=os.path.join(here,'out'); os.makedirs(out,exist_ok=True); imgs={}
for k,sp in S.items():
    g=grid(sp); im=Image.new('RGBA',(16,16),(0,0,0,0))
    for y,row in enumerate(g):
        for x,ch in enumerate(row):
            if ch!='.': im.putpixel((x,y),hexc(sp['pal'][ch]))
    im.save(f'{out}/{k}_16.png'); im.resize((32,32),Image.NEAREST).save(f'{out}/{k}_32.png'); imgs[k]=im
fp='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
font=ImageFont.truetype(fp,17) if os.path.exists(fp) else ImageFont.load_default()
keys=list(S); cols=8; cw=150; chh=150; rows=(len(keys)+cols-1)//cols
sheet=Image.new('RGBA',(cols*cw+20,rows*chh+20),(20,25,30,255)); d=ImageDraw.Draw(sheet)
for i,k in enumerate(keys):
    x=20+(i%cols)*cw; y=16+(i//cols)*chh
    d.rectangle([x-4,y-4,x+100,y+100],fill=(31,39,46,255))
    sheet.alpha_composite(imgs[k].resize((96,96),Image.NEAREST),(x,y))
    sheet.alpha_composite(imgs[k].resize((32,32),Image.NEAREST),(x+106,y+64))
    d.text((x,y+104),S[k]['name'],font=font,fill=(227,232,235,255))
sheet.save(os.path.join(here,'preview_all.png'))
d2={k:{'pal':sp['pal'],'rows':[''.join(r) for r in grid(sp)]} for k,sp in S.items()}
dst=sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'icons.js')
open(dst,'w').write('// 像素圖示（16×16，Q版），由 icons/sprites.py 產生\nconst ICONS='+json.dumps(d2,ensure_ascii=False)+';\nconst ICON_ALIAS='+json.dumps(ALIAS)+';\n')
print('icons',len(S))
