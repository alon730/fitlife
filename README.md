# FitLife

A personal health & fitness web app in Hebrew, built to be installed to the
home screen on iOS and Android.

- Onboarding collects height, weight, age, activity level and goal
- Calorie and macro targets are computed on-device
- Daily log for food, water and weight, with a progress chart
- AI coach, workout plan, meal plan and meal-photo calorie estimation,
  powered by the Claude API

## Privacy

All personal data (profile, food log, weight history, chat) is stored in the
browser's `localStorage` on the device and is never uploaded anywhere.

The Claude API key is entered by the user in Settings and is kept on the device
only. It is **not** part of this repository and is not bundled into the app.

## Running it

Serve this folder over HTTPS and open it in a mobile browser, then use
"Add to Home Screen". A service worker caches the app so it works offline
after the first load.

## Safety notes for under-18 users

The app detects when the user is a minor and adapts:

- BMR uses the Schofield equation (calibrated for children and teens) rather
  than Mifflin–St Jeor
- The daily calorie target is floored at 115% of BMR, even when cutting
- No BMI category is shown, since that requires age- and sex-specific growth
  charts
- The AI coach is instructed not to recommend supplements, extreme diets,
  fasting, or training to failure, and to redirect body-image concerns to a
  parent or doctor
