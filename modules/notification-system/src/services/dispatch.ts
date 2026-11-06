/** External delivery is disabled until the scoped, authorized outbox is connected. */
export interface DispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Notification object structure
 */
export interface Notification {
  recipientEmail?: string;
  recipientId?: string;
  subject?: string;
  title?: string;
  message: string;
  body?: string;
  actionUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  type?: string;
  metadata?: Record<string, unknown>;
}


const blocked=():DispatchResult=>({success:false,error:'Authorized notification delivery adapter is not connected'});
export class EmailDispatcher {
 async dispatch(_notification:Notification):Promise<DispatchResult> {return blocked();}
}
export class SlackDispatcher {
 async dispatch(_notification:Notification):Promise<DispatchResult> {return blocked();}
}
export class DispatcherFactory {
 static async dispatch(_channel:'email'|'slack'|'all',_notification:Notification):Promise<DispatchResult|DispatchResult[]> {return blocked();}
}
