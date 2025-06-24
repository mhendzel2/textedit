import { documents, revisions, changes, type Document, type Revision, type ChangeRecord, type InsertDocument, type InsertRevision, type InsertChange } from "@shared/schema";

export interface IStorage {
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // Revision operations
  getRevision(id: number): Promise<Revision | undefined>;
  getRevisionsByDocument(documentId: number): Promise<Revision[]>;
  createRevision(revision: InsertRevision): Promise<Revision>;
  updateRevision(id: number, revision: Partial<InsertRevision>): Promise<Revision | undefined>;

  // Change operations
  getChange(id: number): Promise<ChangeRecord | undefined>;
  getChangesByRevision(revisionId: number): Promise<ChangeRecord[]>;
  createChange(change: InsertChange): Promise<ChangeRecord>;
  updateChange(id: number, change: Partial<InsertChange>): Promise<ChangeRecord | undefined>;
  updateChangeStatus(id: number, status: 'accepted' | 'rejected'): Promise<ChangeRecord | undefined>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private revisions: Map<number, Revision>;
  private changes: Map<number, ChangeRecord>;
  private currentDocumentId: number;
  private currentRevisionId: number;
  private currentChangeId: number;

  constructor() {
    this.documents = new Map();
    this.revisions = new Map();
    this.changes = new Map();
    this.currentDocumentId = 1;
    this.currentRevisionId = 1;
    this.currentChangeId = 1;
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const now = new Date();
    const document: Document = {
      ...insertDocument,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;

    const updatedDocument: Document = {
      ...document,
      ...updateData,
      updatedAt: new Date(),
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Revision operations
  async getRevision(id: number): Promise<Revision | undefined> {
    return this.revisions.get(id);
  }

  async getRevisionsByDocument(documentId: number): Promise<Revision[]> {
    return Array.from(this.revisions.values()).filter(
      (revision) => revision.documentId === documentId
    );
  }

  async createRevision(insertRevision: InsertRevision): Promise<Revision> {
    const id = this.currentRevisionId++;
    const revision: Revision = {
      ...insertRevision,
      id,
      createdAt: new Date(),
    };
    this.revisions.set(id, revision);
    return revision;
  }

  async updateRevision(id: number, updateData: Partial<InsertRevision>): Promise<Revision | undefined> {
    const revision = this.revisions.get(id);
    if (!revision) return undefined;

    const updatedRevision: Revision = {
      ...revision,
      ...updateData,
    };
    this.revisions.set(id, updatedRevision);
    return updatedRevision;
  }

  // Change operations
  async getChange(id: number): Promise<ChangeRecord | undefined> {
    return this.changes.get(id);
  }

  async getChangesByRevision(revisionId: number): Promise<ChangeRecord[]> {
    return Array.from(this.changes.values()).filter(
      (change) => change.revisionId === revisionId
    );
  }

  async createChange(insertChange: InsertChange): Promise<ChangeRecord> {
    const id = this.currentChangeId++;
    const change: ChangeRecord = {
      ...insertChange,
      id,
      createdAt: new Date(),
    };
    this.changes.set(id, change);
    return change;
  }

  async updateChange(id: number, updateData: Partial<InsertChange>): Promise<ChangeRecord | undefined> {
    const change = this.changes.get(id);
    if (!change) return undefined;

    const updatedChange: ChangeRecord = {
      ...change,
      ...updateData,
    };
    this.changes.set(id, updatedChange);
    return updatedChange;
  }

  async updateChangeStatus(id: number, status: 'accepted' | 'rejected'): Promise<ChangeRecord | undefined> {
    return this.updateChange(id, { status });
  }
}

export const storage = new MemStorage();
