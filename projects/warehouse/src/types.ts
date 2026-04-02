export interface WarehouseProject {
  id: string;
  name: string;
  description: string;
  config: {
    teamSize: number;
    departments: string[];
    documentFormat: 'markdown' | 'pdf' | 'html';
  };
}

export interface SOPDocument {
  id: string;
  title: string;
  description: string;
  steps: string[];
  owner: string;
  lastUpdated: string;
}

export interface OnboardingPack {
  id: string;
  employeeId: string;
  role: string;
  documents: string[];
  completedAt?: string;
}

export interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  searchable: boolean;
}
