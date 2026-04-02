import { Customer, Interaction, CustomerSchema, InteractionSchema } from '../models/crm.types';

export class CRMService {
  private customers: Map<string, Customer> = new Map();
  private interactions: Map<string, Interaction> = new Map();

  addCustomer(customer: Customer): void {
    const validated = CustomerSchema.parse(customer);
    this.customers.set(validated.id, validated);
  }

  getCustomer(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  recordInteraction(interaction: Interaction): void {
    const validated = InteractionSchema.parse(interaction);
    this.interactions.set(validated.id, validated);
  }

  getCustomerInteractions(customerId: string): Interaction[] {
    return Array.from(this.interactions.values()).filter(
      i => i.customerId === customerId
    );
  }
}
