/* Assistant - full-page company copilot (unreachable from nav; kept for reference) */
App.registerView('copilot', {
  title: 'Assistant',
  render(ctx) {
    if (!App.state.copilot) App.state.copilot = [];
    const u = ctx.user;
    const suggestions = App.suggestPrompts(u).slice(0, 6);
    const empty = `<div style="max-width:560px;margin:8vh auto 0;text-align:center">
        <div style="width:54px;height:54px;border-radius:14px;margin:0 auto 18px;background:var(--ink);display:grid;place-items:center;color:var(--brand-400)">${App.icon('sparkles')}</div>
        <h1 style="font-size:24px">Ask across your whole company</h1>
        <p class="muted" style="margin-top:8px;font-size:14px">Tara pulls from ${App.sourcePhrase()} - and only ever returns what your role is permitted to see.</p>
        <div class="grid grid-2" style="margin-top:22px;text-align:left">
          ${suggestions.map(s=>`<button class="chat-suggest__btn" onclick="App.copilot.ask('${s.q.replace(/'/g,"\\'")}')">${App.icon(s.ic)}<span style="flex:1">${App.esc(s.q)}</span><span class="tag">${s.tag}</span></button>`).join('')}
        </div>
      </div>`;
    return `<div class="page" style="max-width:820px;display:flex;flex-direction:column;height:calc(100vh - 150px)">
      <div class="row gap-8" style="margin-bottom:8px;flex-wrap:wrap">
        ${App.sourceChips()}
        <span class="spacer" style="flex:1"></span>
        <span class="muted" style="font-size:12px">${App.icon('lock','')} Permission-aware · on-prem · ${App.esc(DB.company.llm.split('(')[0])}</span>
      </div>
      <div id="copilotThread" style="flex:1;overflow-y:auto;padding:8px 2px 16px">${App.state.copilot.length?'':empty}</div>
      <div class="chat-foot" style="border:1px solid var(--line);border-radius:16px;background:var(--surface)">
        <div class="chat-inputwrap" style="border:none">
          <textarea id="copilotInput" rows="1" placeholder="Ask about ${App.sourceNounList('or')}…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();App.copilot.ask();}"></textarea>
          <button class="chat-send" onclick="App.copilot.ask()">${App.icon('send')}</button>
        </div>
      </div>
    </div>`;
  },
  mount() { App.copilot.render(); const i=document.getElementById('copilotInput'); if(i) i.focus(); }
});

App.copilot = {
  render() {
    const t = document.getElementById('copilotThread'); if(!t) return;
    if (!App.state.copilot.length) return;
    t.innerHTML = App.state.copilot.map(m => {
      if (m.role==='user') return `<div class="msg msg--user" style="margin-bottom:16px"><div class="msg__bubble" style="max-width:70%">${App.esc(m.text)}</div></div>`;
      if (m.typing) return `<div class="msg msg--ai" style="margin-bottom:16px"><div class="msg__av">${App.icon('sparkles')}</div><div class="msg__bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
      const src = m.sources && m.sources.length ? `<div class="src-row">${m.sources.map(s=>{const ic={hrms:'users',jira:'branch',policy:'shield',locked:'lock',llm:'sparkles'}[s.kind]||'database';return `<span class="src-chip ${s.kind}">${App.icon(ic)} ${App.esc(s.label)}</span>`;}).join('')}</div>` : '';
      return `<div class="msg msg--ai" style="margin-bottom:16px"><div class="msg__av">${App.icon('sparkles')}</div><div class="msg__bubble" style="max-width:78%">${m.html}${src}</div></div>`;
    }).join('');
    t.scrollTop = t.scrollHeight;
  },
  ask(text) {
    const inp = document.getElementById('copilotInput');
    text = (text || (inp&&inp.value) || '').trim(); if(!text) return;
    if (inp) inp.value='';
    App.state.copilot.push({ role:'user', text });
    const ph = { role:'ai', typing:true };
    App.state.copilot.push(ph);
    App.copilot.render();
    App.tara.answer(text, App.state.user).then(r => {
      ph.typing = false; ph.html = r.html; ph.sources = r.sources;
      App.copilot.render();
    }).catch(e => {
      ph.typing = false; ph.html = '<p>'+App.esc(String(e&&e.message||e))+'</p>'; ph.sources = [];
      App.copilot.render();
    });
  }
};
