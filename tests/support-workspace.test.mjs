import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
test('support enquiries enforce owner approval, role boundaries and version conflicts',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/support-test-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256',{extractable:true}),issuer='https://support-test.cloudflareaccess.com',jwk={...await exportJWK(publicKey),kid:'support',alg:'RS256',use:'sig'};
 const mf=new Miniflare({modules:true,scriptPath:'work/support-test-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'support'},outboundService:async()=>Response.json({keys:[jwk]})});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const tokens={};for(const role of ['owner','support','sales','catalogue']){tokens[role]=await new SignJWT({email:role+'@example.com'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(issuer).setAudience('support').setIssuedAt().setExpirationTime('10m').sign(privateKey);if(role!=='owner')await db.prepare('INSERT INTO admin_staff(email,role,active) VALUES(?,?,1)').bind(role+'@example.com',role).run();}
 const req=(role,path,body)=>mf.dispatchFetch('https://api.example.com/api/admin/'+path,{method:body?'POST':'GET',headers:{'cf-access-jwt-assertion':tokens[role]||'',Origin:'https://api.example.com','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const create={id:crypto.randomUUID(),subject:'Delivery follow-up',customerName:'Sample customer',channel:'email',category:'delivery',priority:'high',assignedTo:'support@example.com',note:'Customer asked for a delivery update.'};
 const submit=async(action,data)=>{const r=await req('support','support',{action,data}),v=await r.json();assert.equal(r.status,202,JSON.stringify(v));return {...v,id:v.requestId};};
 const review=id=>req('owner','approvals',{id,decision:'approve'});
 const ticket=()=>db.prepare('SELECT * FROM support_tickets WHERE id=?').bind(create.id).first();
 for(const role of ['sales','catalogue'])assert.equal((await req(role,'support')).status,403);
 assert.notEqual((await req('anonymous','support')).status,200);
 const first=await submit('support:create',create);assert.equal(await ticket(),null);assert.equal((await submit('support:create',create)).id,first.id);
 assert.equal((await req('support','approvals',{id:first.id,decision:'approve'})).status,403);
 const reviewed=await review(first.id);assert.equal(reviewed.status,200,await reviewed.text());assert.equal((await ticket()).version,1);
 const notes=()=>db.prepare('SELECT COUNT(*) AS n FROM support_notes WHERE ticket_id=?').bind(create.id).first();assert.equal((await notes()).n,1);
 const listed=await (await req('support','support?mine=1&q=delivery')).json();assert.equal(listed.tickets.length,1);assert.equal(listed.counts.mine,1);
 const update={id:create.id,version:1,status:'waiting_customer',priority:'normal',assignedTo:'support@example.com',note:'Waiting for the address confirmation.'};
 const follow=await submit('support:update',update);assert.equal((await ticket()).status,'open');assert.equal((await notes()).n,1);
 assert.equal((await review(follow.id)).status,200);assert.equal((await ticket()).status,'waiting_customer');assert.equal((await notes()).n,2);assert.equal((await review(follow.id)).status,409);
 const stale=await submit('support:update',{...update,version:2,status:'resolved'});
 assert.equal((await req('owner','support',{action:'support:update',data:{...update,version:2,status:'in_progress',note:''}})).status,200);
 assert.equal((await (await review(stale.id)).json()).status,'conflict');assert.equal((await ticket()).status,'in_progress');
 assert.equal((await req('support','support',{action:'support:create',data:{...create,id:crypto.randomUUID(),orderReference:'MISSING'}})).status,409);
 assert.equal((await req('support','support',{action:'support:create',data:{...create,id:crypto.randomUUID(),assignedTo:'sales@example.com'}})).status,409);

 const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});const v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v;};
 const products=await rpc('listCatalog'),product=products[0],variantId=product.colorways[0].variantIds.S;
 await db.prepare('UPDATE product_variants SET stock=5 WHERE id=?').bind(variantId).run();
 const order=await rpc('createPendingOrder',{customer:{email:'lookup@example.com',firstName:'Ada',lastName:'Sample',phone:'08012345678',addressLine1:'Sample street',addressLine2:'',city:'Kaduna',state:'Kaduna'},cart:[{variantId,quantity:1}],shippingKobo:0,expectedTotalKobo:product.priceKobo});
 for(const q of ['Ada Sample','lookup@example.com','08012345678',order.reference]){const found=await (await req('support','operations?resource=orders&q='+encodeURIComponent(q))).json();assert.equal(found.orders.length,1,JSON.stringify(found));assert.equal(found.orders[0].reference,order.reference);}
 assert.equal((await (await req('support','operations?resource=orders&q=%25')).json()).orders.length,0,'Search treats wildcards literally');
 const publicData={requestId:crypto.randomUUID(),name:'Ada Sample',email:'lookup@example.com',phone:'08012345678',subject:'Where is my parcel?',message:'Please check the delivery of my order.',orderReference:order.reference,category:'delivery',serious:true};
 const publicReq=(data,ip='192.0.2.1',origin='https://vantanoir.store')=>mf.dispatchFetch('https://api.example.com/api/support',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':ip},body:JSON.stringify(data)});
 assert.equal((await publicReq(publicData,'192.0.2.1','https://bad.example')).status,403);
 assert.equal((await publicReq({...publicData,website:'spam'})).status,400);
 const replies=await Promise.all([publicReq(publicData),publicReq(publicData)]);const receipts=await Promise.all(replies.map(r=>r.json()));assert.equal(receipts[0].reference,receipts[1].reference);assert.match(receipts[0].reference,/^VN-HELP-/);assert.deepEqual(Object.keys(receipts[0]),['reference']);
 const incoming=await db.prepare('SELECT * FROM support_tickets WHERE id=?').bind(publicData.requestId).first();assert.equal(incoming.priority,'urgent');assert.equal(incoming.source,'website');
 const queued=await db.prepare("SELECT recipient,event_key,body FROM email_outbox WHERE event_key LIKE 'support-%'").all();assert.equal(queued.results.length,3,'one receipt and alerts for owner + active support only');assert.equal(queued.results.filter(e=>e.event_key.startsWith('support-alert:')).every(e=>!e.body.includes(publicData.message)),true);
 const attention=async role=>(await (await req(role,'support?resource=attention')).json());assert.equal((await attention('support')).urgent,1);const unread=(await attention('support')).unread;
 assert.equal((await req('support','support',{action:'support:seen',id:incoming.id,version:1})).status,200);assert.equal((await attention('support')).unread,unread-1);assert.equal((await attention('owner')).unread,unread);
 const context=await (await req('support','support?resource=order-context&reference='+order.reference)).json();assert.equal(context.enquiries[0].id,incoming.id);assert.ok(Array.isArray(context.returns));
 assert.equal((await req('sales','support?resource=order-context&reference='+order.reference)).status,403);
 assert.equal((await publicReq({...publicData,email:'someoneelse@example.com'})).status,409,'cannot claim another receipt identifier');
 for(let i=0;i<6;i++)await publicReq({...publicData,requestId:crypto.randomUUID(),email:'limit'+i+'@example.com'},'192.0.2.2');
 assert.equal((await publicReq({...publicData,requestId:crypto.randomUUID(),email:'last@example.com'},'192.0.2.2')).status,429);
 const revoked=await submit('support:update',{...update,version:3,status:'resolved'});await db.prepare("UPDATE admin_staff SET active=0 WHERE role='support'").run();assert.equal((await review(revoked.id)).status,409);assert.equal((await req('support','support')).status,403);
 }finally{await mf.dispose();}
});
