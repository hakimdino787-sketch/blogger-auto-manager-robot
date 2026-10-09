import{NextResponse}from"next/server";
import{refreshSession}from"../../../../lib/session";
import{loadPersistentSession,savePersistentSession}from"../../../../lib/persistent-session";

const IMAGE_MAP=[
{match:"الروابط المشبوهة",url:"https://gen.krea.ai/images/3973d470-43d8-4fe6-87ab-c4f3f0cc2a4a.png"},
{match:"نسخة احتياطية",url:"https://gen.krea.ai/images/92fc3ca8-2238-4e48-b228-a4cead15c48d.png"},
{match:"كلمات مرور",url:"https://gen.krea.ai/images/3973d470-43d8-4fe6-87ab-c4f3f0cc2a4a.png"},
{match:"تنظيم الملفات والصور",url:"https://gen.krea.ai/images/92fc3ca8-2238-4e48-b228-a4cead15c48d.png"},
{match:"البحث على الإنترنت",url:"https://gen.krea.ai/images/74d0de0e-468e-4bb3-901e-3802519a1a59.png"},
{match:"تنظم وقتك",url:"https://gen.krea.ai/images/28c0027f-3108-428f-939d-56b9f9dad970.png"},
{match:"تحمي حساباتك",url:"https://gen.krea.ai/images/3973d470-43d8-4fe6-87ab-c4f3f0cc2a4a.png"},
{match:"تنظف الهاتف",url:"https://gen.krea.ai/images/ebe36f8d-7f44-430b-a82f-1b4d69f7ffe0.png"}
];
const DEFAULT_IMAGE="https://gen.krea.ai/images/66052f54-8e38-4f82-bb16-4664ed5d4128.png";
const DAILY_TOPICS=[
"كيف تتحقق من الروابط المشبوهة قبل فتحها وتحمي حساباتك",
"كيف تدير نسخة احتياطية لصور الهاتف وتسترجع ملفاتك بأمان",
"خطوات حماية حساباتك بكلمات مرور قوية والتحقق بخطوتين"
];
function imageFor(title){const hit=IMAGE_MAP.find(x=>String(title).includes(x.match));return hit?.url||DEFAULT_IMAGE}
function authorizedForEnhancement(req){const secret=process.env.CRON_SECRET;if(!secret)return false;return req.headers.get("authorization")===`Bearer ${secret}`}
function hasRealImage(body){return /<img\b[^>]*\bsrc\s*=\s*["']https?:\/\//i.test(body||"")}
function removeOldFakeImage(body){return String(body||"").replace(/<img\b[^>]*\bsrc\s*=\s*["']data:image\/svg\+xml[^"']*["'][^>]*\/?>/gi,"")}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeHtml(s=""){return String(s).replace(/<\/?(script|iframe|object|embed|form)\b[^>]*>/gi,"").replace(/\s+on[a-z]+\s*=\s*(["']).*?\1/gi,"").replace(/javascript:/gi,"")}
function moroccoDate(){const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Casablanca",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const v=Object.fromEntries(p.map(x=>[x.type,x.value]));return v.year+v.month+v.day}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function postWithRetry(url,opts){for(let i=0;i<5;i++){const pr=await fetch(url,opts);if(pr.ok)return pr;if(pr.status!==429&&pr.status!==403)return pr;await sleep(Math.min(32000,2000*(2**i)+Math.floor(Math.random()*1000)))}return fetch(url,opts)}
async function getSession(){let s=await loadPersistentSession();if(!s?.refresh_token)return{error:"خاص ربط Blogger مرة واحدة من الواجهة باش نحفظ جلسة التشغيل"};const rr=await refreshSession(s);if(!rr.ok)return{error:"تعذر تجديد جلسة Blogger؛ خاص إعادة ربط المدونة من الواجهة"};s=rr.session;await savePersistentSession(s);const blog=s.blogs?.[0];if(!blog?.id)return{error:"ما لقيتش مدونة Blogger مربوطة"};return{s,blog}}
async function bloggerPosts(blog,s,status){const r=await fetch("https://www.googleapis.com/blogger/v3/blogs/"+encodeURIComponent(blog.id)+"/posts?status="+status+"&maxResults=100&fetchBodies=false",{headers:{Authorization:"Bearer "+s.access_token}});if(!r.ok)return{error:"تعذر جلب منشورات Blogger ("+status+")",status:r.status};return{items:(await r.json()).items||[]}}
export async function GET(req){
 const params=new URL(req.url).searchParams;
 if(params.get("mode")==="enhance"||params.get("enhance")==="1"){if(!authorizedForEnhancement(req))return NextResponse.json({ok:false,error:"يتطلب تعديل المسودات تصريح مهمة موثوقاً."},{status:401});return enhance(req)}
 if(authorizedForEnhancement(req))return generateDaily(req);
 const x=await getSession();if(x.error)return NextResponse.json({ok:false,error:x.error},{status:503});
 const{s,blog}=x;const list=await bloggerPosts(blog,s,"draft");if(list.error)return NextResponse.json({ok:false,error:list.error},{status:list.status});
 return NextResponse.json({ok:true,blog:blog.name||blog.id,draftCount:list.items.length,drafts:list.items.map(p=>({id:p.id,title:p.title,updated:p.updated}))})
}
async function generateDaily(req){
 if(process.env.BLOGGER_WRITES_ENABLED!=="true")return NextResponse.json({ok:false,error:"حفظ المسودات متوقف بإعداد الحماية (BLOGGER_WRITES_ENABLED). لا شيء نُشر."},{status:423});
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({ok:false,error:"التوليد اليومي غير مفعّل: أضف OPENAI_API_KEY في إعدادات Vercel بشكل آمن ثم أعد النشر. لم يتم إنشاء أو نشر أي مقال."},{status:503});
 const x=await getSession();if(x.error)return NextResponse.json({ok:false,error:x.error},{status:503});
 const{s,blog}=x,day=moroccoDate();
 const [drafts,live]=await Promise.all([bloggerPosts(blog,s,"draft"),bloggerPosts(blog,s,"live")]);
 if(drafts.error||live.error)return NextResponse.json({ok:false,error:"تعذر فحص المسودات والمنشورات الحالية؛ أوقفت التوليد لمنع التكرار.",details:drafts.error||live.error},{status:502});
 const existing=[...drafts.items,...live.items],markers=new Set(existing.flatMap(p=>Array.isArray(p.labels)?p.labels:[]));
 const created=[],skipped=[],failed=[];
 for(let i=0;i<DAILY_TOPICS.length;i++){
  const topic=DAILY_TOPICS[i],marker="tiizkwiz-auto-"+day+"-"+(i+1);
  if(markers.has(marker)){skipped.push({slot:i+1,topic,reason:"سبق إنشاء هذه المسودة في هذا اليوم"});continue}
  try{
   const gr=await fetch(new URL("/api/generate",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic})});
   const gd=await gr.json().catch(()=>({}));
   if(!gr.ok||!gd?.ok||!gd.article){failed.push({slot:i+1,topic,error:gd.error||"فشل توليد المقال"});break}
   const a=gd.article,title=String(a.title||"").trim();
   if(!title||!a.content_html||!Array.isArray(a.labels)){failed.push({slot:i+1,topic,error:"المولد أعاد مقالاً ناقصاً"});continue}
   const image=imageFor(topic),alt=escapeHtml(title.slice(0,180));
   const body='<article dir="rtl"><img src="'+image+'" alt="'+alt+'" loading="eager" style="display:block;width:100%;max-width:1400px;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:0 0 24px" />'+safeHtml(a.content_html)+'<p style="color:#64748b;font-size:13px">أُعد هذا الدليل خصيصاً لقراء Tiizkwiz، ويُنصح بمراجعة المعلومات والروابط قبل النشر.</p></article>';
   const qc=await fetch(new URL("/api/quality-check",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,title,content:body})});
   const q=await qc.json().catch(()=>({}));
   if(!qc.ok||!q.publishable){failed.push({slot:i+1,topic,error:"المقال لم يجتز فحص الجودة؛ لم يُحفظ",qualityScore:q.score??null,issues:q.issues||[]});continue}
   const labels=[...new Set([...(a.labels||[]).filter(v=>typeof v==="string"&&v.trim()).map(v=>v.trim()),"Tiizkwiz",marker])].slice(0,20);
   const put=await postWithRetry("https://www.googleapis.com/blogger/v3/blogs/"+encodeURIComponent(blog.id)+"/posts?isDraft=true",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.access_token},body:JSON.stringify({title,content:body,labels})});
   if(!put.ok){failed.push({slot:i+1,topic,error:"فشل حفظ المسودة في Blogger",status:put.status,details:(await put.text()).slice(0,500)});break}
   const saved=await put.json().catch(()=>({}));
   created.push({slot:i+1,id:saved.id||null,title,qualityScore:q.score,wordCount:q.wordCount,imageUrl:image,status:"DRAFT"});
   markers.add(marker);
  }catch(e){failed.push({slot:i+1,topic,error:"خطأ أثناء تجهيز المقال؛ توقفت المهمة لتجنب التكرار"});break}
 }
 return NextResponse.json({ok:failed.length===0,mode:"generate-three-drafts-daily",blog:blog.name||blog.id,date:day,target:3,created,skipped,failed,published:0,generatedAt:new Date().toISOString()},{status:failed.length?502:200})
}
async function enhance(req){
 if(process.env.BLOGGER_WRITES_ENABLED!=="true")return NextResponse.json({ok:false,error:"تعديل المسودات متوقف مؤقتاً بإعداد الحماية (BLOGGER_WRITES_ENABLED)."}, {status:423});
 const x=await getSession();if(x.error)return NextResponse.json({ok:false,error:x.error},{status:503});
 const{s,blog}=x;const list=await bloggerPosts(blog,s,"draft");if(list.error)return NextResponse.json({ok:false,error:list.error},{status:list.status});
 const drafts=list.items.slice(0,3),updated=[],failed=[];
 for(const p of drafts){
  const title=(p.title||"Tiizkwiz").trim(),body=p.content||"";
  const qr=await fetch(new URL("/api/quality-check",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:title,title,content:body})});
  const qd=await qr.json().catch(()=>({}));
  if(hasRealImage(body)){updated.push({id:p.id,title,score:qd.score??null,qualityOk:!!qd.publishable,changed:false,imageAdded:false});continue}
  const img=imageFor(title),alt=escapeHtml(title.slice(0,180)),cleaned=removeOldFakeImage(body);
  const newBody='<article dir="rtl"><img src="'+img+'" alt="'+alt+'" loading="eager" style="display:block;width:100%;max-width:1400px;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:0 0 24px" />'+cleaned+'</article>';
  const put=await postWithRetry("https://www.googleapis.com/blogger/v3/blogs/"+encodeURIComponent(blog.id)+"/posts/"+encodeURIComponent(p.id),{method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.access_token},body:JSON.stringify({id:p.id,blog:{id:blog.id},title,content:newBody,labels:p.labels||[]})});
  if(put.ok)updated.push({id:p.id,title,score:qd.score??null,qualityOk:!!qd.publishable,changed:true,imageAdded:true,imageUrl:img});else failed.push({id:p.id,title,error:(await put.text()).slice(0,500)})
 }
 return NextResponse.json({ok:failed.length===0,mode:"enhance-existing-drafts-with-real-images",blog:blog.name||blog.id,found:drafts.length,updated,failed,published:0,generatedAt:new Date().toISOString()},{status:failed.length?502:200})
}
export async function POST(req){if(!authorizedForEnhancement(req))return NextResponse.json({ok:false,error:"يتطلب تعديل المسودات تصريح مهمة موثوقاً."},{status:401});return enhance(req)}
