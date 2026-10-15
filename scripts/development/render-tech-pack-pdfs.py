# Requires WeasyPrint and beautifulsoup4. Input: exported pack folder with coverage.json and local assets.
import json,pathlib,concurrent.futures,time,logging,copy,sys
from bs4 import BeautifulSoup
from weasyprint import HTML
logging.getLogger('weasyprint').setLevel(logging.ERROR)
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'techpacks-r06').resolve();rows=json.load(open(root/'coverage.json'))
def render(r):
 try:
  f=root/r['file'];s=BeautifulSoup(f.read_text(),'html.parser')
  for attempt in range(8):
   pages=s.select('article.sheet')
   for n,a in enumerate(pages):a.select('.footer span')[-1].string=f'Page {n+1} of {len(pages)}'
   doc=HTML(string=str(s),base_url=str(f.parent)).render();bad=[]
   for i,p in enumerate(doc.pages):
    boxes=list(p._page_box.descendants());c=next((b for b in boxes if b.element is not None and b.element.get('class')=='sheet-content'),None);ft=next((b for b in boxes if b.element is not None and b.element.get('class')=='footer'),None)
    if c is not None and ft is not None and c.position_y+c.height>ft.position_y+3:bad.append(i)
   if not bad and len(doc.pages)==len(pages):break
   if len(doc.pages)!=len(pages):
    # A long section can create a page without its footer. Split any section whose content exceeds usable A4 height.
    bad=[]
    for a in pages:
     single=copy.copy(s);single.select_one('main').clear();single.select_one('main').append(copy.copy(a));dd=HTML(string=str(single),base_url=str(f.parent)).render()
     if len(dd.pages)>1:bad.append(pages.index(a))
    if not bad:raise ValueError('Unmapped page count')
   for i in sorted(set(bad),reverse=True):
    a=pages[i];c=a.select_one('.sheet-content');children=list(c.find_all(recursive=False));body=children[1:]
    if len(body)==1:
     node=body[0];sub=list(node.find_all(recursive=False))
     if len(sub)<2:raise ValueError('Unsplittable content '+a.select_one('.footer').get_text())
     for x in sub:node.insert_before(x.extract())
     node.decompose();children=list(c.find_all(recursive=False));body=children[1:]
    new=copy.copy(a);nc=new.select_one('.sheet-content');nc.clear();nc.append(copy.copy(children[0]));split=max(1,len(body)//2)
    for x in body[split:]:nc.append(x.extract())
    title=new.select('.footer span')[0];title.string=title.get_text().replace(' — CONTINUED','')+' — CONTINUED';a.insert_after(new)
  else:raise ValueError('Pagination did not converge')
  f.write_text(str(s));dest=root/'pdf'/(f.stem+'.pdf');doc.write_pdf(dest)
  return {'id':r['id'],'color':r['color'],'file':str(dest.relative_to(root)),'pages':len(doc.pages),'issues':[],'bytes':dest.stat().st_size}
 except Exception as e:return {'id':r['id'],'color':r['color'],'error':str(e)}
if __name__=='__main__':
 result=[];start=time.time()
 with concurrent.futures.ProcessPoolExecutor(max_workers=6) as p:
  for i,r in enumerate(p.map(render,rows)):
   result.append(r)
   if (i+1)%50==0:print(json.dumps({'rendered':i+1,'seconds':round(time.time()-start)}),flush=True)
 (root/'pdf-review-status.json').write_text(json.dumps(result,indent=2));m={(r['id'],r['color']):r for r in result}
 for r in rows:r['pages']=m[r['id'],r['color']].get('pages',r['pages'])
 (root/'coverage.json').write_text(json.dumps(rows,indent=2));print(json.dumps({'finished':len(result),'errors':[r for r in result if 'error'in r]}),flush=True)
