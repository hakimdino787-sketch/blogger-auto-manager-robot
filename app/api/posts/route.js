import{NextResponse}from"next/server";
import{getValidSession,refreshSession,setSessionCookie}from"../../../lib/session";

async function bloggerRequest(session,url,options={}){
  let current=session;
  let r=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${current.access_token}`}});
  if(r.status===401&&current.refresh_token){
    const rr=await refreshSession(current);
    if(rr.ok){
      current=rr.session;
      r=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${current.access_token}`}});
      return{r,session:current,refreshed:true};
    }
  }
  return{r,session:current,refreshed:false};
}

export async function GET(req){
  const {session:s,refreshed,refreshError}=await getValidSession(req);
  const id=new URL(req.url).searchParams.get("blogId");
  if(!s?.access_token)return Response.json({ok:false,error:refreshError?"تعذر تجديد جلسة Google":"غير مربوط"},{status:401});
  if(!id)return Response.json({ok:false,error:"blogId مطلوب"},{status:400});
  const x=await bloggerRequest(s,`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(id)}/posts?maxResults=20`);
  const data=await x.r.json();
  const out=NextResponse.json(data,{status:x.r.status});
  if(refreshed||x.refreshed)setSessionCookie(out,x.session);
  return out;
}

export async function POST(req){
  const {session:s,refreshed,refreshError}=await getValidSession(req);
  if(!s?.access_token)return Response.json({ok:false,error:refreshError?"تعذر تجديد جلسة Google":"غير مربوط"},{status:401});
  const{blogId,title,content,draft=false,labels=[]}=await req.json();
  if(!blogId||!title?.trim()||!content?.trim())return Response.json({ok:false,error:"blogId والعنوان والمحتوى مطلوبين"},{status:400});
  const safeLabels=Array.isArray(labels)?labels.filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim()).slice(0,20):[];
  const url=`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts${draft?"?isDraft=true":""}`;
  const x=await bloggerRequest(s,url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:title.trim(),content,labels:safeLabels})});
  const data=await x.r.json();
  const out=NextResponse.json(data,{status:x.r.status});
  if(refreshed||x.refreshed)setSessionCookie(out,x.session);
  return out;
}
