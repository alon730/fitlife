/* ===== store.js — כל הנתונים נשמרים בטלפון בלבד ===== */
const Store = (() => {
  const KEY = 'fitlife.v1';

  const blank = () => ({
    profile: null,          // {name, age, sex, height, weight, activity, goal, place, days, notes}
    apiKey: '',
    days: {},               // 'YYYY-MM-DD' -> {food:[], water:0, burned:0}
    weights: [],            // [{date, kg}]
    workoutPlan: null,      // {generatedAt, days:[...]}
    mealPlan: null,         // {generatedAt, meals:[...]}
    chat: [],               // [{role, text}]
    createdAt: Date.now()
  });

  let data = blank();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = Object.assign(blank(), JSON.parse(raw));
    } catch (e) {
      console.warn('load failed, starting fresh', e);
      data = blank();
    }
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn('save failed', e); }
  }

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function day(key) {
    key = key || todayKey();
    if (!data.days[key]) data.days[key] = { food: [], water: 0, burned: 0 };
    return data.days[key];
  }

  /* --- food log --- */
  function addFood(entry) {
    const d = day();
    d.food.push(Object.assign({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      time: new Date().toISOString(),
      emoji: '🍽️', name: 'ארוחה',
      calories: 0, protein: 0, carbs: 0, fat: 0
    }, entry));
    save();
  }

  function removeFood(id) {
    const d = day();
    d.food = d.food.filter(f => f.id !== id);
    save();
  }

  function totals(key) {
    const d = day(key);
    return d.food.reduce((t, f) => ({
      calories: t.calories + (+f.calories || 0),
      protein:  t.protein  + (+f.protein  || 0),
      carbs:    t.carbs    + (+f.carbs    || 0),
      fat:      t.fat      + (+f.fat      || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  /* --- water --- */
  function addWater(n) {
    const d = day();
    d.water = Math.max(0, Math.min(20, d.water + n));
    save();
    return d.water;
  }

  /* --- weight --- */
  function addWeight(kg) {
    const date = todayKey();
    const existing = data.weights.find(w => w.date === date);
    if (existing) existing.kg = kg;
    else data.weights.push({ date, kg });
    data.weights.sort((a, b) => a.date.localeCompare(b.date));
    if (data.profile) data.profile.weight = kg;
    save();
  }

  /* --- chat --- */
  function pushChat(role, text) {
    data.chat.push({ role, text });
    if (data.chat.length > 60) data.chat = data.chat.slice(-60);
    save();
  }
  function clearChat() { data.chat = []; save(); }

  function reset() { data = blank(); localStorage.removeItem(KEY); }

  return {
    get data() { return data; },
    load, save, todayKey, day,
    addFood, removeFood, totals,
    addWater, addWeight,
    pushChat, clearChat, reset
  };
})();
