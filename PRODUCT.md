# SafeSphere — Product

## What it is
A personal-safety app for everyone in Mumbai, Navi Mumbai, Delhi and Pune. It predicts risk before something happens (risk map, safest route), detects emergencies on its own (fall, phone snatch, scream, a cab leaving its route), and gets help fast (SMS and a call from the user's own phone, live location link, nearby guardians, an admin dashboard).

## Who uses it
- **People travelling alone**, often at night: walking home from a station, taking a cab booked in another app. One hand, partial attention, sometimes stressed.
- **Their trusted contacts**, who receive SMS with a live location link — they may not have the app.
- **Guardians**: verified volunteers who get a push for an SOS within 5 km.
- **Admins / moderators** (police desk, NGO, college safety cell) watching the web dashboard.

## What must be true
- SOS works without internet (SMS from the device) and without Groq or the ML service.
- AI triggers never fire an SOS without a 10-second "Are you OK?" chance to cancel.
- Nothing is invented: no guessed destinations, drivers or plates; missing details are asked for.
- Risk scores always show their reasons.
- Audio stays on the phone unless an SOS is active.
- Zero running cost: no card-gated services.

## Brand commitments
- Light, calm, clean — closest to Apple Health / iOS. The app stays quiet until something is wrong; red is reserved for SOS and danger.
- Plain, direct copy. Second person, short sentences, no fear-mongering.

## Platform
Android 7.0+ (Expo SDK 57 dev build / APK). Web admin dashboard.
