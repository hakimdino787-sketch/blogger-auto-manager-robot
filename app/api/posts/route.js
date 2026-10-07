import{readSession}from"../../../lib/session";

export async function GET(req){
  const s=readSession(req),id=new URL(req.url).searchParams.get("blogId");
  if(!s?.access_token)return Response.json({ok:false,error:"غير مربوط"},{status:401});
  if(!id)return Response.json({ok:false,error:"blogId مطلوب"},{status:400});
  const r=await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(id)}/posts?maxResults=20`,{headers:{Authorization:`Bearer ${s.access_token}`}});
  return Response.json(await r.json(),{status:r.status});
}

export async function POST(req){
  const s=readSession(req);
  if(!s?.access_token)return Response.json({ok:false,error:"غير مربوط"},{status:401});
  const{blogId,title,content,draft=false}=await req.json();
  if(!blogId||!title?.trim()||!content?.trim())return Response.json({ok:false,error:"blogId والعنوان والمحتوى مطلوبين"},{status:400});
  const url=`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts${draft?"?isDraft=true":""}`;
  const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${s.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({title:title.trim(),content})});
  return Response.json(await r.json(),{status:r.status});
}