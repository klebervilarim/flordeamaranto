import json, re, os, glob, unicodedata, urllib.request
import collections

BASE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(BASE, 'catalogo_enriched.json')))

urls = {}
for p in glob.glob('/dev-server/src/assets/catalog/*.asset.json'):
    j = json.load(open(p))
    urls[os.path.basename(p).replace('.asset.json', '')] = j['url']
print('urls:', len(urls))

req = urllib.request.Request(
    'https://fcnzicahwgcznnleqrow.supabase.co/rest/v1/products?select=slug',
    headers={'apikey': 'sb_publishable_aqeAqIAVx6H0Yy2o36wLkA_k_D92DBu'})
existing = {r['slug'] for r in json.load(urllib.request.urlopen(req))}
print('existentes:', len(existing))

BRANDS = [
    ('lattafa', ['yara', 'khamrah', 'asad', 'fakhar', 'badee', 'ana abiyedh', 'qaaed', 'raed', 'oud for glory', 'sublime', 'eclaire', 'tharwah', 'maahir', 'nebras', 'haya', 'sehr', 'mayar', 'ameer al oudh', 'sheikh al shuyukh', 'ramz', 'afeef', 'ajwad', 'andaleeb', 'raghba', 'qaed al fursan', 'ghala', 'sakeena']),
    ('armaf', ['odyssey', 'club de nuit', 'tag him', 'tag her', 'ventana', 'hunter', 'derby', 'tres nuit', 'milestone', 'legesi']),
    ('afnan', ['9pm', '9am', '9 am', 'supremacy', 'historic', 'rare carbon', 'rare titanium', 'turathi', 'rue broca']),
    ('maison-alhambra', ['kismet', 'jean lowe', 'glacier', 'philos', 'vulcan', 'la voie', 'victorioso', 'opera', 'infini', 'exclif', 'amberley', 'luciano', 'jorge di profumo', 'baroque', 'poseidon', 'rose petal', 'woody oud', 'la vita', 'salvo', 'bergamotto', 'yeah']),
    ('khadlaj', ['karus', 'fursan', 'cranberry', 'concord', 'hibiscus', 'velvet', 'hareem al sultan', 'shiyaaka', 'gaith', 'nuha', 'raniya', 'zayar', 'island', 'sahara', 'cocoa', 'lychee', 'safwaan', 'le prestige', 'spring', 'karoondo', 'khadlaj 25']),
    ('rasasi', ['hawras', 'la yuqawam', 'layuqawam', 'daarej', 'fattan', 'boruzz', 'shuhrah', 'rumz', 'sotoor', 'chastity', 'royale blue', 'qasamat', 'entebah', 'hatem', 'junoon']),
    ('fragrance-world', ['imperium', 'barakkat', 'spectre', 'brown orchid', 'french avenue', 'paris corner', 'pinnace', 'atlantis']),
    ('swiss-arabian', ['shaghaf', 'private musk', 'dehn al oud']),
    ('al-haramain', ['amber oud', 'haramain', 'laventure', "l'aventure", 'portfolio']),
    ('ajmal', ['qafiya', 'evoke', 'sacrifice', 'wisal', 'mizyaan', 'aristocrat', 'kuro']),
]


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-') or 'produto'


def titlecase(s):
    small = {'de', 'do', 'da', 'dos', 'das', 'e', 'the', 'of', 'pour', 'le', 'la', 'el'}
    out = []
    for w in s.split():
        wl = w.lower()
        out.append(wl if wl in small else (w.capitalize() if w.isupper() else w))
    return ' '.join(out)


used = set(existing)
rows, sem_preco, sem_foto = [], [], []
for x in data:
    nome = x['nome'].strip()
    name = titlecase(nome)
    slug = slugify(nome)
    if slug in used:
        i = 2
        while f'{slug}-{i}' in used:
            i += 1
        slug = f'{slug}-{i}'
    used.add(slug)
    sku = f"CAT-P{x['pagina']:02d}-{x['pos']:02d}"
    cost = x.get('preco_br') or x.get('preco_br_ocr') or (x.get('preco_py') + 25 if x.get('preco_py') else None)
    cost = round(float(cost), 2) if cost else None
    if cost:
        sug = round(cost * 1.4, 2)
        price = sug
    else:
        price = round(float(x['amazon']), 2) if x.get('amazon') else None
        sug = price
        if not price:
            sem_preco.append(name)
    img = urls.get(x.get('foto') or '')
    if not img:
        sem_foto.append(name)
    tu = (x.get('ocr_text') or '').upper()
    gender = 'unissex' if 'UNISSEX' in tu else 'feminino' if 'FEMININO' in tu else 'masculino' if 'MASCULINO' in tu else None
    vol = f"{int(x['ml'])} ml" if x.get('ml') else None
    if not vol:
        m = re.search(r'(\d{2,3})\s*ML', tu)
        if m:
            vol = f"{m.group(1)} ml"
    brand_slug = None
    nl = ' ' + nome.lower() + ' '
    for bslug, keys in BRANDS:
        if any(k in nl for k in keys):
            brand_slug = bslug
            break
    clean = re.sub(r'R\$\s*\d+[.,]\d{2}', '', x.get('ocr_text') or '')
    clean = re.sub(r'A\s*UNIDADE', '', clean, flags=re.I)
    clean = re.sub(r'\s+', ' ', clean).strip()
    if clean.upper().startswith(nome.upper()):
        clean = clean[len(nome):].strip()
    rows.append(dict(name=name, slug=slug, sku=sku, cost=cost, sug=sug, price=price,
                     img=img, gender=gender, vol=vol, brand=brand_slug,
                     desc=(clean[:280] or None)))

print('sem preco:', len(sem_preco), sem_preco[:8])
print('sem foto:', len(sem_foto), sem_foto[:8])
print('marcas:', collections.Counter(r['brand'] for r in rows).most_common())
json.dump(rows, open(os.path.join(BASE, 'catalogo_import.json'), 'w'), ensure_ascii=False, indent=1)
