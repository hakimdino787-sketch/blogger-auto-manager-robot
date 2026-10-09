"use client";
import{useEffect,useState}from"react";

function makeLabels(topic){return [...new Set(topic.trim().split(/\s+/).map(x=>x.replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g,"")).filter(x=>x.length>2).slice(0,6))]}
function makeOriginalCover(topic){const safe=topic.replace(/[<>&"]/g,"").slice(0,70);const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800" viewBox="0 0 1400 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><rect width="1400" height="800" rx="40" fill="url(#g)"/><circle cx="1180" cy="120" r="180" fill="white" opacity=".08"/><circle cx="180" cy="690" r="250" fill="white" opacity=".06"/><text x="700" y="365" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="62" font-weight="700">'+safe+'</text><text x="700" y="445" text-anchor="middle" fill="white" opacity=".78" font-family="Arial,sans-serif" font-size="28">Tiizkwiz • دليل عملي</text></svg>';return"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg)}
function buildFallbackArticle(topic){const t=topic.trim(),cover=makeOriginalCover(t);return{title:t+" — دليل عملي واضح",labels:makeLabels(t),content:'<article dir="rtl"><img src="'+cover+'" alt="'+t+'" style="width:100%;height:auto;border-radius:18px;margin-bottom:24px"/><p><strong>مقدمة:</strong> هذا الدليل كيركز على '+t+' بطريقة عملية وبعيدة عن الحشو، باش تكون عندك صورة واضحة قبل ما تبدا.</p><h2>شنو خاصك تعرف أولاً؟</h2><p>'+t+' ماشي موضوع كيتفهم بجملة وحدة. الأفضل هو تقسيمه لأجزاء صغيرة، فهم كل جزء، ومن بعد التطبيق ومراجعة النتيجة.</p><h2>كيفاش تبدا بطريقة منظمة؟</h2><ol><li>حدد الهدف ديالك بدقة.</li><li>جمع المعلومات الأساسية من مصادر موثوقة.</li><li>طبق خطوة صغيرة قبل الانتقال للمرحلة التالية.</li><li>راجع النتيجة وصحح الأخطاء.</li></ol><h2>أخطاء خاصك تتجنب</h2><ul><li>الاستعجال قبل فهم الأساسيات.</li><li>الاعتماد على معلومة واحدة بلا تحقق.</li><li>تكرار نفس الطريقة حتى إلا ما عطتش نتيجة.</li></ul><h2>الخلاصة</h2><p>الخلاصة هي أن التعامل مع '+t+' كيحتاج وضوح، تجربة، ومراجعة. بدا بخطوة بسيطة وخلي النتائج هي اللي توجه الخطوة اللي من بعدها.</p></article>'}}

export default function Page(){
 const[blogs,setBlogs]=useState([]),[blogId,setBlogId]=useState(""),[posts,setPosts]=useState([]),[drafts,setDrafts]=useState([]),[title,setTitle]=useState(""),[content,setContent]=useState(""),[topic,setTopic]=useState(""),[labels,setLabels]=useState(""),[status,setStatus]=useState("");
 async function loadBlogs(){await fetch("/api/auth/persist",{method:"POST"}).catch(()=>{});const r=await fetch("/api/blogs",{cache:"no-store"}),d=await r.json();if(d.ok){setBlogs(d.blogs||[]);if(!blogId&&d.blogs?.[0]?.id)setBlogId(d.blogs[0].id)}}
 async function loadPosts(id){if(!id)return;const r=await fetch("/api/posts?blogId="+encodeURIComponent(id),{cache:"no-store"}),d=await r.json();setPosts(d.items||[])}
 async function loadDrafts(id){if(!id)return[];const r=await fetch("/api/posts?blogId="+encodeURIComponent(id)+"&status=DRAFT",{cache:"no-store"}),d=await r.json();const items=d.items||[];setDrafts(items);return items}
 useEffect(()=>{loadBlogs()},[]);
 useEffect(()=>{if(blogId){loadPosts(blogId);loadDrafts(blogId)}},[blogId]);
 async function generate(){
  if(!topic.trim()){setStatus("⚠️ كتب موضوع المقال أولاً");return}
  setStatus("⏳ كنوجد مقال أصلي...");
  try{
   const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic})});
   const d=await r.json();
   if(!r.ok){setStatus("❌ "+(d.error||"تعذر توليد المقال. ما تصايب حتى محتوى احتياطي."));return}
   const a=d.article,cover=makeOriginalCover(topic);
   setTitle(a.title);setContent('<article dir="rtl"><img src="'+cover+'" alt="'+topic.replace(/"/g,"")+'" style="width:100%;height:auto;border-radius:18px;margin-bottom:24px"/>'+a.content_html+'<hr/><p style="font-size:13px;color:#64748b">محتوى أصلي أُعد خصيصاً لـTiizkwiz.</p></article>');setLabels(a.labels.join(", "));setStatus(d.source==="openai"?"✅ المقال تولّد بالمولد الذكي؛ راجعه قبل الحفظ.":"⚠️ استُخدمت صيغة محلية احتياطية؛ خصّص المقال وأضف معلومات موثوقة قبل حفظه.");
  }catch{setStatus("❌ تعذر الاتصال بالمولد. ما تصايب حتى محتوى احتياطي؛ حاول من بعد.")}
 }
 function saveLocal(){
  if(!title.trim()||!content.trim()){setStatus("⚠️ خاص العنوان والمحتوى");return}
  const item={id:Date.now().toString(),title:title.trim(),content,labels:labels.split(",").map(x=>x.trim()).filter(Boolean),topic:topic.trim(),savedAt:new Date().toISOString()};
  const old=JSON.parse(localStorage.getItem("tiizkwiz_queue")||"[]");
  localStorage.setItem("tiizkwiz_queue",JSON.stringify([item,...old].slice(0,50)));
  setStatus("💾 تسجل محلياً بأمان — ما تم إرسال والو لـ Blogger");
 }
 async function attachOriginalImage(post){
  if(!blogId||!post?.id){setStatus("⚠️ ما لقيتش معرّف المسودة؛ ما تبدل والو.");return}
  const isPhotos=String(post.title||"").includes("صور الهاتف")||String(post.title||"").includes("النسخ الاحتياطي");
  const imageUrl=isPhotos?"https://images.openai.com/static-rsc-4/VKb8M8bq2ivtEwA9aG0dsfClK8_GOGsesorVwlbfHdWQAVWM6GjXggx-lrGroMTHuBp07yxx87wr3NUYNENfKzqJoJTB1gM4nrfoFxSy_827IY983veF8XMyGz9iYeErmCFoE8q0LSPR2VCAwHSj0bVeF1aUV0qkjbj1MvohhyFRcbHWHfaHUpBAmdNSCk2y?purpose=fullsize":"https://images.openai.com/static-rsc-4/4NmzwACti5vlLE0ML4ErnMesXWlXWn4NdjYDQeMa9xQU37HbpR-t60bIwgd7zd-lpsupo-Fh4csRCF27Xfx9mmGOyrsoUKSj23CzDMyMXNt0ugaDsABpG71qL_-bmLI6gJ8pxmG0MwyUpTpGakgUcIjQJ7H2vT7S0MZ-cbxSw5m6Z7X0Bir44TN1QZ41RvPt?purpose=fullsize";
  setStatus("⏳ كنضيف الصورة للمسودة بلا نشر...");
  try{
   const r=await fetch("/api/posts/"+encodeURIComponent(post.id)+"/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({blogId,imageUrl,alt:post.title})});
   const d=await r.json();
   if(!r.ok||!d.ok){setStatus("❌ ما تبدل والو: "+(d.error||"تعذر إضافة الصورة"));return}
   const updated=await loadDrafts(blogId);
   await loadPosts(blogId);
   const verified=updated.find(p=>p.id===post.id);
   if(verified&&String(verified.content||"").includes(imageUrl)){setStatus("✅ تزادت الصورة وتأكدنا منها داخل المسودة. المقال ما تنشرش.");}
   else if(d.alreadyPresent){setStatus("ℹ️ الصورة كانت موجودة أصلاً فالمسودة؛ ما تكرراتش.");}
   else{setStatus("⚠️ Blogger قبل التعديل ولكن ما تأكدش ظهور الصورة فالفحص؛ راجع المسودة قبل أي خطوة أخرى.");}
  }catch{setStatus("❌ وقع خطأ فالاتصال؛ ما تعاودش الإرسال حتى نراجع الحالة.")}
 }
 async function createDraft(){
  if(!blogId||!title.trim()||!content.trim()){setStatus("⚠️ خاص العنوان والمحتوى");return}
  const draftTitle=title.trim();setStatus("⏳ كنرسل المقال كمسودة فقط...");
  const r=await fetch("/api/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({blogId,title:draftTitle,content,draft:true,labels:labels.split(",").map(x=>x.trim()).filter(Boolean)})});
  const d=await r.json();
  if(!r.ok){setStatus("❌ ما تأكدش الحفظ: "+(d.error?.message||d.error||"وقع خطأ")+". خليه كما هو وما تعاودش الإرسال حتى نراجع السبب.");return}
  const returnedId=d.id||d.postId;
  const items=await loadDrafts(blogId);await loadPosts(blogId);
  const found=items.some(p=>p.title===draftTitle||(returnedId&&p.id===returnedId));
  if(found){setStatus("✅ تأكد ظهور المسودة في Blogger. راجعها ثم انشرها يدوياً فقط.");setTitle("");setContent("");}
  else{setStatus("⚠️ Blogger رجع نجاح الطلب، لكن المسودة ما بانتش في فحص القائمة. ما تعاودش الإرسال باش ما يتكررش المقال؛ راجع المسودات في Blogger.");}
 }
 return <main><div className="card"><h1>🤖 Blogger Auto Manager Robot</h1><p className="muted">توليد مقال وتجهيزه بتصميم جذاب. رجعت صلاحية Blogger عبر API؛ غادي نختبرو الحفظ كمسودة فقط.</p><div className="blog"><b>✅ Google رجّعات الصلاحية. الاختبار الحالي: حفظ مسودة واحدة فقط، بلا نشر.</b></div></div><div className="card"><h2>✨ توليد مقال كامل وجذاب</h2><p className="muted">خطة مبسطة: 3 مقالات فقط في اليوم كحد أقصى. اختار موضوعاً واحداً في كل مرة، راجع المقال، ثم احفظه كمسودة. ما كاينش نشر جماعي.</p><div className="topic-list">{["كيف تتحقق من الروابط المشبوهة قبل فتحها","كيف تدير نسخة احتياطية لصور الهاتف بأمان","خطوات حماية حساباتك بكلمات مرور قوية والتحقق بخطوتين"].map((t,i)=><button className="topic-button" key={t} onClick={()=>setTopic(t)}>{i+1}. {t}</button>)}</div><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="أو كتب موضوعاً خاصاً بك"/><button onClick={generate}>✨ ولد المقال الجذاب</button></div><div className="card"><h2>📝 المنشور</h2><label>المدونة</label><select value={blogId} onChange={e=>setBlogId(e.target.value)}>{blogs.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="عنوان المقال..."/><input value={labels} onChange={e=>setLabels(e.target.value)} placeholder="الوسوم: مثال، تقنية، شرح"/><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="المحتوى..." rows={14}/><div className="actions"><button onClick={saveLocal}>💾 حفظ محلياً (آمن)</button><button onClick={createDraft}>🟡 إرسال كمسودة لـ Blogger</button></div><p className="muted">🔒 النشر المباشر متوقف في الروبو للحماية. راجع المسودة وانشرها يدوياً من Blogger فقط.</p>{status&&<p>{status}</p>}</div><div className="card"><h2>🎨 تصميم Blogger</h2><p className="muted">Theme Tiizkwiz V4.1 جاهز للاستيراد في Blogger. من هنا تقدر تحمّلو، ومن بعد Blogger → Theme → Restore → Upload.</p><a href="https://raw.githubusercontent.com/hakimdino787-sketch/blogger-auto-manager-robot/main/themes/tiizkwiz-v4.1.xml" download target="_blank" rel="noreferrer"><button>⬇️ تحميل Theme XML</button></a> {blogId?<a href={"https://www.blogger.com/blog/themes/"+encodeURIComponent(blogId)} target="_blank" rel="noreferrer"><button>🎨 فتح Theme ديال المدونة</button></a>:<p className="muted">اختار المدونة أولاً.</p>}</div><div className="card"><h2>📝 المسودات في Blogger</h2>{drafts.length?drafts.map(p=><div className="blog" key={p.id}><b>{p.title||"بدون عنوان"}</b><div className="muted">🟡 مسودة</div><button onClick={()=>attachOriginalImage(p)}>🖼️ إضافة الصورة الأصلية للمسودة</button><div className="muted">{String(p.content||"").includes("images.openai.com/static-rsc-4/")?"🖼️ توجد صورة أصلية داخل المحتوى":""}</div></div>):<p className="muted">ما كايناش مسودات ظاهرة حالياً. إلا حفظتي مسودة وبقات غايبة، ما تعاودش إرسالها حتى تراجع Blogger.</p>}</div><div className="card"><h2>📚 آخر المنشورات</h2>{posts.length?posts.map(p=><div className="blog" key={p.id}><b>{p.title||"بدون عنوان"}</b><div className="muted">{p.status==="LIVE"||p.published?"🟢 منشور":p.status==="DRAFT"?"🟡 مسودة":"منشور أو حالة غير محددة"}</div></div>):<p className="muted">مازال ما كاين حتى منشور ظاهر هنا.</p>}</div></main>
}