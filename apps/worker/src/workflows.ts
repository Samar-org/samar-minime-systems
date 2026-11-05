import { proxyActivities } from '@temporalio/workflow';
import type * as ActivityTypes from './activities.js';
const activities=proxyActivities<typeof ActivityTypes>({startToCloseTimeout:'10 minutes',scheduleToCloseTimeout:'15 minutes',retry:{maximumAttempts:1}});
type Task=Parameters<typeof ActivityTypes.executeAgentTask>[0];
export interface PipelineInput {projectId:string;workflowId:string;agents:Array<Omit<Task,'projectId'|'workflowId'>>;}
export interface SingleInput {task:Task;}
/** Recovery spec §3: serial durable steps fail the workflow instead of swallowing failed agents. */
export async function pipelineWorkflow(input:PipelineInput){
 if(!input?.projectId||!input.workflowId||!Array.isArray(input.agents)||input.agents.length<1||input.agents.length>100)throw new Error('Invalid bounded pipeline input');
 await activities.updateWorkflowStatus({workflowId:input.workflowId,status:'RUNNING'});
 const results:Awaited<ReturnType<typeof ActivityTypes.executeAgentTask>>[]=[];
 try{
  for(const task of input.agents)results.push(await activities.executeAgentTask({...task,projectId:input.projectId,workflowId:input.workflowId}));
  await activities.updateWorkflowStatus({workflowId:input.workflowId,status:'COMPLETED'});
  return {success:true,results,totalCostUsd:results.reduce((sum,r)=>sum+r.costUsd,0)};
 }catch(error){await activities.updateWorkflowStatus({workflowId:input.workflowId,status:'FAILED'});throw error;}
}
/** Same activity contract for all named entrypoints; it never invents agent IDs or budgets. */
async function single(input:SingleInput){
 if(!input?.task?.taskId||!input.task.projectId||!input.task.workflowId||!input.task.agentId||!Number.isFinite(input.task.maxCostUsd)||input.task.maxCostUsd<=0)throw new Error('Explicit task scope, configured agent and budget required');
 return pipelineWorkflow({projectId:input.task.projectId,workflowId:input.task.workflowId,agents:[input.task]});
}
export async function marketResearchWorkflow(input:SingleInput){return single(input);}
export async function creativeWorkflow(input:SingleInput){return single(input);}
export async function uiGenerationWorkflow(input:SingleInput){return single(input);}
export async function adsWorkflow(input:SingleInput){return single(input);}
export async function seoWorkflow(input:SingleInput){return single(input);}
