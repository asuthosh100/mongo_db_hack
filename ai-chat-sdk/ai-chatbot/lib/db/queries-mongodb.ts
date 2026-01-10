import "server-only";

import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import { generateUUID } from "../utils";
import {
  connectToMongoDB,
  getCollections,
  type User,
  type Chat,
  type DBMessage,
  type Vote,
  type Document,
  type Suggestion,
  type Stream,
} from "./mongodb";
import { generateHashedPassword } from "./utils";

// Ensure MongoDB connection is initialized
let collectionsInitialized = false;

async function ensureCollections() {
  if (!collectionsInitialized) {
    await connectToMongoDB();
    collectionsInitialized = true;
  }
  return getCollections();
}

export async function getUser(email: string): Promise<User[]> {
  try {
    const { users } = await ensureCollections();
    const userDocs = await users.find({ email }).toArray();
    return userDocs.map((doc) => {
      // Ensure id field exists, using id if present, otherwise _id
      const id = doc.id || doc._id?.toString() || generateUUID();
      const { _id, ...rest } = doc as any;
      return { ...rest, id } as User;
    });
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get user by email: ${error.message}`
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);
  const id = generateUUID();

  try {
    const { users } = await ensureCollections();
    await users.insertOne({
      id,
      email,
      password: hashedPassword,
    });
    return { id, email };
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to create user: ${error.message}`
    );
  }
}

export async function createGuestUser(): Promise<Array<{ id: string; email: string }>> {
  const email = `guest-${Date.now()}@guest.local`;
  const password = generateHashedPassword(generateUUID());
  const id = generateUUID();

  try {
    const { users } = await ensureCollections();
    await users.insertOne({
      id,
      email,
      password,
    });
    return [{ id, email }];
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to create guest user. Make sure MONGODB_URL or mongodb is set in environment variables. Error: ${error.message}`
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    const { chats } = await ensureCollections();
    await chats.insertOne({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility: visibility || "private",
    });
  } catch (error: any) {
    throw new ChatSDKError("bad_request:database", `Failed to save chat: ${error.message}`);
  }
}

export async function deleteChatById({ id }: { id: string }): Promise<Chat | null> {
  try {
    const collections = await ensureCollections();
    
    // Delete related documents
    await collections.votes.deleteMany({ chatId: id });
    await collections.messages.deleteMany({ chatId: id });
    await collections.streams.deleteMany({ chatId: id });
    
    // Delete chat
    const result = await collections.chats.findOneAndDelete({ id });
    if (!result) return null;
    
    // Ensure id field exists
    const chatId = result.id || result._id?.toString() || id;
    const { _id, ...rest } = result as any;
    return { ...rest, id: chatId } as Chat;
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to delete chat by id: ${error.message}`
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const collections = await ensureCollections();
    
    const userChats = await collections.chats.find({ userId }).toArray();
    
    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await collections.votes.deleteMany({ chatId: { $in: chatIds } });
    await collections.messages.deleteMany({ chatId: { $in: chatIds } });
    await collections.streams.deleteMany({ chatId: { $in: chatIds } });

    const deleteResult = await collections.chats.deleteMany({ userId });
    return { deletedCount: deleteResult.deletedCount || 0 };
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to delete all chats by user id: ${error.message}`
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const { chats } = await ensureCollections();
    const extendedLimit = limit + 1;
    
    let query: any = { userId: id };
    let sortDirection: 1 | -1 = -1; // -1 for desc

    if (startingAfter) {
      const selectedChat = await chats.findOne({ id: startingAfter });
      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }
      query.createdAt = { $gt: selectedChat.createdAt };
    } else if (endingBefore) {
      const selectedChat = await chats.findOne({ id: endingBefore });
      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }
      query.createdAt = { $lt: selectedChat.createdAt };
    }

    const filteredChats = await chats
      .find(query)
      .sort({ createdAt: sortDirection })
      .limit(extendedLimit)
      .toArray();

    // Ensure id field exists for all chats
    const chatsWithId = filteredChats.map((chat) => {
      const chatId = chat.id || chat._id?.toString() || generateUUID();
      const { _id, ...rest } = chat as any;
      return { ...rest, id: chatId } as Chat;
    });

    const hasMore = chatsWithId.length > limit;

    return {
      chats: hasMore ? chatsWithId.slice(0, limit) : chatsWithId,
      hasMore,
    };
  } catch (error: any) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get chats by user id: ${error.message}`
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const { chats } = await ensureCollections();
    const selectedChat = await chats.findOne({ id });
    if (!selectedChat) return null;
    
    // Ensure id field exists
    const chatId = selectedChat.id || selectedChat._id?.toString() || id;
    const { _id, ...rest } = selectedChat as any;
    return { ...rest, id: chatId } as Chat;
  } catch (error: any) {
    throw new ChatSDKError("bad_request:database", `Failed to get chat by id: ${error.message}`);
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    const { messages: messagesCollection } = await ensureCollections();
    await messagesCollection.insertMany(messages);
  } catch (error: any) {
    throw new ChatSDKError("bad_request:database", `Failed to save messages: ${error.message}`);
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    const { messages } = await ensureCollections();
    await messages.updateOne({ id }, { $set: { parts } });
  } catch (error: any) {
    throw new ChatSDKError("bad_request:database", `Failed to update message: ${error.message}`);
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const { messages } = await ensureCollections();
    return await messages
      .find({ chatId: id })
      .sort({ createdAt: 1 }) // asc
      .toArray();
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get messages by chat id: ${error.message}`
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const { votes } = await ensureCollections();
    const existingVote = await votes.findOne({ messageId });

    if (existingVote) {
      await votes.updateOne(
        { messageId, chatId },
        { $set: { isUpvoted: type === "up" } }
      );
    } else {
      await votes.insertOne({
        chatId,
        messageId,
        isUpvoted: type === "up",
      });
    }
  } catch (error: any) {
    throw new ChatSDKError("bad_request:database", `Failed to vote message: ${error.message}`);
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const { votes } = await ensureCollections();
    return await votes.find({ chatId: id }).toArray();
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get votes by chat id: ${error.message}`
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    const { documents } = await ensureCollections();
    const doc = {
      id,
      createdAt: new Date(),
      title,
      kind,
      content,
      userId,
    };
    await documents.insertOne(doc);
    return [doc];
  } catch (error: any) {
    throw new ChatSDKError("bad_request:database", `Failed to save document: ${error.message}`);
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const { documents } = await ensureCollections();
    return await documents
      .find({ id })
      .sort({ createdAt: 1 }) // asc
      .toArray();
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get documents by id: ${error.message}`
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const { documents } = await ensureCollections();
    const docs = await documents
      .find({ id })
      .sort({ createdAt: -1 }) // desc
      .limit(1)
      .toArray();
    return docs[0] || null;
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get document by id: ${error.message}`
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const collections = await ensureCollections();
    
    await collections.suggestions.deleteMany({
      documentId: id,
      documentCreatedAt: { $gt: timestamp },
    });

    const deletedDocs = await collections.documents
      .find({
        id,
        createdAt: { $gt: timestamp },
      })
      .toArray();

    await collections.documents.deleteMany({
      id,
      createdAt: { $gt: timestamp },
    });

    return deletedDocs;
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to delete documents by id after timestamp: ${error.message}`
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    const { suggestions: suggestionsCollection } = await ensureCollections();
    await suggestionsCollection.insertMany(suggestions);
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to save suggestions: ${error.message}`
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const { suggestions } = await ensureCollections();
    return await suggestions.find({ documentId }).toArray();
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get suggestions by document id: ${error.message}`
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const { messages } = await ensureCollections();
    return await messages.find({ id }).toArray();
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get message by id: ${error.message}`
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const collections = await ensureCollections();
    
    const messagesToDelete = await collections.messages
      .find({
        chatId,
        createdAt: { $gte: timestamp },
      })
      .toArray();

    const messageIds = messagesToDelete.map((msg) => msg.id);

    if (messageIds.length > 0) {
      await collections.votes.deleteMany({
        chatId,
        messageId: { $in: messageIds },
      });

      await collections.messages.deleteMany({
        chatId,
        id: { $in: messageIds },
      });
    }
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to delete messages by chat id after timestamp: ${error.message}`
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    const { chats } = await ensureCollections();
    await chats.updateOne({ id: chatId }, { $set: { visibility } });
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to update chat visibility by id: ${error.message}`
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    const { chats } = await ensureCollections();
    await chats.updateOne({ id: chatId }, { $set: { title } });
  } catch (error) {
    console.warn("Failed to update title for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const collections = await ensureCollections();
    const hoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);

    // Find chats by userId
    const userChats = await collections.chats.find({ userId: id }).toArray();
    const chatIds = userChats.map((chat) => chat.id);

    if (chatIds.length === 0) {
      return 0;
    }

    // Count messages in those chats created after hoursAgo with role "user"
    const count = await collections.messages.countDocuments({
      chatId: { $in: chatIds },
      createdAt: { $gte: hoursAgo },
      role: "user",
    });

    return count;
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get message count by user id: ${error.message}`
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    const { streams } = await ensureCollections();
    await streams.insertOne({
      id: streamId,
      chatId,
      createdAt: new Date(),
    });
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to create stream id: ${error.message}`
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const { streams } = await ensureCollections();
    const streamDocs = await streams
      .find({ chatId })
      .sort({ createdAt: 1 }) // asc
      .toArray();
    return streamDocs.map((doc) => doc.id);
  } catch (error: any) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get stream ids by chat id: ${error.message}`
    );
  }
}

