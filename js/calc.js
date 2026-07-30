/* ===== calc.js — חישובי קלוריות ומאקרו ===== */
const Calc = (() => {

  /* קצב חילוף חומרים במנוחה.
     לילדים ובני נוער משתמשים במשוואת Schofield, שמכוילת לגילאים האלה.
     למבוגרים (18+) — Mifflin-St Jeor. */
  function bmr(p) {
    const kg = +p.weight, cm = +p.height, age = +p.age;
    const male = p.sex === 'male';

    if (age < 18) {
      if (age < 10) return male ? 22.7 * kg + 495 : 22.5 * kg + 499;
      return male ? 17.5 * kg + 651 : 12.2 * kg + 746;
    }
    if (age <= 30) return male ? 15.3 * kg + 679 : 14.7 * kg + 496;
    return 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161);
  }

  function tdee(p) {
    return bmr(p) * (+p.activity || 1.375);
  }

  /* יעד קלורי יומי.
     חשוב: אצל ילדים ובני נוער אסור לרדת מתחת ל-BMR — הגוף עוד גדל.
     לכן יש רצפה קשיחה. */
  function target(p) {
    const t = tdee(p);
    const b = bmr(p);
    let cal;
    if (p.goal === 'lose')      cal = t * 0.85;
    else if (p.goal === 'gain') cal = t * 1.12;
    else                        cal = t;

    const floor = (+p.age < 18) ? b * 1.15 : b;
    return Math.round(Math.max(cal, floor) / 10) * 10;
  }

  function macros(p) {
    const cal = target(p);
    const kg = +p.weight;
    const perKg = p.goal === 'maintain' ? 1.4 : 1.8;
    const protein = Math.round(kg * perKg);
    const fat = Math.round(cal * 0.27 / 9);
    const carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
    return { calories: cal, protein, carbs, fat };
  }

  function waterGoal(p) {
    const cups = Math.round((+p.weight * 35) / 250);
    return Math.max(6, Math.min(12, cups));
  }

  function bmi(p) {
    const m = +p.height / 100;
    if (!m) return 0;
    return +( +p.weight / (m * m) ).toFixed(1);
  }

  /* קטגוריית BMI תקפה רק ל-18+. אצל ילדים צריך אחוזוני גדילה
     לפי גיל ומין — לא נציג קטגוריה כדי לא להטעות. */
  function bmiLabel(p) {
    if (+p.age < 18) return null;
    const v = bmi(p);
    if (v < 18.5) return 'מתחת למשקל';
    if (v < 25)   return 'משקל תקין';
    if (v < 30)   return 'עודף משקל';
    return 'השמנה';
  }

  const goalText = { lose: 'ירידה במשקל', maintain: 'שמירה על המשקל', gain: 'עלייה במסת שריר' };
  const placeText = { home: 'בבית', gym: 'חדר כושר', outdoor: 'בחוץ' };
  const activityText = {
    '1.2': 'כמעט לא זז', '1.375': 'פעילות קלה', '1.55': 'פעילות בינונית',
    '1.725': 'פעילות גבוהה', '1.9': 'ספורטאי'
  };

  return { bmr, tdee, target, macros, waterGoal, bmi, bmiLabel, goalText, placeText, activityText };
})();
