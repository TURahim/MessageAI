/**
 * Evaluation Harness for AI Gating Classifier
 * 
 * Measures accuracy and latency of message classification
 * Runs in CI to catch regressions
 * 
 * Usage:
 *   ts-node eval-runner.ts
 *   npm run eval (add to package.json)
 * 
 * Thresholds (CI gates):
 * - Accuracy: >85%
 * - P95 latency: <500ms
 * - Precision (urgency): ≥90%
 */

import * as fs from 'fs';
import * as path from 'path';
import { gateMessage } from '../../functions/lib/ai/aiGatingService.js';
import type { GatingResult } from '../../functions/lib/ai/aiGatingService.js';

interface TestCase {
  input: string;
  expected: {
    task: string | null;
    confidence_min: number;
    note?: string;
  };
}

interface TestConversations {
  schedule: TestCase[];
  rsvp: TestCase[];
  task: TestCase[];
  urgent: TestCase[];
  normal: TestCase[];
}

interface EvalResults {
  totalTests: number;
  passed: number;
  failed: number;
  accuracy: number;
  latencies: number[];
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  falsePositives: TestCase[];
  falseNegatives: TestCase[];
  urgencyPrecision: number;
}

/**
 * Calculates percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Loads test conversations from JSON file
 */
function loadTestConversations(): TestConversations {
  const filePath = path.join(__dirname, 'test-conversations.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Runs evaluation suite
 */
export async function runEvaluation(): Promise<EvalResults> {
  console.log('🚀 Starting evaluation...\n');

  const testData = loadTestConversations();
  const allTests: Array<{ category: string; test: TestCase }> = [];

  // Flatten all tests
  for (const [category, tests] of Object.entries(testData)) {
    tests.forEach((test: TestCase) => {
      allTests.push({ category, test });
    });
  }

  let passed = 0;
  let failed = 0;
  const latencies: number[] = [];
  const falsePositives: TestCase[] = [];
  const falseNegatives: TestCase[] = [];
  let urgencyCorrect = 0;
  let urgencyTotal = 0;

  console.log(`📊 Running ${allTests.length} test cases...\n`);

  for (const { category, test } of allTests) {
    try {
      // Call gating service
      const result: GatingResult = await gateMessage(test.input);

      // Record latency
      latencies.push(result.processingTime);

      // Check if task type matches
      const taskMatches = result.task === test.expected.task;
      
      // Check if confidence meets minimum
      const confidenceMeets = result.confidence >= test.expected.confidence_min;

      const testPassed = taskMatches && confidenceMeets;

      if (testPassed) {
        passed++;
        console.log(`✅ [${category}] "${test.input.substring(0, 50)}..."`);
        console.log(`   Task: ${result.task}, Confidence: ${result.confidence.toFixed(2)}, Latency: ${result.processingTime}ms\n`);
      } else {
        failed++;
        console.log(`❌ [${category}] "${test.input.substring(0, 50)}..."`);
        console.log(`   Expected: ${test.expected.task} (conf≥${test.expected.confidence_min})`);
        console.log(`   Got: ${result.task} (conf=${result.confidence.toFixed(2)}), Latency: ${result.processingTime}ms\n`);

        // Track false positives/negatives
        if (!taskMatches) {
          if (result.task !== null && test.expected.task === null) {
            falsePositives.push(test);
          } else if (result.task === null && test.expected.task !== null) {
            falseNegatives.push(test);
          }
        }
      }

      // Track urgency precision separately
      if (category === 'urgent') {
        urgencyTotal++;
        if (result.task === 'urgent' && result.confidence >= 0.6) {
          urgencyCorrect++;
        }
      }
    } catch (error: any) {
      failed++;
      console.log(`💥 [${category}] ERROR: ${test.input.substring(0, 50)}...`);
      console.log(`   ${error.message}\n`);
    }
  }

  // Calculate metrics
  const accuracy = passed / allTests.length;
  const p50Latency = percentile(latencies, 50);
  const p95Latency = percentile(latencies, 95);
  const p99Latency = percentile(latencies, 99);
  const urgencyPrecision = urgencyTotal > 0 ? urgencyCorrect / urgencyTotal : 1.0;

  const results: EvalResults = {
    totalTests: allTests.length,
    passed,
    failed,
    accuracy,
    latencies,
    p50Latency,
    p95Latency,
    p99Latency,
    falsePositives,
    falseNegatives,
    urgencyPrecision,
  };

  return results;
}

/**
 * Prints evaluation results
 */
function printResults(results: EvalResults): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EVALUATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passed} (${(results.accuracy * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed}`);
  console.log();
  console.log('Latency:');
  console.log(`  P50: ${results.p50Latency.toFixed(0)}ms`);
  console.log(`  P95: ${results.p95Latency.toFixed(0)}ms`);
  console.log(`  P99: ${results.p99Latency.toFixed(0)}ms`);
  console.log();
  console.log('Quality:');
  console.log(`  Accuracy: ${(results.accuracy * 100).toFixed(1)}% (threshold: >85%)`);
  console.log(`  Urgency Precision: ${(results.urgencyPrecision * 100).toFixed(1)}% (threshold: ≥90%)`);
  console.log(`  False Positives: ${results.falsePositives.length}`);
  console.log(`  False Negatives: ${results.falseNegatives.length}`);
  console.log('='.repeat(60));

  // Print false positives
  if (results.falsePositives.length > 0) {
    console.log('\n⚠️  FALSE POSITIVES (flagged as needing AI when not needed):');
    results.falsePositives.forEach(fp => {
      console.log(`   "${fp.input}"`);
    });
  }

  // Print false negatives
  if (results.falseNegatives.length > 0) {
    console.log('\n⚠️  FALSE NEGATIVES (missed by classifier):');
    results.falseNegatives.forEach(fn => {
      console.log(`   "${fn.input}"`);
    });
  }

  console.log();
}

/**
 * Checks if results meet CI thresholds
 */
function checkThresholds(results: EvalResults): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  if (results.accuracy < 0.85) {
    failures.push(`Accuracy ${(results.accuracy * 100).toFixed(1)}% < 85%`);
  }

  if (results.p95Latency > 500) {
    failures.push(`P95 latency ${results.p95Latency.toFixed(0)}ms > 500ms`);
  }

  if (results.urgencyPrecision < 0.90) {
    failures.push(`Urgency precision ${(results.urgencyPrecision * 100).toFixed(1)}% < 90%`);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Main entry point
 */
async function main() {
  try {
    const results = await runEvaluation();
    printResults(results);

    const thresholds = checkThresholds(results);

    if (thresholds.passed) {
      console.log('✅ All thresholds met! Safe to deploy.\n');
      process.exit(0);
    } else {
      console.log('❌ FAILED - Thresholds not met:\n');
      thresholds.failures.forEach(f => console.log(`   - ${f}`));
      console.log('\nFix issues before deploying.\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('💥 Evaluation failed:', error.message);
    process.exit(1);
  }
}

export { checkThresholds };

// Run if called directly
if (require.main === module) {
  main();
}

