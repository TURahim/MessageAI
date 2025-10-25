Simplify Conflict Resolution Card (V1.1)

Goal
Make the conflict card lean, readable, and tappable. Remove wall-of-text, reduce repetition, and emphasize quick resolution with 1–3 clear alternatives. Keep it consistent with our assistant card style.

Problems with current UI

Too much repeated copy (“conflict detected…” shown twice; long paragraphs).

Heavy color block + multiple emojis → visual noise.

Alternatives are dense list rows; high cognitive load.

Timezone note + counts + titles compete with the primary action.

Desired UX (high level)

Single concise header with icon + title.

One-sentence context (overlaps with another session). No repeated paragraphs.

Compact alternatives presented as chips or slim cards (max 3), each with start–end time and a tiny subline reason.

Secondary actions: “See more times” (opens picker), “Keep current time”.

Subtle timezone hint at the bottom, not in the body copy.

No duplication of text inside the bordered panel and the parent message; pick one surface.

Content & hierarchy (copy not final)

Header: ⚠️ Conflict detected

Body (one sentence): This overlaps with another session. Pick a new time below.

Alternatives (3 max):

Wed • 5:00–6:00 PM
Same time tomorrow

Thu • 10:00–11:00 AM
Morning focus slot

Fri • 2:00–3:00 PM
Avoids back-to-back

Actions:

Primary: See more times (ghost button, right aligned)

Secondary: Keep current (link)

Footnote (muted): Times shown in America/Toronto

Visual guidelines (don’t hardcode; use design tokens)

Container: Use the standard AI assistant card pattern (same radius, padding, shadow). No nested orange panel.

Iconography: One icon only (warning).

Typography:

Header: same style as assistant card title (semibold).

Body: two short lines max.

Chips/slim cards: strong time line + muted reason line.

Color:

Neutral background (assistant card color).

Warning icon/tint minimal (no full warning background).

Density:

Aim for ~3 visible items without scrolling on a small phone.

Keep vertical rhythm tight; avoid large gaps.

Interaction & states

Loading: Render shell immediately (header + 3 placeholder chips with shimmer).

Filled: Hydrate chips with times and reason.

Empty: If no valid alternatives, show: No good matches right now. → Button: See more times.

Error: Couldn’t load alternatives. → Retry.

Tap behavior:

On chip tap → optimistic update to new time, disable other chips, swap to success state: Rescheduled to Wed 5:00–6:00 PM with ✅.

Post a single confirmation message to the chat.

Undo: Show a 5–10s toast/snack: Rescheduled. Undo (one tap).

A11y: Large tap targets; VoiceOver labels like “Select Wednesday five to six PM — same time tomorrow”.

System considerations (not implementation details)

Idempotency: Ignore double taps; ensure only one reschedule/write.

No duplication: Don’t echo the same paragraph above and inside the card.

Privacy: Never reveal other participant names in multi-chat conflicts; use “another session”.

Telemetry: Log conflict_card_shown, alt_loaded, alt_selected, see_more_times_clicked, keep_current_clicked, undo_reschedule. Include latency to selection.

Acceptance criteria

 Card is reduced to one header, one short line, and ≤3 compact alternatives.

 Visual style matches assistant cards; no large warning panels; single icon.

 Tapping an alternative reschedules once, disables others, and shows success within the same card.

 “See more times” opens the broader picker; “Keep current” exits cleanly.

 Timezone note is subtle and placed at the bottom.

 All states (loading/filled/empty/error) are supported without layout jumpiness.