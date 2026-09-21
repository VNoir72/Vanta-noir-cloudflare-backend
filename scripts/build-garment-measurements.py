import json,re,copy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
blocks=json.loads((root/'data/garment-measurement-source-blocks.json').read_text())
# Preserve the 39 published development blocks exactly; add explicitly proposed women/accessory blocks.
def add(code,name,fit,rows):
 blocks[code]={'code':code,'name':name,'fit':fit,'rows':[{'label':k,'values':[round(v+(i-1)*g,1) for i in range(5)]} for k,v,g in rows]}
add('W01','Fitted / cropped womens top','Fitted stretch; proposed sample target',[('T1 Half chest',42,2.5),('T2 Body length (HPS)',44,1),('T3 Shoulder width',35,1),('T4 Sleeve length',17,0.5),('T5 Half hem',36,2.5)])
add('W02','Womens long-sleeve fitted top','Fitted stretch; proposed sample target',[('T1 Half chest',43,2.5),('T2 Body length (HPS)',52,1),('T3 Shoulder width',35,1),('T4 Sleeve length',60,0.5),('T5 Half hem',38,2.5)])
add('W03','Womens tank / halter','Fitted stretch; proposed sample target',[('T1 Half chest',41,2.5),('T2 Body length (HPS)',43,1),('T5 Half hem',35,2.5),('T11 Strap width',3,0)])
add('W04','Womens bodysuit','Fitted stretch; snap closure. Verify torso and gusset on sample.',[('T1 Half chest',42,2.5),('Half waist',34,2.5),('Half hip',43,2.5),('HPS to crotch closure',70,1.5)])
add('W05','Sports bra / bralette','Stretch support; breast support and cup shape require separate fitting.',[('T1 Half chest',38,2.5),('Underband width relaxed',32,2.5),('T2 Body length (HPS)',31,1),('T11 Strap width',3,0)])
add('W06','Womens leggings','Stretch performance; negative ease provisional.',[('B1 Half waist, relaxed',32,2.5),('B2 Half waist, extended',42,2.5),('B3 Half hip',42,2.5),('B4 Front rise',27,0.5),('B5 Back rise',36,0.5),('B6 Half thigh',24,1.5),('B8 Half leg opening',10,0.5),('B9 Inseam',73,1)])
add('W07','Womens tailored / denim trouser','High waist; relaxed straight/wide silhouette.',[('B1 Half waist, relaxed',36,2.5),('B3 Half hip',51,2.5),('B4 Front rise',30,0.5),('B5 Back rise',40,0.5),('B6 Half thigh',32,1.5),('B8 Half leg opening',25,1),('B9 Inseam',77,1)])
add('W08','Womens shorts','High waist; relaxed silhouette.',[('B1 Half waist, relaxed',35,2.5),('B3 Half hip',51,2.5),('B4 Front rise',29,0.5),('B5 Back rise',39,0.5),('B6 Half thigh',32,1.5),('B8 Half leg opening',31,1.5),('B9 Inseam',12,0.5)])
add('W09','Midi skirt','Proposed woven fit; validate pleat sweep separately.',[('B1 Half waist, relaxed',36,2.5),('B3 Half hip',51,2.5),('Skirt length',78,1),('Half hem sweep',62,3)])
add('W10','Mini skirt / skort','Proposed woven fit; skort inner shorts require fit trial.',[('B1 Half waist, relaxed',36,2.5),('B3 Half hip',51,2.5),('Skirt length',41,1),('Half hem sweep',59,3)])
add('W11','Fitted midi dress','Stretch fit; validate waist position and ease.',[('T1 Half chest',43,2.5),('Half waist',35,2.5),('Half hip',45,2.5),('T2 Body length (HPS)',116,1.5),('Half hem sweep',45,2.5)])
add('W12','Slip dress','Woven bias-cut development target.',[('T1 Half chest',46,2.5),('Half waist',41,2.5),('Half hip',51,2.5),('T2 Body length (HPS)',118,1.5),('Half hem sweep',60,3)])
add('W13','Womens shirt / jersey','Regular fit development target.',[('T1 Half chest',50,2.5),('T2 Body length (HPS)',60,1),('T3 Shoulder width',40,1),('T4 Sleeve length',22,0.5),('T5 Half hem',50,2.5)])
add('W14','Womens jacket','Regular fit over light layers.',[('T1 Half chest',53,2.5),('T2 Body length (HPS)',58,1),('T3 Shoulder width',42,1),('T4 Sleeve length',60,0.5),('T5 Half hem',51,2.5)])
add('W15','Womens coat','Layering fit; proposed development target.',[('T1 Half chest',56,2.5),('T2 Body length (HPS)',108,1.5),('T3 Shoulder width',43,1),('T4 Sleeve length',61,0.5),('T5 Half hem',64,3)])
add('W16','Womens briefs','Stretch underwear development target.',[('B1 Half waist, relaxed',32,2.5),('B3 Half hip',39,2.5),('Side seam length',8,0.5),('Gusset width',6.5,0.2)])
add('W17','Structured corset / bustier','Boning, bust shaping and closure adjustment require dedicated fitting.',[('T1 Half chest',43,2.5),('Half waist',34,2.5),('Centre-front length',36,1),('Side seam length',25,0.5)])
add('W18','Womens fitted wrap blouse','Fitted wrap development target; overlap must remain secure.',[('T1 Half chest',46,2.5),('Half waist',37,2.5),('T2 Body length (HPS)',50,1),('T3 Shoulder width',37,1),('T4 Sleeve length',60,0.5)])
add('W19','Womens knit top / quarter-zip','Regular knit fit; stretch and recovery require sampling.',[('T1 Half chest',49,2.5),('T2 Body length (HPS)',56,1),('T3 Shoulder width',39,1),('T4 Sleeve length',59,0.5),('T5 Half hem',43,2.5)])
add('W20','Womens insulated jacket','Layering fit; verify finished loft and sleeve mobility.',[('T1 Half chest',58,2.5),('T2 Body length (HPS)',62,1),('T3 Shoulder width',46,1),('T4 Sleeve length',61,0.5),('T5 Half hem',56,2.5)])
# Explicit frozen SKU assignments, generated once; runtime does not guess by names.
products=json.load(open(root/'portable/catalog-snapshot.json'))
def classify(p):
 n=p['name'].lower();cat=p['category'].lower();w=p.get('details',{}).get('audience')=='women';codes=[]
 accessory=next((x for x in ['socks','beanie','bucket','cap','belt','scarf','gloves','sunglasses','backpack','duffel','bottle','bag','tote','crossbody','sling'] if re.search(r'\b'+re.escape(x)+r'(?:s)?\b',n)),None)
 if accessory:return [],accessory
 is_set='set' in cat or ' + ' in n or 'tracksuit' in n
 if w:
  if is_set:
   upper='W05' if 'activewear' in n or re.search(r'\bbra\b',n) else 'T22' if 'hood' in n or 'pullover' in n else 'W03' if 'tank' in n else 'W18' if 'wrap' in n else 'W13' if any(x in n for x in ['shirt','tee','jersey','mesh top','satin top']) else 'W14'
   lower='W06' if 'activewear' in n or 'legging' in n else 'W10' if 'skort' in n or 'mini skirt' in n else 'W09' if 'skirt' in n else 'W08' if re.search(r'\bshorts?\b',n) else 'B13' if 'hood' in n or 'pullover' in n else 'W07'
   codes=[upper,lower]
  elif cat in ['jackets and coats','windbreakers']:
   codes=['W15' if 'coat' in n or 'parka' in n or 'trench' in n or 'long puffer' in n else 'W20' if 'puffer' in n or 'insulated' in n or 'quilted' in n else 'W14']
  elif 'dress' in n:codes=['W15' if 'blazer' in n or 'coat' in n else 'W12' if 'slip' in n else 'W11']
  elif 'skirt' in n or 'skort' in n or 'cargo mini' in n:codes=['W10' if 'skort' in n or 'mini' in n else 'W09']
  elif 'bodysuit' in n:codes=['W04']
  elif 'corset' in n or 'bustier' in n:codes=['W17']
  elif 'wrap top' in n or 'wrap blouse' in n:codes=['W18']
  elif 'bralette' in n or re.search(r'\bbra\b',n):codes=['W05']
  elif 'brief' in n:codes=['W16']
  elif 'legging' in n:codes=['W06']
  elif cat=='shorts':codes=['W08']
  elif any(x in n for x in ['jean','denim','carpenter','trouser','cargo','parachute','pant']) and not any(x in n for x in ['jacket','overshirt']):codes=['W07']
  elif 'coat' in n or 'trench' in n:codes=['W15']
  elif any(x in n for x in ['jacket','blazer','bomber','vest','varsity']):codes=['W14']
  elif 'hood' in n:codes=['T22']
  elif any(x in n for x in ['tank','singlet','halter','one-shoulder','performance top','neck crop']):codes=['W03']
  elif 'overshirt' in n:codes=['W13']
  elif 'knit' in n or 'sweater' in n or 'quarter-zip' in n:codes=['W19']
  elif ('long sleeve' in n or 'long-sleeve' in n) and cat=='t-shirts':codes=['W02']
  elif 'tee' in n:codes=['T05' if 'oversized' in n or 'boyfriend' in n else 'W01']
  else:codes=['W13']
 else:
  if is_set:
   codes=['T04','B03'] if 'windbreaker' in n else ['T03','B02'] if 'performance' in n or 'track' in n or 'funnel' in n or 'full zip' in n else ['T01','B01'] if 'hood' in n else ['T18','B04'] if 'denim' in n else ['T15','B10'] if 'sleeveless' in n or 'tank' in n else ['T12','B09']
  elif 'boxer' in n:codes=['B16' if 'brief' in n else 'B17']
  elif cat=='shorts':codes=['B15' if 'swim' in n else 'B12' if 'denim' in n else 'B14' if 'tailored' in n or 'pleat' in n else 'B10' if 'mesh' in n or 'basket' in n else 'B11']
  elif 'carpenter' in n or 'double-knee' in n or 'painter' in n:codes=['B06']
  elif ('jean' in n or 'denim' in n) and not any(x in n for x in ['jacket','overshirt','varsity']):codes=['B05' if 'straight' in n else 'B04']
  elif 'cargo' in n:codes=['B07']
  elif 'parachute' in n:codes=['B08']
  elif 'jogger' in n or 'sweatpant' in n:codes=['B01']
  elif any(x in n for x in ['track pant','technical bottom','nylon track']):codes=['B02']
  elif 'trouser' in n or 'bottom' in n:codes=['B09']
  elif 'coat' in n:codes=['T21']
  elif 'puffer' in n or 'padded' in n or 'quilted' in n:codes=['T20']
  elif 'windbreaker' in n or 'shell' in n or 'anorak' in n:codes=['T04']
  elif 'leather' in n or 'racer' in n or 'moto panel' in n:codes=['T19']
  elif ('denim' in n or 'trucker' in n) and 'overshirt' not in n:codes=['T18']
  elif 'varsity' in n or 'bomber' in n or 'statement jacket' in n:codes=['T17']
  elif 'hoodie' in n:codes=['T01']
  elif 'jacket' in n or 'full zip' in n or 'vest' in n:codes=['T03']
  elif 'sweatshirt' in n or 'crewneck' in n:codes=['T02']
  elif 'overshirt' in n:codes=['T13']
  elif 'rugby' in n:codes=['T10']
  elif 'polo' in n:codes=['T09']
  elif 'quarter-zip' in n or 'sweater' in n:codes=['T11']
  elif any(x in n for x in ['basketball jersey','singlet','sleeveless','tank','racerback','high-neck','split-hem','side-cutout','mesh-overlay']):codes=['T15']
  elif 'jersey' in n:codes=['T14']
  elif 'shirt' in n and not re.search(r'\bt[ -]shirt\b',n):codes=['T12']
  elif 'long-sleeve' in n or 'long sleeve' in n:codes=['T08']
  elif 'fitted' in n or 'rib' in n:codes=['T07']
  else:codes=['T05']
 return codes,None
assignments={};accessory_targets={'socks':{'Foot length relaxed':23,'Leg height from heel':22},'beanie':{'Opening width relaxed':22,'Height unfolded':28},'cap':{'Head circumference minimum':54,'Head circumference maximum':62,'Brim length':7},'bucket':{'Head circumference':58,'Crown height':9,'Brim width':6},'belt':{'Strap width':3.5,'Adjustable usable length minimum':75,'Adjustable usable length maximum':115},'scarf':{'Length':180,'Width':30},'gloves':{'Middle finger to cuff':24,'Palm width':10},'sunglasses':{'Frame width':14.5,'Lens width':5.2,'Bridge width':2},'backpack':{'Height':45,'Width':30,'Depth':15},'duffel':{'Length':50,'Height':28,'Depth':25},'bottle':{'Height':25,'Diameter':7},'bag':{'Height':20,'Width':26,'Depth':8},'tote':{'Height':38,'Width':34,'Depth':10},'crossbody':{'Height':20,'Width':26,'Depth':8},'sling':{'Height':30,'Width':18,'Depth':8}}
for p in products:
 codes,acc=classify(p);specs=[]
 for code in codes:
  b=copy.deepcopy(blocks[code]);n=p['name'].lower();kind='bottom' if code.startswith('B') or code in ['W06','W07','W08','W09','W10','W16'] else 'top'
  # Distinct silhouette adjustments are recorded per style, never altering source block.
  adjustments=[]
  if 'cropped' in n or 'crop ' in n:
   for row in b['rows']:
    if row['label'].startswith('T2 ') and code not in ['T22','W01','W03','W05']:
     row['values']=[round((47 if p.get('details',{}).get('audience')=='women' else 58)+(i-1),1) for i in range(5)];adjustments.append('Cropped body length target')
  if 'longline' in n and code in ['T05','T07','T08']:
   for r in b['rows']:
    if r['label'].startswith('T2 '):r['values']=[83+i*2 for i in range(5)]
   adjustments.append('Longline body length target')
  if 'mini dress' in n and code=='W15':
   for r in b['rows']:
    if r['label'].startswith('T2 '):r['values']=[83.5+i*1.5 for i in range(5)]
   adjustments.append('Proposed mini coat-dress body length; verify waist, belt position and overlap on sample')
  if 'maxi' in n and code in ['W11','W12']:
   for r in b['rows']:
    if r['label'].startswith('T2 '):r['values']=[136.5+i*1.5 for i in range(5)]
   adjustments.append('Maxi body length target')
  if code=='W19' and 'polo' in n:
   for r in b['rows']:
    if r['label'].startswith('T4 '):r['values']=[21.5+i*.5 for i in range(5)]
   adjustments.append('Short-sleeve knit polo target')
  if 'raglan' in n:
   b['rows']=[r for r in b['rows'] if not r['label'].startswith(('T3 ','T4 '))];adjustments.append('Raglan shoulder and sleeve need pattern-specific measurements')
  if 'sleeveless' in n or 'vest' in n or 'basketball' in n:
   b['rows']=[r for r in b['rows'] if not r['label'].startswith(('T4 ','T6 ','T8 '))]
  if ('long-sleeve' in n or 'long sleeve' in n or 'hockey' in n or 'moto jersey' in n) and code in ['T14','T12','W13']:
   for r in b['rows']:
    if r['label'].startswith('T4 '):r['values']=[59.5+i*.5 for i in range(5)] if code=='W13' else [63+i for i in range(5)]
  b.update(kind=kind,adjustments=adjustments);specs.append(b)
 assignments[p['id']]={'name':p['name'],'status':'proposed','revision':'VN-MEAS-02','blocks':specs,'accessory':accessory_targets[acc] if acc else None,'notes':'Finished garment targets in cm. Flat widths unless circumference is stated. Make and approve samples before production. Proposed tolerance: widths/lengths ±1 cm; small details ±0.5 cm. No inferred outseam from rise plus inseam.'}
(root/'data/garment-measurements.json').write_text(json.dumps(assignments,indent=2)+'\n')
(root/'data/garment-measurement-blocks.json').write_text(json.dumps(blocks,indent=2)+'\n')
print('Assigned',len(assignments),'products;',len(blocks),'blocks;',sum(bool(x['accessory']) for x in assignments.values()),'accessories')
