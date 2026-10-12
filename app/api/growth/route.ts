import {publicGrowth} from '@/lib/growth';
export async function GET(request:Request){try{return Response.json(await publicGrowth(new URL(request.url).searchParams.get('channel')==='app'?'app':'web'),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({authDomain:'vanta-noir.firebaseapp.com',sponsors:[]},{status:503});}}
