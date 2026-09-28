import json,sys
sys.path.insert(0,'/home/claude/icons')
from sprites import S,grid
from PIL import Image,ImageDraw,ImageFont
out='/home/claude/icons/out'; import os; os.makedirs(out,exist_ok=True)
def hexc(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))+(255,)
imgs={}
for k,sp in S.items():
    g=grid(sp); im=Image.new('RGBA',(16,16),(0,0,0,0))
    for y,row in enumerate(g):
        for x,ch in enumerate(row):
            if ch!='.': im.putpixel((x,y),hexc(sp['pal'][ch]))
    im.save(f'{out}/{k}_16.png'); im.resize((32,32),Image.NEAREST).save(f'{out}/{k}_32.png')
    imgs[k]=im
# preview sheet
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',22) if os.path.exists('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc') else None
W=len(S)*170+30; H=300
sheet=Image.new('RGBA',(W,H),(20,25,30,255)); d=ImageDraw.Draw(sheet)
for i,(k,sp) in enumerate(S.items()):
    x=30+i*170
    d.rectangle([x-6,24,x+134,164],fill=(31,39,46,255))
    sheet.alpha_composite(imgs[k].resize((128,128),Image.NEAREST),(x,30))
    sheet.alpha_composite(imgs[k].resize((32,32),Image.NEAREST),(x,180))
    sheet.alpha_composite(imgs[k],(x+44,188))
    if font:
        d.text((x,225),sp['name'],font=font,fill=(227,232,235,255))
        d.text((x,255),sp['pilot'],font=font,fill=(141,155,166,255))
sheet.save('/home/claude/icons/preview.png'); print('ok',[f for f in os.listdir(out)][:4]); print(os.path.exists('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'))
