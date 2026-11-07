#!/usr/bin/env python3
"""Raw 2K PNG -> delivered WebP at the manifest's dimensions and KB ceiling."""
import json, pathlib, subprocess, sys, shutil
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAN  = json.loads((ROOT/"assets/manifest.json").read_text(encoding="utf-8"))
RAW  = ROOT/"assets/raw"

def cutout(src, dst):
    """Flat cream ground -> alpha. Reliable because the preamble forces a seamless flat background."""
    im = Image.open(src).convert("RGBA"); px = im.load()
    w,h = im.size
    # sample the four corners for the true ground colour
    corners=[px[2,2],px[w-3,2],px[2,h-3],px[w-3,h-3]]
    gr=tuple(sum(c[i] for c in corners)//4 for i in range(3))
    from collections import deque
    seen=bytearray(w*h); q=deque()
    for x in range(w):
        for y in (0,h-1): q.append((x,y))
    for y in range(h):
        for x in (0,w-1): q.append((x,y))
    TOL=26
    while q:
        x,y=q.popleft()
        if x<0 or y<0 or x>=w or y>=h: continue
        i=y*w+x
        if seen[i]: continue
        r,g,b,_=px[x,y]
        if abs(r-gr[0])+abs(g-gr[1])+abs(b-gr[2])>TOL*3: continue
        seen[i]=1; px[x,y]=(r,g,b,0)
        q.extend(((x+1,y),(x-1,y),(x,y+1),(x,y-1)))
    im.save(dst)

def build(a, variant=1):
    src = RAW/f'{a["id"]}-v{variant}.png'
    if not src.exists(): return None
    out = ROOT/a["path"]; out.parent.mkdir(parents=True, exist_ok=True)
    tmp = ROOT/f'assets/tmp-{a["id"]}.png'
    if a.get("cutout"): cutout(src, tmp)
    else: shutil.copy(src, tmp)
    w,h = a.get("w") or 1200, a.get("h") or 1200
    target = a.get("targetKb") or 150
    for q in (86,82,78,72,66,60,54):
        cmd=["cwebp","-q",str(q),"-resize",str(w),str(h),str(tmp),"-o",str(out)]
        if a.get("cutout"): cmd[1:1]=["-alpha_q","90","-exact"]
        subprocess.run(cmd,capture_output=True)
        kb=out.stat().st_size/1024
        if kb<=target: break
    tmp.unlink(missing_ok=True)
    return (a["id"], a["path"], round(kb), target, q, "OK" if kb<=target else "OVER")

rows=[r for r in (build(a) for a in MAN) if r]
print(f"{'id':5} {'path':46} {'KB':>5} {'target':>6} {'q':>3}  ")
for r in rows:
    print(f"{r[0]:5} {r[1]:46} {r[2]:5} {r[3]:6} {r[4]:3}  {r[5]}")
print(f"\n{len(rows)} delivered, {sum(1 for r in rows if r[5]=='OVER')} over target")
