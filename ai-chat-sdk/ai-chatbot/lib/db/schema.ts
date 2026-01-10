// MongoDB schema types - exports types from mongodb.ts for backward compatibility
// PostgreSQL/Drizzle schema is deprecated - using MongoDB instead

export type {
  User,
  Chat,
  DBMessage,
  Vote,
  Document,
  Suggestion,
  Stream,
} from "./mongodb";

// Legacy type aliases for backward compatibility
export type UserType = User;
export type ChatType = Chat;
export type MessageType = DBMessage;
export type VoteType = Vote;
export type DocumentType = Document;
export type SuggestionType = Suggestion;
export type StreamType = Stream;

// Deprecated PostgreSQL/Drizzle types - kept for compatibility but not used
export type MessageDeprecated = DBMessage;
export type VoteDeprecated = Vote;
