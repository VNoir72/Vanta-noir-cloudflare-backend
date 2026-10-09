"""Planning model only. No physical weight claims and no checkout activation.
Usage: python scripts/estimate-catalogue-parcels.py INPUT_JSON OUTPUT_DIRECTORY
"""
import json,math,re,sys,uuid
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import quote
RUN='catalogue-estimate-2026-10-09-v1'
FACTOR={'S':.90,'M':.95,'L':1,'XL':1.08,'XXL':1.16}
def up(x):return int(math.ceil(x/10)*10)
def has(pattern,text):return bool(re.search(pattern,text,re.I))
def component(p,sec,size,idx):
 text=' '.join([sec.get('title',''),p['type'] if len(p.get('sections') or [])<2 else '']).lower()
 fabric=(p.get('fabric') or '').lower(); alltext=' '.join([text,fabric,p.get('features') or '']).lower()
 kind=sec.get('kind','top'); notes=[]
 if p['category']=='Singlets and tanks' and has('jacket|coat',text):
  text=(p.get('type') or p['name']).lower()+' sleeveless tank';alltext=text+' '+fabric;notes.append('Conflicting jacket size chart on tank: sleeveless silhouette assumed; verify fabric and chart')
 nums=[int(x) for x in re.findall(r'(\d{2,4})\s*GSM',p.get('gsm') or '',re.I)]
 # For distinct set fabrics, assign the first to the top and second to bottom.
 gsm=nums[min(idx,len(nums)-1)] if nums else (420 if 'denim' in fabric else 360 if has('fleece|terry',fabric) else 450 if 'wool' in fabric else 240)
 if not nums:notes.append('GSM assumed; supplier specification missing')
 if len(nums)>1 and len(p.get('sections') or [])<2:
  gsm=nums[0]*.9+nums[1]*.1;notes.append('Mixed fabric: assumed 90/10 surface split')
 rows=sec.get('rows') or [];r=next((r for r in rows if r.get('size')==size),None)
 f=FACTOR.get(size,1)
 if not r:
  notes.append('Missing size chart: typical silhouette dimensions assumed')
  r={'chest':60*math.sqrt(f),'hip':58*math.sqrt(f),'length':(105 if kind=='bottom' else 74)*math.sqrt(f),'sleeve':62*math.sqrt(f)}
 chest=r.get('chest',r.get('hip',52));length=r.get('length');hip=r.get('hip',chest)
 if kind=='bottom':
  shorts=has('short|skort',text);skirt=has('skirt|skort',text)
  length=length or (r.get('inseam',22 if shorts else 77)+(27 if shorts else 29))
  if shorts:length=min(length,60)
  area=2*hip*length/10000
  area*=1.45 if skirt and 'pleat' in text else 1.15 if skirt else 1.20 if has('wide|baggy|cargo|carpenter',text) else 1.08
  if has('legging|cycling',text):area*=.85
  if 'skort' in text:area+=.28*f
  extras=55 if has('jean|denim|cargo|carpenter',alltext) else 30
  dims=[32,23,4] if not shorts else [24,17,3]
 elif kind=='onepiece':
  length=length or 105;area=2*max(chest,hip)*length/10000*1.12
  if 'sleeve' in r:area+=2*r['sleeve']*(.40*chest)/10000
  extras=30;dims=[32,23,4]
 else:
  length=length or 70
  sleeveless=has('sleeveless|singlet|tank|bralette|sports bra|halter',text)
  short=has('short.sleeve|\btee\b|t-shirt|football|basketball|camp|bowling|polo',text) and not has('long.sleeve|rugby',text)
  sleeve=0 if sleeveless else min(r.get('sleeve',25),28) if short else r.get('sleeve',62)
  if short and r.get('sleeve',0)>35:notes.append('Short-sleeve design conflicts with chart; capped assumed sleeve at 28 cm')
  area=(2*chest*length+2*sleeve*(.40*chest))/10000*1.08
  if has('hood',text):area+=.36*f # double-layer hood included
  if has('hoodie|sweatshirt|fleece|terry',alltext):area+=.13*f # rib and pocket allowance
  extras=25
  if has('jacket|blazer|bomber|coat|varsity|parka|overshirt',text):extras+=55
  if has('zip',text):extras+=35
  dims=[24,17,2] if short or sleeveless or has('crop|bralette|bra',text) else [32,23,4]
 if has('cargo|carpenter|multi.pocket',text):area+=.15*f
 if has('shirt|polo',text) and not has('sweatshirt|t-shirt',text):area+=.08*f
 lining=0
 if has('jacket|blazer|coat|bomber|varsity|puffer|quilt',text):lining=area*.85*70
 if has('puffer|quilt',text):lining+=area*130;notes.append('Assumed 130 GSM insulation and 70 GSM lining')
 if has('leather',alltext):
  if not nums:gsm=650 if 'genuine' in alltext or 'lamb' in alltext else 400
  extras+=80 if has('jacket|coat|bomber|blazer',text) else 0;notes.append('Leather/backing and hardware uncertain')
 mass=area*gsm+extras+lining
 if gsm>330 or has('hood|sweater|knit|denim|jean',text):dims=[32,23,6]
 if has('coat|puffer|parka',text):dims=[40,30,10]
 elif has('jacket|bomber|varsity|blazer',text):dims=[32,23,7]
 if kind=='bottom' and has('short',text):dims=[24,17,3 if gsm<300 else 4]
 dims[2]=round(dims[2]*max(1,f),1)
 return mass,dims,{'piece':sec.get('title') or text,'areaM2':round(area,3),'gsm':round(gsm,1),'trimsGrams':extras,'liningFillGrams':round(lining),'notes':notes}
def estimate(p,size):
 text=' '.join([p.get('type') or '',p['name']]).lower();cat=p['category'];f=FACTOR.get(size,1)
 accessory=None
 for pattern,mass,dims in [(r'sunglass',100,[18,8,6]),(r'bottle',350,[25,9,9]),(r'backpack',800,[40,30,10]),(r'duffel|gym.*bag',750,[40,30,10]),(r'tote',350,[24,17,4]),(r'bag|crossbody|sling',550,[24,17,8]),(r'belt',300,[20,15,4]),(r'sock',100,[20,14,3]),(r'glove',120,[20,15,3]),(r'scarf',250,[24,17,4]),(r'beanie',150,[20,15,4]),(r'cap|hat',180,[24,17,10])]:
  if has(pattern,text) and cat in ['Fashion accessories','Training accessories','Headwear','Underwear and socks','Bags']:accessory=(mass,dims);break
 if accessory:
  mass,dims=accessory;parts=[{'piece':'Accessory unit / one pair for socks and gloves','assumedMassGrams':mass,'notes':['Category-based assumption; GSM cannot establish assembled accessory weight']}]
 else:
  secs=p.get('sections') or []
  if not secs:
   kind='bottom' if cat in ['Shorts','Jeans','Trousers and utility pants','Joggers and track pants','Cargo trousers','Track pants','Leggings','Skirts and skorts','Skirts'] else 'onepiece' if cat=='Dresses' else 'top'
   secs=[{'kind':kind,'title':p.get('type') or p['name']}]
  components=[component(p,s,size,i) for i,s in enumerate(secs)]
  mass=sum(x[0] for x in components);parts=[x[2] for x in components]
  dims=[max(x[1][0] for x in components),max(x[1][1] for x in components),sum(x[1][2] for x in components)]
  # Preserve explicit earlier size-L mass assumptions where they exist; still unmeasured.
  match=re.search(r'Estimated size-L (?:set )?mass:\s*([\d,]+)\s*g',p.get('features') or '',re.I)
  if match:mass=int(match[1].replace(',',''))*f;parts.append({'explicitDesignMassGrams':mass,'notes':['Prior design estimate, not a physical measurement']})
  if cat=='Underwear and socks' and 'sock' not in text:mass=min(mass,160*f);dims=[20,15,3];parts.append({'notes':['Underwear silhouette cap; reference charts may describe generic full-length tops']})
 # Garment + 15% provisional planning allowance + 10 g removable tags/inner wrap.
 shipping=up(mass*1.15+10)
 return {'data':{'weightGrams':shipping,'lengthCm':dims[0],'widthCm':dims[1],'heightCm':dims[2],'measured':False},'garmentEstimateGrams':up(mass),'basis':parts}
def main():
 products=json.load(open(sys.argv[1]));out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
 profiles=[];report=[]
 for p in products:
  entry={k:p.get(k) for k in ['id','name','category','fabric','gsm']};entry['sizes']={}
  for size in p['sizes']:
   result=estimate(p,size);entry['sizes'][size]=result
   profiles.append({'productId':p['id'],'size':size,'key':'parcel-item:'+quote(p['id'],safe="-_.!~*'()")+':'+quote(size,safe="-_.!~*'()"),'value':{'revision':str(uuid.uuid4()),'data':result['data'],'updatedAt':datetime.now(timezone.utc).isoformat(),'estimateRun':RUN,'basis':'Design estimate: fabric/size-chart model; 15% planning allowance + 10 g tags/inner wrap. Not measured.'}})
  report.append(entry)
 packages=[]
 for id,name,dims,box,wrap,limit in [('small-folding-box','Small folding box',[25,18,8],400,30,3000),('medium-standard-box','Medium standard box',[36,25,15],800,60,8000),('large-bulk-carton','Large bulk carton',[46,36,20],1500,100,15000),('luxury-gift-box','Luxury gift box',[36,25,15],700,60,5000)]:
  packages.append({'id':id,'name':name+' — estimate','lengthCm':dims[0],'widthCm':dims[1],'heightCm':dims[2],'tareGrams':box+wrap,'maxWeightGrams':limit,'measured':False})
 (out/'profiles.json').write_text(json.dumps(profiles,separators=(',',':')))
 (out/'packaging.json').write_text(json.dumps({'revision':str(uuid.uuid4()),'data':packages,'estimateRun':RUN},separators=(',',':')))
 (out/'calculations.json').write_text(json.dumps(report,ensure_ascii=False,separators=(',',':')))
 lines=['# Provisional catalogue shipping weights','', 'All values are estimates, not measurements. Saved item weights include a 15% planning allowance and 10 g for tags/inner wrapping. Box/tissue/tape weight is added once per parcel, separately. These assumptions do not enable live checkout rates.','', 'Calculation: estimated fabric area × specified/assumed GSM + trims + assumed lining/fill. Size charts grade areas; sets sum included components. No manufacturing cutting waste is added. Accessories without mass specifications use disclosed category assumptions. Allow roughly ±25–40% uncertainty; this is a planning judgement, not a statistical confidence interval. Folded dimensions are also provisional.','', 'Box presets: small 25×18×8 cm, 400+30=430 g; medium 36×25×15 cm, 800+60=860 g; large 46×36×20 cm, 1500+100=1600 g; luxury assumed 36×25×15 cm, 700+60=760 g. The luxury dimensions and all gross-weight limits are planning assumptions, not manufacturer ratings. Luxury packaging may need an outer transit carton.','', 'The source articles give broad examples, not specifications for the proposed boxes. In particular, Packing Solution associates its quoted weight bands with larger dimensions. User-provided sizes/ranges are retained as provisional presets.','', 'Source links: https://packingsolution.co.uk/blogs/news/weight-of-a-cardboard-box-in-kg ; https://gentlever.com/standard-box-sizes/ ; https://gentlever.com/how-much-does-a-cardboard-box-weigh/','', '| Product | Fabric target | S | M | L | XL | XXL | Other |','|---|---|---:|---:|---:|---:|---:|---|']
 for p in report:
  clean=lambda s:str(s or '').replace('|','/').replace('\n',' ')
  vals=[str(p['sizes'][s]['data']['weightGrams'])+' g' if s in p['sizes'] else '—' for s in ['S','M','L','XL','XXL']]
  other=', '.join(s+': '+str(v['data']['weightGrams'])+' g' for s,v in p['sizes'].items() if s not in FACTOR)
  lines.append('| '+' | '.join([clean(p['name'])+' (`'+p['id']+'`)',clean(p['gsm']),*vals,other])+' |')
 (out/'garment-weight-estimates.md').write_text('\n'.join(lines)+'\n')
 print(json.dumps({'products':len(products),'profiles':len(profiles),'packaging':len(packages),'min':min(r['value']['data']['weightGrams'] for r in profiles),'max':max(r['value']['data']['weightGrams'] for r in profiles)}))
if __name__=='__main__':main()
