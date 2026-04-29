(function () {
  if (document.getElementById('ccv-root')) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  // ── Inject UI ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'ccv-root';
  document.body.appendChild(root);

  root.innerHTML = `
    <div id="ccv-panel">
      <div id="ccv-head">
        <span id="ccv-status">Голосовой ввод</span>
        <button class="ccv-ibtn" id="ccv-close">✕</button>
      </div>
      <div id="ccv-transcript"><span id="ccv-placeholder">Нажми ⏺ чтобы начать...</span></div>
      <div id="ccv-bar">
        <select id="ccv-lang">
          <option value="ru-RU">🇷🇺 RU</option>
          <option value="en-US">🇺🇸 EN</option>
        </select>
        <button class="ccv-ibtn" id="ccv-copy" disabled>📋 Копировать</button>
        <button class="ccv-ibtn" id="ccv-clear">🗑</button>
      </div>
    </div>
    <button id="ccv-mic" title="Голосовой ввод">🎤</button>
    <div id="ccv-toast"></div>
  `;

  // ── Refs ──────────────────────────────────────────────────────────────
  const mic        = root.querySelector('#ccv-mic');
  const panel      = root.querySelector('#ccv-panel');
  const txEl       = root.querySelector('#ccv-transcript');
  const statusEl   = root.querySelector('#ccv-status');
  const langSel    = root.querySelector('#ccv-lang');
  const copyBtn    = root.querySelector('#ccv-copy');
  const clearBtn   = root.querySelector('#ccv-clear');
  const closeBtn   = root.querySelector('#ccv-close');
  const toastEl    = root.querySelector('#ccv-toast');

  // ── State ─────────────────────────────────────────────────────────────
  let rec       = null;
  let recording = false;
  let finalText = '';

  // ── Toast ─────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg, warn) {
    toastEl.textContent = msg;
    toastEl.className = 'ccv-show' + (warn ? ' ccv-warn' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = ''; }, 3500);
  }

  // ── Transcript helpers ────────────────────────────────────────────────
  function setTranscript(text) {
    txEl.innerHTML = text
      ? `<span>${escHtml(text)}</span>`
      : `<span id="ccv-placeholder">Нажми ⏺ чтобы начать...</span>`;
    copyBtn.disabled = !text;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function getTranscript() {
    const ph = txEl.querySelector('#ccv-placeholder');
    return ph ? '' : txEl.textContent;
  }

  // ── Recognition ───────────────────────────────────────────────────────
  function startRec() {
    finalText = getTranscript();
    if (finalText && !finalText.endsWith(' ')) finalText += ' ';

    rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = langSel.value;

    rec.onstart = () => {
      statusEl.textContent = '🔴 Запись...';
    };

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i].transcript + ' ';
        else interim = e.results[i].transcript;
      }
      setTranscript((finalText + interim).trim());
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        toast('⚠️ Нет доступа к микрофону — разреши в настройках Chrome', true);
      }
      stopRec(false);
    };

    rec.onend = () => {
      if (recording) rec.start();
    };

    rec.start();
    recording = true;
    mic.classList.add('ccv-rec');
    mic.textContent = '⏹';
    mic.title = 'Остановить запись';
    panel.classList.add('ccv-open');
  }

  function stopRec(autoCopy = true) {
    recording = false;
    if (rec) { rec.stop(); rec = null; }
    mic.classList.remove('ccv-rec');
    mic.textContent = '🎤';
    mic.title = 'Голосовой ввод';
    statusEl.textContent = 'Голосовой ввод';

    if (autoCopy) {
      const text = getTranscript();
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          toast('✓ Скопировано!\nКликни в поле ввода Claude Code → Ctrl+V');
        }).catch(() => {
          toast('Не удалось скопировать — нажми "Копировать" вручную', true);
        });
      }
    }
  }

  // ── Button events ─────────────────────────────────────────────────────
  mic.addEventListener('click', () => {
    if (recording) {
      stopRec();
    } else {
      panel.classList.add('ccv-open');
      startRec();
    }
  });

  copyBtn.addEventListener('click', () => {
    const text = getTranscript();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast('✓ Скопировано! Нажми Ctrl+V в поле ввода');
    });
  });

  clearBtn.addEventListener('click', () => {
    if (recording) stopRec(false);
    finalText = '';
    setTranscript('');
  });

  closeBtn.addEventListener('click', () => {
    if (recording) stopRec(false);
    panel.classList.remove('ccv-open');
  });
})();
