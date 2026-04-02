import { proxyActivities, defineWorkflow, log } from '@temporalio/workflow';
import * as activities from './activities.js';

const activityConfig = {
  startToCloseTimeout: '10m',
  scheduleToCloseTimeout: '24h',
};

const Activities = proxyActivities(activityConfig);

export const pipelineWorkflow = defineWorkflow({
  execute: async (input: {
    projectId: string;
    agents: Array<{ agentId: string; prompt: string }>;
  }) => {
    log.info('Pipeline workflow started', { projectId: input.projectId });

    const results = [];
    let totalCost = 0;

    for (const agent of input.agents) {
      try {
        const result = await Activities.executeAgentTask({
          agentId: agent.agentId,
          prompt: agent.prompt,
          projectId: input.projectId,
        });
        results.push(result);
        totalCost += result.costUsd;
      } catch (err) {
        log.error('Agent execution failed', { agentId: agent.agentId, error: String(err) });
      }
    }

    await Activities.updateProjectMetrics({
      projectId: input.projectId,
      metrics: {
        agentsExecuted: results.length,
        totalCostUsd: totalCost,
        completedAt: new Date().toISOString(),
      },
    });

    log.info('Pipeline workflow completed', { projectId: input.projectId, results: results.length });
    return {
      success: true,
      results,
      totalCostUsd: totalCost,
    };
  },
});

export const marketResearchWorkflow = defineWorkflow({
  execute: async (input: {
    projectId: string;
    topic: string;
  }) => {
    log.info('Market research workflow started', { projectId: input.projectId, topic: input.topic });

    const result = await Activities.executeAgentTask({
      agentId: 'research-agent',
      prompt: `Conduct market research on: ${input.topic}`,
      projectId: input.projectId,
    });

    await Activities.notifyStakeholders({
      projectId: input.projectId,
      message: `Market research completed for ${input.topic}`,
      priority: 'medium',
    });

    return { success: true, result };
  },
});

export const creativeWorkflow = defineWorkflow({
  execute: async (input: {
    projectId: string;
    brief: string;
  }) => {
    log.info('Creative workflow started', { projectId: input.projectId });

    const result = await Activities.executeAgentTask({
      agentId: 'creative-agent',
      prompt: `Create creative content based on brief: ${input.brief}`,
      projectId: input.projectId,
    });

    return { success: true, result };
  },
});

export const uiGenerationWorkflow = defineWorkflow({
  execute: async (input: {
    projectId: string;
    requirements: string;
  }) => {
    log.info('UI generation workflow started', { projectId: input.projectId });

    const result = await Activities.executeAgentTask({
      agentId: 'ui-agent',
      prompt: `Generate UI based on requirements: ${input.requirements}`,
      projectId: input.projectId,
    });

    return { success: true, result };
  },
});

export const adsWorkflow = defineWorkflow({
  execute: async (input: {
    projectId: string;
    campaign: string;
  }) => {
    log.info('Ads workflow started', { projectId: input.projectId, campaign: input.campaign });

    const result = await Activities.executeAgentTask({
      agentId: 'ads-agent',
      prompt: `Create ads campaign: ${input.campaign}`,
      projectId: input.projectId,
    });

    return { success: true, result };
  },
});

export const seoWorkflow = defineWorkflow({
  execute: async (input: {
    projectId: string;
    website: string;
  }) => {
    log.info('SEO workflow started', { projectId: input.projectId, website: input.website });

    const result = await Activities.executeAgentTask({
      agentId: 'seo-agent',
      prompt: `Optimize SEO for: ${input.website}`,
      projectId: input.projectId,
    });

    return { success: true, result };
  },
});
