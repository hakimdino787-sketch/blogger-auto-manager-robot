import{NextResponse}from"next/server";
import{readSession}from"../../../../lib/session";
import{savePersistentSession}from"../../../../lib/persistent-session";

export async function POST(req){
  const s=readSession(req);
  if(!s?.access_token||!s?.refresh_token)return NextResponse.json({ok:false,error:"جلسة Blogger غير جاهزة"},{status:401});
  const ok=await savePersistentSession(s);
  return NextResponse.json({ok,error:ok?null:"تعذر حفظ جلسة Blogger"});
}