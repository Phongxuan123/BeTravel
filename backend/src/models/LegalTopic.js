import mongoose from "mongoose";

/*
 * Chu de phap ly theo tung quoc gia (vi du 'giao-thong', 'thi-thuc'). Dung de
 * nhom bai luat va lam bo loc o man hinh Explore cua mobile.
 */
const legalTopicSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    icon: { type: String, default: "" },
    order: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

legalTopicSchema.index({ countryCode: 1, slug: 1 }, { unique: true });

export default mongoose.model("LegalTopic", legalTopicSchema);
