import { z } from 'genkit';
import { EvalStatusEnum } from 'genkit/evaluator';
import { ai } from '../../genkit.config.js';

type EvalInput = {
  goal: string;
  eventId: string;
  agentSummary: string;
  toolCallCount: number;
  finishReason: string;
};

function scoreCoordinatorRun(input: EvalInput) {
  const { goal, agentSummary, toolCallCount, finishReason } = input;

  let score = 0.2;
  const notes: string[] = [];

  if (agentSummary.length >= 80) {
    score += 0.25;
    notes.push('Summary length adequate');
  } else {
    notes.push('Summary too short');
  }

  if (toolCallCount >= 2) {
    score += 0.25;
    notes.push('Multi-step tool usage');
  } else {
    notes.push('Expected at least roster + match tools');
  }

  if (/roster|shift|match|volunteer/i.test(agentSummary)) {
    score += 0.2;
    notes.push('Domain-relevant summary');
  }

  if (finishReason === 'stop' || finishReason === 'length') {
    score += 0.1;
  }

  if (/error|failed/i.test(agentSummary)) {
    score = Math.min(score, 0.3);
    notes.push('Failure language detected');
  }

  if (!goal || goal.length < 10) {
    score = Math.min(score, 0.2);
    notes.push('Invalid goal in eval input');
  }

  const normalized = Math.min(1, Math.max(0, score));
  const passed = normalized >= 0.6;

  return {
    score: normalized,
    passed,
    notes: notes.join('; '),
    status: passed ? EvalStatusEnum.PASS : EvalStatusEnum.FAIL,
  };
}

/** Lightweight evaluator for coordinator run quality (Genkit Dev UI + logging). */
export const volunteerCoordinatorQualityEval = ai.defineEvaluator(
  {
    name: 'volunteerCoordinatorQuality',
    displayName: 'Volunteer Coordinator Quality',
    definition:
      'Scores whether the agent produced an actionable coordinator summary with tool usage appropriate to the goal.',
  },
  async (dataPoint) => {
    const input = dataPoint.input as EvalInput;
    const result = scoreCoordinatorRun(input);

    return {
      testCaseId: dataPoint.testCaseId,
      evaluation: {
        score: result.score,
        status: result.status,
        details: { reasoning: result.notes },
      },
    };
  },
);

export function evaluateCoordinatorRun(params: EvalInput) {
  return scoreCoordinatorRun(params);
}
