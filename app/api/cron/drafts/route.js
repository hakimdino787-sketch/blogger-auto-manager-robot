import{NextResponse}from"next/server";
import{refreshSession}from"../../../../lib/session";
import{loadPersistentSession,savePersistentSession}from"../../../../lib/persistent-session";

const topics=[
"كيفاش تنظم وقتك فالنهار بلا تطبيقات معقدة",
"طرق عملية باش تحمي حساباتك على الإنترنت",
"كيفاش تنظف الهاتف وتخفف الملفات اللي ما محتاجهاش",
"طريقة بسيطة لتنظيم الملفات والصور فالهاتف والحاسوب",
"كيفاش تستعمل البحث على الإنترنت بطريقة أذكى",
"أخطاء رقمية يومية كتضيع الوقت وكيفاش تتجنبها",
"كيفاش تبني روتين أسبوعي بسيط باش تبقى منظم"
];

function cover(topic){
 const safe=topic.replace(/[<>&"]/g,"").slice(0,90);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><rect width="1400" height="800" rx="40" fill="url(#g)"/><text x="700" y="370" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="52" font-weight="700">'+safe+'</text><text x="700" y="445" text-anchor="middle" fill="white" opacity=".8" font-family="Arial,sans-serif" font-size="26">Tiizkwiz • دليل عملي</text></svg>';
 return"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
}

function fallback(topic){
 const c=cover(topic);
 return{title:topic+" — خطوات عملية باش تبدا",labels:["دليل عملي","تنظيم","نصائح"],content:'<article dir="rtl"><img src="'+c+'" alt="'+topic.replace(/"/g,"")+'" style="width:100%;height:auto;border-radius:18px;margin-bottom:24px"/><p><strong>مقدمة:</strong> إلا كان هاد الموضوع كيتكرر عندك، أحسن حل ماشي أنك تجمع عشرات النصائح وتبقى محتار. الفكرة هي تختار خطوات قليلة، تفهم علاش كتخدم، وتجربها بهدوء. فهاد الدليل غادي نمشيو من الأساسيات للتطبيق ونخليو كل خطوة واضحة.</p><h2>منين خاصك تبدا؟</h2><p>قبل أي تغيير، حدد المشكل الحقيقي اللي باغي تحلو. واش كتضيع الوقت؟ واش كتنسى المهام؟ واش كتلقى صعوبة فالوصول للمعلومة؟ ملي كتحدد المشكل، كتولي عندك طريقة باش تقيس واش الحل نافع فعلاً ولا غير كيزيد عليك التعقيد.</p><h2>الخطوة الأولى: بسط الطريقة</h2><p>ما تبدأش بأداة كثيرة الإعدادات. استعمل أبسط طريقة ممكنة، وسجل غير المعلومات اللي محتاجها. الهدف فالأسبوع الأول هو بناء عادة مستقرة، ماشي الوصول للكمال. إلا كانت الخطوة كتحتاج منك وقت طويل كل مرة، حاول تختصرها أو قسمها إلى مراحل صغيرة.</p><h2>الخطوة الثانية: طبق وجرب</h2><ol><li>حدد نتيجة واحدة باغي توصل ليها.</li><li>خصص وقتاً قصيراً للتجربة.</li><li>سجل شنو خدم وشنو ما خدمش.</li><li>بدل غير حاجة واحدة فكل تجربة.</li></ol><h2>شنو خاصك تتجنب؟</h2><ul><li>تغيير كل شيء مرة واحدة.</li><li>اتباع نصيحة بلا ما تفهم واش مناسبة ليك.</li><li>الاعتماد على الذاكرة فالمهام المتكررة.</li><li>الاستمرار فطريقة واضحة أنها ما كتجيبش نتيجة.</li></ul><h2>كيفاش تعرف أنك كتقدم؟</h2><p>قارن الوضع الحالي بالوضع اللي كان قبل التجربة. ممكن التقدم يكون بسيط: وقت أقل، أخطاء أقل، أو وصول أسرع للمعلومة. هاد المؤشرات الصغيرة أهم من الإحساس المؤقت بأنك كتخدم بزاف.</p><h2>الخلاصة</h2><p>التغيير النافع كيبدا بخطوة مفهومة وقابلة للتطبيق. خذ من هاد الدليل الفكرة اللي مناسبة ليك، جربها، ومن بعد عدلها حسب النتيجة. ماشي ضروري تستعمل أدوات كثيرة؛ المهم يكون عندك نظام واضح وتقدر تستمر عليه.</p></article>'};
}

export async function GET(req){
 const expected=process.env.CRON_SECRET;
 const manual=req.nextUrl.searchParams.get("manual");
 const authorized=(expected&&req.headers.get("authorization")===`Bearer ${expected}`)||(process.env.MANUAL_RUN_TOKEN&&manual===process.env.MANUAL_RUN_TOKEN);
 if(!authorized)return NextResponse.json({ok:false,error:"غير مصرح"},{status:401});
 let s=await loadPersistentSession();
 if(!s?.refresh_token)return NextResponse.json({ok:false,error:"خاص ربط Blogger مرة واحدة من الواجهة باش نحفظ جلسة التشغيل"},{status:503});
 const rr=await refreshSession(s);
 if(rr.ok){s=rr.session;await savePersistentSession(s)}
 const blog=s.blogs?.[0];
 if(!blog?.id)return NextResponse.json({ok:false,error:"ما لقيتش مدونة Blogger مربوطة"},{status:503});
 const origin=new URL(req.url).origin;
 const recent=await fetch(`${origin}/api/posts?blogId=${encodeURIComponent(blog.id)}`,{headers:{Authorization:`Bearer ${s.access_token}`},cache:"no-store"});
 let recentTitles=new Set();
 if(recent.ok){const rd=await recent.json();recentTitles=new Set((rd.items||[]).map(x=>String(x.title||"").trim()))}
 const created=[],skipped=[];
 for(const topic of topics){
   const a=fallback(topic);
   let article=a;
   if(process.env.OPENAI_API_KEY){
     try{
       const gr=await fetch(`${origin}/api/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic})});
       const gd=await gr.json();
       if(gr.ok&&gd.article?.title&&gd.article?.content_html){
         article={...a,...gd.article};
         article.content='<article dir="rtl"><img src="'+cover(topic)+'" alt="'+topic.replace(/"/g,"")+'" style="width:100%;height:auto;border-radius:18px;margin-bottom:24px"/>'+gd.article.content_html+'<hr/><p style="font-size:13px;color:#64748b">محتوى أصلي أُعد خصيصاً لـTiizkwiz.</p></article>';
       }
     }catch{}
   }
   if(recentTitles.has(article.title)){skipped.push(article.title);continue}
   const qr=await fetch(`${origin}/api/quality-check`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,title:article.title,content:article.content})});
   const qd=await qr.json().catch(()=>({}));
   const pr=await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blog.id)}/posts?isDraft=true`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.access_token}`},body:JSON.stringify({title:article.title,content:article.content,labels:article.labels||[]})});
   if(pr.ok){created.push({title:article.title,score:qd.score??null,qualityOk:!!qd.ok});recentTitles.add(article.title)}else{created.push({title:article.title,error:await pr.text()})}
 }
 return NextResponse.json({ok:true,blog:blog.name||blog.id,created,skipped,generatedAt:new Date().toISOString()});
}