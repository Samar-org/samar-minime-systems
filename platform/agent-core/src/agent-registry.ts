import { AgentConfig } from '@samar/schemas';
import { getLogger } from '@samar/observability';

const logger = getLogger('agent-registry');

export interface RegisteredAgent {
  id: string;
  name: string;
  config: AgentConfig;
  enabled: boolean;
}

export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();

  register(agent: RegisteredAgent): void {
    this.agents.set(agent.id, agent);
    logger.info(`Registered agent: ${agent.name} (${agent.id})`);
  }

  get(id: string): RegisteredAgent | undefined {
    return this.agents.get(id);
  }

  getByName(name: string): RegisteredAgent | undefined {
    return Array.from(this.agents.values()).find(a => a.name === name);
  }

  getAll(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  getEnabled(): RegisteredAgent[] {
    return this.getAll().filter(a => a.enabled);
  }

  enable(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.enabled = true;
      logger.info(`Enabled agent: ${agent.name}`);
    }
  }

  disable(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.enabled = false;
      logger.info(`Disabled agent: ${agent.name}`);
    }
  }

  unregister(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      this.agents.delete(id);
      logger.info(`Unregistered agent: ${agent.name}`);
    }
  }
}
