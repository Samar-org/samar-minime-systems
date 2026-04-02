import { getLogger } from '@samar/observability';
import { TaskRunResult, WorkflowRunResult } from './types';

const logger = getLogger('evaluator');

export class TaskEvaluator {
  evaluate(result: TaskRunResult): { passed: boolean; score: number; feedback: string } {
    logger.debug('Evaluating task result', { taskId: result.taskId });

    if (result.error) {
      return {
        passed: false,
        score: 0,
        feedback: `Task failed: ${result.error}`,
      };
    }

    return {
      passed: true,
      score: 1,
      feedback: 'Task completed successfully',
    };
  }
}

export class WorkflowEvaluator {
  private taskEvaluator = new TaskEvaluator();

  evaluate(result: WorkflowRunResult): { passed: boolean; score: number; feedback: string } {
    logger.debug('Evaluating workflow result', { workflowId: result.workflowId });

    const taskResults = result.taskResults.map((tr) => this.taskEvaluator.evaluate(tr));
    const passedCount = taskResults.filter((r) => r.passed).length;
    const score = passedCount / taskResults.length;

    return {
      passed: score >= 0.8,
      score,
      feedback: `Workflow completed with ${passedCount}/${taskResults.length} tasks passed`,
    };
  }
}
