# 09 — Accessibility Guidance

Target: WCAG 2.2 AA where feasible for the browser/PWA experience.

## 1. Touch and interaction
- Minimum touch target: approximately 44×44 CSS px.
- Provide adequate spacing between adjacent actions.
- Do not require precision gestures.
- All key functions must be operable without camera input via manual entry.

## 2. Color and contrast
- Body text contrast at least 4.5:1 for normal text.
- Large text at least 3:1.
- Do not communicate status by color alone.
- Pair colors with text/icons such as Verified, Warning, Error, Offline.

## 3. Text sizing
Recommended mobile baseline:
- page title: 24–28 px
- section title: 18–20 px
- body: 16 px
- secondary text: 14 px
- avoid essential text below 12 px

## 4. Screen reader support
- Proper landmark regions.
- Labels bound to every form field.
- Announce scan success/failure with accessible live regions.
- Icon-only controls require accessible names.
- Camera viewport must have a meaningful label/state.

## 5. Keyboard support
Desktop and tablet keyboard users must be able to:
- navigate all controls,
- activate scan/manual entry,
- use dialogs,
- access results and exceptions,
- see a visible focus indicator.

## 6. Motion
- Respect `prefers-reduced-motion`.
- Avoid non-essential animation in the camera view.
- Do not flash rapidly.

## 7. Error handling
- Put error text near the affected control.
- Explain how to recover.
- Preserve user-entered values after validation failure.
