# 地球地図日本（dataofjapan/land の japan.geojson）を、印刷用に軽くする。
# 小さな島は落とし、点を間引いて、都道府県ごとの [ [lng,lat], ... ] の輪郭にする。
# 使い方: python3 print/simplify_map.py <japan.geojson>
import json, math, os, sys
here = os.path.dirname(os.path.abspath(__file__))
g = json.load(open(sys.argv[1]))

def area(r):
    a = 0
    for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
        a += x1 * y2 - x2 * y1
    return abs(a) / 2

def dp(pts, eps):
    # Douglas-Peucker
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-12
    best, idx = 0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / n
        if d > best: best, idx = d, i
    if best > eps:
        return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]

out = []
for f in g['features']:
    polys = f['geometry']['coordinates'] if f['geometry']['type'] == 'MultiPolygon' else [f['geometry']['coordinates']]
    rings = []
    for poly in polys:
        r = poly[0]
        if area(r) < 0.004: continue  # 小島は落とす（約0.004平方度未満）
        # 閉じた輪郭は始点と終点が同じなので、半分に分けて間引く
        h = len(r) // 2
        s = dp(r[:h + 1], 0.006)[:-1] + dp(r[h:], 0.006)
        if len(s) >= 4: rings.append([[round(x, 3), round(y, 3)] for x, y in s])
    out.append({'pref': f['properties']['nam_ja'], 'rings': rings})
json.dump(out, open(os.path.join(here, 'japan_simplified.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(sum(len(r) for o in out for r in o['rings']), 'points', os.path.getsize(os.path.join(here, 'japan_simplified.json')), 'bytes')
