const SW = (() => {
  const KEY = 'sw_db_v2', SES = 'sw_session_v2';
  const pad = (n, l = 4) => String(n).padStart(l, '0');
  const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const peso = n => '₱ ' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const fdate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const PRODUCTS = {
    window: { name: 'Sliding Window', w: [60, 300], h: [60, 250], panels: [1, 2, 3, 4], dw: 120, dh: 150, dp: 2 },
    door: { name: 'Glass Door', w: [70, 160], h: [180, 250], panels: [1, 2], dw: 90, dh: 210, dp: 1 },
    fixed: { name: 'Fixed Glass Panel', w: [40, 400], h: [40, 300], panels: [1], dw: 100, dh: 120, dp: 1 }
  };
  const GLASS = { clear: { label: 'Clear', op: .35 }, tinted: { label: 'Tinted', op: .65 }, frosted: { label: 'Frosted', op: .85 } };
  const FINISH = { 'Black': '#2b2f36', 'Silver': '#c9ced6', 'Wood tone': '#6b4a2f', 'White': '#f2f2f2', 'Bronze': '#8a6a43' };
  const STAGES = [['Project created', 20], ['Fabrication', 50], ['Installation', 80], ['Completed', 100]];
  const ROLES = { customer: 'Customer', employee: 'Employee', owner: 'Owner / Admin' };
  const STATUS_CLASS = { 'Pending measurement': 'info', 'Awaiting approval': 'warn', 'Reduction requested': 'warn', 'Approved': 'ok' };
  const home = role => ({ customer: 'customize.html', employee: 'employee.html', owner: 'owner.html' }[role]);

  
  function estimate(s, rates) {
    const w = s.width / 100, h = s.height / 100, n = s.panels || 1;
    const frame = r2(2 * (w + h) + (n - 1) * h), area = r2(w * h);
    const items = [
      { item: `Aluminum frame (${s.finish})`, qty: frame, unit: 'm', rate: rates.aluminum },
      { item: `Glass (${GLASS[s.glass].label.toLowerCase()})`, qty: area, unit: 'm²', rate: rates.glass[s.glass] },
      { item: 'Accessories', qty: 1, unit: 'set', rate: rates.accessories[s.product] }
    ].map(i => ({ ...i, amount: r2(i.qty * i.rate) }));
    const material = r2(items.reduce((a, i) => a + i.amount, 0));
    const labor = rates.labor[s.product];
    return { items, material, labor, total: r2(material + labor) };
  }
  function recalc(q, db) {
    const e = estimate(q.spec, db.rates);
    q.items = e.items; q.material = e.material; q.labor = e.labor;
    q.total = r2(e.material + e.labor - (q.discount || 0));
  }

  let mem = null;
  function seed() {
    const db = {
      seq: { Q: 4, D: 4, P: 1, U: 4 },
      rates: {
        aluminum: 350, glass: { clear: 1200, tinted: 1500, frosted: 1700 },
        accessories: { window: 450, door: 900, fixed: 150 }, labor: { window: 1200, door: 1800, fixed: 800 }
      },
      users: [
        { id: 'U-1', name: 'Juan Dela Cruz', email: 'juan@email.com', phone: '0917 000 0001', password: 'demo123', role: 'customer' },
        { id: 'U-2', name: 'Maria Santos', email: 'maria@email.com', phone: '0917 000 0002', password: 'demo123', role: 'customer' },
        { id: 'U-3', name: 'Jeffrey Taopo', email: 'employee@southworks.ph', phone: '', password: 'demo123', role: 'employee' },
        { id: 'U-4', name: 'Ricardo Barlizo', email: 'owner@southworks.ph', phone: '', password: 'demo123', role: 'owner' }
      ],
      designs: [], quotations: [], projects: []
    };
    const mk = (id, uid, spec, status, verified, projectId) => {
      db.designs.push({ id: 'D-' + id.slice(2).replace(/^0+/, ''), userId: uid, spec, created: '2026-10-30' });
      const q = {
        id, userId: uid, designId: 'D-' + id.slice(2).replace(/^0+/, ''), spec, discount: 0, verified, status, created: '2026-10-30', projectId: projectId || null,
        log: [{ d: '2026-10-30', text: 'Quotation requested from 3D design', by: '' }]
      };
      recalc(q, db); db.quotations.push(q); return q;
    };
    mk('Q-0001', 'U-1', { product: 'window', width: 120, height: 150, glass: 'clear', finish: 'Black', panels: 2 }, 'Approved', true, 'P-0001')
      .log.push({ d: '2026-11-01', text: 'Measurements verified by employee', by: 'Jeffrey Taopo' }, { d: '2026-11-02', text: 'Approved by customer', by: 'Juan Dela Cruz' });
    mk('Q-0002', 'U-2', { product: 'door', width: 90, height: 210, glass: 'tinted', finish: 'Silver', panels: 1 }, 'Approved', true)
      .log.push({ d: '2026-11-04', text: 'Approved by customer', by: 'Maria Santos' });
    mk('Q-0003', 'U-1', { product: 'fixed', width: 100, height: 120, glass: 'clear', finish: 'White', panels: 1 }, 'Awaiting approval', true)
      .log.push({ d: '2026-11-05', text: 'Measurements verified by employee', by: 'Jeffrey Taopo' });
    mk('Q-0004', 'U-2', { product: 'window', width: 150, height: 120, glass: 'frosted', finish: 'Wood tone', panels: 3 }, 'Pending measurement', false);
    db.projects.push({
      id: 'P-0001', quotationId: 'Q-0001', userId: 'U-1', start: '2026-11-02', deadline: '2026-11-20', stage: 'Fabrication', progress: 55, status: 'Ongoing',
      updates: [{ d: '2026-11-02', stage: 'Project created', progress: 20, remarks: 'Project record created', by: 'Ricardo Barlizo' },
      { d: '2026-11-06', stage: 'Fabrication', progress: 55, remarks: 'Aluminum frames cut and assembled', by: 'Jeffrey Taopo' }]
    });
    db.quotations[0].log.push({ d: '2026-11-02', text: 'Deadline set to Nov 20, 2026 — project P-0001 created', by: 'Ricardo Barlizo' });
    return db;
  }
  function load() {
    if (mem) return mem;
    try { const s = localStorage.getItem(KEY); if (s) { mem = JSON.parse(s); return mem; } } catch (e) { }
    mem = seed(); save(); return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { } }
  function reset() { mem = seed(); save(); }

  const setSession = id => { try { sessionStorage.setItem(SES, id); } catch (e) { } };
  const clearSession = () => { try { sessionStorage.removeItem(SES); } catch (e) { } };
  function user() { let id = null; try { id = sessionStorage.getItem(SES); } catch (e) { } return id ? load().users.find(u => u.id === id) || null : null; }
  const userName = id => (load().users.find(u => u.id === id) || {}).name || '—';
  function login(email, pw) { return load().users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.password === pw) || null; }
  function addUser(u) {
    const db = load();
    if (db.users.some(x => x.email.toLowerCase() === u.email.trim().toLowerCase())) throw new Error('That email is already registered.');
    const nu = { id: 'U-' + (++db.seq.U), name: u.name.trim(), email: u.email.trim(), phone: u.phone || '', password: u.password, role: u.role || 'customer' };
    db.users.push(nu); save(); return nu;
  }
  function setRole(id, role) { const db = load(); const u = db.users.find(x => x.id === id); if (u) { u.role = role; save(); } }

  /* ---------- business actions (follow the proposed flow chart) ---------- */
  const log = (q, text, by) => q.log.push({ d: today(), text, by: by || '' });
  const find = (db, id) => { const q = db.quotations.find(x => x.id === id); if (!q) throw new Error('Quotation not found.'); return q; };

  function saveDesign(uid, spec) { const db = load(); const d = { id: 'D-' + (++db.seq.D), userId: uid, spec: { ...spec }, created: today() }; db.designs.push(d); save(); return d; }
  function requestQuote(uid, spec, replaceId) {
    const db = load(); const d = { id: 'D-' + (++db.seq.D), userId: uid, spec: { ...spec }, created: today() }; db.designs.push(d);
    let q;
    if (replaceId) {
      q = db.quotations.find(x => x.id === replaceId && x.userId === uid);
      if (!q || q.status === 'Approved') throw new Error('This quotation can no longer be changed.');
      Object.assign(q, { designId: d.id, spec: { ...spec }, verified: false, discount: 0, status: 'Pending measurement' });
      log(q, 'Design changed by customer — measurements must be verified again', userName(uid));
    } else {
      q = { id: 'Q-' + pad(++db.seq.Q), userId: uid, designId: d.id, spec: { ...spec }, discount: 0, verified: false, status: 'Pending measurement', created: today(), projectId: null, log: [] };
      log(q, 'Quotation requested from 3D design', userName(uid)); db.quotations.push(q);
    }
    recalc(q, db); save(); return q;
  }
  function verify(qid, w, h, notes, by) {
    const db = load(), q = find(db, qid), P = PRODUCTS[q.spec.product];
    if (q.status === 'Approved') throw new Error('Quotation is already approved.');
    if (w < P.w[0] || w > P.w[1] || h < P.h[0] || h > P.h[1]) throw new Error(`Size must be ${P.w[0]}–${P.w[1]} cm wide and ${P.h[0]}–${P.h[1]} cm high for a ${P.name}.`);
    q.spec.width = w; q.spec.height = h; q.verified = true; q.notes = notes || ''; q.status = 'Awaiting approval';
    recalc(q, db); log(q, `Measurements verified (${w} × ${h} cm) — quotation generated`, by); save(); return q;
  }
  function approve(qid, by) {
    const db = load(), q = find(db, qid);
    if (q.status !== 'Awaiting approval' || !q.verified) throw new Error('Quotation is not ready for approval.');
    q.status = 'Approved'; log(q, 'Approved by customer', by); save(); return q;
  }
  function requestReduction(qid, by) {
    const db = load(), q = find(db, qid);
    if (q.status !== 'Awaiting approval') throw new Error('Cannot request a reduction at this stage.');
    q.status = 'Reduction requested'; log(q, 'Customer requested a price reduction', by); save(); return q;
  }
  function adjust(qid, discount, by) {
    const db = load(), q = find(db, qid);
    if (!['Awaiting approval', 'Reduction requested'].includes(q.status)) throw new Error('Price can only be adjusted before approval.');
    if (!(discount >= 0) || discount >= q.material + q.labor) throw new Error('Enter a valid reduction amount.');
    q.discount = r2(discount); q.status = 'Awaiting approval'; recalc(q, db);
    log(q, discount ? `Price adjusted: − ${peso(discount)}` : 'Price adjustment removed', by); save(); return q;
  }
  function createProject(qid, deadline, by) {
    const db = load(), q = find(db, qid);
    if (q.status !== 'Approved' || q.projectId) throw new Error('Quotation is not ready for scheduling.');
    if (!deadline) throw new Error('Please choose an estimated completion date.');
    const p = {
      id: 'P-' + pad(++db.seq.P), quotationId: q.id, userId: q.userId, start: today(), deadline, stage: 'Project created', progress: 20, status: 'Ongoing',
      updates: [{ d: today(), stage: 'Project created', progress: 20, remarks: 'Project record created', by }]
    };
    db.projects.push(p); q.projectId = p.id; log(q, `Deadline set to ${fdate(deadline)} — project ${p.id} created`, by); save(); return p;
  }
  function updateProject(pid, stage, pct, remarks, by) {
    const db = load(), p = db.projects.find(x => x.id === pid);
    if (!p) throw new Error('Project not found.');
    pct = stage === 'Completed' ? 100 : Math.max(0, Math.min(99, Math.round(pct)));
    p.stage = stage; p.progress = pct; p.status = stage === 'Completed' ? 'Completed' : 'Ongoing';
    p.updates.push({ d: today(), stage, progress: pct, remarks: remarks || '', by }); save(); return p;
  }
  function setRates(r) { const db = load(); db.rates = r; save(); }

  const $ = id => document.getElementById(id);
  function toast(msg, bad) {
    let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.className = '', 3200);
  }
  function chip(status) { return `<span class="chip ${STATUS_CLASS[status] || ''}">${esc(status)}</span>`; }
  const specText = s => `${PRODUCTS[s.product].name} · ${s.width} × ${s.height} cm · ${s.panels} panel${s.panels > 1 ? 's' : ''} · ${s.finish} · ${GLASS[s.glass].label} glass`;
  function breakdown(q) {
    const qty = i => i.unit === 'set' ? '1 set' : i.qty.toFixed(2) + ' ' + i.unit;
    return `<div class="tw"><table><thead><tr><th>Item</th><th>Qty / Length</th><th>Rate</th><th class="r">Amount</th></tr></thead><tbody>
      ${q.items.map(i => `<tr><td>${esc(i.item)}</td><td>${qty(i)}</td><td>${peso(i.rate)}${i.unit === 'set' ? '' : ' / ' + i.unit}</td><td class="r">${peso(i.amount)}</td></tr>`).join('')}
      <tr><td>Labor</td><td>1 job</td><td>${peso(q.labor)}</td><td class="r">${peso(q.labor)}</td></tr>
      ${q.discount ? `<tr><td>Price adjustment (owner)</td><td></td><td></td><td class="r">− ${peso(q.discount)}</td></tr>` : ''}
      </tbody><tfoot><tr><td colspan="3">Total price</td><td class="r">${peso(q.total)}</td></tr></tfoot></table></div>`;
  }
  function shell(u) {
    const nav = {
      customer: [['customize.html', '3D Customizer'], ['quotation.html', 'My Quotations'], ['status.html', 'Project Status']],
      employee: [['employee.html', 'Employee Panel']],
      owner: [['owner.html', 'Owner Panel'], ['employee.html', 'Employee Panel']]
    }[u.role];
    const page = location.pathname.split('/').pop() || 'index.html';
    const a = document.createElement('aside'); a.className = 'side';
    a.innerHTML = `<div class="brand"><span class="logo">S</span><div><b>SOUTHWORKS</b><small>Trinity · Glass &amp; Aluminum</small></div></div>
      <nav><p class="grp">${u.role === 'customer' ? 'Customer' : 'Staff'}</p>${nav.map(([h, t]) => `<a href="${h}" class="${h === page ? 'on' : ''}">${t}</a>`).join('')}</nav>
      <a class="out" href="index.html" id="logout">Log out</a>`;
    document.body.prepend(a);
    $('logout').addEventListener('click', clearSession);
    const w = $('who'); if (w) w.textContent = `${u.name} · ${ROLES[u.role]}`;
  }
  function need(...roles) {
    const u = user();
    if (!u) { location.replace('index.html'); throw new Error('redirect'); }
    if (roles.length && !roles.includes(u.role)) { location.replace(home(u.role)); throw new Error('redirect'); }
    shell(u); return u;
  }

  return {
    PRODUCTS, GLASS, FINISH, STAGES, ROLES, STATUS_CLASS, esc, peso, fdate, today, estimate, db: load, reset, setSession, clearSession, user, userName, login, addUser, setRole, home,
    saveDesign, requestQuote, verify, approve, requestReduction, adjust, createProject, updateProject, setRates, toast, chip, specText, breakdown, need, $
  };
})();
