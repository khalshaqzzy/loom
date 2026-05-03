export const createDedupKey = (senderNodeId: number, seqId: number): string =>
  `${senderNodeId}:${seqId}`;
