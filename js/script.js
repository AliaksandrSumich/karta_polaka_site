(function(){
  const ruBtn = document.getElementById('lang-ru');
  const plBtn = document.getElementById('lang-pl');
  let currentLang = 'ru';

  function translateDOM(lang){
    document.documentElement.lang = (lang==='pl' ? 'pl' : 'ru');
    document.querySelectorAll('[data-i18n-ru]').forEach(el=>{
      const txt = el.getAttribute('data-i18n-' + lang);
      if (txt != null) el.textContent = txt;
    });
  }
  function setLang(lang){
    currentLang = (lang==='pl' ? 'pl' : 'ru');
    translateDOM(currentLang);
    if (ruBtn) ruBtn.classList.toggle('active', currentLang==='ru');
    if (plBtn) plBtn.classList.toggle('active', currentLang==='pl');
    try{ localStorage.setItem('lang', currentLang); }catch(e){}
    if (quizState.started) {
      renderQuestion();
    } else {
      const startBtn = document.getElementById('quiz-start');
      if (startBtn) translateDOM(currentLang);
    }
  }
  ruBtn && ruBtn.addEventListener('click', ()=>setLang('ru'));
  plBtn && plBtn.addEventListener('click', ()=>setLang('pl'));
  const savedLang = (function(){ try{ return localStorage.getItem('lang'); }catch(e){ return null; }})();
  if (savedLang) setLang(savedLang); else translateDOM(currentLang);

  // Carousel (safe no-op if section removed)
  const carousel = document.getElementById('carousel');
  const slides = carousel ? Array.from(carousel.children) : [];
  let idx = 0;
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  function show(i){
    if(!carousel) return;
    idx = (i + slides.length) % slides.length;
    carousel.style.transform = `translateX(${ -idx * 100 }%)`;
    carousel.style.transition = 'transform 400ms ease';
  }
  prev && prev.addEventListener('click', ()=>show(idx-1));
  next && next.addEventListener('click', ()=>show(idx+1));
  show(0);

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Quiz implementation
  const msgs = {
    ru: {
      start: '\u041d\u0430\u0447\u0430\u0442\u044c \u0442\u0435\u0441\u0442',
      progress: (i,t)=>`\u0412\u043e\u043f\u0440\u043e\u0441 ${i} \u0438\u0437 ${t}`,
      next: '\u0414\u0430\u043b\u0435\u0435',
      finish: '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c',
      select: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0440\u0438\u0430\u043d\u0442, \u0437\u0430\u0442\u0435\u043c \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u0414\u0430\u043b\u0435\u0435',
      resultTitle: '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442',
      correct: '\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e',
      incorrect: '\u041d\u0435\u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e',
      score: (c,t)=>`\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0445: ${c} \u0438\u0437 ${t}`,
      percent: p=>`\u041f\u0440\u043e\u0446\u0435\u043d\u0442: ${p}%`,
      pass: '\u041e\u0442\u043b\u0438\u0447\u043d\u043e! \u0412\u044b \u043f\u0440\u043e\u0448\u043b\u0438 \u0442\u0435\u0441\u0442.',
      fail: '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0434\u043b\u044f \u043f\u0440\u043e\u0445\u043e\u0434\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
      retry: '\u041f\u0440\u043e\u0439\u0442\u0438 \u0441\u043d\u043e\u0432\u0430',
      openBot: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0431\u043e\u0442\u0430 \u0432 Telegram',
      explanation: '\u041f\u043e\u044f\u0441\u043d\u0435\u043d\u0438\u0435'
    },
    pl: {
      start: 'Rozpocznij test',
      progress: (i,t)=>`Pytanie ${i} z ${t}`,
      next: 'Dalej',
      finish: 'Zako\u0144cz test',
      select: 'Wybierz odpowied\u017a, a nast\u0119pnie kliknij Dalej',
      resultTitle: 'Wynik',
      correct: 'Poprawnie',
      incorrect: 'Niepoprawnie',
      score: (c,t)=>`Poprawnych: ${c} z ${t}`,
      percent: p=>`Procent: ${p}%`,
      pass: '\u015awietnie! Zda\u0142e\u015b test.',
      fail: 'Za ma\u0142o, spr\u00f3buj ponownie.',
      retry: 'Rozpocznij ponownie',
      openBot: 'Otw\u00f3rz bota w Telegramie',
      explanation: 'Wyja\u015bnienie'
    }
  };

  const quizContainer = document.getElementById('quiz-app');
  const startBtn = document.getElementById('quiz-start');

  const quizState = {
    pool: [], // all parsed
    questions: [], // 20 selected
    idx: 0,
    correctCount: 0,
    started: false
  };

  function shuffle(arr){
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function parseCSV(text){
    // Robust CSV parser (handles quotes, commas, newlines)
    const rows = [];
    let i = 0, cur = '', inQuotes = false; 
    const out = [];
    function pushCell(){ out.push(cur); cur = ''; }
    function pushRow(){ rows.push(out.slice()); out.length = 0; }
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    while (i < text.length){
      const ch = text[i];
      if (inQuotes){
        if (ch === '"'){
          if (text[i+1] === '"'){ cur += '"'; i++; }
          else { inQuotes = false; }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"'){ inQuotes = true; }
        else if (ch === ','){ pushCell(); }
        else if (ch === '\n'){ pushCell(); pushRow(); }
        else if (ch === '\r'){ /* ignore */ }
        else { cur += ch; }
      }
      i++;
    }
    if (cur.length || out.length) { pushCell(); pushRow(); }
    // Build objects by header
    const header = rows.shift() || [];
    return rows
      .filter(r => r.some(cell => (cell || '').trim() !== ''))
      .map(r => {
        const obj = {};
        header.forEach((h, idx) => { obj[h.trim()] = (r[idx] || '').trim(); });
        return obj;
      });
  }

  async function loadQuestions(){
    const csvPath = encodeURI('./\u0412\u043e\u043f\u0440\u043e\u0441\u044b \u043d\u0430 \u043a\u0430\u0440\u0442\u0443 \u043f\u043e\u043b\u044f\u043a\u0430.csv');
    const res = await fetch(csvPath, { cache: 'no-store' });
    if (!res.ok) throw new Error('CSV load failed');
    const txt = await res.text();
    const rows = parseCSV(txt);
    const pool = rows.map(r => ({
      q: r['\u0412\u043e\u043f\u0440\u043e\u0441'] || '',
      explain: r['\u0420\u0430\u0437\u0432\u0435\u0440\u043d\u0443\u0442\u044b\u0439 \u043e\u0442\u0432\u0435\u0442'] || '',
      correct: r['\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442'] || '',
      opt1: r['\u0412\u0430\u0440\u0438\u0430\u043d\u0442 1'] || '',
      opt2: r['\u0412\u0430\u0440\u0438\u0430\u043d\u0442 2'] || '',
      img: r['\u041e\u0442\u0432\u0435\u0442 \u0432 \u043a\u0430\u0440\u0442\u0438\u043d\u043a\u0435'] || ''
    })).filter(o => o.q && o.correct);
    if (!pool.length) throw new Error('No quiz data');
    quizState.pool = pool;
  }

  function select20(){
    const copy = quizState.pool.slice();
    shuffle(copy);
    const take = Math.min(20, copy.length);
    quizState.questions = copy.slice(0, take).map(item => {
      const options = shuffle([item.correct, item.opt1, item.opt2].filter(Boolean));
      return {
        q: item.q,
        explain: item.explain,
        correct: item.correct,
        options,
        img: item.img ? ('images/' + item.img) : ''
      };
    });
    quizState.idx = 0;
    quizState.correctCount = 0;
  }

  function renderQuestion(){
    if (!quizState.started) return;
    const t = msgs[currentLang];
    const total = quizState.questions.length;
    if (!total) return renderResult();
    const i = quizState.idx;
    const q = quizState.questions[i];
    const percent = Math.round((i)/total*100);

    const mediaHTML = q.img ? `<div class="media"><img src="${q.img}" alt="${q.q}" loading="lazy" decoding="async" onerror="this.style.display='none'"/></div>` : '';
    const optsHTML = q.options.map((opt, k)=>{
      const id = `opt_${i}_${k}`;
      return `<label class="option"><input type="radio" name="q${i}" value="${opt.replace(/"/g,'&quot;')}" id="${id}"/> <span>${opt}</span></label>`;
    }).join('');

    quizContainer.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-head">
          <div class="quiz-muted">${t.progress(i+1, total)}</div>
          <div class="quiz-muted">${total} pytań</div>
        </div>
        <div class="quiz-progress"><span style="width:${percent}%"></span></div>
        <div class="quiz-body">
          <div class="text">
            <h3>${q.q}</h3>
            <div class="options" id="options">${optsHTML}</div>
            <div class="quiz-muted" id="hint">${t.select}</div>
          </div>
          ${mediaHTML}
        </div>
        <div class="quiz-actions">
          <button class="btn" id="next-btn">${i === total-1 ? t.finish : t.next}</button>
        </div>
      </div>
    `;

    const nextBtn = document.getElementById('next-btn');
    nextBtn.disabled = true;
    const optionsWrap = document.getElementById('options');
    let chosen = '';
    optionsWrap.addEventListener('change', (e)=>{
      if (e.target && e.target.name === `q${i}`){
        chosen = e.target.value;
        nextBtn.disabled = false;
      }
    });

    nextBtn.addEventListener('click', ()=>{
      if (!chosen) return;
      if (chosen === q.correct) quizState.correctCount++;
      quizState.idx++;
      if (quizState.idx < total){
        renderQuestion();
      } else {
        renderResult();
      }
    });
  }

  function renderResult(){
    const t = msgs[currentLang];
    const total = quizState.questions.length;
    const c = quizState.correctCount;
    const percent = total ? Math.round((c/total)*100) : 0;
    const passed = percent >= 80;
    quizContainer.innerHTML = `
      <div class="result">
        <h3>${t.resultTitle}</h3>
        <p class="score">${t.score(c,total)} · ${t.percent(percent)}</p>
        <p class="${passed ? 'pass' : 'fail'}">${passed ? t.pass : t.fail}</p>
        <div class="quiz-actions">
          <button class="btn" id="retry-btn">${t.retry}</button>
          <a class="btn primary" href="https://t.me/pytania_KartaPolaka_bot" target="_blank" rel="noopener noreferrer">${t.openBot}</a>
        </div>
      </div>
    `;
    const retry = document.getElementById('retry-btn');
    retry && retry.addEventListener('click', ()=>{
      select20();
      renderQuestion();
    });
  }

  async function startQuiz(){
    try {
      if (!quizState.pool.length){
        await loadQuestions();
      }
      quizState.started = true;
      select20();
      if (!quizState.questions.length) throw new Error('No questions');
      renderQuestion();
    } catch (e) {
      quizContainer.innerHTML = '<div class="result"><p class="fail">Nie udało się wczytać pytań.</p><div class="quiz-actions"><button class="btn" id="retry-load">Spróbuj ponownie</button></div></div>';
      const r = document.getElementById('retry-load');
      r && r.addEventListener('click', ()=>{
        quizContainer.innerHTML = '<button id="quiz-start" class="btn primary">' + (currentLang==='pl' ? msgs.pl.start : msgs.ru.start) + '</button>';
      });
    }
  }

  // Direct binding (if present initially)
  if (startBtn){
    startBtn.addEventListener('click', (e)=>{ e.preventDefault(); startQuiz(); });
  }
  // Delegated binding to handle any re-renders/translation updates
  if (quizContainer){
    quizContainer.addEventListener('click', (e)=>{
      const btn = e.target && e.target.closest && e.target.closest('#quiz-start');
      if (btn){ e.preventDefault(); startQuiz(); }
    });
  }
})();