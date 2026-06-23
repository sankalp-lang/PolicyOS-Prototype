/* Regulatory — two paths into the same place (Approvals):
   1) AUTO feed  — circulars Tara already watches (DB.circulars), single-policy gap → change request.
   2) MANUAL upload — a compliance owner uploads any circular PDF (DB.incomingCirculars); Tara checks it
      against the WHOLE policy library, proposes a redline per affected clause (with page citations),
      and the reviewer accepts each (or in bulk) → Approvals.
   Tracked under Compliance › Regulatory Updates. */
App.registerView('regulatory', {
  title: 'Regulatory',
  render(ctx) {
    const RV = App.regulatoryView;
    if (RV._analyzing) return RV._renderAnalyzing();
    if (RV.assessment) return RV._renderAssessment();
    return RV._renderList(ctx);
  },
  mount(root) {
    const s = root.querySelector('#regSearch');
    if (s) s.oninput = () => { const q = (s.value || '').toLowerCase(); root.querySelectorAll('#regBody tr').forEach(tr => { tr.style.display = tr.dataset.n.includes(q) ? '' : 'none'; }); };
  }
});

App.regulatoryView = {
  assessment: null,
  _analyzing: null,
  _uploaded: [],
  _draftUpload: null,
  _assessments: {},   // cache per circular id — preserves queued/dismissed/edits across re-entry
  _reviewCtx: null,

  _refresh() {
    const root = document.getElementById('viewRoot'); if (!root) return;
    const v = App.views['regulatory']; const ctx = { user: App.currentUser() };
    root.innerHTML = v.render(ctx); if (v.mount) v.mount(root, ctx);
  },
  _canEdit() { const r = App.currentUser().role; return r === 'admin' || r === 'policy_manager' || r === 'risk_approver'; },

  /* ---------------- list (auto feed + uploaded) ---------------- */
  _renderList(ctx) {
    const rows = DB.circulars.map(c => {
      const p = App.policy(c.affects);
      const status = c.status === 'Actioned' ? App.ui.pill('Actioned', 'green', true)
        : c.suggestion ? App.ui.pill('Gap found', 'amber', true)
        : App.ui.pill('No gap', 'green', true);
      return `<tr class="clickable" data-n="${App.esc((c.title + ' ' + c.ref + ' ' + c.regulator).toLowerCase())}" onclick="App.regulatoryView.open('${c.id}')">
        <td><div class="cell-person">${App.icon('alert')}<div><div class="cell-strong">${App.esc(c.title)}</div><div class="muted" style="font-size:12px">${App.esc(c.regulator)} · ${App.esc(c.ref)}</div></div></div></td>
        <td class="muted">${c.date}</td>
        <td>${p ? App.ui.pill(p.name, 'violet') : App.ui.pill('—', 'gray')}</td>
        <td>${status}</td>
        <td><button class="btn btn--sm" onclick="event.stopPropagation();App.regulatoryView.open('${c.id}')">${App.icon('eye')} Review</button></td>
      </tr>`;
    }).join('');
    const gaps = DB.circulars.filter(c => c.suggestion && c.status !== 'Actioned').length;

    // uploaded circulars (manual ingest) — quick re-entry into their assessment
    const uploaded = this._uploaded.map(id => (DB.incomingCirculars || []).find(c => c.id === id)).filter(Boolean);
    const upStrip = uploaded.length ? `<div class="reg-uploaded">${uploaded.map(c => {
      const n = (c.clauses || []).reduce((a, cl) => a + (cl.impact || []).filter(i => !i.noGap).length, 0);
      return `<button class="reg-upcard" onclick="App.regulatoryView._analyze('${c.id}');App.regulatoryView._refresh()">
        <span class="reg-upcard__ic">${App.icon('file')}</span>
        <span style="flex:1;text-align:left"><b>${App.esc(c.file)}</b><span class="muted" style="display:block;font-size:12px">${App.esc(c.regulator)} · ${App.esc(c.ref)} · ${n} suggested change${n === 1 ? '' : 's'}</span></span>
        <span class="pill pill--violet">View assessment</span></button>`;
    }).join('')}</div>` : '';

    return `<div class="page">
      <div class="page__head"><div><h1>Regulatory</h1><p>Incoming regulator circulars, compared against your policy library. Tara flags the gap, drafts the edit with page citations, and routes it for approval.</p></div><div class="spacer"></div>
        ${this._canEdit() ? `<button class="btn btn--primary" onclick="App.regulatoryView.uploadModal()">${App.icon('download')} Upload circular</button>` : ''}</div>
      <div class="info-banner">${App.icon('shield')} <span>Tracked under <strong>Compliance › Regulatory Updates</strong>. Most regulations can't be pre-embedded — <strong>upload a circular PDF</strong> and Tara checks it against every policy. Suggestions are <strong>flagged for human review</strong>, never auto-applied.</span></div>
      ${upStrip}
      <div class="toolbar"><div class="search-input">${App.icon('search')}<input id="regSearch" placeholder="Search circulars…"/></div><span class="muted" style="font-size:12px;align-self:center">${gaps} of ${DB.circulars.length} watched circulars need a change</span></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Circular</th><th>Published</th><th>Affects</th><th>Status</th><th></th></tr></thead><tbody id="regBody">${rows}</tbody></table></div>
    </div>`;
  },

  /* ---------------- upload (dummy PDF) ---------------- */
  uploadModal() {
    this._draftUpload = null;
    App.openModal({
      title: 'Upload a regulator circular', sub: 'Tara reads the document and checks every clause against your policy library.', lg: true,
      body: `<div id="upBody"></div>`,
      footer: `<button class="btn" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn--primary" id="upAnalyze" disabled onclick="App.regulatoryView.runAnalysis()">${App.icon('sparkles')} Analyze against policy library</button>`
    });
    this._renderUpload();
  },
  _renderUpload() {
    const host = document.getElementById('upBody'); if (!host) return;
    const d = this._draftUpload;
    if (!d) {
      const samples = (DB.incomingCirculars || []).map(c =>
        `<button class="reg-pick" onclick="App.regulatoryView._pick('${c.id}')">${App.icon('file')}<div style="flex:1;text-align:left"><b>${App.esc(c.file)}</b><div class="muted" style="font-size:12px">${App.esc(c.regulator)} · ${App.esc(c.ref)} · ${c.pages} pages</div></div>${App.icon('arrow')}</button>`).join('');
      host.innerHTML = `<div class="dropzone" onclick="document.getElementById('upPick').scrollIntoView({block:'nearest'})">${App.icon('download')}
          <div style="font-weight:600;margin-top:8px">Drop a circular PDF here, or choose one</div>
          <div class="muted" style="font-size:12.5px;margin-top:3px">PDF · up to 25 MB — text is parsed and matched to your policies</div></div>
        <div class="setup-label" style="margin-top:16px">Demo — pick a sample circular to ingest</div>
        <div id="upPick" class="reg-picklist">${samples}</div>`;
    } else {
      const c = d;
      const affected = new Set(); let nChange = 0;
      (c.clauses || []).forEach(cl => (cl.impact || []).forEach(i => { if (!i.noGap) { affected.add(i.policyId); nChange++; } }));
      host.innerHTML = `<div class="file-card">${App.icon('file')}<div style="flex:1"><b>${App.esc(c.file)}</b><div class="muted" style="font-size:12px">${App.esc(c.regulator)} · ${App.esc(c.ref)} · ${c.date} · ${c.pages} pages</div></div>
          <button class="btn btn--sm" onclick="App.pdf.open({kind:'circular',id:'${c.id}'})">${App.icon('eye')} Preview</button>
          <button class="btn btn--sm" onclick="App.regulatoryView._draftUpload=null;App.regulatoryView._renderUpload();var b=document.getElementById('upAnalyze');if(b)b.disabled=true">Change</button></div>
        <div class="info-banner" style="margin-top:14px;margin-bottom:0">${App.icon('sparkles')} <span>Ready to analyze <strong>${App.esc(c.title)}</strong> — Tara will scan ${c.clauses.length} clauses against your ${DB.policies.length} policies (≈ ${nChange} likely change${nChange === 1 ? '' : 's'} across ${affected.size} policies).</span></div>`;
    }
  },
  _pick(id) {
    this._draftUpload = (DB.incomingCirculars || []).find(c => c.id === id) || null;
    this._renderUpload();
    const b = document.getElementById('upAnalyze'); if (b) b.disabled = !this._draftUpload;
  },
  runAnalysis() {
    const d = this._draftUpload; if (!d) return;
    App.closeModal();
    this._analyzing = d.id; this._refresh();
    const self = this; setTimeout(function () { self._analyze(d.id); self._analyzing = null; self._refresh(); }, 1150);
  },

  _renderAnalyzing() {
    const c = (DB.incomingCirculars || []).find(x => x.id === this._analyzing) || {};
    return `<div class="page"><div class="reg-analyzing">
      <div class="reg-analyzing__ic">${App.icon('sparkles')}</div>
      <h2>Analyzing ${App.esc(c.file || 'circular')}…</h2>
      <p class="muted">Reading ${c.pages || ''} pages · extracting clauses · comparing against ${DB.policies.length} policies in your library</p>
      <div class="typing" style="margin:14px auto 0;width:fit-content"><span></span><span></span><span></span></div>
    </div></div>`;
  },

  /* ---------------- impact assessment ---------------- */
  _analyze(circId, force) {
    // reuse a prior assessment (with its queued/dismissed/edits) unless an explicit re-scan is asked for
    if (!force && this._assessments[circId]) { this.assessment = this._assessments[circId]; if (this._uploaded.indexOf(circId) < 0) this._uploaded.push(circId); return; }
    const circ = (DB.incomingCirculars || []).find(c => c.id === circId); if (!circ) return;
    const sugg = [];
    circ.clauses.forEach(cl => (cl.impact || []).forEach(imp => {
      const p = App.policy(imp.policyId);
      let impact = null;
      if (!imp.noGap && imp.sim && App.sim && App.sim.paramsFor(imp.policyId)) {
        const r = App.sim.run(imp.policyId, imp.sim);
        if (r.applicable) {
          const dA = ((r.proposed.rate - r.base.rate) * 100).toFixed(1), dN = ((r.proposed.npa - r.base.npa) * 100).toFixed(1);
          impact = { approvalDelta: dA, npaDelta: dN, flipped: (r.flipped.length || r.gained.length), total: r.total };
        }
      }
      sugg.push({ key: circ.id + '|' + cl.id + '|' + imp.policyId, clause: cl, imp: imp, policy: p, impact: impact, status: imp.noGap ? 'nogap' : 'pending', edited: null });
    }));
    this.assessment = { circ: circ, suggestions: sugg };
    this._assessments[circ.id] = this.assessment;
    if (this._uploaded.indexOf(circ.id) < 0) this._uploaded.push(circ.id);
  },
  _backToList() { this.assessment = null; this._refresh(); },
  _rescan() { const a = this.assessment; if (!a) return; this._analyze(a.circ.id, true); this._refresh(); App.toast('Re-scanned ' + a.circ.ref + ' — review state reset'); },

  _renderAssessment() {
    const a = this.assessment, c = a.circ;
    const live = a.suggestions.filter(s => s.status !== 'nogap' && s.status !== 'dismissed');
    const affected = Array.from(new Set(live.map(s => s.imp.policyId)));
    const queued = a.suggestions.filter(s => s.status === 'queued').length;
    const pending = a.suggestions.filter(s => s.status === 'pending').length;
    const bulkBar = pending === 0
      ? `<div class="reg-bulkbar reg-bulkbar--done">${App.icon('check')} <span>All suggestions reviewed${queued ? ' — ' + queued + ' sent to Approvals' : ''}.</span><div style="flex:1"></div>${queued ? `<button class="btn btn--sm btn--primary" onclick="App.navigate('approvals')">${App.icon('branch')} View ${queued} in Approvals</button>` : ''}</div>`
      : `<div class="reg-bulkbar"><label class="reg-selall"><input type="checkbox" class="reg-selallcb" onchange="App.regulatoryView._selAll(this.checked)"> Select all · <span id="regSelN">0</span> selected</label><div style="flex:1"></div><button class="btn btn--sm" onclick="App.regulatoryView._bulk('dismiss')">Dismiss selected</button><button class="btn btn--sm btn--primary" onclick="App.regulatoryView._bulk('approve')">${App.icon('send')} Send selected for approval</button></div>`;

    // group suggestions by policy
    const order = Array.from(new Set(a.suggestions.map(s => s.imp.policyId)));
    const groups = order.map(pid => {
      const items = a.suggestions.filter(s => s.imp.policyId === pid);
      const p = items[0].policy;
      const cards = items.map(s => this._suggCard(s)).join('');
      return `<div class="reg-group">
        <div class="reg-group__h">${App.icon('file')}<b>${p ? App.esc(p.name) : App.esc(pid)}</b>
          <span class="muted" style="font-size:12px">${p ? App.esc(p.category + ' · ' + p.version) : ''}</span><div style="flex:1"></div>
          ${p ? `<button class="btn btn--sm" onclick="App.pdf.open({kind:'policy',id:'${p.id}'})">${App.icon('eye')} Open policy PDF</button>` : ''}</div>
        ${cards}</div>`;
    }).join('');

    return `<div class="page">
      <div class="reg-bk" onclick="App.regulatoryView._backToList()">${App.icon('arrow')} Back to circulars</div>
      <div class="page__head"><div>
        <h1 style="display:flex;align-items:center;gap:10px">${App.esc(c.title)}</h1>
        <p>${App.esc(c.regulator)} · ${App.esc(c.ref)} · ${App.esc(c.date)} · ${c.pages} pages — analyzed against your ${DB.policies.length} policies.</p>
      </div><div class="spacer"></div>
        <button class="btn" onclick="App.pdf.open({kind:'circular',id:'${c.id}'})">${App.icon('file')} View circular PDF</button>
        <button class="btn" onclick="App.regulatoryView._rescan()">${App.icon('sparkles')} Re-scan</button>
        ${queued ? `<button class="btn btn--primary" onclick="App.navigate('approvals')">${App.icon('branch')} Open Approvals (${queued})</button>` : ''}
      </div>
      <div class="reg-stats">
        ${this._stat(live.length, 'suggested change' + (live.length === 1 ? '' : 's'), 'edit')}
        ${this._stat(affected.length, 'polic' + (affected.length === 1 ? 'y' : 'ies') + ' affected', 'file')}
        ${this._stat(a.suggestions.length - live.length, 'no-gap clauses', 'check')}
        ${this._stat(queued, 'queued for approval', 'branch')}
      </div>
      <div class="info-banner">${App.icon('sparkles')} <span>Each suggestion cites the <strong>circular page</strong> and the <strong>policy page</strong> it changes. Review individually, or select several and send them to Approvals together. Nothing changes the live policy until an approver signs off.</span></div>
      ${groups}
      ${bulkBar}
    </div>`;
  },
  _stat(n, label, ic) {
    return `<div class="reg-stat"><div class="reg-stat__ic">${App.icon(ic)}</div><div><div class="reg-stat__n">${n}</div><div class="reg-stat__l">${label}</div></div></div>`;
  },
  _suggCard(s) {
    const c = this.assessment.circ, cl = s.clause, imp = s.imp, p = s.policy;
    const sugText = s.edited || imp.suggested;
    if (s.status === 'nogap') {
      return `<div class="sugg sugg--nogap">
        <div class="sugg__top"><span class="pill pill--green">${App.icon('check')} No change needed</span><span class="muted" style="font-size:12px">${App.esc(cl.ref)} · ${App.esc(cl.topic)}</span></div>
        <p class="sugg__clause">${App.esc(cl.text)}</p>
        <div class="sugg__cites">${App.pdf.cite('circular', c.id, cl.id, 'Circular')} ${p ? App.pdf.cite('policy', p.id, imp.anchor, p.name) : ''}<span class="muted" style="font-size:12px;align-self:center">— ${App.esc(imp.rationale)}</span></div>
      </div>`;
    }
    const statusPill = s.status === 'queued' ? `<span class="pill pill--violet">${App.icon('branch')} Queued for approval</span>`
      : s.status === 'dismissed' ? `<span class="pill pill--gray">Dismissed</span>`
      : `<span class="pill pill--amber">${App.icon('alert')} Needs review</span>`;
    const actionable = s.status === 'pending';
    return `<div class="sugg" data-key="${s.key}">
      <div class="sugg__top">
        ${actionable ? `<input type="checkbox" class="regcb" value="${s.key}" onchange="App.regulatoryView._count()">` : ''}
        ${statusPill}<span class="muted" style="font-size:12px">${App.esc(cl.ref)} · ${App.esc(cl.topic)}</span>
        <div style="flex:1"></div>
        <button class="btn btn--sm" onclick="App.regulatoryView.review('${s.key}')">${App.icon('eye')} Review</button>
        ${actionable ? `<button class="btn btn--sm btn--primary" onclick="App.regulatoryView.sendForApproval(['${s.key}'])">${App.icon('send')} Send for approval</button>` : ''}
      </div>
      <p class="sugg__clause">${App.esc(cl.text)}</p>
      <div class="redline">
        <div class="redline__row"><span class="redline__lbl">Current</span><span class="diff-del">${App.esc(imp.current)}</span></div>
        <div class="redline__row"><span class="redline__lbl">Suggested</span><span class="diff-add">${App.esc(sugText)}</span></div>
      </div>
      <div class="sugg__cites">${App.pdf.cite('circular', c.id, cl.id, 'Circular')} ${p ? App.pdf.cite('policy', p.id, imp.anchor, p.name) : ''}</div>
      <div class="sugg__why">${App.icon('sparkles')} <span>${App.esc(imp.rationale)}</span></div>
      ${s.impact ? `<div class="sugg__impact">${App.icon('chart')} <span>Modelled on the test cohort: approval <b>${s.impact.approvalDelta >= 0 ? '+' : ''}${s.impact.approvalDelta} pts</b>, NPA <b>${s.impact.npaDelta >= 0 ? '+' : ''}${s.impact.npaDelta} pts</b>, ${s.impact.flipped} of ${s.impact.total} applicants reclassified.</span> <button class="btn btn--sm" onclick="App.simView.open('${imp.policyId}',{${Object.keys(imp.sim).map(k => k + ':' + imp.sim[k]).join(',')}},'From ${App.esc(c.ref)}')">Open simulator</button></div>` : ''}
    </div>`;
  },
  _count() {
    const all = document.querySelectorAll('.regcb'), sel = document.querySelectorAll('.regcb:checked');
    const el = document.getElementById('regSelN'); if (el) el.textContent = sel.length;
    const sa = document.querySelector('.reg-selallcb'); if (sa) { sa.checked = all.length > 0 && sel.length === all.length; sa.indeterminate = sel.length > 0 && sel.length < all.length; }
  },
  _selAll(on) { document.querySelectorAll('.regcb').forEach(function (cb) { cb.checked = on; }); this._count(); },
  _selected() { return Array.from(document.querySelectorAll('.regcb:checked')).map(cb => cb.value); },
  _bulk(action) {
    const keys = this._selected();
    if (!keys.length) { App.toast('Select one or more suggestions first', 'warn'); return; }
    if (action === 'approve') this.sendForApproval(keys);
    else { keys.forEach(k => { const s = this.assessment.suggestions.find(x => x.key === k); if (s && s.status === 'pending') s.status = 'dismissed'; }); App.toast(keys.length + ' suggestion(s) dismissed'); this._refresh(); }
  },

  /* ---------------- individual review (redline + policy PDF side-by-side) ---------------- */
  review(key) {
    const s = this.assessment.suggestions.find(x => x.key === key); if (!s) return;
    const c = this.assessment.circ, cl = s.clause, imp = s.imp, p = s.policy;
    const sugText = s.edited || imp.suggested;
    const editable = s.status === 'pending';
    App.openModal({
      title: 'Suggested change · ' + (p ? p.name : imp.policyId), sub: c.regulator + ' ' + c.ref + ' · clause ' + cl.ref, lg: true,
      body: `<div class="reg-review">
        <div class="reg-review__left">
          <div class="setup-label">Circular clause</div>
          <div class="card card--pad" style="background:var(--surface-2)"><span class="muted" style="font-size:12px">${App.esc(cl.ref)} · ${App.esc(cl.topic)}</span><p style="margin:6px 0 0;font-size:13px;line-height:1.55">${App.esc(cl.text)}</p>
            <div style="margin-top:8px">${App.pdf.cite('circular', c.id, cl.id, 'Circular')}</div></div>
          <div class="redline" style="margin-top:14px">
            <div class="redline__row"><span class="redline__lbl">Current</span><span class="diff-del">${App.esc(imp.current)}</span></div>
          </div>
          <div class="field" style="margin-top:10px"><label>Suggested change ${editable ? '<span class="muted" style="font-weight:400;text-transform:none">— edit before sending</span>' : ''}</label>
            <textarea class="textarea" id="regEdit" rows="3" ${editable ? '' : 'disabled'}>${App.esc(sugText)}</textarea></div>
          <div class="sugg__why" style="margin-top:4px">${App.icon('sparkles')} <span>${App.esc(imp.rationale)}</span></div>
          <div style="margin-top:10px">${p ? App.pdf.cite('policy', p.id, imp.anchor, 'Jump to ' + p.name) : ''}</div>
        </div>
        <div class="reg-review__right">
          <div class="reg-review__tabs"><button class="seg is-on" id="rgtP" onclick="App.regulatoryView._pane('policy')">Policy</button><button class="seg" id="rgtC" onclick="App.regulatoryView._pane('circular')">Circular</button></div>
          <div id="regPdfPane" class="reg-review__pdf"></div>
        </div>
      </div>`,
      footer: editable
        ? `<button class="btn btn--danger" onclick="App.regulatoryView._dismissOne('${key}')">Dismiss</button><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn--primary" onclick="App.regulatoryView._sendFromReview('${key}')">${App.icon('send')} Send for approval</button>`
        : `<button class="btn" onclick="App.closeModal()">Close</button>${s.status === 'queued' ? `<button class="btn btn--primary" onclick="App.closeModal();App.navigate('approvals')">${App.icon('branch')} View in Approvals</button>` : ''}`
    });
    this._reviewCtx = { key: key, pane: 'policy' };
    if (p) App.pdf.renderInto('regPdfPane', 'policy', p.id, { anchor: imp.anchor });
    else App.pdf.renderInto('regPdfPane', 'circular', c.id, { anchor: cl.id });
  },
  _pane(which) {
    const ctx = this._reviewCtx; if (!ctx) return; ctx.pane = which;
    const s = this.assessment.suggestions.find(x => x.key === ctx.key); const c = this.assessment.circ;
    document.getElementById('rgtP').classList.toggle('is-on', which === 'policy');
    document.getElementById('rgtC').classList.toggle('is-on', which === 'circular');
    if (which === 'policy' && s.policy) App.pdf.renderInto('regPdfPane', 'policy', s.policy.id, { anchor: s.imp.anchor });
    else App.pdf.renderInto('regPdfPane', 'circular', c.id, { anchor: s.clause.id });
  },
  _sendFromReview(key) {
    const s = this.assessment.suggestions.find(x => x.key === key);
    const ta = document.getElementById('regEdit'); if (s && ta) s.edited = ta.value.trim() || s.imp.suggested;
    App.closeModal(); this.sendForApproval([key]);
  },
  _dismissOne(key) { const s = this.assessment.suggestions.find(x => x.key === key); if (s) s.status = 'dismissed'; App.closeModal(); App.toast('Suggestion dismissed'); this._refresh(); },

  /* ---------------- route to Approvals ---------------- */
  sendForApproval(keys) {
    const c = this.assessment.circ; const me = (App.state.user && App.state.user.id) || 'THQ0144'; let n = 0;
    keys.forEach(key => {
      const s = this.assessment.suggestions.find(x => x.key === key);
      if (!s || s.status !== 'pending') return;
      const imp = s.imp, cl = s.clause, p = s.policy; const to = s.edited || imp.suggested;
      // don't raise a duplicate request for the same change from the same circular
      const dup = DB.approvals.some(x => x.policy === imp.policyId && x.change && x.change.field === imp.anchor && x.change.to === to && x.sourceRef === c.ref);
      if (dup) { s.status = 'queued'; return; }
      const req = {
        id: 'REQ-' + (2000 + DB.approvals.length), name: (p ? p.name : imp.policyId) + ' — ' + imp.anchor + ' → ' + to,
        type: 'Regulatory Change', policy: imp.policyId, requestedBy: me, on: '21 Jun 2026', priority: 'High', status: 'Pending L1',
        change: { field: imp.anchor, from: imp.current, to: to },
        rationale: imp.rationale,
        complianceFlag: 'Matches ' + c.regulator + ' ' + c.ref + ' (' + c.date + '), clause ' + cl.ref + '.',
        impact: s.impact || null,
        citations: [{ kind: 'policy', id: imp.policyId, anchor: imp.anchor }, { kind: 'circular', id: c.id, anchor: cl.id }],
        sourceRef: c.ref
      };
      DB.approvals.unshift(req); s.status = 'queued'; n++;
    });
    if (n) { App.toast(n + ' change' + (n === 1 ? '' : 's') + ' sent to Approvals'); this._refresh(); }
    else App.toast('Nothing to send — already queued or dismissed', 'warn');
  },

  /* ---------------- auto-feed circular (existing single-policy path) ---------------- */
  open(id) {
    const c = DB.circulars.find(x => x.id === id); if (!c) return;
    const p = App.policy(c.affects);
    const canSim = App.sim && App.sim.paramsFor(c.affects) && c.simOverride;
    const done = c.status === 'Actioned';
    const gap = c.suggestion
      ? `<div class="answer-card"><div class="answer-card__h">${App.icon('edit')} Gap detected · ${App.esc(c.field)}</div><div class="answer-card__b">
          <div class="grid grid-2" style="gap:14px">
            <div><div class="login__label" style="margin-bottom:6px">Your policy today</div><div class="card card--pad" style="background:var(--surface-2)"><span class="diff-del">${App.esc(c.current)}</span></div></div>
            <div><div class="login__label" style="margin-bottom:6px">Regulator mandates</div><div class="card card--pad" style="background:var(--surface-2)"><span class="diff-add">${App.esc(c.mandated)}</span></div></div>
          </div></div></div>
          <div class="info-banner" style="margin-top:14px;margin-bottom:0">${App.icon('sparkles')} <span><strong>Suggested change (review required):</strong> ${App.esc(c.suggestion)}</span></div>
          ${p ? `<div style="margin-top:12px">${App.pdf.cite('policy', p.id, c.field, p.name)}</div>` : ''}`
      : `<div class="info-banner" style="margin-bottom:0;background:var(--green-50);border-color:#bcd3c2;color:var(--green-700)">${App.icon('check')} <span>No gap — your ${p ? App.esc(p.name) : 'policy'} already satisfies this circular.</span></div>`;
    let footer = `<button class="btn" onclick="App.closeModal()">Close</button>`;
    if (c.suggestion && !done) {
      if (canSim) {
        const ovLit = '{' + Object.keys(c.simOverride).map(k => k + ':' + c.simOverride[k]).join(',') + '}';
        footer += `<button class="btn" onclick="App.closeModal();App.simView.open('${c.affects}',${ovLit},'From circular ${App.esc(c.ref)}')">${App.icon('chart')} Simulate impact</button>`;
      }
      footer += `<button class="btn btn--primary" onclick="App.regulatoryView.createChange('${c.id}')">${App.icon('send')} Create change request</button>`;
    } else if (done) {
      footer += `<span class="pill pill--green" style="align-self:center">${App.icon('check')} Change request raised</span>`;
    }
    App.openModal({
      title: c.title, sub: c.regulator + ' · ' + c.ref + ' · ' + c.date, lg: true,
      body: `<div class="row gap-8" style="margin-bottom:12px;flex-wrap:wrap">${App.ui.pill(c.regulator, 'blue')} ${p ? App.ui.pill('Affects: ' + p.name, 'violet') : ''} ${App.ui.pill('Compliance › Regulatory Updates', 'gray')}</div>
        <p style="font-size:13.5px;color:var(--ink-2);line-height:1.6">${App.esc(c.summary)}</p>
        <div class="mt-16">${gap}</div>`,
      footer
    });
  },
  createChange(id) {
    const c = DB.circulars.find(x => x.id === id); if (!c) return;
    const p = App.policy(c.affects);
    let impact = null;
    let rationale = 'Aligns ' + (p ? p.name : 'policy') + ' with ' + c.regulator + ' ' + c.ref + ' (' + c.date + ').';
    if (App.sim && c.simOverride && App.sim.paramsFor(c.affects)) {
      const r = App.sim.run(c.affects, c.simOverride);
      if (r.applicable) {
        const dA = ((r.proposed.rate - r.base.rate) * 100).toFixed(1), dN = ((r.proposed.npa - r.base.npa) * 100).toFixed(1);
        impact = { approvalDelta: dA, npaDelta: dN, flipped: (r.flipped.length || r.gained.length) };
        rationale += ' Simulated impact: approval ' + (dA >= 0 ? '+' : '') + dA + ' pts, NPA ' + (dN >= 0 ? '+' : '') + dN + ' pts.';
      }
    }
    const me = (App.state.user && App.state.user.id) || 'THQ0144';
    const req = { id: 'REQ-' + (2000 + DB.approvals.length), name: (p ? p.name : 'Policy') + ' — ' + c.field + ' → ' + c.mandated,
      type: 'Regulatory Change', policy: c.affects, requestedBy: me, on: '21 Jun 2026', priority: 'High', status: 'Pending L1',
      change: { field: c.field, from: c.current, to: c.mandated }, rationale,
      complianceFlag: 'Matches ' + c.regulator + ' circular ' + c.ref + ' (' + c.date + ').', impact,
      citations: p ? [{ kind: 'policy', id: p.id, anchor: c.field }] : [], sourceRef: c.ref };
    DB.approvals.unshift(req);
    c.status = 'Actioned';
    App.closeModal(); App.toast('Change request created from ' + c.ref + ' → Approvals'); App.navigate('approvals');
  }
};
