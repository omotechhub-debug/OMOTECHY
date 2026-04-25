import mongoose from "mongoose";

export interface IAIAssistantMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface IAIAssistantSession extends mongoose.Document {
  sessionId: string;
  userId: string;
  userRole: string;
  messages: IAIAssistantMessage[];
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new mongoose.Schema<IAIAssistantMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const aiAssistantSessionSchema = new mongoose.Schema<IAIAssistantSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

aiAssistantSessionSchema.index({ userId: 1, lastUsedAt: -1 });

export default mongoose.models.AIAssistantSession ||
  mongoose.model<IAIAssistantSession>("AIAssistantSession", aiAssistantSessionSchema);
