from pathlib import Path
import json,hashlib,zipfile,copy,re,shutil,io
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Image
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing,Rect,Line,Polygon,String
from reportlab.graphics import renderPDF,renderSVG
from pypdf import PdfReader
root=Path(__file__).parent; out=root/'output/pdf/r10';out.mkdir(parents=True,exist_ok=True)
assets=root/'r10-assets'; products=json.loads((root/'r10-products-before.json').read_text())
pdfmetrics.registerFont(TTFont('VN','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('VNB','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
st=getSampleStyleSheet()
st.add(ParagraphStyle(name='VNBody',fontName='VN',fontSize=9,leading=13,spaceAfter=7))
st.add(ParagraphStyle(name='VNTitle',fontName='VNB',fontSize=22,leading=26,spaceAfter=12))
st.add(ParagraphStyle(name='VNHead',fontName='VNB',fontSize=11,leading=15,spaceBefore=10,spaceAfter=6))
st.add(ParagraphStyle(name='VNSmall',fontName='VN',fontSize=7.5,leading=10,spaceAfter=5))
def p(s,style='VNBody'):return Paragraph(escape(str(s)).replace('\n','<br/>'),st[style])
def block(h,s):return [p(h,'VNHead'),p(s)]
def footer(c,d):
 c.setFont('VN',7);c.setFillColor(colors.HexColor('#555555'));c.drawString(40,27,'VANTA NOIR / R10 / 27 OCT 2026 / DESIGN REFERENCE CORRECTION');c.drawRightString(A4[0]-40,27,str(d.page))
def table(rows,width=515):
 t=Table([[p(x,'VNSmall') for x in r] for r in rows],colWidths=[width/len(rows[0])]*len(rows[0]),repeatRows=1)
 t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.4,colors.HexColor('#cccccc')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#eeeeee')),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]));return t
def skort_diagram():
 d=Drawing(510,300)
 d.add(String(12,282,'OUTER PLEATED SHELL',fontName='VNB',fontSize=10));d.add(String(280,282,'ATTACHED INNER SHORTS',fontName='VNB',fontSize=10))
 d.add(Rect(40,224,160,30,fillColor=colors.HexColor('#dddddd'),strokeColor=colors.black))
 d.add(Polygon([40,224,200,224,232,72,8,72],fillColor=colors.HexColor('#eeeeee'),strokeColor=colors.black))
 for a in range(50,200,20):d.add(Line(a,224,(a-120)*1.4+120,72,strokeColor=colors.HexColor('#555555')))
 d.add(Line(20,266,220,266,strokeColor=colors.black));d.add(String(82,270,'M waist 35 cm',fontName='VN',fontSize=8))
 d.add(Line(244,254,244,72));d.add(String(250,160,'35 cm',fontName='VN',fontSize=8))
 d.add(Rect(300,224,160,30,fillColor=colors.HexColor('#dddddd'),strokeColor=colors.black))
 d.add(Polygon([300,224,460,224,476,90,398,90,380,148,362,90,284,90],fillColor=colors.HexColor('#cccccc'),strokeColor=colors.black))
 d.add(Line(380,224,380,148));d.add(Line(380,148,398,90));d.add(String(410,128,'12 cm inseam',fontName='VN',fontSize=8))
 d.add(Line(200,240,300,240,strokeColor=colors.black,strokeDashArray=[4,3]));d.add(String(218,248,'joined',fontName='VN',fontSize=8))
 d.add(String(12,38,'Both components caught into the same waistband seam; inner hem remains free.',fontName='VN',fontSize=9))
 d.add(String(12,20,'Development schematic, not a cutting pattern. Dimensions are authored sampling targets.',fontName='VN',fontSize=8))
 return d
notes={
'vn-p016':'Replaced both Olive and Jet Black rear references with authored true-rear mockups: center-back seat seam, plain rear seat and elastic waistband. Front drawcord and front emblem are absent from rear views; existing outer-leg cargo pockets remain. This closes the missing-rear reference finding for both saved colours.',
'vn-p017':'Replaced both Jet Black and Charcoal rear references with authored true-rear mockups: fixed waistband with center-back loop, rear waist shaping darts and center-back seat seam. No front fly, front pleats or front emblem appears on the rear. Plain rear without added pockets is the R10 design decision.',
'vn-p047':'Replaced both Jet Black and Charcoal back references with inner-face belt mockups showing the rear buckle attachment, folded webbing return and plain reverse tip. The saved triangular V buckle remains; no prong-hole belt is substituted.',
'vn-vd-p04-2-25':'Replaced inconsistent buckle artwork in front/left/right references using unchanged path geometry from the supplied Gold_Source_Outline.svg. Replaced the wrongly labelled back image with an actual rear-strap view; the decorative face is hidden on the opposite side. Corrected generic webbing/zip copy to this leather belt construction.',
'vn-pdf-p05-3-r5-c5':'Replaced the simplified angular chest mark with the exact supplied winged-spire contour in front and visible left-side views. Removed obsolete conflicting front references from the active gallery. Corrected pointed-collar copy to the visible ribbed bomber collar and documented side snaps.',
'vn-pdf-p06-2-r3-a2':'Full-resolution front and rear references both show separate leg openings and a crotch division. This is a pleated culotte short, not an unverified skirt with hidden inner shorts. The four exterior views are retained and the construction/description now explicitly state two outer trouser legs.',
'vn-pdf-p06-2-r3-c2':'Resolved the hidden-construction ambiguity by authoring an attached-inner-short skort design. The existing pleated outer silhouette, piping and front emblem are retained. A separate inner-short construction drawing and measurement schedule are supplied. This is a new documented design specification, not a claim that an unseen sample was inspected.'}
patches=[];manifest=[]
for prod in products:
 id=prod['id'];d=copy.deepcopy(prod['details_json']);fields={};d['specificationStatus']='reference';d.pop('specificationApprovedAt',None)
 if 'sizeGuide' in d:d['sizeGuide']['status']='reference'
 d['techPackConstructionRevision']='R10 reconciled design-reference instructions / 2026-10-27'
 if id=='vn-p016':
  d['features']='Relaxed straight-leg cargo trousers; elastic waistband and front drawcord; large upper outer-thigh and smaller lower outer-leg flap pockets. R10 rear: plain seat, center-back seam; no rear patch pockets or rear emblem.'
  d['hardware']='Front drawcord and its existing eyelets/tips only. Rear waistband has no cord exit. Do not add the generic zip previously mentioned.'
 elif id=='vn-p017':
  d['features']='Wide tailored legs, front pleats and fixed waistband with belt loops. R10 rear: center-back loop, shaping darts and center-back seat seam; plain seat without rear pockets. Emblem remains front-only.'
 elif id=='vn-p047':
  d['features']='35 mm woven strap; retained triangular V buckle; reverse attachment bar and stitched folded return; black leather end tip. No prong holes or substituted buckle.'
  d['hardware']='Retain triangular V frame and compatible 35 mm webbing attachment. Fold return 80 mm and box-and-cross stitch. Reverse view documents assembly direction; validate frame clearance and adjustment retention on hardware sample.'
 elif id=='vn-vd-p04-2-25':
  fields['name']='Winged-Spire Leather Belt';fields['description']='Black smooth-leather belt with gold-tone winged-spire buckle, stitched edges, keeper and adjustable fastening.'
  d.update(garmentType='Leather belt with winged-spire buckle',fabric='Smooth black leather face with smooth lining; proposed finished strap thickness 3 mm. Supplier must confirm hide grade, lining and composition.',fabricWeight='Not applicable; thickness target 3 mm.',features='Black smooth-leather strap, 35 mm wide\nFine edge stitching and keeper\nAdjustment holes\nGold-tone exact-master winged-spire buckle',hardware='Front emblem 62.00 x 42.26 mm, exact supplied contour; gold-tone finish. Proposed 2.5 mm metal face thickness on a concealed supporting carrier: the separated wing pieces must be mechanically joined behind the face. Rear attachment accepts 35 mm strap; retain adjustment-hole fastening. Hardware maker must validate carrier, pin and load clearance on CAD/sample without changing visible master geometry.',stitching='Skive folded leather return; secure attachment with bonded-thread lockstitch and suitable leather-point needle. Edge stitch 2 mm from edge; finish edges smoothly. No generic zip or webbing heat-sealing operation.',labels='Brand/size identification on inner strap or hangtag. No garment neck label or hanging care label. Confirm actual composition and origin before label printing.',artworkLock='R10 exact supplied Gold_Source_Outline.svg contour. Finished face width 62.00 mm and proportional height 42.26 mm. No smoothing, redraw, extra wings or substitution. Three mockup angles derive from the same path strings. Separate 1:1 SVG controls tooling silhouette; finish shading is illustrative.')
  d['artworkApplications']=[{'position':'Front buckle face centered on strap fastening','dimensions':'62.00 x 42.26 mm; preserve aspect ratio','method':'Gold-tone metal face on concealed carrier; factory CAD and sample validation'}]
 elif id=='vn-pdf-p05-3-r5-c5':
  d['features']='Diamond quilting\nSleeveless vest\nRibbed bomber collar and armhole binding\nSnap front and side snap plackets\nTwo front welt pockets\nWhite exact-master emblem on wearer-left chest; plain back'
  d['hardware']='Retain visible silver-tone front and side snaps, following view placement. No zip or pointed shirt collar.'
  d['sizeGuide']['sections'][0]['title']='Diamond-quilted vest / retained sampling targets'
  d['artworkLock']='R10 exact supplied Gold_Source_Outline.svg contour, recoloured white. Finished embroidery target width 80.00 mm, proportional height 54.53 mm. Center on wearer-left chest, 110 mm horizontally from center-front and 160 mm below high shoulder point (size M); grade placement with chest block. No rear emblem. Artwork is exact vector; digitised stitch file and actual sew-out must be validated on the quilted shell.'
  d['artworkApplications']=[{'position':'Wearer-left chest; M center 110 mm from center-front, 160 mm below high shoulder point','dimensions':'80.00 x 54.53 mm','method':'White embroidery using supplied unchanged contour; stitch digitising and sew-out required'}]
 elif id=='vn-pdf-p06-2-r3-a2':
  fields['name']='Pleated Culotte Shorts - Charcoal Pinstripe';fields['description']='Charcoal pinstripe pleated shorts with two separate wide legs, a branded waistband and saved white graphic details.'
  d.update(garmentType='Pleated culotte shorts',contents='One pair of pleated shorts',features='Two separate outer trouser legs and crotch seam, visible in front and rear views\nDense pleats create a skirt-like volume\nCharcoal pinstripe fabric\nBranded waistband and saved white details',stitching='Construct two outer short legs with front/back rise and inseam seams; overedge allowances, join crotch and apply waistband. Set pleats symmetrically and match pinstripes. This is not a single skirt shell; no concealed short component is required to explain the saved design.',hardware='No exposed zip or metal hardware visible. Retain waistband construction and use a concealed side closure only if the fitted pattern requires it; sample must demonstrate entry/fit.')
  d['sizeGuide']['sections'][0]['title']='Pleated culotte shorts / retained sampling targets'
 elif id=='vn-pdf-p06-2-r3-c2':
  fields['name']='Pleated Tennis Skort';fields['category']='Skirts and skorts';fields['description']='Black pleated tennis skort with white piping, the saved front emblem and attached inner shorts.'
  d.update(garmentType='Pleated tennis skort with attached inner shorts',contents='One skort: pleated outer shell and attached inner shorts',fabric='Outer: proposed black polyester-rich woven suitable for permanent pleating, 180-220 GSM. Inner shorts: proposed 90% polyester / 10% elastane jersey, 180 GSM. Confirm swatches and care tests.',fabricWeight='Outer 180-220 GSM; inner 180 GSM design targets.',features='Pleated outer skirt shell with saved white piping and emblem\nAttached black stretch inner shorts\nOuter shell and inner shorts joined at one waistband seam\nInner short hems free and concealed below shell',stitching='Pleat and join the outer shell; retain white piping. Construct inner shorts with stretch-compatible overlock seams and coverstitched hems. Join shell and inner-short waist edges into the same waistband, align side seams and crotch orientation. Keep inner hems free; tack inner to outer only at waistband, not at pleat hems.',hardware='Soft waistband elastic; no exposed metal closure. Confirm entry stretch on the pattern and sample.',sizeNotes='R10 authored sampling targets, finished flat cm. Outer shell and inner shorts have separate charts. Outer length is measured from top waistband to hem; inner inseam from crotch junction to hem. These are design targets, not measurements inferred from hidden photographic detail.')
  sizes=['S','M','L','XL','XXL'];outer=[];inner=[]
  for i,s in enumerate(sizes):
   outer.append({'size':s,'waist':32.5+2.5*i,'hip':48.5+2.5*i,'length':34+i})
   inner.append({'size':s,'waist':32.5+2.5*i,'hip':46.5+2.5*i,'frontRise':26+i,'backRise':35+i,'inseam':11.5+.5*i,'legOpening':25.5+1.5*i})
  d['sizeGuide']={'status':'reference','notes':d['sizeNotes'],'sections':[{'kind':'bottom','title':'Outer pleated shell / R10 targets','rows':outer},{'kind':'bottom','title':'Attached inner shorts / R10 targets','rows':inner}]};d['sizeChart']=[]
 if 'name' in fields:d['seoTitle']=fields['name']+' | Vanta Noir';d['seoDescription']=fields['description']
 d['visualReview']={'revision':'VISUAL-R10-20261027','status':'corrected-reference','scope':'Seven remaining R08 design-reference findings; stated colours/views and construction decisions only. Physical testing and global catalogue certification are separate.','notes':notes[id],'corrections':['referenceViews','constructionSpecification','manufacturingAttachments'],'previousReview':d['visualReview'],'savedPDFNotice':'R10 correction pack supersedes conflicting R07/R08/R09 descriptions, references and affected dimensions. Retain unchanged original specifications. This closes the reference finding, not bulk-production approval.'}
 changed={k:v for k,v in d.items() if v!=prod['details_json'].get(k)};patches.append({'id':id,'fields':fields,'detailsPatch':changed,'removeDetailsKeys':['specificationApprovedAt']})
 name=fields.get('name',prod['name']);folder=out/id;folder.mkdir(exist_ok=True)
 story=[p('VANTA NOIR / R10 CORRECTION PACK','VNSmall'),p(name,'VNTitle'),p(id,'VNSmall')]
 story+=block('Resolved reference finding',notes[id]);story+=block('Version precedence',d['visualReview']['savedPDFNotice'])
 story+=block('Design authority and limits','R10 is an authored design-reference correction under the owner instruction to finish the findings. Rendered rear views and hidden construction are documented design decisions. They are not photographs of manufactured samples. Actual fit, material performance, hardware tooling and embroidery sew-out still need factory validation.')
 story.append(PageBreak());story.append(p('Corrected references','VNTitle'))
 images=list(assets.glob(id+'-*.webp'))
 if not images:
  prefix=id.replace('vn-pdf-','pdf-');base=root/'vanta-noir/public/images/catalogue/studio-grey';images=[base/(prefix+'-front.webp'),base/(prefix+'-back.webp')]
 cells=[]
 for im in images:
  from PIL import Image as PILImage
  iw,ih=PILImage.open(im).size;scale=min(235/iw,250/ih)
  pic=PILImage.open(im).convert('RGB');pic.thumbnail((900,900));buf=io.BytesIO();pic.save(buf,'JPEG',quality=90);buf.seek(0)
  cells.append([Image(buf,width=iw*scale,height=ih*scale),p(im.stem.replace(id+'-',''),'VNSmall')])
 for i in range(0,len(cells),2):
  row=[Table([[x] for x in c],colWidths=[245]) for c in cells[i:i+2]]
  if len(row)==1:row.append('')
  story.append(Table([row],colWidths=[255,255]));story.append(Spacer(1,8))
 story.append(PageBreak());story.append(p('Construction and artwork','VNTitle'))
 for title,key in [('Design features','features'),('Material target','fabric'),('Assembly','stitching'),('Hardware','hardware'),('Artwork instruction','artworkLock')]:story+=block(title,d.get(key,''))
 if id=='vn-pdf-p06-2-r3-c2':
  story+=[PageBreak(),p('Inner-short construction','VNTitle'),skort_diagram()]
  draw=skort_diagram();renderSVG.drawToFile(draw,str(folder/'Inner-Short-Construction-R10.svg'));renderPDF.drawToFile(draw,str(folder/'Inner-Short-Construction-R10.pdf'))
  story+=block('Assembly sequence','1. Make and press the outer pleated shell. 2. Sew the two inner-short legs, crotch and stretch hems. 3. Align both waist openings, matching side and center marks. 4. Attach both components to the waistband. 5. Confirm the inner legs remain concealed during standing and movement; adjust the sample before bulk cutting.')
 if d.get('sizeGuide',{}).get('sections'):
  story+=[PageBreak(),p('Sampling measurements','VNTitle'),p(d.get('sizeNotes','Finished flat cm; retained design targets. Physical validation required.'))]
  for sec in d['sizeGuide']['sections']:
   story.append(p(sec['title'],'VNHead'));rs=sec['rows'];keys=list(rs[0]) if rs else []
   if keys:story.append(table([keys]+[[r.get(k,'') for k in keys] for r in rs]))
  story+=block('Measurement rule','Widths are one-side flat widths, not body circumference. Retained numbers remain design targets. Do not scale mockup photographs for pattern dimensions. Confirm tolerances, seam reserves, fit and movement on the sample.')
 f=out/(id+'-Visual-Correction-R10.pdf');SimpleDocTemplate(str(f),pagesize=A4,rightMargin=40,leftMargin=40,topMargin=38,bottomMargin=48,title=name+' R10',author='Vanta Noir').build(story,onFirstPage=footer,onLaterPages=footer)
 b=f.read_bytes();assert id in ''.join(x.extract_text() or '' for x in PdfReader(f).pages)
 manifest.append({'id':id,'file':f.name,'path':str(f),'kind':'review','color':'R10 resolved reference / construction correction','pages':len(PdfReader(f).pages),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'md5':hashlib.md5(b).hexdigest(),'key':'tech-packs/r4-20261026/'+f.name})
 (folder/'Current-R10-Specification.json').write_text(json.dumps({'id':id,'name':name,'details':d},indent=2))
 if id in ['vn-vd-p04-2-25','vn-pdf-p05-3-r5-c5']:
  art='belt-emblem-62mm.svg' if id=='vn-vd-p04-2-25' else 'vest-emblem-80mm.svg';shutil.copy(assets/art,folder/art)
  masterdir=root/'master-r10/extracted/VANTA_NOIR_Master_Vector_Geometry_2026/03_Emblems'
  for ext in ['svg','pdf','eps']:shutil.copy(masterdir/('Gold_Source_Outline.'+ext),folder/('Supplied-Master-Source.'+ext))
  shutil.copy(assets/'master-geometry-verification.json',folder/'Master-Geometry-Verification.json')
  (folder/'ARTWORK-READ-ME.txt').write_text('Use the garment-specific millimetre SVG for final silhouette and size. The supplied source PDF/EPS retains original source page size: scale proportionally to the specified width, never to page width. Path coordinates are unchanged. The source archive itself describes these as vector reconstructions of supplied artwork. Embroidery stitch digitising, hardware engineering and physical samples are not replaced by these geometry files.\n')
 zpath=out/(id+'-R10-Reference-Artwork.zip')
 with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED) as z:
  for q in folder.iterdir():z.write(q,q.name)
  for q in images:z.write(q,'Views/'+q.name)
 b=zpath.read_bytes();manifest.append({'id':id,'file':zpath.name,'path':str(zpath),'kind':'artwork','color':'R10 corrected views, specification and applicable vector/drawing files','bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'md5':hashlib.md5(b).hexdigest(),'key':'tech-packs/r4-20261026/'+zpath.name})
(root/'r10-product-patches.json').write_text(json.dumps(patches,indent=2));(root/'r10-attachment-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'pdfs':7,'attachments':len(manifest),'pages':sum(m.get('pages',0) for m in manifest),'maxBytes':max(m['bytes'] for m in manifest)}))
