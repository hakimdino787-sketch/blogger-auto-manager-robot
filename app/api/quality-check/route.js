import{NextResponse}from"next/server";

function stripHtml(s=""){return s.replace(/<[^>]*>/g," ").replace(/&[^;]+;/g," ").replace(/\s+/g," ").trim()}
function words(s=""){return stripHtml(s).split(/\s+/).filter(Boolean)}
function repeatedRatio(s=""){const w=words(s).map(x=>x.toLowerCase()).filter(x=>x.length>3),m=new Map();for(const x of w)m.set(x,(m.get(x)||0)+1);const repeated=[...m.values()].filter(n=>n>=5).reduce((a,n)=>a+n,0);return w.length?repeated/w.length:0}
export async function POST(req){
 try{
  const{topic="",title="",content=""}=await req.json();
  const text=stripHtml(content), issues=[], checks={};
  checks.topic=topic.trim().length>=8;
  checks.title=title.trim().length>=25&&title.trim().length<=110;
  checks.length=words(text).length>=500;
  checks.structure=/<h2\b/i.test(content)&&/<p\b/i.test(content);
  checks.originalCover=/<img\b[^>]*\bsrc\s*=\s*["']https:\/\//i.test(content);
  checks.repetition=repeatedRatio(text)<0.12;
  checks.keywordStuffing=!/(\b(أفضل|افضل|ربح|طريقة|طرق|دليل)\b[^.]{0,20}){8,}/i.test(text);
  checks.suspiciousLinks=(content.match(/https?:\/\//gi)||[]).length<=5;
  if(!checks.topic)issues.push("الموضوع قصير بزاف");
  if(!checks.title)issues.push("العنوان خاصو يكون بين 25 و110 حرف");
  if(!checks.length)issues.push("المقال أقل من 500 كلمة");
  if(!checks.structure)issues.push("خاص المقال يكون فيه فقرات وعناوين H2");
  if(!checks.originalCover)issues.push("خاص المقال صورة غلاف فعلية برابط HTTPS؛ صورة SVG التجريبية ما كتتحسبش كصورة أصلية.");
  if(!checks.repetition)issues.push("كاين تكرار مرتفع للكلمات");
  if(!checks.keywordStuffing)issues.push("احتمال حشو كلمات مفتاحية");
  if(!checks.suspiciousLinks)issues.push("عدد الروابط مرتفع");
  const passed=Object.values(checks).filter(Boolean).length;
  const score=Math.round((passed/Object.keys(checks).length)*100);
  return NextResponse.json({ok:true,publishable:score>=80&&issues.length===0,score,issues,checks,wordCount:words(text).length});
 }catch{return NextResponse.json({ok:false,error:"تعذر فحص المقال"},{status:400})}
}