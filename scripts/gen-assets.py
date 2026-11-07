#!/usr/bin/env python3
"""Generate site assets from assets/manifest.json via gpt-image-2 (kie.ai)."""
import json, sys, pathlib, argparse, concurrent.futures as cf, traceback
sys.path.insert(0, str(pathlib.Path.home() / ".claude/skills/gpt-image-2/scripts"))
from generate import generate_image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRE  = (ROOT / "assets/prompts/_preamble.txt").read_text(encoding="utf-8").strip()
MAN  = json.loads((ROOT / "assets/manifest.json").read_text(encoding="utf-8"))
RAW  = ROOT / "assets/raw"; RAW.mkdir(parents=True, exist_ok=True)

def build(a):
    p = PRE + "\n\n" + a["prompt"]
    if a.get("sharedAvoid"):
        p += "\n\nSHARED AVOID: " + a["sharedAvoid"]
    return p

def one(a, v):
    out = RAW / f'{a["id"]}-v{v}.png'
    if out.exists() and out.stat().st_size > 10000:
        return (a["id"], v, "skip", str(out))
    try:
        generate_image(prompt=build(a), aspect_ratio=a["ratio"], resolution=a["res"],
                       output_path=str(out), verbose=False)
        return (a["id"], v, "ok", str(out))
    except Exception as e:
        return (a["id"], v, "FAIL", f"{type(e).__name__}: {e}")

ap = argparse.ArgumentParser()
ap.add_argument("--families", default="AB")
ap.add_argument("--workers", type=int, default=4)
ap.add_argument("--ids", default="")
args = ap.parse_args()

sel = [a for a in MAN if a["family"] in args.families]
if args.ids:
    want = set(args.ids.split(","))
    sel = [a for a in MAN if a["id"] in want]

jobs = [(a, v) for a in sel for v in range(1, a["variants"] + 1)]
print(f"{len(sel)} assets, {len(jobs)} renders, {args.workers} workers", flush=True)
ok = fail = skip = 0
with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
    for aid, v, st, info in ex.map(lambda j: one(*j), jobs):
        if st == "ok": ok += 1
        elif st == "skip": skip += 1
        else: fail += 1
        print(f"  [{st:4}] {aid}-v{v}  {info if st=='FAIL' else ''}", flush=True)
print(f"\nok={ok} skip={skip} fail={fail}")
