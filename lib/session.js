import crypto from "crypto";
const COOKIE="blogger_session";
function key(){return crypto.createHash("sha256").update(process.env.AUTH_SECRET||"").digest()}
export function seal(obj){const iv=crypto.randomBytes(12),c=crypto.createCipheriv("aes-256-gcm",key(),iv),enc=Buffer.concat([c.update(JSON.stringify(obj),"utf8"),c.final()]);return[iv.toString("base64url"),c.getAuthTag().toString("base64url"),enc.toString("base64url")].join(".")}
export function unseal(v){try{const[iv,tag,data]=v.split(".");if(!iv||!tag||!data)return null;const d=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64url"));d.setAuthTag(Buffer.from(tag,"base64url"));return JSON.parse(Buffer.concat([d.update(Buffer.from(data,"base64url")),d.final()]).toString("utf8"))}catch{return null}}
export function readSession(req){return unseal(req.cookies.get(COOKIE)?.value||"")}
export function sessionCookieOptions(){return{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:604800}}
export async function refreshSession(s){
  if(!s?.refresh_token||!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET)return {session:s,ok:false};
  const body=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,refresh_token:s.refresh_token,grant_type:"refresh_token"});
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const tokens=await r.json();
  if(!r.ok||!tokens.access_token)return {session:s,ok:false,error:tokens};
  return {session:{...s,access_token:tokens.access_token,expires_at:Date.now()+Number(tokens.expires_in||3600)*1000,refresh_token:tokens.refresh_token||s.refresh_token},ok:true};
}
export async function getValidSession(req){
  const s=readSession(req);
  if(!s?.access_token)return {session:null,refreshed:false};
  if(s.expires_at&&Date.now()<Number(s.expires_at)-120000)return {session:s,refreshed:false};
  const r=await refreshSession(s);
  return r.ok?{session:r.session,refreshed:true}:{session:s,refreshed:false,refreshError:r.error};
}
export function setSessionCookie(response,session){response.cookies.set(COOKIE,seal(session),sessionCookieOptions());return response}
