# 把 lvadj.json 的調整值寫進 story.js（每章 lvAdj 欄位）
import json,re,sys
d=sys.argv[1] if len(sys.argv)>1 else '/home/claude/zijia2'
adj=json.load(open(d+'/lvadj.json'))
s=open(d+'/story.js').read()
s=re.sub(r"\n    lvAdj:-?\d+, *// 平衡調整\n","\n",s)
for cid,v in adj.items():
    if not v: continue
    pat=f"\n  {cid}: {{\n"
    assert s.count(pat)==1,cid
    s=s.replace(pat,pat+f"    lvAdj:{v}, // 平衡調整\n")
open(d+'/story.js','w').write(s)
print('baked',adj)
