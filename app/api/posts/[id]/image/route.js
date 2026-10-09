import { NextResponse } from "next/server";
import { getValidSession, refreshSession, setSessionCookie } from "../../../../../lib/session";
import { loadPersistentSession } from "../../../../../lib/persistent-session";

async function bloggerRequest(session, url, options = {}) {
  let current = session;
  let r = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${current.access_token}` } });
  let refreshed = false;
  if ((r.status === 401 || r.status === 403) && current.refresh_token) {
    const rr = await refreshSession(current);
    if (rr.ok) {
      current = rr.session;
      r = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${current.access_token}` } });
      refreshed = true;
    }
  }
  if (r.status === 403) {
    const persistent = await loadPersistentSession();
    if (persistent?.refresh_token && persistent.refresh_token !== current.refresh_token) {
      const rr = await refreshSession(persistent);
      if (rr.ok) {
        current = rr.session;
        r = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${current.access_token}` } });
        refreshed = true;
      }
    }
  }
  return { r, session: current, refreshed };
}

export async function POST(req, { params }) {
  if (process.env.BLOGGER_WRITES_ENABLED !== "true") {
    return Response.json({ ok: false, error: "تعديل Blogger متوقف مؤقتاً بسبب إعداد الحماية (BLOGGER_WRITES_ENABLED)." }, { status: 423 });
  }
  const { session, refreshed, refreshError } = await getValidSession(req);
  if (!session?.access_token) return Response.json({ ok: false, error: refreshError ? "تعذر تجديد جلسة Google" : "غير مربوط" }, { status: 401 });

  const { blogId, imageUrl, alt } = await req.json();
  const postId = (await params).id;
  if (!blogId || !postId || !imageUrl) return Response.json({ ok: false, error: "blogId و postId ورابط الصورة مطلوبون" }, { status: 400 });

  let parsed;
  try { parsed = new URL(imageUrl); } catch { return Response.json({ ok: false, error: "رابط الصورة غير صالح" }, { status: 400 }); }
  if (parsed.protocol !== "https:" || parsed.hostname !== "images.openai.com") {
    return Response.json({ ok: false, error: "مسموح فقط بروابط الصور الأصلية المتفق عليها" }, { status: 400 });
  }

  const listUrl = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts?maxResults=50&status=DRAFT`;
  const list = await bloggerRequest(session, listUrl);
  const listData = await list.r.json();
  if (!list.r.ok) {
    const out = NextResponse.json({ ok: false, error: listData.error?.message || "تعذر قراءة قائمة المسودات" }, { status: list.r.status });
    if (refreshed || list.refreshed) setSessionCookie(out, list.session);
    return out;
  }
  const post = (listData.items || []).find(item => String(item.id) === String(postId));
  if (!post || post.status !== "DRAFT") {
    return Response.json({ ok: false, error: "المقال ما لقيناهش ضمن المسودات الحالية؛ ما تبدل والو." }, { status: 404 });
  }
  const escapedAlt = String(alt || post.title || "Tiizkwiz").replace(/[<>&"]/g, "");
  if (String(post.content || "").includes(imageUrl)) {
    return Response.json({ ok: true, alreadyPresent: true, title: post.title, status: "DRAFT" });
  }
  const image = `<div style="margin:0 0 24px"><img src="${imageUrl}" alt="${escapedAlt}" style="display:block;width:100%;height:auto;max-width:100%;border-radius:16px" loading="lazy"/></div>`;
  const updated = { ...post, content: image + (post.content || "") };
  delete updated.published;
  const base = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}`;
  const put = await bloggerRequest(list.session, base, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
  const result = await put.r.json();
  const out = NextResponse.json({ ok: put.r.ok, title: result.title || post.title, status: result.status || "DRAFT", imageAdded: put.r.ok, error: result.error?.message }, { status: put.r.status });
  if (refreshed || list.refreshed || put.refreshed) setSessionCookie(out, put.session);
  return out;
}
