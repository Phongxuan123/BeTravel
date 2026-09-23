import Feedback from "../models/Feedback.js";
import ChatMessage from "../models/ChatMessage.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";
import { FeedbackTargetType } from "../core/constants.js";

/*
 * Nguoi dung tao feedback tu nut "Bao sai" (hoac thumbs up/down mo rong sau
 * nay). targetId phai la mot ChatMessage role=assistant CO THAT cua CHINH
 * user do -- khong tin targetId tu client ma khong xac minh, tranh mot user
 * bao cao/spam tren tin nhan cua nguoi khac.
 */
export const createFeedback = async ({ userId, targetType, targetId, rating, note, context }) => {
  if (targetType === FeedbackTargetType.CHAT_MESSAGE) {
    const message = await ChatMessage.findById(targetId).populate({
      path: "sessionId",
      select: "userId",
    });
    if (!message || String(message.sessionId?.userId) !== String(userId)) {
      throw new Error("FEEDBACK_TARGET_NOT_FOUND");
    }
  }

  return Feedback.create({ userId, targetType, targetId, rating, note, context });
};

export const listFeedback = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};

  if (query.rating) filter.rating = query.rating;
  if (query.status) filter.status = query.status;
  if (query.countryCode) filter["context.countryCode"] = query.countryCode;

  const [items, total] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Feedback.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

/*
 * Chi tiet cho A08: keo them ChatMessage lien quan (cau tra loi that + chunk
 * da truy hoi kem score) de reviewer thay DUOC LY DO AI tra loi nhu vay, thay
 * vi chi thay note cua nguoi bao cao.
 */
export const getFeedbackDetail = async (id) => {
  const feedback = await Feedback.findById(id).lean();
  if (!feedback) throw new Error("FEEDBACK_NOT_FOUND");

  let message = null;
  if (feedback.targetType === FeedbackTargetType.CHAT_MESSAGE) {
    message = await ChatMessage.findById(feedback.targetId)
      .select("text citations retrieval fallbackReason model createdAt")
      .lean();
  }

  return { feedback, message };
};

export const updateFeedbackStatus = async (id, { reviewerId, status, reviewerNote }) => {
  const feedback = await Feedback.findByIdAndUpdate(
    id,
    { $set: { status, reviewerId, reviewerNote: reviewerNote ?? "" } },
    { returnDocument: "after" },
  );
  if (!feedback) throw new Error("FEEDBACK_NOT_FOUND");
  return feedback;
};

export const countPendingFeedback = () => Feedback.countDocuments({ status: "pending" });
