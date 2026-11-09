import type { CreateNotificationInput, NotificationFilter, Pagination, NotificationScope } from '../models/notification.types.js';

function disconnected():never {
 throw new Error('Scoped notification outbox and acknowledgement owner are not connected');
}
/** The legacy implementation conflated read receipts with sentAt and lacked tenant checks.
 * No table writes or fabricated reads are allowed until the authoritative bridge exists. */
export class NotificationService {
 async send(_input:CreateNotificationInput):Promise<never> {return disconnected();}
 async sendBulk(_inputs:CreateNotificationInput[]):Promise<never> {return disconnected();}
 async getNotifications(_scope:NotificationScope,_userId:string,_filter:NotificationFilter={},_pagination:Pagination={page:1,limit:20}):Promise<never> {return disconnected();}
 async getRecentActivity(_scope:NotificationScope,_userId:string,_limit=10):Promise<never> {return disconnected();}
 async markRead(_scope:NotificationScope,_id:string):Promise<never> {return disconnected();}
 async markAllRead(_scope:NotificationScope,_userId:string):Promise<never> {return disconnected();}
 async getUnreadCount(_scope:NotificationScope,_userId:string):Promise<never> {return disconnected();}
 async deleteNotification(_scope:NotificationScope,_id:string):Promise<never> {return disconnected();}
}
