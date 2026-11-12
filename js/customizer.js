(function () {
  const u = SW.need('customer'), $ = SW.$, P = SW.PRODUCTS, G = SW.GLASS, F = SW.FINISH;
  const params = new URLSearchParams(location.search);
  const editQ = params.get('edit') ? SW.db().quotations.find(q => q.id === params.get('edit') && q.userId === u.id && q.status !== 'Approved') : null;

  $('product').innerHTML = Object.entries(P).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  $('glass').innerHTML = Object.entries(G).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  let finish = 'Black';
  $('finish').innerHTML = Object.entries(F).map(([n, c]) => `<button type="button" class="sw" data-n="${n}" title="${n}" aria-label="${n}" aria-pressed="false" style="background:${c}"></button>`).join('');
  $('finish').addEventListener('click', e => { const b = e.target.closest('.sw'); if (b) { finish = b.dataset.n; sync(); } });

  function fillPanels(max, val) {
    $('panels').innerHTML = P[$('product').value].panels.map(n => `<option>${n}</option>`).join('');
    $('panels').value = Math.min(val, Math.max(...P[$('product').value].panels));
  }
  function applySpec(s) {
    $('product').value = s.product; fillPanels(0, s.panels);
    $('w').value = s.width; $('h').value = s.height; $('glass').value = s.glass; finish = s.finish;
  }
  function defaults() { const p = P[$('product').value]; $('w').value = p.dw; $('h').value = p.dh; fillPanels(0, p.dp); }

  if (editQ) {
    applySpec(editQ.spec);
    $('ttl').textContent = 'Change design · ' + editQ.id;
    $('editnote').hidden = false;
    $('editnote').textContent = 'Editing this quotation. Saving a new design will send it back for measurement verification.';
    $('go').textContent = 'Update quotation';
  } else { defaults(); }

  function spec() {
    return {
      product: $('product').value, width: Math.round(+$('w').value) || 0, height: Math.round(+$('h').value) || 0,
      glass: $('glass').value, finish, panels: +$('panels').value
    };
  }
  function check(s) {
    const p = P[s.product];
    if (s.width < p.w[0] || s.width > p.w[1]) return `Width must be ${p.w[0]}–${p.w[1]} cm for a ${p.name}.`;
    if (s.height < p.h[0] || s.height > p.h[1]) return `Height must be ${p.h[0]}–${p.h[1]} cm for a ${p.name}.`;
    return '';
  }

  const el = $('viewport');
  let ren, scene, cam, grp, dist = 7, rotY = -0.45, rotX = 0.08, auto = true, ready = false;
  try {
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, .1, 100);
    ren = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    ren.setSize(el.clientWidth, el.clientHeight); el.appendChild(ren.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, .75));
    const d = new THREE.DirectionalLight(0xffffff, .8); d.position.set(4, 6, 5); scene.add(d);
    grp = new THREE.Group(); scene.add(grp); ready = true;
  } catch (err) {
    el.innerHTML = '<div class="fallback">3D preview needs WebGL, which is not available in this browser. You can still customize and request a quotation.</div>';
  }

  function clearGroup() {
    while (grp.children.length) {
      const m = grp.children[0]; grp.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
  }
  function build(s) {
    if (!ready) return;
    clearGroup();
    const w = s.width / 50, h = s.height / 50, t = .12, n = s.panels;
    const fm = new THREE.MeshStandardMaterial({ color: F[s.finish], metalness: .6, roughness: .4 });
    const gm = new THREE.MeshPhysicalMaterial({ color: 0x9fd6e0, transparent: true, opacity: G[s.glass].op, roughness: s.glass === 'frosted' ? .6 : .1 });
    const box = (x, y, z, bw, bh, bd, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat); m.position.set(x, y, z); grp.add(m); return m; };
    // outer frame
    box(0, h / 2, 0, w + t, t, t * 1.4, fm); box(0, -h / 2, 0, w + t, t, t * 1.4, fm);
    box(-w / 2, 0, 0, t, h + t, t * 1.4, fm); box(w / 2, 0, 0, t, h + t, t * 1.4, fm);
    // panels (sliding panels sit on alternating rails)
    const pw = w / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + pw * (i + .5), z = s.product === 'window' ? (i % 2 ? .06 : -.06) : 0;
      box(x, 0, z, pw - t * .4, h - t * .4, .03, gm);
      // panel sash
      const sh = .05, sz = z;
      box(x, h / 2 - t * .6, sz, pw, sh, .06, fm); box(x, -h / 2 + t * .6, sz, pw, sh, .06, fm);
      if (i > 0) box(-w / 2 + pw * i, 0, sz, t * .6, h, .08, fm);
    }
    if (s.product === 'door') {
      const hd = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .7, 12), fm); hd.position.set(w / 2 - .28, 0, .14); grp.add(hd);
    }
    if (s.product === 'window') box(0, -h / 2 - .08, .04, w + .3, .05, .35, fm); // sill
    dist = Math.max(4.5, Math.max(w, h) * 1.9);
  }

  function sync() {
    const s = spec(), bad = check(s), p = P[s.product];
    $('wh').textContent = `${p.w[0]}–${p.w[1]} cm`; $('hh').textContent = `${p.h[0]}–${p.h[1]} cm`;
    $('finish').querySelectorAll('.sw').forEach(b => b.setAttribute('aria-pressed', b.dataset.n === finish));
    $('err').textContent = bad; $('go').disabled = $('save').disabled = !!bad;
    if (bad) return;
    const e = SW.estimate(s, SW.db().rates);
    $('estl').innerHTML = e.items.map(i => `<li><span>${SW.esc(i.item)}</span><span>${SW.peso(i.amount)}</span></li>`).join('') + `<li><span>Labor</span><span>${SW.peso(e.labor)}</span></li>`;
    $('estt').textContent = SW.peso(e.total);
    build(s);
  }
  $('product').addEventListener('change', () => { defaults(); sync(); });
  ['w', 'h', 'glass', 'panels'].forEach(id => $(id).addEventListener('input', sync));

  $('save').addEventListener('click', () => { const d = SW.saveDesign(u.id, spec()); SW.toast('Design saved (' + d.id + ').'); });
  $('go').addEventListener('click', () => {
    try { const q = SW.requestQuote(u.id, spec(), editQ && editQ.id); SW.toast('Quotation ' + q.id + ' requested.'); setTimeout(() => location.href = 'quotation.html#' + q.id, 700); }
    catch (x) { SW.toast(x.message, true); }
  });

  if (ready) {
    let drag = false, px = 0, py = 0; const pts = new Map(); let pd = 0;
    el.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); el.setPointerCapture(e.pointerId); drag = true; auto = false; px = e.clientX; py = e.clientY; if (pts.size === 2) { const [a, b] = [...pts.values()]; pd = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } });
    el.addEventListener('pointerup', e => { pts.delete(e.pointerId); drag = pts.size > 0; });
    el.addEventListener('pointercancel', e => { pts.delete(e.pointerId); drag = pts.size > 0; });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const nd = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); dist = Math.min(18, Math.max(3, dist - (nd - pd) * .02)); pd = nd; return; }
      if (drag) { rotY += (e.clientX - px) * .01; rotX = Math.max(-.6, Math.min(.6, rotX + (e.clientY - py) * .006)); px = e.clientX; py = e.clientY; }
    });
    el.addEventListener('wheel', e => { e.preventDefault(); dist = Math.min(18, Math.max(3, dist + e.deltaY * .005)); }, { passive: false });
    el.addEventListener('dblclick', () => { rotY = -0.45; rotX = .08; auto = true; });
    (function loop() {
      requestAnimationFrame(loop);
      if (auto) rotY += .003;
      grp.rotation.y = rotY; grp.rotation.x = rotX;
      cam.position.set(0, 0, dist); ren.render(scene, cam);
    })();
    addEventListener('resize', () => { cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); ren.setSize(el.clientWidth, el.clientHeight); });
  }
  sync();
})();
