import mongoose from "mongoose";

import { FeedbackTargetType, FeedbackRating, FeedbackStatus } from "../core/constants.js";

/*
 * Feedback co ghi chu (khac voi ChatMessage.feedback -- thumbs nhanh khong
 * note). Sinh ra tu nut "Bao sai" trong AnswerCard.tsx (B5), vao hang doi A08
 * cho doi noi dung xu ly. LUU context.question de reviewer khong phai lat lai
 * ca phien chat moi hieu duoc bao cao ve cau hoi nao.
 */
const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    targetType: { type: String, enum: Object.values(FeedbackTargetType), required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },

    rating: { type: String, enum: Object.values(FeedbackRating), required: true },
    note: { type: String, default: "" },

    context: {
      countryCode: { type: String, default: "" },
      question: { type: String, default: "" },
    },

    status: { type: String, enum: Object.values(FeedbackStatus), default: FeedbackStatus.PENDING },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewerNote: { type: String, default: "" },
  },
  { timestamps: true },
);

feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model("Feedback", feedbackSchema);
