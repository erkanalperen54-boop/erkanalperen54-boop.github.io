/* Güvenli döküman portalı — Express + SQLite */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const multer = require('multer');
const { marked } = require('marked');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'degistir-beni-123';
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'pdfs'), { recursive: true });

/* ---------- DB ---------- */
const db = new Database(path.join(DATA_DIR, 'portal.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',      -- admin | member
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS projects(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private', -- public | private
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS docs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'markdown',    -- markdown | pdf
  content TEXT DEFAULT '',
  pdf_file TEXT DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS invites(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);
`);

// Admin hesabını tohumla
(function seedAdmin(){
  const row = db.prepare('SELECT id FROM users WHERE username=?').get(ADMIN_USER);
  if(!row){
    db.prepare("INSERT INTO users(username,pass_hash,role,status) VALUES(?,?, 'admin','approved')")
      .run(ADMIN_USER, bcrypt.hashSync(ADMIN_PASS, 12));
    console.log(`[portal] Admin hesabı oluşturuldu: ${ADMIN_USER} (ADMIN_PASS ile şifre belirleyin!)`);
  }
})();

/* ---------- Helpers ---------- */
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('trust proxy', 1);

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function parseCookies(req){
  const out = {};
  (req.headers.cookie||'').split(';').forEach(p=>{
    const i = p.indexOf('='); if(i>0) out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1).trim());
  });
  return out;
}
function currentUser(req){
  const token = parseCookies(req).portal_session;
  if(!token) return null;
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token=? AND u.status='approved'`).get(token);
  return row || null;
}
function setSession(res, userId){
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token,user_id) VALUES(?,?)').run(token, userId);
  res.setHeader('Set-Cookie', `portal_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60*60*24*14}${COOKIE_SECURE?'; Secure':''}`);
  return token;
}
function clearSession(req, res){
  const token = parseCookies(req).portal_session;
  if(token) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
  res.setHeader('Set-Cookie', 'portal_session=; HttpOnly; Path=/; Max-Age=0');
}
function requireAuth(req, res, next){
  const u = currentUser(req);
  if(!u) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  req.user = u; next();
}
function requireAdmin(req, res, next){
  const u = currentUser(req);
  if(!u) return res.redirect('/login');
  if(u.role !== 'admin') return res.status(403).send(page('Yetkisiz', `<p class="msg err">Bu alan yalnızca yöneticilere açıktır.</p><p><a href="/projects">← Projelere dön</a></p>`, u));
  req.user = u; next();
}
function canSeeProject(user, project){
  if(project.visibility === 'public') return true;
  if(!user) return false;
  if(user.role === 'admin') return true;
  return !!db.prepare('SELECT 1 FROM invites WHERE project_id=? AND user_id=?').get(project.id, user.id);
}

/* ---------- Sayfa iskeleti ---------- */
function page(title, body, user){
  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} — Alperen Erkan</title>
<link rel="stylesheet" href="/style.css">
<style>
.portal{max-width:860px;margin:0 auto;padding:140px 24px 80px}
.portal h1{font-size:clamp(32px,5vw,52px);font-weight:700;letter-spacing:-.03em}
.portal .eyebrow{margin-bottom:12px}
.card{background:var(--bg-soft);border-radius:var(--radius);padding:32px;margin-top:24px}
label{display:block;font-size:13px;font-weight:600;margin:16px 0 6px;color:var(--ink-2)}
input,select,textarea{width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:#fff;font-size:15px;font-family:inherit}
textarea{min-height:200px;resize:vertical;font-family:ui-monospace,Menlo,monospace;font-size:13.5px}
.msg{padding:14px 18px;border-radius:12px;margin-top:18px;font-size:14.5px}
.msg.ok{background:rgba(48,209,88,.12);color:#1a7f37}
.msg.err{background:rgba(255,59,48,.1);color:#c1271f}
table{width:100%;border-collapse:collapse;font-size:14.5px;margin-top:12px}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}
th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3)}
.pill{font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:980px;background:rgba(0,113,227,.1);color:var(--accent)}
.pill.gray{background:rgba(0,0,0,.06);color:var(--ink-2)}
.row-actions a,.row-actions button{font-size:13px;color:var(--accent);background:none;border:none;cursor:pointer;font-family:inherit;padding:0;margin-right:10px}
.proj{display:block;background:var(--bg-soft);border-radius:var(--radius);padding:26px 28px;margin-top:16px;transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
.proj:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(0,0,0,.08)}
.proj h3{font-size:19px;font-weight:700;letter-spacing:-.01em}
.proj p{font-size:14px;color:var(--ink-2);margin-top:6px;line-height:1.6}
.doc-body{font-size:16px;line-height:1.8;color:var(--ink-2)}
.doc-body h1,.doc-body h2,.doc-body h3{color:var(--ink);letter-spacing:-.02em;margin:28px 0 12px}
.doc-body pre{background:#1d1d1f;color:#f5f5f7;padding:18px;border-radius:12px;overflow:auto;font-size:13.5px}
.doc-body code{font-family:ui-monospace,Menlo,monospace;font-size:.92em}
.doc-body p code{background:rgba(0,0,0,.06);padding:2px 6px;border-radius:6px}
.doc-body table{font-size:14.5px}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.topbar nav{display:flex;gap:18px;font-size:14.5px}
.topbar nav a{color:var(--ink-2)} .topbar nav a:hover{color:var(--accent)}
.pdf-frame{width:100%;height:78vh;border:none;border-radius:12px;background:#fff}
.small{font-size:13px;color:var(--ink-3)}
</style></head><body>
<div class="portal">
  <div class="topbar">
    <a href="/" style="font-weight:700;letter-spacing:-.02em;font-size:18px">Alperen Erkan</a>
    <nav>
      <a href="/projects">Dökümanlar</a>
      ${user && user.role==='admin' ? '<a href="/admin">Yönetim</a>' : ''}
      ${user ? `<a href="/logout">Çıkış (${esc(user.username)})</a>` : '<a href="/login">Giriş</a>'}
    </nav>
  </div>
  ${body}
</div></body></html>`;
}

/* ---------- Auth ---------- */
app.get(['/login','/login.html'], (req,res)=>{
  const u = currentUser(req);
  if(u) return res.redirect('/projects');
  const next = esc(req.query.next || '/projects');
  const err = req.query.err ? '<p class="msg err">Kullanıcı adı veya şifre hatalı.</p>' : '';
  const pend = req.query.pending ? '<p class="msg ok">Kaydınız alındı. Yönetici onayından sonra giriş yapabilirsiniz.</p>' : '';
  const rej = req.query.rejected ? '<p class="msg err">Hesabınız henüz onaylanmadı veya reddedildi.</p>' : '';
  res.send(page('Giriş', `
    <p class="eyebrow">/login</p><h1>Güvenli alan</h1>
    ${err}${pend}${rej}
    <div class="card">
      <form method="POST" action="/login">
        <input type="hidden" name="next" value="${next}">
        <label>Kullanıcı adı</label><input name="username" required autocomplete="username">
        <label>Şifre</label><input name="password" type="password" required autocomplete="current-password">
        <p style="margin-top:22px"><button class="btn btn--primary" type="submit">Giriş yap</button></p>
      </form>
    </div>
    <p class="small" style="margin-top:18px">Hesabın yok mu? <a href="/register" style="color:var(--accent)">Kayıt ol</a> — kayıtlar yönetici onayına tabidir.</p>
  `));
});

app.post('/login', (req,res)=>{
  const { username, password, next } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(String(username||'').trim());
  if(!u || !bcrypt.compareSync(String(password||''), u.pass_hash)) return res.redirect('/login?err=1');
  if(u.status !== 'approved') return res.redirect('/login?rejected=1');
  setSession(res, u.id);
  const target = (next && next.startsWith('/')) ? next : '/projects';
  res.redirect(target);
});

app.get(['/register','/register.html'], (req,res)=>{
  const taken = req.query.taken ? '<p class="msg err">Bu kullanıcı adı zaten alınmış.</p>' : '';
  res.send(page('Kayıt', `
    <p class="eyebrow">/register</p><h1>Kayıt ol</h1>
    ${taken}
    <div class="card">
      <form method="POST" action="/register">
        <label>Kullanıcı adı</label><input name="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_.-]+" autocomplete="username">
        <label>Şifre (en az 8 karakter)</label><input name="password" type="password" required minlength="8" autocomplete="new-password">
        <p style="margin-top:22px"><button class="btn btn--primary" type="submit">Kayıt isteği gönder</button></p>
      </form>
    </div>
    <p class="small" style="margin-top:18px">Kaydın yönetici tarafından onaylandıktan sonra giriş yapabilirsin.</p>
  `));
});

app.post('/register', (req,res)=>{
  const username = String(req.body.username||'').trim();
  const password = String(req.body.password||'');
  if(!/^[A-Za-z0-9_.-]{3,32}$/.test(username) || password.length < 8) return res.redirect('/register');
  try{
    db.prepare("INSERT INTO users(username,pass_hash,role,status) VALUES(?,?,'member','pending')")
      .run(username, bcrypt.hashSync(password, 12));
  }catch(e){ return res.redirect('/register?taken=1'); }
  res.redirect('/login?pending=1');
});

app.get('/logout', (req,res)=>{ clearSession(req,res); res.redirect('/'); });

/* ---------- Projeler ---------- */
app.get('/projects', (req,res)=>{
  const u = currentUser(req);
  let rows;
  if(!u){
    rows = db.prepare("SELECT * FROM projects WHERE visibility='public' ORDER BY created_at DESC").all();
  } else if(u.role==='admin'){
    rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  } else {
    rows = db.prepare(`SELECT p.* FROM projects p LEFT JOIN invites i ON i.project_id=p.id AND i.user_id=?
      WHERE p.visibility='public' OR i.id IS NOT NULL ORDER BY p.created_at DESC`).all(u.id);
  }
  const list = rows.length ? rows.map(p=>`
    <a class="proj" href="/projects/${esc(p.slug)}">
      <span class="pill ${p.visibility==='public'?'':'gray'}">${p.visibility==='public'?'Açık':'Kapalı · davetli'}</span>
      <h3 style="margin-top:10px">${esc(p.title)}</h3>
      <p>${esc(p.summary)}</p>
    </a>`).join('') :
    '<p class="small" style="margin-top:24px">Şu an görüntüleyebileceğin döküman yok. Yetki için yöneticiyle iletişime geç.</p>';
  res.send(page('Dökümanlar', `
    <p class="eyebrow">/projects</p><h1>Proje dökümanları</h1>
    ${u?'':'<p class="small" style="margin-top:14px">Yalnızca açık projeleri görüyorsun. Kapalı projeler için <a href="/login" style="color:var(--accent)">giriş yap</a>.</p>'}
    ${list}
  `, u));
});

app.get('/projects/:slug', (req,res)=>{
  const p = db.prepare('SELECT * FROM projects WHERE slug=?').get(req.params.slug);
  if(!p) return res.status(404).send(page('Bulunamadı','<p class="msg err">Proje bulunamadı.</p>'));
  const u = currentUser(req);
  if(!canSeeProject(u,p)) return res.redirect('/login?next='+encodeURIComponent(req.originalUrl));
  const docs = db.prepare('SELECT * FROM docs WHERE project_id=? ORDER BY sort,id').all(p.id);
  const list = docs.length ? docs.map(d=>`
    <a class="proj" href="/projects/${esc(p.slug)}/${d.id}">
      <span class="pill">${d.kind==='pdf'?'PDF':'Döküman'}</span>
      <h3 style="margin-top:10px">${esc(d.title)}</h3>
      <p class="small">Eklenme: ${esc(d.created_at)}</p>
    </a>`).join('') : '<p class="small" style="margin-top:24px">Bu projede henüz döküman yok.</p>';
  res.send(page(p.title, `
    <p class="eyebrow">/projects/${esc(p.slug)}</p><h1>${esc(p.title)}</h1>
    <p class="lede" style="margin-top:14px">${esc(p.summary)}</p>
    ${list}
  `, u));
});

app.get('/projects/:slug/:docId', (req,res)=>{
  const p = db.prepare('SELECT * FROM projects WHERE slug=?').get(req.params.slug);
  const d = p && db.prepare('SELECT * FROM docs WHERE id=? AND project_id=?').get(req.params.docId, p.id);
  if(!p || !d) return res.status(404).send(page('Bulunamadı','<p class="msg err">Döküman bulunamadı.</p>'));
  const u = currentUser(req);
  if(!canSeeProject(u,p)) return res.redirect('/login?next='+encodeURIComponent(req.originalUrl));
  const body = d.kind==='pdf'
    ? `<iframe class="pdf-frame" src="/pdf/${d.id}"></iframe><p class="small" style="margin-top:12px"><a href="/pdf/${d.id}?dl=1" style="color:var(--accent)">PDF'i indir ↓</a></p>`
    : `<div class="doc-body card">${marked.parse(d.content||'')}</div>`;
  res.send(page(d.title, `
    <p class="eyebrow"><a href="/projects/${esc(p.slug)}" style="color:var(--accent)">← ${esc(p.title)}</a></p>
    <h1>${esc(d.title)}</h1>
    <div style="margin-top:28px">${body}</div>
  `, u));
});

app.get('/pdf/:docId', (req,res)=>{
  const d = db.prepare('SELECT * FROM docs WHERE id=? AND kind=\'pdf\'').get(req.params.docId);
  if(!d) return res.status(404).end();
  const p = db.prepare('SELECT * FROM projects WHERE id=?').get(d.project_id);
  const u = currentUser(req);
  if(!canSeeProject(u,p)) return res.status(403).end('Yetkisiz erişim');
  const file = path.join(DATA_DIR, 'pdfs', path.basename(d.pdf_file));
  if(!fs.existsSync(file)) return res.status(404).end();
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition', `${req.query.dl?'attachment':'inline'}; filename="${encodeURIComponent(d.title)}.pdf"`);
  fs.createReadStream(file).pipe(res);
});

/* ---------- Admin ---------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req,f,cb)=>cb(null, path.join(DATA_DIR,'pdfs')),
    filename: (req,f,cb)=>cb(null, crypto.randomBytes(16).toString('hex')+'.pdf')
  }),
  limits:{ fileSize: 50*1024*1024 },
  fileFilter: (req,f,cb)=>cb(null, /pdf$/i.test(f.originalname))
});

app.get('/admin', requireAdmin, (req,res)=>{
  const pending = db.prepare("SELECT * FROM users WHERE status='pending' ORDER BY created_at").all();
  const members = db.prepare("SELECT * FROM users WHERE status!='pending' ORDER BY created_at DESC").all();
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  const invites = db.prepare(`SELECT i.id, i.project_id, u.username FROM invites i JOIN users u ON u.id=i.user_id`).all();

  const pendRows = pending.map(x=>`<tr><td>${esc(x.username)}</td><td class="small">${esc(x.created_at)}</td>
    <td class="row-actions">
      <form method="POST" action="/admin/user/status" style="display:inline"><input type="hidden" name="id" value="${x.id}"><input type="hidden" name="status" value="approved"><button>✓ Onayla</button></form>
      <form method="POST" action="/admin/user/status" style="display:inline"><input type="hidden" name="id" value="${x.id}"><input type="hidden" name="status" value="rejected"><button style="color:#c1271f">✕ Reddet</button></form>
    </td></tr>`).join('') || '<tr><td colspan="3" class="small">Bekleyen kayıt yok.</td></tr>';

  const projOpts = projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('');
  const memberOpts = members.filter(m=>m.role!=='admin').map(m=>`<option value="${m.id}">${esc(m.username)}</option>`).join('');

  const projRows = projects.map(p=>{
    const inv = invites.filter(i=>i.project_id===p.id).map(i=>`
      <form method="POST" action="/admin/invite/remove" style="display:inline"><input type="hidden" name="id" value="${i.id}">
      <span class="pill gray">${esc(i.username)} <button style="border:none;background:none;color:#c1271f;cursor:pointer">×</button></span></form>`).join(' ') || '<span class="small">davetli yok</span>';
    return `<tr>
      <td><a href="/projects/${esc(p.slug)}" style="color:var(--accent)">${esc(p.title)}</a><br><span class="small">/${esc(p.slug)}</span></td>
      <td><span class="pill ${p.visibility==='public'?'':'gray'}">${p.visibility==='public'?'Açık':'Kapalı'}</span></td>
      <td>${inv}</td>
      <td class="row-actions">
        <form method="POST" action="/admin/project/delete" style="display:inline" onsubmit="return confirm('Proje ve dökümanları silinsin mi?')"><input type="hidden" name="id" value="${p.id}"><button style="color:#c1271f">Sil</button></form>
      </td></tr>`;
  }).join('') || '<tr><td colspan="4" class="small">Henüz proje yok.</td></tr>';

  const memberRows = members.map(m=>`<tr><td>${esc(m.username)}</td><td><span class="pill gray">${esc(m.role)}</span> <span class="pill ${m.status==='approved'?'':'gray'}">${esc(m.status)}</span></td>
    <td class="row-actions">${m.role!=='admin' ? `<form method="POST" action="/admin/user/delete" style="display:inline" onsubmit="return confirm('Kullanıcı silinsin mi?')"><input type="hidden" name="id" value="${m.id}"><button style="color:#c1271f">Sil</button></form>`:''}</td></tr>`).join('');

  res.send(page('Yönetim', `
    <p class="eyebrow">/admin</p><h1>Yönetim paneli</h1>

    <div class="card"><h2 style="font-size:19px;font-weight:700">⏳ Onay bekleyen kayıtlar</h2>
      <table><tr><th>Kullanıcı</th><th>Tarih</th><th></th></tr>${pendRows}</table></div>

    <div class="card"><h2 style="font-size:19px;font-weight:700">📁 Projeler & davetler</h2>
      <table><tr><th>Proje</th><th>Görünürlük</th><th>Davetliler</th><th></th></tr>${projRows}</table>
      <h3 style="margin-top:26px;font-size:15px;font-weight:700">Yeni proje</h3>
      <form method="POST" action="/admin/project/create" style="margin-top:8px">
        <label>Başlık</label><input name="title" required>
        <label>Slug (URL)</label><input name="slug" required pattern="[a-z0-9-]+" placeholder="neox-kernel">
        <label>Özet</label><input name="summary">
        <label>Görünürlük</label><select name="visibility"><option value="private">Kapalı (davetli)</option><option value="public">Açık</option></select>
        <p style="margin-top:18px"><button class="btn btn--primary">Proje oluştur</button></p>
      </form>
      <h3 style="margin-top:26px;font-size:15px;font-weight:700">Kullanıcıyı projeye davet et</h3>
      <form method="POST" action="/admin/invite" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        <select name="project_id" style="flex:1;min-width:180px">${projOpts}</select>
        <select name="user_id" style="flex:1;min-width:180px">${memberOpts}</select>
        <button class="btn btn--primary" style="padding:12px 22px">Davet et</button>
      </form>
    </div>

    <div class="card"><h2 style="font-size:19px;font-weight:700">➕ Projeye döküman ekle</h2>
      <form method="POST" action="/admin/doc/create" enctype="multipart/form-data" style="margin-top:12px">
        <label>Proje</label><select name="project_id">${projOpts}</select>
        <label>Döküman başlığı</label><input name="title" required>
        <label>Tür</label><select name="kind" onchange="document.getElementById('mdArea').style.display=this.value==='markdown'?'block':'none';document.getElementById('pdfArea').style.display=this.value==='pdf'?'block':'none'">
          <option value="markdown">Markdown (site içi sayfa)</option><option value="pdf">PDF yükle</option></select>
        <div id="mdArea"><label>İçerik (Markdown)</label><textarea name="content" placeholder="# Başlık&#10;&#10;İçerik..."></textarea></div>
        <div id="pdfArea" style="display:none"><label>PDF dosyası (maks 50MB)</label><input type="file" name="pdf" accept="application/pdf"></div>
        <p style="margin-top:18px"><button class="btn btn--primary">Dökümanı kaydet</button></p>
      </form>
    </div>

    <div class="card"><h2 style="font-size:19px;font-weight:700">👥 Kullanıcılar</h2>
      <table><tr><th>Kullanıcı</th><th>Rol / Durum</th><th></th></tr>${memberRows}</table></div>
  `, req.user));
});

app.post('/admin/user/status', requireAdmin, (req,res)=>{
  const st = req.body.status==='approved'?'approved':'rejected';
  db.prepare('UPDATE users SET status=? WHERE id=? AND role!=\'admin\'').run(st, req.body.id);
  res.redirect('/admin');
});
app.post('/admin/user/delete', requireAdmin, (req,res)=>{
  db.prepare('DELETE FROM users WHERE id=? AND role!=\'admin\'').run(req.body.id);
  res.redirect('/admin');
});
app.post('/admin/project/create', requireAdmin, (req,res)=>{
  const slug = String(req.body.slug||'').toLowerCase().replace(/[^a-z0-9-]/g,'-');
  try{
    db.prepare('INSERT INTO projects(slug,title,summary,visibility) VALUES(?,?,?,?)')
      .run(slug, String(req.body.title||'').trim(), String(req.body.summary||''), req.body.visibility==='public'?'public':'private');
  }catch(e){}
  res.redirect('/admin');
});
app.post('/admin/project/delete', requireAdmin, (req,res)=>{
  const docs = db.prepare('SELECT pdf_file FROM docs WHERE project_id=? AND kind=\'pdf\'').all(req.body.id);
  docs.forEach(d=>{ try{ fs.unlinkSync(path.join(DATA_DIR,'pdfs',path.basename(d.pdf_file))); }catch(e){} });
  db.prepare('DELETE FROM projects WHERE id=?').run(req.body.id);
  res.redirect('/admin');
});
app.post('/admin/invite', requireAdmin, (req,res)=>{
  try{ db.prepare('INSERT OR IGNORE INTO invites(project_id,user_id) VALUES(?,?)').run(req.body.project_id, req.body.user_id); }catch(e){}
  res.redirect('/admin');
});
app.post('/admin/invite/remove', requireAdmin, (req,res)=>{
  db.prepare('DELETE FROM invites WHERE id=?').run(req.body.id);
  res.redirect('/admin');
});
app.post('/admin/doc/create', requireAdmin, upload.single('pdf'), (req,res)=>{
  const kind = req.body.kind==='pdf' ? 'pdf' : 'markdown';
  const title = String(req.body.title||'').trim();
  if(!title || !req.body.project_id) return res.redirect('/admin');
  if(kind==='pdf'){
    if(!req.file) return res.redirect('/admin');
    db.prepare("INSERT INTO docs(project_id,title,kind,pdf_file) VALUES(?,?, 'pdf', ?)")
      .run(req.body.project_id, title, req.file.filename);
  } else {
    db.prepare("INSERT INTO docs(project_id,title,kind,content) VALUES(?,?, 'markdown', ?)")
      .run(req.body.project_id, title, String(req.body.content||''));
  }
  res.redirect('/admin');
});

/* ---------- Statik site (mevcut sayfalara dokunulmuyor) ---------- */
app.use(express.static(__dirname, { index: 'index.html', extensions: ['html'] }));

app.listen(PORT, ()=>console.log(`[portal] http://localhost:${PORT}`));
