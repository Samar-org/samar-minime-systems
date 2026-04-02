import {
  WorkflowDefinition,
  WorkflowStep,
  RetryPolicy,
  WorkflowDefinitionSchema,
} from './types';

export class WorkflowBuilder {
  private name: string;
  private pipelineType: string;
  private steps: Map<string, WorkflowStep> = new Map();
  private dependencies: Map<string, Set<string>> = new Map(); // stepId -> dependsOn set
  private budgetUsd: number = 100;
  private defaultRetryPolicy?: RetryPolicy;

  private constructor(name: string, pipelineType: string) {
    this.name = name;
    this.pipelineType = pipelineType;
  }

  static create(name: string, pipelineType: string): WorkflowBuilder {
    return new WorkflowBuilder(name, pipelineType);
  }

  addStep(step: WorkflowStep): WorkflowBuilder {
    if (this.steps.has(step.id)) {
      throw new Error(`Step with id '${step.id}' already exists`);
    }

    this.steps.set(step.id, step);
    this.dependencies.set(step.id, new Set(step.dependsOn || []));

    return this;
  }

  addDependency(stepId: string, dependsOnId: string): WorkflowBuilder {
    if (!this.steps.has(stepId)) {
      throw new Error(`Step '${stepId}' does not exist`);
    }
    if (!this.steps.has(dependsOnId)) {
      throw new Error(`Dependency step '${dependsOnId}' does not exist`);
    }

    const deps = this.dependencies.get(stepId);
    if (deps) {
      deps.add(dependsOnId);
    }

    const step = this.steps.get(stepId);
    if (step) {
      step.dependsOn = Array.from(deps || new Set());
    }

    return this;
  }

  withBudget(budgetUsd: number): WorkflowBuilder {
    this.budgetUsd = budgetUsd;
    return this;
  }

  withRetryPolicy(policy: RetryPolicy): WorkflowBuilder {
    this.defaultRetryPolicy = policy;
    return this;
  }

  build(): WorkflowDefinition {
    // Validate
    this.validateSteps();

    // Allocate budget per step if not specified
    const stepCount = this.steps.size;
    const budgetPerStep = this.budgetUsd / Math.max(stepCount, 1);

    const steps: WorkflowStep[] = [];
    for (const step of this.steps.values()) {
      if (step.budgetUsd === 5 && stepCount > 1) {
        step.budgetUsd = budgetPerStep;
      }
      if (!step.retryPolicy && this.defaultRetryPolicy) {
        step.retryPolicy = this.defaultRetryPolicy;
      }
      steps.push(step);
    }

    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const definition: WorkflowDefinition = {
      id: workflowId,
      name: this.name,
      pipelineType: this.pipelineType,
      steps,
    };

    // Validate schema
    WorkflowDefinitionSchema.parse(definition);

    return definition;
  }

  toTaskList(projectId: string): any[] {
    const definition = this.build();

    // Convert workflow definition to task array format expected by Temporal
    return definition.steps.map(step => ({
      id: step.id,
      name: step.name,
      projectId,
      agentTier: step.tier,
      status: 'PENDING',
      budgetLimitUsd: step.budgetUsd,
      maxRetries: step.retryPolicy?.maxAttempts || 3,
      input: {
        agentId: step.agentId,
      },
      dependsOn: step.dependsOn || [],
    }));
  }

  private validateSteps(): void {
    if (this.steps.size === 0) {
      throw new Error('Workflow must have at least one step');
    }

    // Check for circular dependencies
    for (const [stepId, deps] of this.dependencies.entries()) {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      this.detectCycle(stepId, visited, recursionStack);
    }

    // Check that all dependencies exist
    for (const [stepId, deps] of this.dependencies.entries()) {
      for (const depId of deps) {
        if (!this.steps.has(depId)) {
          throw new Error(`Step '${stepId}' depends on non-existent step '${depId}'`);
        }
      }
    }

    // Check budget allocation
    const totalBudget = Array.from(this.steps.values()).reduce(
      (sum, step) => sum + step.budgetUsd,
      0
    );
    if (totalBudget > this.budgetUsd * 1.1) {
      // Allow 10% overage
      throw new Error(
        `Total step budget (${totalBudget}) exceeds workflow budget (${this.budgetUsd})`
      );
    }
  }

  private detectCycle(
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): void {
    if (recursionStack.has(node)) {
      throw new Error(`Circular dependency detected involving step '${node}'`);
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    recursionStack.add(node);

    const deps = this.dependencies.get(node) || new Set();
    for (const dep of deps) {
      this.detectCycle(dep, visited, recursionStack);
    }

    recursionStack.delete(node);
  }
}
