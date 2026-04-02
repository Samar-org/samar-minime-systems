import {
  ProjectPhase,
  ProjectConfig,
  PhaseGate,
  ProjectDashboard,
  ProjectStatusSchema,
} from './types';

export class ProjectLifecycle {
  private phaseGates: Map<ProjectPhase, PhaseGate> = new Map();

  private phases: ProjectPhase[] = [
    'INTAKE',
    'STRATEGY',
    'PRODUCT',
    'DESIGN',
    'ENGINEERING',
    'QA',
    'RELEASE',
    'GROWTH',
    'OPS',
    'RETROSPECTIVE',
  ];

  constructor() {
    this.initializeDefaultGates();
  }

  async initializeProject(
    orgId: string,
    config: ProjectConfig
  ): Promise<{ projectId: string; config: ProjectConfig }> {
    // In production, this would create a Project record in Prisma
    // For now, return structure for integration
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      projectId,
      config,
    };
  }

  async getPhaseStatus(projectId: string) {
    // In production, would fetch from Prisma
    // Return placeholder structure
    return {
      projectId,
      currentPhase: 'INTAKE' as ProjectPhase,
      completionPercent: 0,
      blockingItems: [],
      duration: {
        plannedDays: 7,
        actualDays: undefined,
      },
    };
  }

  async advancePhase(projectId: string): Promise<{
    success: boolean;
    newPhase?: ProjectPhase;
    blockers?: string[];
  }> {
    // In production, would:
    // 1. Get current phase from Prisma
    // 2. Check phase gates
    // 3. Update phase in Prisma
    // For now, return success structure
    return {
      success: true,
      newPhase: 'STRATEGY',
    };
  }

  async getProjectDashboard(projectId: string): Promise<ProjectDashboard> {
    // In production, would aggregate from Prisma:
    // - Workflow counts and status
    // - Task counts and status
    // - Cost records aggregation
    // - Quality score from evaluations
    // - Current phase and completion

    return {
      projectId,
      name: 'Sample Project',
      currentPhase: 'INTAKE',
      status: 'DRAFT',
      phaseStatus: {
        phase: 'INTAKE',
        completionPercent: 25,
        blockingItems: [],
        duration: {
          plannedDays: 7,
        },
      },
      workflowCount: 0,
      taskCount: 0,
      totalCostUsd: 0,
      budgetRemainingUsd: 100,
      qualityScore: undefined,
      lastUpdated: new Date(),
    };
  }

  private initializeDefaultGates(): void {
    const defaultGates: Record<ProjectPhase, Omit<PhaseGate, 'phase'>> = {
      INTAKE: {
        requiredApprovals: ['pm'],
        requiredArtifacts: ['DECISION_MEMO'],
        autoAdvance: false,
      },
      STRATEGY: {
        requiredApprovals: ['director'],
        requiredArtifacts: ['PRD'],
        autoAdvance: false,
      },
      PRODUCT: {
        requiredApprovals: ['pm'],
        requiredArtifacts: ['SPEC'],
        autoAdvance: false,
      },
      DESIGN: {
        requiredApprovals: ['designer'],
        requiredArtifacts: ['SPEC'],
        autoAdvance: false,
      },
      ENGINEERING: {
        requiredApprovals: [],
        requiredArtifacts: [],
        autoAdvance: false,
      },
      QA: {
        requiredApprovals: ['qa-director'],
        requiredArtifacts: [],
        autoAdvance: false,
      },
      RELEASE: {
        requiredApprovals: ['director'],
        requiredArtifacts: ['RELEASE_NOTES'],
        autoAdvance: false,
      },
      GROWTH: {
        requiredApprovals: [],
        requiredArtifacts: [],
        autoAdvance: false,
      },
      OPS: {
        requiredApprovals: [],
        requiredArtifacts: [],
        autoAdvance: false,
      },
      RETROSPECTIVE: {
        requiredApprovals: [],
        requiredArtifacts: [],
        autoAdvance: false,
      },
    };

    for (const phase of this.phases) {
      const gateConfig = defaultGates[phase];
      this.phaseGates.set(phase, { phase, ...gateConfig });
    }
  }

  getPhaseGate(phase: ProjectPhase): PhaseGate | undefined {
    return this.phaseGates.get(phase);
  }

  getNextPhase(currentPhase: ProjectPhase): ProjectPhase | null {
    const currentIndex = this.phases.indexOf(currentPhase);
    if (currentIndex === -1 || currentIndex === this.phases.length - 1) {
      return null;
    }
    return this.phases[currentIndex + 1];
  }

  getAllPhases(): ProjectPhase[] {
    return [...this.phases];
  }
}
