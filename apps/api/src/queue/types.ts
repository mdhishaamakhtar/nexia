export const QUEUE_NAME = "nexia-embedding";
export const TYPE_EMBEDDING_TASK = "task:embedding";
export const TYPE_DELETION_TASK = "task:deletion";

export type EmbeddingPayload = {
  profile_id: number;
};

export type DeletionPayload = {
  profile_id: number;
};
