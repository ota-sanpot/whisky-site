# 蒸溜所の住所（無ければ県＋市町村）から、国土地理院の住所検索APIで緯度経度を取る。
# 結果は print/geo.json に保存し、取れているものは取り直さない。
import json, os, re, subprocess, time, urllib.parse, urllib.request
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, '..', 'site', 'data.js')).read()
data = json.loads(re.match(r'^window\.WDATA = ([\s\S]*);\s*$', src).group(1))
geo_path = os.path.join(here, 'geo.json')
geo = json.load(open(geo_path)) if os.path.exists(geo_path) else {}
for d in data['distilleries']:
    if d['id'] in geo: continue
    q = d.get('address') or (d['pref'] + (d.get('city') or ''))
    q = re.sub(r'（.*?）', '', q).split(' ')[0]
    url = 'https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + urllib.parse.quote(q)
    res = json.load(urllib.request.urlopen(url, timeout=20))
    if not res:
        q2 = d['pref'] + (d.get('city') or '')
        res = json.load(urllib.request.urlopen('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + urllib.parse.quote(q2), timeout=20))
        q = q2
    if res:
        lng, lat = res[0]['geometry']['coordinates']
        geo[d['id']] = {'lat': lat, 'lng': lng, 'q': q, 'hit': res[0]['properties']['title'], 'level': 'address' if d.get('address') else ('city' if d.get('city') else 'pref')}
    else:
        geo[d['id']] = None
    print(d['id'], geo[d['id']])
    time.sleep(0.3)
json.dump(geo, open(geo_path, 'w'), ensure_ascii=False, indent=1)
