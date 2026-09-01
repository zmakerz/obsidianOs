export type KnowledgeKind = "raw" | "article" | "wiki" | "sop" | "context" | "output";
export interface KnowledgeReference {
  id: string; kind: KnowledgeKind; title: string; uri: string; sourceIds: string[]; updatedAt: string;
}
export interface KnowledgePort {
  findById(id: string): Promise<KnowledgeReference | null>;
  search(query: string, kinds?: KnowledgeKind[]): Promise<KnowledgeReference[]>;
}
