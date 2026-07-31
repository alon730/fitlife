/* ===== ui.js — רינדור המסכים ===== */
const UI = (() => {
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* בריחת HTML — טקסט מה-AI ומהמשתמש נכנס ל-innerHTML, אז חובה */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const n = (v) => Math.round(+v || 0);

  /* מספרים כמו "4 / 6" או "3×12" מתהפכים בתוך טקסט עברי, כי הדפדפן
     מסדר אותם לפי כיוון הפסקה. bdi מבודד אותם ומכריח כיוון משמאל לימין. */
  const ltr = (s) => '<bdi class="ltr">' + esc(s) + '</bdi>';

  /* ---------------- toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  /* ---------------- sheets ---------------- */
  function openSheet(id) {
    $('#sheetBackdrop').classList.remove('hidden');
    $('#' + id).classList.remove('hidden');
  }
  function closeSheets() {
    $('#sheetBackdrop').classList.add('hidden');
    $$('.sheet').forEach(s => s.classList.add('hidden'));
  }

  /* מודאל קלט מספרי פשוט */
  function askNumber(title, value, cb) {
    $('#promptTitle').textContent = title;
    const input = $('#promptInput');
    input.value = value != null ? value : '';
    openSheet('promptSheet');
    setTimeout(() => input.focus(), 100);
    $('#promptOk').onclick = () => {
      const v = parseFloat(input.value);
      closeSheets();
      if (!isNaN(v)) cb(v);
    };
  }

  /* ---------------- ניווט ---------------- */
  let current = 'home';
  function show(view) {
    current = view;
    $$('.view').forEach(v => v.classList.add('hidden'));
    $('#view-' + view).classList.remove('hidden');
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    render(view);
  }

  function render(view) {
    if (view === 'home')    renderHome();
    if (view === 'workout') renderWorkout();
    if (view === 'food')    renderFood();
    if (view === 'chat')    renderChat();
    if (view === 'profile') renderProfile();
  }

  /* ================= HOME ================= */
  function renderHome() {
    const p = Store.data.profile;
    if (!p) return;
    const m   = Calc.macros(p);
    const t   = Store.totals();
    const day = Store.day();

    $('#greet').textContent = greeting() + ', ' + p.name;
    $('#todayLabel').textContent = new Date().toLocaleDateString('he-IL', {
      weekday: 'long', day: 'numeric', month: 'long'
    });

    const left = m.calories - t.calories + day.burned;
    $('#calLeft').textContent   = n(left);
    $('#calTarget').textContent = n(m.calories);
    $('#calEaten').textContent  = n(t.calories);
    $('#calBurned').textContent = n(day.burned);

    const pct = Math.max(0, Math.min(1, t.calories / m.calories));
    $('#calRing').style.strokeDashoffset = String(326.7 * (1 - pct));

    const bar = (id, val, goal) => {
      $('#' + id).style.width = Math.min(100, (val / goal) * 100 || 0) + '%';
    };
    bar('pBar', t.protein, m.protein); $('#pVal').innerHTML = ltr(`${n(t.protein)}/${m.protein}`) + " ג'";
    bar('cBar', t.carbs,   m.carbs);   $('#cVal').innerHTML = ltr(`${n(t.carbs)}/${m.carbs}`)     + " ג'";
    bar('fBar', t.fat,     m.fat);     $('#fVal').innerHTML = ltr(`${n(t.fat)}/${m.fat}`)         + " ג'";

    /* מים */
    const goal = Calc.waterGoal(p);
    $('#waterCount').innerHTML = ltr(`${day.water} / ${goal}`);
    $('#waterRow').innerHTML = Array.from({ length: goal }, (_, i) =>
      `<button class="cup${i < day.water ? ' on' : ''}" data-cup="${i + 1}" aria-label="כוס ${i + 1}"></button>`
    ).join('');
    $$('#waterRow .cup').forEach(c => c.onclick = () => {
      const target = +c.dataset.cup;
      Store.day().water = (Store.day().water === target) ? target - 1 : target;
      Store.save();
      renderHome();
    });

    /* יומן */
    const log = $('#todayLog');
    if (!day.food.length) {
      log.innerHTML = '<div class="empty">עוד לא רשמת כלום היום.<br>צלם ארוחה כדי להתחיל 📷</div>';
    } else {
      log.innerHTML = day.food.map(f => `
        <div class="log-item">
          <div class="log-emoji">${esc(f.emoji)}</div>
          <div class="log-main">
            <div class="log-name">${esc(f.name)}</div>
            <div class="log-sub">${n(f.protein)}ח' · ${n(f.carbs)}פ' · ${n(f.fat)}ש' · ${timeOf(f.time)}</div>
          </div>
          <div class="log-cal">${n(f.calories)}</div>
          <button class="log-del" data-del="${esc(f.id)}" aria-label="מחק">
            <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>`).join('');
      $$('#todayLog [data-del]').forEach(b => b.onclick = () => {
        Store.removeFood(b.dataset.del);
        renderHome();
      });
    }

    renderWeightChart();
  }

  function renderWeightChart() {
    /* ממיינים כאן ולא סומכים על סדר ההוספה — גרף עם תאריכים מעורבבים
       הוא חסר משמעות, וזה זול מספיק לעשות בכל רינדור */
    const ws = Store.data.weights.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
    const el = $('#weightChart');
    if (ws.length < 2) {
      el.innerHTML = '<div class="empty">רשום את המשקל שלך כמה ימים<br>כדי לראות גרף התקדמות</div>';
      return;
    }
    const vals = ws.map(w => w.kg);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    el.innerHTML = ws.map(w => {
      const h = 20 + ((w.kg - min) / span) * 70;
      const d = new Date(w.date + 'T00:00:00');
      return `<div class="chart-col">
        <div class="chart-bar" style="height:${h}px" title="${w.kg} ק&quot;ג"></div>
        <div class="chart-lbl">${d.getDate()}/${d.getMonth() + 1}</div>
      </div>`;
    }).join('');
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 6)  return 'לילה טוב';
    if (h < 12) return 'בוקר טוב';
    if (h < 17) return 'צהריים טובים';
    if (h < 21) return 'ערב טוב';
    return 'לילה טוב';
  }

  const timeOf = (iso) => {
    try { return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  };

  /* ================= WORKOUTS ================= */
  function renderWorkout() {
    const el = $('#workoutContent');
    const plan = Store.data.workoutPlan;

    if (!plan) {
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:32px 20px">
          <div style="font-size:44px;margin-bottom:12px">🏋️</div>
          <h3 style="margin-bottom:8px">עוד אין לך תוכנית</h3>
          <p class="muted small">אבנה לך תוכנית אימונים שבועית שמתאימה בדיוק לפרופיל, למטרה ולמקום שבו אתה מתאמן.</p>
          <button class="btn btn-primary btn-lg" id="genWorkout">בנה לי תוכנית</button>
        </div>`;
      $('#genWorkout').onclick = App.generateWorkout;
      return;
    }

    const today = new Date().getDay(); // 0=ראשון
    el.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:6px">${esc(plan.title)}</h3>
        <p class="muted small" style="margin:0">${esc(plan.summary)}</p>
      </div>
      ${(plan.days || []).map((d, i) => `
        <div class="day-card${i === today ? ' open' : ''}" data-day="${i}">
          <div class="day-head">
            <div class="day-badge${d.rest ? ' rest' : ''}">${d.rest ? '😴' : (i === today ? '⭐' : i + 1)}</div>
            <div class="day-info">
              <div class="day-title">${esc(d.day)}${i === today ? ' · היום' : ''}</div>
              <div class="day-meta">${esc(d.focus)}${d.rest ? '' : ` · ${n(d.durationMin)} דק' · ${(d.exercises || []).length} תרגילים`}</div>
            </div>
            <svg class="day-chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <div class="day-body">
            ${d.rest
              ? '<p class="muted small" style="margin:14px 0 0">יום מנוחה. תן לגוף להתאושש — זה חלק מהאימון 💤</p>'
              : (d.exercises || []).map(x => `
                <div class="ex">
                  <div class="ex-top">
                    <span class="ex-name">${esc(x.name)}</span>
                    <span class="ex-sets">${ltr(n(x.sets) + '×' + x.reps)}</span>
                  </div>
                  <div class="ex-desc">${esc(x.notes)} · מנוחה ${n(x.restSec)} שנ'</div>
                </div>`).join('')}
          </div>
        </div>`).join('')}
      <button class="btn btn-ghost btn-lg" id="regenWorkout" style="margin-top:6px">בנה תוכנית חדשה</button>
      <p class="muted small" style="text-align:center;margin-top:10px">נוצרה ב-${new Date(plan.generatedAt).toLocaleDateString('he-IL')}</p>`;

    $$('#workoutContent .day-head').forEach(h => h.onclick = () =>
      h.parentElement.classList.toggle('open'));
    $('#regenWorkout').onclick = App.generateWorkout;
  }

  /* ================= NUTRITION ================= */
  function renderFood() {
    const el = $('#foodContent');
    const plan = Store.data.mealPlan;
    const p = Store.data.profile;
    const m = Calc.macros(p);
    const t = Store.totals();

    const summaryCard = `
      <div class="card">
        <div class="card-head"><h3>היום עד עכשיו</h3><span class="pill">${ltr(n(t.calories) + ' / ' + m.calories)}</span></div>
        <div class="macro-row" style="margin:0">
          <div class="macro"><div class="macro-lbl">חלבון</div><div class="macro-val">${ltr(n(t.protein) + '/' + m.protein)} ג'</div></div>
          <div class="macro"><div class="macro-lbl">פחמימות</div><div class="macro-val">${ltr(n(t.carbs) + '/' + m.carbs)} ג'</div></div>
          <div class="macro"><div class="macro-lbl">שומן</div><div class="macro-val">${ltr(n(t.fat) + '/' + m.fat)} ג'</div></div>
        </div>
      </div>`;

    if (!plan) {
      el.innerHTML = summaryCard + `
        <div class="card" style="text-align:center;padding:32px 20px">
          <div style="font-size:44px;margin-bottom:12px">🥗</div>
          <h3 style="margin-bottom:8px">עוד אין תוכנית תזונה</h3>
          <p class="muted small">אבנה לך תפריט יומי שמגיע בדיוק ליעד הקלוריות והמאקרו שלך, עם אוכל פשוט וזמין.</p>
          <button class="btn btn-primary btn-lg" id="genMeal">בנה לי תפריט</button>
        </div>`;
      $('#genMeal').onclick = App.generateMealPlan;
      return;
    }

    el.innerHTML = summaryCard + `
      <div class="card"><p class="muted small" style="margin:0">${esc(plan.summary)}</p></div>
      ${(plan.meals || []).map((meal, i) => `
        <div class="meal-card">
          <div class="meal-head">
            <div>
              <div class="meal-name">${esc(meal.name)}</div>
              <div class="log-sub">${esc(meal.time)} · ${n(meal.protein)}ח' ${n(meal.carbs)}פ' ${n(meal.fat)}ש'</div>
            </div>
            <div class="meal-cal">${n(meal.calories)}</div>
          </div>
          <div class="meal-items">
            ${(meal.items || []).map(x => `<div class="meal-item">${esc(x)}</div>`).join('')}
          </div>
          <button class="btn btn-ghost" style="width:100%;margin-top:12px;padding:10px" data-eat="${i}">✓ אכלתי את זה</button>
        </div>`).join('')}
      ${(plan.tips && plan.tips.length) ? `
      <div class="card">
        <div class="card-head"><h3>טיפים</h3></div>
        <div class="meal-items">${plan.tips.map(x => `<div class="meal-item">${esc(x)}</div>`).join('')}</div>
      </div>` : ''}
      <button class="btn btn-ghost btn-lg" id="regenMeal">בנה תפריט חדש</button>`;

    $$('#foodContent [data-eat]').forEach(b => b.onclick = () => {
      const meal = plan.meals[+b.dataset.eat];
      Store.addFood({
        emoji: '🍽️', name: meal.name,
        calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat
      });
      toast('נרשם ביומן ✓');
      renderFood();
    });
    $('#regenMeal').onclick = App.generateMealPlan;
  }

  /* ================= CHAT ================= */
  const SUGGESTIONS = [
    'מה לאכול אחרי אימון?',
    'איך עושים שכיבת סמיכה נכון?',
    'כמה מים אני צריך ביום?',
    'אין לי כוח היום, מה עושים?'
  ];

  function renderChat() {
    const box = $('#chatScroll');
    const msgs = Store.data.chat;

    if (!msgs.length) {
      box.innerHTML = `
        <div class="empty" style="padding:30px 10px">
          <div style="font-size:44px;margin-bottom:10px">💬</div>
          <div style="font-size:16px;color:var(--text);font-weight:600;margin-bottom:6px">היי, אני המאמן שלך</div>
          <div>שאל אותי כל דבר על אימונים, תרגילים או תזונה</div>
        </div>
        <div class="chat-suggest">
          ${SUGGESTIONS.map(s => `<button data-sug="${esc(s)}">${esc(s)}</button>`).join('')}
        </div>`;
      $$('#chatScroll [data-sug]').forEach(b => b.onclick = () => App.sendChat(b.dataset.sug));
      return;
    }

    box.innerHTML = msgs.map(m =>
      `<div class="msg ${m.role === 'me' ? 'me' : (m.role === 'err' ? 'err' : 'ai')}">${esc(m.text)}</div>`
    ).join('');
    scrollChat();
  }

  function scrollChat() {
    const box = $('#chatScroll');
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  function chatTyping(on) {
    const box = $('#chatScroll');
    const old = $('#typingBubble');
    if (old) old.remove();
    if (on) {
      const d = document.createElement('div');
      d.className = 'msg ai typing';
      d.id = 'typingBubble';
      d.innerHTML = '<i></i><i></i><i></i>';
      box.appendChild(d);
      scrollChat();
    }
  }

  /* ================= PROFILE ================= */
  function renderProfile() {
    const p = Store.data.profile;
    const m = Calc.macros(p);
    const label = Calc.bmiLabel(p);
    const keyOk = AI.hasKey();

    $('#profileContent').innerHTML = `
      <div class="prof-head">
        <div class="avatar">${esc((p.name || '?').charAt(0))}</div>
        <div>
          <div class="prof-name">${esc(p.name)}</div>
          <div class="prof-sub">${p.age} · ${Calc.goalText[p.goal]}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>הנתונים שלי</h3></div>
        <div class="kv"><span class="kv-k">גובה</span><span class="kv-v">${p.height} ס"מ</span></div>
        <div class="kv"><span class="kv-k">משקל</span><span class="kv-v">${p.weight} ק"ג</span></div>
        <div class="kv"><span class="kv-k">BMI</span><span class="kv-v">${Calc.bmi(p)}${label ? ' · ' + label : ''}</span></div>
        <div class="kv"><span class="kv-k">רמת פעילות</span><span class="kv-v">${Calc.activityText[String(p.activity)]}</span></div>
        <div class="kv"><span class="kv-k">מקום אימון</span><span class="kv-v">${Calc.placeText[p.place]}</span></div>
        <div class="kv"><span class="kv-k">ימי אימון</span><span class="kv-v">${p.days} בשבוע</span></div>
      </div>
      ${+p.age < 18 ? `<p class="muted small" style="margin:-6px 4px 14px">בגיל שלך אין קטגוריית BMI קבועה — היא נמדדת מול טבלאות גדילה לפי גיל ומין, אז מוצג רק המספר.</p>` : ''}

      <div class="card">
        <div class="card-head"><h3>היעדים היומיים שלי</h3></div>
        <div class="kv"><span class="kv-k">קלוריות</span><span class="kv-v">${m.calories}</span></div>
        <div class="kv"><span class="kv-k">חלבון</span><span class="kv-v">${m.protein} ג'</span></div>
        <div class="kv"><span class="kv-k">פחמימות</span><span class="kv-v">${m.carbs} ג'</span></div>
        <div class="kv"><span class="kv-k">שומן</span><span class="kv-v">${m.fat} ג'</span></div>
        <div class="kv"><span class="kv-k">מים</span><span class="kv-v">${Calc.waterGoal(p)} כוסות</span></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>עריכה</h3></div>
        <button class="row-btn" data-edit="weight">עדכן משקל<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <button class="row-btn" data-edit="height">עדכן גובה<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <button class="row-btn" data-edit="burned">קלוריות שנשרפו היום<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <button class="row-btn" id="redoOnboarding">מלא מחדש את השאלון<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
      </div>

      <div class="card">
        <div class="card-head"><h3>הגדרות AI</h3></div>
        <p class="muted small">הצ'אט, בניית התוכניות וצילום הארוחות צריכים חיבור לשירות AI.
        <b>שאר האפליקציה עובדת בלי זה.</b></p>

        <label class="lbl">איזה שירות?</label>
        <div class="prov-list" id="provList">
          ${Object.keys(AI.PROVIDERS).map(id => {
            const pr = AI.PROVIDERS[id];
            const on = AI.provider() === id;
            return `<button class="prov${on ? ' on' : ''}" data-prov="${id}">
              <span class="prov-top">
                <b>${esc(pr.label)}</b>
                <span class="prov-badge${pr.free ? ' free' : ''}">${esc(pr.badge)}</span>
              </span>
              <span class="prov-note">${esc(pr.note)}</span>
            </button>`;
          }).join('')}
        </div>

        <label class="lbl">המפתח שלך</label>
        <input class="field" id="apiKeyInput" type="password" placeholder="${esc(AI.info().hint)}"
               value="${esc(AI.keyFor(AI.provider()))}" autocomplete="off" spellcheck="false">
        <div style="display:flex;gap:10px">
          <button class="btn btn-ghost" id="saveKey" style="flex:1">שמור</button>
          <button class="btn btn-primary" id="testKey" style="flex:1">בדוק חיבור</button>
        </div>
        <p class="small" style="margin:12px 0 0">
          סטטוס: <b>${keyOk ? 'מפתח שמור' : 'אין מפתח'}</b><span class="status-dot${keyOk ? ' ok' : ''}"></span>
        </p>
        <p class="muted small" style="margin:10px 0 0">
          איפה משיגים מפתח: <span class="link" id="openSignup">${esc(AI.info().signup)}</span><br>
          המפתח נשמר רק בטלפון שלך.
        </p>
      </div>

      <div class="card">
        <button class="row-btn danger" id="wipe">מחק את כל הנתונים
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`;

    $$('#profileContent [data-edit]').forEach(b => b.onclick = () => App.editField(b.dataset.edit));
    $('#redoOnboarding').onclick = () => App.startOnboarding(true);

    $$('#provList [data-prov]').forEach(b => b.onclick = () => {
      /* שומרים את מה שהוקלד לספק הנוכחי לפני שמחליפים,
         אחרת מפתח שהודבק ולא נשמר נעלם */
      AI.setKey($('#apiKeyInput').value, AI.provider());
      AI.setProvider(b.dataset.prov);
      renderProfile();
    });
    $('#openSignup').onclick = () => window.open(AI.info().signup, '_blank');

    $('#saveKey').onclick = () => {
      AI.setKey($('#apiKeyInput').value);
      toast('המפתח נשמר ✓');
      renderProfile();
    };
    $('#testKey').onclick = App.testKey;
    $('#wipe').onclick = App.wipe;
  }

  return {
    $, $$, esc, n, toast, openSheet, closeSheets, askNumber,
    show, render, renderHome, renderWorkout, renderFood, renderChat, renderProfile,
    chatTyping, scrollChat,
    get current() { return current; }
  };
})();
