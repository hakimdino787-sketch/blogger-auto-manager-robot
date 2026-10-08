import{NextResponse}from"next/server";
import{refreshSession}from"../../../../lib/session";
import{loadPersistentSession,savePersistentSession}from"../../../../lib/persistent-session";

const topics=[
"أخطاء رقمية يومية كتضيع الوقت وكيفاش تتجنبها",
"كيفاش تبني روتين أسبوعي بسيط باش تبقى منظم"
];

function cover(topic){
 const safe=String(topic||"Tiizkwiz").replace(/[<>&"]/g,"").slice(0,90);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><rect width="1400" height="800" rx="40" fill="url(#g)"/><text x="700" y="370" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="52" font-weight="700">'+safe+'</text><text x="700" y="445" text-anchor="middle" fill="white" opacity=".8" font-family="Arial,sans-serif" font-size="26">Tiizkwiz • دليل عملي</text></svg>';
 return"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg)
}
function fallback(topic){const c=cover(topic);return{title:topic+" — خطوات عملية باش تبدا",labels:["دليل عملي","تنظيم","نصائح"],content:'<article dir="rtl"><img src="'+c+'" alt="'+topic.replace(/"/g,"")+'" style="width:100%;height:auto;border-radius:18px;margin-bottom:24px"/><p><strong>مقدمة:</strong> إلا كان هاد الموضوع كيتكرر عندك، أحسن حل ماشي أنك تجمع عشرات النصائح وتبقى محتار. الفكرة هي تختار خطوات قليلة، تفهم علاش كتخدم، وتجربها بهدوء.</p><h2>منين خاصك تبدا؟</h2><p>قبل أي تغيير، حدد المشكل الحقيقي اللي باغي تحلو. ملي كتحدد المشكل، كتولي عندك طريقة باش تقيس واش الحل نافع فعلاً.</p><h2>الخطوة الأولى: بسط الطريقة</h2><p>ما تبدأش بأداة كثيرة الإعدادات. استعمل أبسط طريقة ممكنة، وسجل غير المعلومات اللي محتاجها.</p><h2>الخطوة الثانية: طبق وجرب</h2><ol><li>حدد نتيجة واحدة باغي توصل ليها.</li><li>خصص وقتاً قصيراً للتجربة.</li><li>سجل شنو خدم وشنو ما خدمش.</li><li>بدل غير حاجة واحدة فكل تجربة.</li></ol><h2>شنو خاصك تتجنب؟</h2><ul><li>تغيير كل شيء مرة واحدة.</li><li>اتباع نصيحة بلا ما تفهم واش مناسبة ليك.</li><li>الاعتماد على الذاكرة فالمهام المتكررة.</li></ul><h2>الخلاصة</h2><p>التغيير النافع كيبدا بخطوة مفهومة وقابلة للتطبيق. خذ الفكرة المناسبة ليك، جربها، ومن بعد عدلها حسب النتيجة.</p></article>'}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function postWithRetry(url,opts){for(let i=0;i<5;i++){const pr=await fetch(url,opts);if(pr.ok)return pr;if(pr.status!==429&&pr.status!==403)return pr;await sleep(Math.min(32000,2000*(2**i)+Math.floor(Math.random()*1000)))}return fetch(url,opts)}

async function getSession(){
 let s=await loadPersistentSession();
 if(!s?.refresh_token)return{error:"خاص ربط Blogger مرة واحدة من الواجهة باش نحفظ جلسة التشغيل"};
 const rr=await refreshSession(s);if(rr.ok){s=rr.session;await savePersistentSession(s)}
 const blog=s.blogs?.[0];if(!blog?.id)return{error:"ما لقيتش مدونة Blogger مربوطة"};
 return{s,blog}
}

export async function GET(req){
 const x=await getSession();if(x.error)return NextResponse.json({ok:false,error:x.error},{status:503});
 const{s,blog}=x;
 const list=await fetch("https://www.googleapis.com/blogger/v3/blogs/"+encodeURIComponent(blog.id)+"/posts?maxResults=100&fetchBodies=false",{headers:{Authorization:"Bearer "+s.access_token}});
 const existing=new Set();if(list.ok){const ld=await list.json();for(const p of ld.items||[])existing.add((p.title||"").trim())}
 const created=[],skipped=[];
 for(const topic of topics){
  const a=fallback(topic);let article=a;
  if(existing.has(article.title)){skipped.push({title:article.title,reason:"already-exists"});continue}
  if(process.env.OPENAI_API_KEY){try{const gr=await fetch(new URL("/api/generate",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic})});const gd=await gr.json();if(gr.ok&&gd.article?.title&&gd.article?.content_html){article={...a,...gd.article};article.content='<article dir="rtl"><img src="'+cover(topic)+'" alt="'+topic.replace(/"/g,"")+'" style="width:100%;height:auto;border-radius:18px;margin-bottom:24px"/>'+gd.article.content_html+'<hr/><p style="font-size:13px;color:#64748b">محتوى أصلي أُعد خصيصاً لـTiizkwiz.</p></article>'}}catch{}}
  const qr=await fetch(new URL("/api/quality-check",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,title:article.title,content:article.content})});const qd=await qr.json().catch(()=>({}));
  const pr=await postWithRetry("https://www.googleapis.com/blogger/v3/blogs/"+encodeURIComponent(blog.id)+"/posts?isDraft=true",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.access_token},body:JSON.stringify({title:article.title,content:article.content,labels:article.labels||[]})});
  if(pr.ok){created.push({title:article.title,score:qd.score??null,qualityOk:!!qd.ok})}else{created.push({title:article.title,error:await pr.text()})}
 }
 const failed=created.filter(x=>x.error);
 return NextResponse.json({ok:failed.length===0,blog:blog.name||blog.id,created,skipped,generatedAt:new Date().toISOString()},{status:failed.length?502:200});
}

export async function POST(req){
 const x=await getSession();if(x.error)return NextResponse.json({ok:false,error:x.error},{status:503});
 const{s,blog}=x;
 const list=await fetch("https://www.googleapis.com/blogger/v3/blogs/"+encodeURIComponent(blog.id)+"/posts?status=draft&maxResults=100&fetchBodies=true",{headers:{Authorization:"Bearer "+s.access_token}});
 if(!list.ok)return NextResponse.json({ok:false,error:"تعذر جلب مسودات Blogger: "+await list.text()},{status:list.status});
 const data=await list.json();const drafts=(data.items||[]).slice(0,7);
 const updated=[],failed=[];
 for(const p of drafts){
  const title=(p.title||"Tiizkwiz").trim();
  const body=p.content||"";
  const hasCover=/<img[^>]+data:image\/svg\+xml/i.test(body)||/Tiizkwiz\s*•\s*دليل عملي/i.test(body);
  const qr=await fetch(new URL("/api/quality-check",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:title,title,content:body})});
  const qd=await qr.json().catch(()=>({}));
  const newBody=hasCover?body:'<article dir="rtl"><img src="'+cover(title)+'" alt="'+title.replace(/"/g,"")+'" style="width:100%;height:auto;border-radius:18px;margin-bottom:24px"/> '+body+'</article>';
  if(newBody===body){updated.push({id:p.id,title,score:qd.score??null,qualityOk:!!qd.ok,changed:false});continue}
  const put=await postWithRetry("https://www.googleapis.com/blogger/v3/blogs/"+encodeURIComponent(blog.id)+"/posts/"+encodeURIComponent(p.id),{method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.access_token},body:JSON.stringify({id:p.id,blog:{id:blog.id},title,content:newBody,labels:p.labels||[]})});
  if(put.ok)updated.push({id:p.id,title,score:qd.score??null,qualityOk:!!qd.ok,changed:true});
  else failed.push({id:p.id,title,error:await put.text()});
 }
 return NextResponse.json({ok:failed.length===0,mode:"enhance-existing-drafts",blog:blog.name||blog.id,found:drafts.length,updated,failed,published:0,generatedAt:new Date().toISOString()},{status:failed.length?502:200});
}