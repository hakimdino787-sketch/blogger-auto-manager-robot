import{NextResponse}from"next/server";

const SYSTEM=`أنت كاتب عربي مغربي محترف تكتب لموقع Tiizkwiz. اكتب محتوى أصلياً من الصفر، بأسلوب بشري طبيعي وواضح، وليس إعادة صياغة لمقال موجود. لا تنسخ أو تقتبس نصوصاً محمية. لا تدّعي معلومات غير مؤكدة. إذا كان الموضوع يحتاج معلومات حديثة، اذكر بوضوح ما يحتاج تحققاً ولا تخترع أرقاماً أو مصادر. اجعل المقال مفيداً فعلاً للقارئ، منظمًا بعناوين H2/H3 وفقرات قصيرة وقوائم عند الحاجة. تجنب الحشو وتكرار الكلمات المفتاحية والعبارات الآلية. لا تكتب مقدمة عامة يمكن وضعها في أي موضوع؛ اربط كل فقرة بالموضوع. اكتب بالعربية الطبيعية مع لمسة مغربية خفيفة عندما تكون مناسبة، بدون مبالغة في الدارجة. لا تضع روابط أو مصادر وهمية. أعد JSON صالحاً فقط بالشكل: {"title":"...","excerpt":"...","content_html":"...","labels":["...","..."],"meta_description":"..."}.`;

function cleanJson(text){
  const s=String(text||"").trim().replace(/^\`\`\`json\s*/i,"").replace(/^\`\`\`\s*/,"").replace(/\s*\`\`\`$/,"");
  return JSON.parse(s);
}

export async function POST(req){
  try{
    const{topic}=await req.json();
    if(!topic?.trim())return NextResponse.json({ok:false,error:"الموضوع مطلوب"},{status:400});
    const key=process.env.OPENAI_API_KEY;
    if(!key)return NextResponse.json({ok:false,error:"OPENAI_API_KEY غير مضبوط في Vercel. الروبوت ما غاديش يستعمل مولد آلي خارجي حتى نربط مفتاح رسمي."},{status:503});
    const model=process.env.OPENAI_MODEL||"gpt-5-mini";
    const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model,messages:[{role:"system",content:SYSTEM},{role:"user",content:"الموضوع: "+topic.trim()+"\n\nاكتب مقالاً مفيداً ومتماسكاً، بزاوية واضحة وتجربة قراءة مريحة. لا تعتمد على نسخ أو إعادة صياغة مصدر بعينه."}],temperature:.7})});
    const data=await r.json();
    if(!r.ok)return NextResponse.json({ok:false,error:data?.error?.message||"فشل توليد المقال"},{status:r.status});
    const raw=data?.choices?.[0]?.message?.content||"";
    const article=cleanJson(raw);
    if(!article.title||!article.content_html||!Array.isArray(article.labels))throw new Error("استجابة المولد غير مكتملة");
    return NextResponse.json({ok:true,article});
  }catch(e){return NextResponse.json({ok:false,error:e?.message||"وقع خطأ غير متوقع"},{status:500})}
}
