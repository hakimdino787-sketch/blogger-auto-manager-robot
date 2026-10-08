import{get,put}from"@vercel/blob";

const PATH="auth/blogger-session.json";

export async function loadPersistentSession(){
  if(!process.env.BLOB_READ_WRITE_TOKEN)return null;
  try{
    const r=await get(PATH,{access:"private",useCache:false});
    if(!r?.stream)return null;
    return JSON.parse(await new Response(r.stream).text());
  }catch{return null}
}

export async function savePersistentSession(session){
  if(!process.env.BLOB_READ_WRITE_TOKEN)return false;
  try{
    await put(PATH,JSON.stringify(session),{access:"private",addRandomSuffix:false,allowOverwrite:true});
    return true;
  }catch{return false}
}