import crypto from "crypto";
const COOKIE="blogger_session";
function key(){return crypto.createHash("sha256").update(process.env.AUTH_SECRET||"").digest()}
export function seal(obj){const iv=crypto.randomBytes(12),c=crypto.createCipheriv("aes-256-gcm",key(),iv),enc=Buffer.concat([c.update(JSON.stringify(obj),"utf8"),c.final()]);return[iv.toString("base64url"),c.getAuthTag().toString("base64url"),enc.toString("base64url")].join(".")}
export function unseal(v){try{const[iv,tag,data]=v.split("."),d=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64url"));d.setAuthTag(Buffer.from(tag,"base64url"));return JSON.parse(Buffer.concat([d.update(Buffer.from(data,"base64url")),d.final()]).toString("utf8"))}catch{return null}}
export function readSession(req){return unseal(req.cookies.get(COOKIE)?.value||"")}