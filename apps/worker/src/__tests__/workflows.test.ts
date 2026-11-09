import {it,expect,vi,beforeEach} from 'vitest';
const activities=vi.hoisted(()=>({executeAgentTask:vi.fn(),updateWorkflowStatus:vi.fn()}));
vi.mock('@temporalio/workflow',()=>({proxyActivities:()=>activities}));
import {pipelineWorkflow,marketResearchWorkflow} from '../workflows.js';
const task={agentId:'persisted-agent-id',prompt:'Review',taskId:'t',tier:'UTILITY',maxCostUsd:1,requiresJson:false};
beforeEach(()=>{vi.clearAllMocks();activities.updateWorkflowStatus.mockResolvedValue(undefined);});
it('workflow propagates failures and persists failed status, never a success envelope',async()=>{
 activities.executeAgentTask.mockRejectedValue(new Error('budget denied'));
 await expect(pipelineWorkflow({projectId:'p',workflowId:'w',agents:[task]})).rejects.toThrow('budget denied');
 expect(activities.updateWorkflowStatus).toHaveBeenLastCalledWith({workflowId:'w',status:'FAILED'});
});
it('workflow sends the complete explicit scope and sums actual cost',async()=>{
 activities.executeAgentTask.mockResolvedValue({content:'evidence',costUsd:.1});
 const result=await pipelineWorkflow({projectId:'p',workflowId:'w',agents:[task]});
 expect(activities.executeAgentTask).toHaveBeenCalledWith({...task,projectId:'p',workflowId:'w'});expect(result.totalCostUsd).toBe(.1);
});
it('unscoped legacy invocation fails before any activity',async()=>{
 await expect(marketResearchWorkflow({task:{...task,projectId:'',workflowId:'w'}})).rejects.toThrow();
 expect(activities.executeAgentTask).not.toHaveBeenCalled();
});
