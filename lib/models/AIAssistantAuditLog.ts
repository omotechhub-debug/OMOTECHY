import mongoose from "mongoose";

export interface IAIAssistantAuditLog extends mongoose.Document {
  userId: string;
  userRole: string;
  sessionId?: string;
  actionId: string;
  status: "success" | "failed";
  message: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const aiAssistantAuditLogSchema = new mongoose.Schema<IAIAssistantAuditLog>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    actionId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

aiAssistantAuditLogSchema.index({ createdAt: -1 });
aiAssistantAuditLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.AIAssistantAuditLog ||
  mongoose.model<IAIAssistantAuditLog>("AIAssistantAuditLog", aiAssistantAuditLogSchema);
