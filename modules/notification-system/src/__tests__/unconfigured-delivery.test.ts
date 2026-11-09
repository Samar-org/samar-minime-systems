import {it,expect} from 'vitest';
import {EmailDispatcher,SlackDispatcher,DispatcherFactory} from '../services/dispatch';
import {NotificationService} from '../services/notification.service';
it('unconnected dispatchers never report success or generate delivery IDs',async()=>{
 const input={message:'Test only',recipientEmail:'test@example.invalid'};
 for(const result of [await new EmailDispatcher().dispatch(input),await new SlackDispatcher().dispatch(input),await DispatcherFactory.dispatch('all',input)]){
  expect(result).toMatchObject({success:false});expect(result).not.toHaveProperty('messageId');
 }
});
it('the legacy store cannot invent unread totals or change delivery timestamps',async()=>{
 const service=new NotificationService();const scope={projectId:'example',environment:'staging' as const};
 await expect(service.getUnreadCount(scope,'user')).rejects.toThrow(/not connected/);
 await expect(service.markRead(scope,'notification')).rejects.toThrow(/not connected/);
});
