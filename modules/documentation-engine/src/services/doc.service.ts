import { Document, DocumentType, DocumentationProject } from '../models/doc.types';

export class DocumentationService {
  async generateDocument(
    title: string,
    type: DocumentType,
    content: string,
    author?: string
  ): Promise<Document> {
    return {
      id: `doc_${Date.now()}`,
      title,
      type,
      content,
      metadata: {
        author,
        version: '1.0.0',
        lastUpdated: new Date(),
        tags: [type.toLowerCase()]
      }
    };
  }

  async createDocumentationProject(
    name: string,
    documents: Document[]
  ): Promise<DocumentationProject> {
    return {
      id: `prj_${Date.now()}`,
      name,
      documents,
      generatedAt: new Date()
    };
  }

  async updateDocument(
    document: Document,
    newContent: string
  ): Promise<Document> {
    return {
      ...document,
      content: newContent,
      metadata: {
        ...document.metadata,
        lastUpdated: new Date()
      }
    };
  }
}

export const documentationService = new DocumentationService();
