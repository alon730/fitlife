/* ===== app.js — הרכבה של הכל ===== */
const App = (() => {
  const $  = UI.$, $$ = UI.$$;

  /* ================= ONBOARDING ================= */
  let step = 0;
  const draft = {};

  function startOnboarding(editing) {
    if (editing && Store.data.profile) Object.assign(draft, Store.data.profile);
    step = editing ? 1 : 0;
    $('#app').classList.add('hidden');
    $('#onboarding').classList.remove('hidden');
    paintStep();
    if (editing) prefill();
  }

  function prefill() {
    $('#obName').value   = draft.name   || '';
    $('#obAge').value    = draft.age    || '';
    $('#obHeight').value = draft.height || '';
    $('#obWeight').value = draft.weight || '';
    $('#obNotes').value  = draft.notes  || '';
    pick('#obSex',      draft.sex);
    pick('#obActivity', draft.activity);
    pick('#obGoal',     draft.goal);
    pick('#obPlace',    draft.place);
    pick('#obDays',     draft.days);
  }
  function pick(sel, val) {
    if (val == null) return;
    $$(sel + ' [data-val]').forEach(b =>
      b.classList.toggle('on', b.dataset.val === String(val)));
  }

  function paintStep() {
    $$('.ob-step').forEach(s => s.classList.toggle('hidden', +s.dataset.step !== step));
    $('#obBar').style.width = (step / 5 * 100) + '%';
    $('#onboarding').scrollTop = 0;
  }

  function validateStep() {
    if (step === 1) {
      const name = $('#obName').value.trim();
      const age  = parseInt($('#obAge').value, 10);
      if (!name)                       return 'צריך למלא שם';
      if (!age || age < 10 || age > 99) return 'צריך גיל בין 10 ל-99';
      draft.name = name; draft.age = age;
    }
    if (step === 2) {
      const h = parseInt($('#obHeight').value, 10);
      const w = parseFloat($('#obWeight').value);
      if (!draft.sex)                     return 'בחר מין';
      if (!h || h < 100 || h > 230)       return 'צריך גובה בין 100 ל-230 ס"מ';
      if (!w || w < 25 || w > 250)        return 'צריך משקל בין 25 ל-250 ק"ג';
      draft.height = h; draft.weight = w;
    }
    if (step === 3 && !draft.activity) return 'בחר רמת פעילות';
    if (step === 4) {
      if (!draft.goal)  return 'בחר מטרה';
      if (!draft.place) return 'בחר איפה אתה מתאמן';
      if (!draft.days)  return 'בחר כמה ימים בשבוע';
    }
    return null;
  }

  function bindOnboarding() {
    $$('#onboarding [data-next]').forEach(b => b.onclick = () => {
      const err = validateStep();
      if (err) return UI.toast(err);
      step = Math.min(5, step + 1);
      paintStep();
    });
    $$('#onboarding [data-back]').forEach(b => b.onclick = () => {
      step = Math.max(0, step - 1);
      paintStep();
    });

    const choose = (sel, key, single) => {
      $$(sel + ' [data-val]').forEach(b => b.onclick = () => {
        $$(sel + ' [data-val]').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        draft[key] = b.dataset.val;
        if (single) setTimeout(() => { if (!validateStep()) { step++; paintStep(); } }, 180);
      });
    };
    choose('#obSex', 'sex');
    choose('#obActivity', 'activity', true);
    choose('#obGoal', 'goal');
    choose('#obPlace', 'place');
    choose('#obDays', 'days');

    $('#obFinish').onclick = () => {
      draft.notes = $('#obNotes').value.trim();
      const changedBody = !Store.data.profile ||
        Store.data.profile.weight !== draft.weight ||
        Store.data.profile.goal !== draft.goal ||
        Store.data.profile.place !== draft.place ||
        Store.data.profile.days !== draft.days;

      Store.data.profile = Object.assign({}, draft);
      Store.addWeight(+draft.weight);

      /* אם השתנה משהו מהותי, התוכניות הישנות כבר לא מתאימות */
      if (changedBody) {
        Store.data.workoutPlan = null;
        Store.data.mealPlan = null;
      }
      Store.save();
      enterApp();
      UI.toast('הכל מוכן! 💪');
    };
  }

  function enterApp() {
    $('#onboarding').classList.add('hidden');
    $('#app').classList.remove('hidden');
    UI.show('home');
  }

  /* ================= תמונות ================= */
  /* תמונות מהטלפון ענקיות. מקטינים לפני שליחה — מהיר יותר וזול יותר. */
  function fileToImage(file, maxEdge) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('לא הצלחתי לקרוא את התמונה'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('הקובץ הזה לא תמונה תקינה'));
        img.onload = () => {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = cv.toDataURL('image/jpeg', 0.82);
          resolve({ dataUrl, base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function openScan() {
    const ai = AI.hasKey();
    $('#scanTitle').textContent = 'הוסף ארוחה';
    $('#scanBody').innerHTML = `
      <p class="muted small">${ai
        ? 'צלם את האוכל ואני אחשב כמה קלוריות יש בו, או בחר מהרשימה.'
        : 'בחר מהרשימה מה אכלת. צילום ארוחה דורש מפתח AI בהגדרות.'}</p>
      <div class="scan-actions">
        <button class="btn ${ai ? 'btn-primary' : 'btn-ghost'} btn-lg" id="scanCamera">📷 פתח מצלמה${ai ? '' : ' (צריך מפתח)'}</button>
        <button class="btn btn-ghost btn-lg" id="scanGallery">🖼️ בחר מהגלריה</button>
        <button class="btn ${ai ? 'btn-ghost' : 'btn-primary'} btn-lg" id="scanManual">📝 בחר מרשימת מאכלים</button>
      </div>`;
    $('#scanCamera').onclick  = () => $('#fileCamera').click();
    $('#scanGallery').onclick = () => $('#fileGallery').click();
    $('#scanManual').onclick  = openManual;
    UI.openSheet('scanSheet');
  }

  /* ---------- רישום ידני ----------
     קיים כדי שמעקב הקלוריות יעבוד גם בלי מפתח AI ובלי אינטרנט. */
  let manualQuery = '';

  function openManual() {
    $('#scanTitle').textContent = 'מה אכלת?';
    $('#scanBody').innerHTML = `
      <input class="field" id="foodSearch" type="search" placeholder="חפש מאכל..." autocomplete="off" value="${UI.esc(manualQuery)}">
      <div id="foodList" class="food-list"></div>
      <button class="btn btn-ghost btn-lg" id="foodCustom" style="margin-top:12px">➕ משהו אחר (הזנה חופשית)</button>
      <button class="btn btn-ghost btn-lg" id="foodBack" style="margin-top:8px">חזור</button>`;

    const input = $('#foodSearch');
    input.oninput = () => { manualQuery = input.value; paintFoodList(); };
    $('#foodCustom').onclick = openCustomFood;
    $('#foodBack').onclick   = openScan;
    paintFoodList();
  }

  function paintFoodList() {
    const results = Foods.search(manualQuery);
    const box = $('#foodList');
    if (!results.length) {
      box.innerHTML = `<div class="empty">לא מצאתי "${UI.esc(manualQuery)}".<br>אפשר להוסיף אותו בהזנה חופשית.</div>`;
      return;
    }
    /* בלי חיפוש מציגים לפי קטגוריות, עם חיפוש רשימה שטוחה */
    const rows = (list) => list.map(f => `
      <button class="food-row" data-food="${UI.esc(f.n)}">
        <span class="food-emoji">${f.e}</span>
        <span class="food-main">
          <span class="food-name">${UI.esc(f.n)}</span>
          <span class="food-unit">${UI.esc(f.u)}</span>
        </span>
        <span class="food-cal">${f.c}</span>
      </button>`).join('');

    box.innerHTML = manualQuery.trim()
      ? rows(results)
      : Foods.GROUPS.map(g => {
          const list = Foods.byGroup(g);
          return list.length ? `<div class="food-group">${UI.esc(g)}</div>` + rows(list) : '';
        }).join('');

    $$('#foodList [data-food]').forEach(b => b.onclick = () => {
      const food = Foods.DB.find(f => f.n === b.dataset.food);
      if (food) openPortion(food);
    });
  }

  function openPortion(food) {
    $('#scanTitle').textContent = 'כמה אכלת?';
    let qty = 1;
    $('#scanBody').innerHTML = `
      <div class="portion-head">
        <span class="portion-emoji">${food.e}</span>
        <div>
          <div class="portion-name">${UI.esc(food.n)}</div>
          <div class="log-sub">ל${UI.esc(food.u)} אחת</div>
        </div>
      </div>
      <label class="lbl">כמה?</label>
      <div class="chips" id="qtyChips">
        ${[0.5,1,1.5,2,3].map(q => `<button class="chip${q===1?' on':''}" data-q="${q}">${q === 0.5 ? '½' : (q === 1.5 ? '1½' : q)}</button>`).join('')}
      </div>
      <div class="result-grid" id="portionTotals"></div>
      <div class="ob-actions">
        <button class="btn btn-ghost" id="portionBack">חזור</button>
        <button class="btn btn-primary" id="portionAdd">הוסף ליומן</button>
      </div>`;

    const paint = () => {
      const m = (v) => Math.round(v * qty);
      $('#portionTotals').innerHTML = `
        <div class="result-cell"><b>${m(food.c)}</b><span>קלוריות</span></div>
        <div class="result-cell"><b>${m(food.p)}</b><span>חלבון ג'</span></div>
        <div class="result-cell"><b>${m(food.ch)}</b><span>פחמימות ג'</span></div>
        <div class="result-cell"><b>${m(food.f)}</b><span>שומן ג'</span></div>`;
    };
    paint();

    $$('#qtyChips [data-q]').forEach(b => b.onclick = () => {
      $$('#qtyChips [data-q]').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      qty = parseFloat(b.dataset.q);
      paint();
    });

    $('#portionBack').onclick = openManual;
    $('#portionAdd').onclick = () => {
      const m = (v) => Math.round(v * qty);
      const label = qty === 1 ? food.n : `${food.n} (${qty === 0.5 ? '½' : qty} ${food.u})`;
      Store.addFood({ emoji: food.e, name: label,
        calories: m(food.c), protein: m(food.p), carbs: m(food.ch), fat: m(food.f) });
      UI.closeSheets();
      UI.toast('נוסף ליומן ✓');
      UI.render(UI.current);
    };
  }

  function openCustomFood() {
    $('#scanTitle').textContent = 'הזנה חופשית';
    $('#scanBody').innerHTML = `
      <label class="lbl">מה אכלת?</label>
      <input class="field" id="cfName" type="text" placeholder="לדוגמה: עוגת יום הולדת">
      <label class="lbl">קלוריות</label>
      <input class="field" id="cfCal" type="number" inputmode="numeric" placeholder="250">
      <p class="muted small">המאקרו לא חובה — אפשר להשאיר ריק.</p>
      <div class="macro-row">
        <div class="macro"><div class="macro-lbl">חלבון ג'</div><input class="field" id="cfP" type="number" inputmode="numeric" placeholder="0" style="margin:6px 0 0"></div>
        <div class="macro"><div class="macro-lbl">פחמימות ג'</div><input class="field" id="cfC" type="number" inputmode="numeric" placeholder="0" style="margin:6px 0 0"></div>
        <div class="macro"><div class="macro-lbl">שומן ג'</div><input class="field" id="cfF" type="number" inputmode="numeric" placeholder="0" style="margin:6px 0 0"></div>
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" id="cfBack">חזור</button>
        <button class="btn btn-primary" id="cfAdd">הוסף ליומן</button>
      </div>`;

    $('#cfBack').onclick = openManual;
    $('#cfAdd').onclick = () => {
      const name = $('#cfName').value.trim();
      const cal  = parseFloat($('#cfCal').value);
      if (!name)            return UI.toast('צריך לכתוב מה אכלת');
      if (isNaN(cal) || cal < 0) return UI.toast('צריך למלא קלוריות');
      const num = (sel) => Math.max(0, parseFloat($(sel).value) || 0);
      Store.addFood({ emoji:'🍽️', name, calories: Math.round(cal),
        protein: num('#cfP'), carbs: num('#cfC'), fat: num('#cfF') });
      UI.closeSheets();
      UI.toast('נוסף ליומן ✓');
      UI.render(UI.current);
    };
  }

  async function handleImage(file) {
    if (!file) return;
    if (!AI.hasKey()) {
      UI.closeSheets();
      UI.toast('צריך מפתח API בהגדרות');
      return UI.show('profile');
    }

    let img;
    try {
      img = await fileToImage(file, 1280);
    } catch (e) {
      $('#scanBody').innerHTML = `<p class="msg err" style="max-width:none">${UI.esc(e.message)}</p>`;
      return;
    }

    $('#scanBody').innerHTML = `
      <img class="scan-preview" src="${img.dataUrl}" alt="הארוחה שצילמת">
      <div class="scan-loading"><div class="spinner"></div><div>מנתח את הארוחה...</div></div>`;

    try {
      const r = await AI.analyzeMeal(img.base64, img.mediaType);
      showScanResult(r, img.dataUrl);
    } catch (e) {
      $('#scanBody').innerHTML = `
        <img class="scan-preview" src="${img.dataUrl}" alt="הארוחה שצילמת">
        <p class="msg err" style="max-width:none">${UI.esc(AI.errorText(e))}</p>
        <button class="btn btn-ghost btn-lg" id="scanRetry">נסה שוב</button>`;
      $('#scanRetry').onclick = () => handleImage(file);
    }
  }

  function showScanResult(r, dataUrl) {
    if (!r.isFood) {
      $('#scanBody').innerHTML = `
        <img class="scan-preview" src="${dataUrl}" alt="התמונה שצילמת">
        <p class="muted" style="text-align:center">${UI.esc(r.note || 'לא זיהיתי אוכל בתמונה.')}</p>
        <button class="btn btn-ghost btn-lg" id="scanAgain">צלם שוב</button>`;
      $('#scanAgain').onclick = openScan;
      return;
    }

    const conf = { high: 'זיהוי בטוח', medium: 'זיהוי סביר', low: 'זיהוי לא ודאי' }[r.confidence] || '';
    $('#scanBody').innerHTML = `
      <img class="scan-preview" src="${dataUrl}" alt="${UI.esc(r.name)}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span style="font-size:28px">${UI.esc(r.emoji)}</span>
        <div>
          <div style="font-size:18px;font-weight:700">${UI.esc(r.name)}</div>
          <div class="log-sub">${UI.esc(conf)}</div>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-cell"><b>${UI.n(r.calories)}</b><span>קלוריות</span></div>
        <div class="result-cell"><b>${UI.n(r.protein)}</b><span>חלבון ג'</span></div>
        <div class="result-cell"><b>${UI.n(r.carbs)}</b><span>פחמימות ג'</span></div>
        <div class="result-cell"><b>${UI.n(r.fat)}</b><span>שומן ג'</span></div>
      </div>
      ${(r.items && r.items.length) ? `<div class="meal-items" style="margin-bottom:14px">
        ${r.items.map(i => `<div class="meal-item">${UI.esc(i.name)} — ${UI.esc(i.amount)} · ${UI.n(i.calories)} קל'</div>`).join('')}
      </div>` : ''}
      ${r.note ? `<p class="muted small">${UI.esc(r.note)}</p>` : ''}
      ${r.confidence === 'low' ? `<p class="muted small">הזיהוי לא ודאי — אפשר לתקן את הקלוריות אחרי השמירה בעזרת המחיקה והוספה מחדש.</p>` : ''}
      <div class="ob-actions">
        <button class="btn btn-ghost" id="scanAgain">צלם שוב</button>
        <button class="btn btn-primary" id="scanSave">הוסף ליומן</button>
      </div>`;

    $('#scanAgain').onclick = openScan;
    $('#scanSave').onclick = () => {
      Store.addFood({
        emoji: r.emoji || '🍽️', name: r.name,
        calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat
      });
      UI.closeSheets();
      UI.toast('נוסף ליומן ✓');
      UI.render(UI.current);
    };
  }

  /* ================= צ'אט ================= */
  let sending = false;

  async function sendChat(text) {
    text = (text || $('#chatInput').value).trim();
    if (!text || sending) return;

    if (!AI.hasKey()) {
      UI.toast('צריך מפתח API בהגדרות');
      return UI.show('profile');
    }

    $('#chatInput').value = '';
    $('#chatInput').style.height = 'auto';

    /* צילום ההיסטוריה לפני ההוספה — אחרת ההודעה הנוכחית תישלח פעמיים */
    const history = Store.data.chat.slice();
    Store.pushChat('me', text);
    UI.renderChat();

    sending = true;
    $('#chatSend').disabled = true;
    $('#chatSub').textContent = 'כותב...';
    UI.chatTyping(true);

    try {
      const reply = await AI.chat(text, history);
      UI.chatTyping(false);
      Store.pushChat('ai', reply);
    } catch (e) {
      UI.chatTyping(false);
      Store.pushChat('err', AI.errorText(e));
    } finally {
      sending = false;
      $('#chatSend').disabled = false;
      $('#chatSub').textContent = 'מוכן לשאלות';
      UI.renderChat();
    }
  }

  /* ================= יצירת תוכניות ================= */
  async function generatePlan(kind) {
    if (!AI.hasKey()) {
      UI.toast('צריך מפתח API בהגדרות');
      return UI.show('profile');
    }
    const isWorkout = kind === 'workout';
    const holder = $(isWorkout ? '#workoutContent' : '#foodContent');
    holder.innerHTML = `
      <div class="card">
        <div class="scan-loading">
          <div class="spinner"></div>
          <div>${isWorkout ? 'בונה לך תוכנית אימונים...' : 'בונה לך תפריט...'}</div>
          <div class="small">זה לוקח כמה שניות</div>
        </div>
      </div>`;

    try {
      const plan = isWorkout ? await AI.generateWorkoutPlan() : await AI.generateMealPlan();
      plan.generatedAt = Date.now();
      if (isWorkout) Store.data.workoutPlan = plan;
      else           Store.data.mealPlan = plan;
      Store.save();
      isWorkout ? UI.renderWorkout() : UI.renderFood();
      UI.toast('מוכן! 💪');
    } catch (e) {
      holder.innerHTML = `
        <div class="card" style="text-align:center">
          <p class="msg err" style="max-width:none;margin:0 0 14px">${UI.esc(AI.errorText(e))}</p>
          <button class="btn btn-primary btn-lg" id="retryPlan">נסה שוב</button>
        </div>`;
      $('#retryPlan').onclick = () => generatePlan(kind);
    }
  }

  /* ================= פרופיל ================= */
  /* מרעננים את המסך הנוכחי, לא בהכרח את הפרופיל —
     אפשר להגיע לכאן גם מכפתור מהיר במסך הבית */
  function editField(which) {
    const p = Store.data.profile;
    const done = () => { UI.render(UI.current); UI.toast('עודכן ✓'); };

    if (which === 'weight') {
      UI.askNumber('משקל בק"ג', p.weight, v => {
        if (v < 25 || v > 250) return UI.toast('משקל לא הגיוני');
        Store.addWeight(v);
        done();
      });
    }
    if (which === 'height') {
      UI.askNumber('גובה בס"מ', p.height, v => {
        if (v < 100 || v > 230) return UI.toast('גובה לא הגיוני');
        p.height = v; Store.save();
        done();
      });
    }
    if (which === 'burned') {
      UI.askNumber('קלוריות שנשרפו באימון היום', Store.day().burned, v => {
        Store.day().burned = Math.max(0, Math.min(3000, v));
        Store.save();
        done();
      });
    }
  }

  async function testKey() {
    const key = $('#apiKeyInput').value.trim();
    if (!key) return UI.toast('קודם הדבק מפתח');
    Store.data.apiKey = key;
    Store.save();
    const btn = $('#testKey');
    btn.disabled = true;
    btn.textContent = 'בודק...';
    try {
      await AI.testKey();
      UI.toast('החיבור עובד ✓');
    } catch (e) {
      UI.toast(AI.errorText(e));
    } finally {
      UI.renderProfile();
    }
  }

  function wipe() {
    if (!confirm('זה ימחק את הפרופיל, היומן, התוכניות והצ\'אט. בטוח?')) return;
    Store.reset();
    location.reload();
  }

  /* ================= bootstrap ================= */
  function bind() {
    bindOnboarding();

    $$('.tab').forEach(t => t.onclick = () => UI.show(t.dataset.view));
    $('#goSettings').onclick = () => UI.show('profile');

    /* מסך הבית */
    $('#qScan').onclick    = openScan;
    $('#foodScan').onclick = openScan;
    $('#qWater').onclick   = () => {
      /* לא עוברים את היעד — אחרת המונה מראה מספר שאין לו כוסות בשורה */
      const goal = Calc.waterGoal(Store.data.profile);
      const d = Store.day();
      if (d.water >= goal) return UI.toast('כבר הגעת ליעד המים היום 💧');
      d.water++; Store.save(); UI.renderHome();
    };
    $('#qWorkout').onclick = () => UI.show('workout');
    $('#qWeigh').onclick   = () => editField('weight');

    /* קבצי תמונה */
    ['#fileCamera', '#fileGallery'].forEach(sel => {
      $(sel).onchange = (e) => {
        const f = e.target.files && e.target.files[0];
        e.target.value = '';           /* כדי שבחירה חוזרת של אותו קובץ תעבוד */
        handleImage(f);
      };
    });

    /* צ'אט */
    $('#chatSend').onclick = () => sendChat();
    const input = $('#chatInput');
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(110, input.scrollHeight) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
    $('#chatClear').onclick = () => {
      if (!Store.data.chat.length) return;
      if (confirm('לנקות את השיחה?')) { Store.clearChat(); UI.renderChat(); }
    };

    /* sheets */
    $('#sheetBackdrop').onclick = UI.closeSheets;
    $('#promptCancel').onclick  = UI.closeSheets;

    /* חזרה למסך — יום חדש? רענן */
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Store.data.profile) UI.render(UI.current);
    });
  }

  /* ה-service worker שומר את כל קבצי האפליקציה בטלפון, כדי שהיא
     תיפתח גם בלי אינטרנט ובלי המחשב ששירת אותה בפעם הראשונה.
     דורש https או localhost — מ-file:// הדפדפן פשוט יתעלם. */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* לא קריטי — האפליקציה עובדת גם בלעדיו, רק לא במצב לא מקוון */
    });
  }

  function init() {
    Store.load();
    bind();
    registerSW();
    if (Store.data.profile) enterApp();
    else startOnboarding(false);
  }

  return {
    init, startOnboarding, sendChat, editField, testKey, wipe,
    generateWorkout:  () => generatePlan('workout'),
    generateMealPlan: () => generatePlan('meal')
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
