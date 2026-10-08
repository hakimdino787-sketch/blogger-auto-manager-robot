import{NextResponse}from"next/server";
import{getValidSession,setSessionCookie}from"../../../lib/session";
export async function GET(req){
  const {session:s,refreshed,refreshError}=await getValidSession(req);
  if(!s?.access_token)return Response.json({ok:false,connected:false,error:refreshError?"تعذر تجديد جلسة Google":"غير مربوط"},{status:401});
  const r=await fetch("https://www.googleapis.com/blogger/v3/users/self/blogs",{headers:{Authorization:`Bearer ${s.access_token}`}});
  const data=await r.json();
  if(!r.ok)return Response.json({ok:false,connected:false,error:"تعذر جلب مدونات Blogger",details:data},{status:r.status});
  s.blogs=data.items||s.blogs||[];
  const out=NextResponse.json({ok:true,connected:true,blogs:s.blogs});
  if(refreshed)setSessionCookie(out,s);
  return out;
}