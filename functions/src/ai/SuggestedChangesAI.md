Refactor prompt — RSVP Interpreter hardening

Goal
Make interpretRSVP faster, cheaper, and safer by adding strong local rules, robust ambiguity detection, prompt context, confidence clamping, and a timeout—without changing public exports.

Scope
Edit rsvpInterpreter.ts (or the file containing interpretRSVP) and promptTemplates.ts only if needed. Preserve current exports and logging style (emoji prefixes).

Changes Required

Robust ambiguity detection (regex)

Replace the string-based AMBIGUITY_KEYWORDS + .includes() with word-boundary regexes (case-insensitive, NFKC-normalized).

Include conditional blockers like “yes, but…”, “sounds good, but…”, “however”, “on second thought”.

Provide one normalize helper:

const NORMALIZE = (s: string) =>
  s.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();


Use an AMBIGUITY_REGEXES: RegExp[] and a helper:
function hasAmbiguity(textN: string): boolean { return AMBIGUITY_REGEXES.some(rx => rx.test(textN)); }

Strong-rule fast path (skip LLM when obvious)

Add deterministic accept/decline regex sets and a helper:

const ACCEPT_REGEXES = [ /\by(es|up)\b/, /\bsure\b/, /\bsounds\s+good\b/, /\bworks\s+for\s+me\b/, /\bthat\s+works\b/, /\bi'?ll\s+be\s+there\b/, /\bcount\s+me\s+in\b/ ];
const DECLINE_REGEXES = [ /\bno(pe)?\b/, /\b(can('| )?t|cannot)\s+(make|do|come|attend)\b/, /\bsorry[, ]+\s*i('?m)?\s+(busy|booked|not\s+available)\b/, /\bwon'?t\s+be\s+able\s+to\b/ ];
function quickClassify(textN: string): RSVPResponse | null {
  if (ACCEPT_REGEXES.some(r => r.test(textN))) return 'accept';
  if (DECLINE_REGEXES.some(r => r.test(textN))) return 'decline';
  return null;
}


In interpretRSVP, normalize once, run hasAmbiguity(textN) and quickClassify(textN).
If quickClassify returns a label and not ambiguous, return immediately with confidence: 0.9, shouldAutoRecord policy (see §5).

Use event context in the prompt

If eventContext is provided, append a one-line context to the prompt:

const ctx = eventContext
  ? `\nEvent: ${eventContext.eventTitle ?? 'Untitled'} (ID ${eventContext.eventId.slice(0,8)})`
  : '';
const prompt = `${RSVP_INTERPRETATION_PROMPT}${ctx}\n\n"${text}"`;


Keep the base RSVP_INTERPRETATION_PROMPT unchanged otherwise.

Confidence clamping + timeout/retry

Add helpers:

const clamp01 = (n: number) => Math.max(0, Math.min(1, n ?? 0));


Wrap the model call with an AbortController timeout of 3s. On timeout or transient error (429/5xx), do one retry; otherwise return fallback unclear.

async function callModel(prompt: string) { /* openai('gpt-3.5-turbo'), schema, temperature:0.3, maxTokens:50, signal */ }


After the call, clamp the confidence to [0,1]. If hasAmbiguity, cap at <= 0.6 and log the adjustment.

Safer auto-record policy

Keep the baseline: auto-record when confidence >= 0.7, and !hasAmbiguity, and response != 'unclear'.

Add a min length guard to avoid auto-recording single-word ambiguous replies:

const MIN_LEN_FOR_AUTO = 3;
const shouldAutoRecord =
  adjustedConfidence >= 0.7 &&
  !hasAmbiguity &&
  parsed.response !== 'unclear' &&
  text.trim().length >= MIN_LEN_FOR_AUTO;


Apply the same logic to fast-path decisions.

Unify exported ambiguity helper

Update the exported hasAmbiguityWords(text: string) to reuse the regex-based logic to avoid divergence with the main function.

Logging

Keep emoji prefixes and current patterns.

On fast-path classification, log "⚡ RSVP quick-classified" with { response, confidence, hasAmbiguity, shouldAutoRecord }.

On LLM timeout/retry, log "⏱️ RSVP LLM timeout; retrying once" and final outcome log.

Acceptance Criteria

TypeScript compiles with no new errors; no changes to public exports (interpretRSVP, hasAmbiguityWords, types).

For inputs:

"Yes that works" → fast-path accept, confidence≈0.9, shouldAutoRecord:true.

"Sorry, I'm busy" → fast-path decline, confidence≈0.9, shouldAutoRecord:true.

"Maybe, let me check" → ambiguous, LLM may classify but confidence capped ≤0.6; shouldAutoRecord:false.

"Sounds good, but I might need to move it" → detected conditional blocker; hasAmbiguity:true; shouldAutoRecord:false.

"Ok" (short) → likely LLM 'unclear' or low confidence; shouldAutoRecord:false.

Event context provided (e.g., "Yes that works" with eventTitle:"Math, Fri 5pm") → prompt includes context; still accept.

LLM call times out after ~3s with one retry; on persistent failure returns 'unclear' safely.

Style/Constraints

Do not log full message text; keep substrings as already implemented.

Keep model temperature: 0.3, maxTokens: 50.

Prefer minimal code churn; factor helpers at top of module.