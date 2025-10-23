# Evaluation Suite for AI Gating Classifier

**Purpose:** Measure accuracy and latency of message classification to prevent regressions

---

## Quick Start

```bash
# Install dependencies
cd functions
npm install

# Set API keys (required)
export OPENAI_API_KEY=sk-proj-xxx
# OR
export ANTHROPIC_API_KEY=sk-ant-xxx

# Run evaluation
cd ../monitoring/eval-suite
ts-node eval-runner.ts
```

---

## Test Data

**File:** `test-conversations.json`

**Categories:**
- **schedule** (10 tests) - Time/date mentions
- **rsvp** (10 tests) - Invitation responses
- **task** (10 tests) - Homework/deadline mentions
- **urgent** (4 tests) - Urgent messages
- **normal** (8 tests) - Regular chat (should be gated out)

**Total:** 42 test cases

---

## Metrics

### Accuracy
- **Target:** >85%
- **Measurement:** (Passed tests) / (Total tests)
- **Includes:** Task type match + confidence threshold

### Latency
- **Target:** P95 <500ms
- **Measurement:** Processing time from gating service
- **Percentiles:** P50, P95, P99

### Urgency Precision
- **Target:** ≥90%
- **Measurement:** (Correct urgency flags) / (Total urgency tests)
- **Purpose:** Minimize false positives (urgency is high-stakes)

---

## CI Integration

**Workflow:** `.github/workflows/eval.yml`

**Runs On:**
- Every PR to `main`
- Manual trigger

**Gates:**
1. Accuracy must be >85%
2. P95 latency must be <500ms
3. Urgency precision must be ≥90%

**Fail Behavior:**
- If any gate fails → CI fails
- Blocks merge until fixed

---

## Adding New Test Cases

1. Edit `test-conversations.json`
2. Add to appropriate category
3. Set `confidence_min` (minimum acceptable confidence)
4. Run eval locally to verify
5. Commit if passed

**Example:**
```json
{
  "input": "Can we meet next Friday?",
  "expected": {
    "task": "scheduling",
    "confidence_min": 0.75
  }
}
```

---

## Interpreting Results

### Green (✅ Passing)
```
Total Tests: 42
Passed: 37 (88.1%)
P95: 420ms
Accuracy: >85% ✅
Urgency Precision: 100% ✅
```
**Action:** Safe to deploy

### Red (❌ Failing)
```
Total Tests: 42
Passed: 34 (81.0%)
P95: 620ms
Accuracy: <85% ❌
P95 latency: >500ms ❌
```
**Actions:**
- Review false positives/negatives
- Tune prompt or model
- Add more examples to prompt
- Consider model upgrade

---

## Weekly Reviews

Run evaluation weekly to track:
- Drift in accuracy over time
- New failure patterns
- Cost trends (from BigQuery)

**Command:**
```bash
npm run eval > weekly-report-$(date +%Y-%m-%d).txt
```

Review false positives for urgency classification (high-stakes).

---

## Debugging Failed Tests

When a test fails:

1. **Check output:**
   ```
   ❌ [scheduling] "Can we meet next Friday?..."
      Expected: scheduling (conf≥0.75)
      Got: null (conf=0.55), Latency: 380ms
   ```

2. **Analyze:**
   - Was confidence just below threshold? → Tune threshold or improve prompt
   - Wrong task type? → Add similar examples to prompt
   - High latency? → Check model selection or API issues

3. **Fix:**
   - Update prompt template
   - Add to training examples
   - Adjust confidence threshold if justified

4. **Re-run:**
   ```bash
   npm run eval
   ```

---

## Cost Tracking

Eval suite logs cost per test case.

**Sample Output:**
```
Total cost: $0.042 (42 tests × ~$0.001 each)
```

**Budget:** <$0.10 per run (affordable for CI)

---

## Future Enhancements

- [ ] Add semantic similarity scoring (not just task match)
- [ ] Track model performance over time
- [ ] A/B test different prompts
- [ ] Add adversarial test cases
- [ ] Generate synthetic tests with LLM

---

**Last Updated:** October 23, 2025  
**Maintainer:** Development Team  
**CI Status:** Will be added in `.github/workflows/eval.yml`

