# Lesson Visuals MVP

EnglishGate now supports one shared contextual **Lesson Visual** per lesson.

## Prototype workflow
1. Teacher opens **Classes**.
2. Teacher selects **Add lesson visual** or **Edit lesson visual**.
3. Teacher uploads an image or pastes an image URL.
4. EnglishGate requires alt text and allows a short "Before you begin" prompt.
5. Uploaded images are center-cropped and compressed to 1280×720 (16:9).
6. The saved visual is displayed in the student Listening activity from the same source.

The renderer is exposed as `window.EnglishGateLessonVisuals.render(lesson)` so the same component can be used when Reading activities are added.

## Production data
The production `lessons` schema includes a `visual jsonb` field. Recommended shape:

```json
{
  "src": "storage-or-cdn-url",
  "alt": "Two professionals introducing themselves in an office.",
  "caption": "What information do people usually share when they meet professionally?",
  "sourceType": "upload",
  "updatedAt": "2026-09-07T00:00:00Z"
}
```

For production, store uploaded files in object storage/CDN and save only the resulting URL in `visual.src`. The localStorage data URL behavior is prototype-only.
