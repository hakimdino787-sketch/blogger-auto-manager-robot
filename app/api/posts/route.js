import{NextResponse}from"next/server";
import{getValidSession,refreshSession,setSessionCookie}from"../../../lib/session";
import{loadPersistentSession}from"../../../lib/persistent-session";

async function bloggerRequest(session,url,options={}){
  let current=session;
  let r=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${current.access_token}`}});
  let refreshed=false;
  if((r.status===401||r.status===403)&&current.refresh_token){
    const rr=await refreshSession(current);
    if(rr.ok){
      current=rr.session;
      r=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${current.access_token}`}});
      refreshed=true;
    }
  }
  if(r.status===403){
    const persistent=await loadPersistentSession();
    if(persistent?.refresh_token&&persistent.refresh_token!==current.refresh_token){
      const rr=await refreshSession(persistent);
      if(rr.ok){
        current=rr.session;
        r=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${current.access_token}`}});
        refreshed=true;
      }
    }
  }
  return{r,session:current,refreshed};
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
  if(process.env.BLOGGER_WRITES_ENABLED!=="true")return Response.json({ok:false,error:"Blogger API للكتابة متوقف مؤقتاً لحماية الحساب أثناء مراجعة تقييد Google. يمكنك حفظ المقال محلياً، وسيُعاد تفعيل الإرسال بعد رفع التقييد."},{status:423});
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
