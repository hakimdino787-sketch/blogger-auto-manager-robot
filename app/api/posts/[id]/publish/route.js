import{readSession}from"../../../../../lib/session";
export async function POST(req,{params}){
 if(process.env.BLOGGER_WRITES_ENABLED!=="true")return Response.json({ok:false,error:"النشر متوقف مؤقتاً لحماية المدونة. احفظ المقال كمسودة وراجعه يدوياً من Blogger."},{status:423});
 const s=readSession(req);
 if(!s?.access_token)return Response.json({ok:false,error:"غير مربوط"},{status:401});
 const{id}=await params,blogId=new URL(req.url).searchParams.get("blogId");
 if(!blogId)return Response.json({ok:false,error:"blogId مطلوب"},{status:400});
 const r=await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(id)}/publish`,{method:"POST",headers:{Authorization:`Bearer ${s.access_token}`}});
 return Response.json(await r.json(),{status:r.status});
}
