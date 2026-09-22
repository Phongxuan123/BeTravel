import LegalArticle from "../models/LegalArticle.js";
import Country from "../models/Country.js";
import SupportLocation from "../models/SupportLocation.js";
import Job from "../models/Job.js";
import { ContentStatusValues, JobStatus } from "../core/constants.js";

// Thong ke tong quan cho A01 Dashboard -- toan bo query that, khong mock.
export const getDashboardSummary = async () => {
  const [articlesByStatus, countryCount, locationCount, failedJobCount] = await Promise.all([
    LegalArticle.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Country.countDocuments(),
    SupportLocation.countDocuments(),
    Job.countDocuments({ status: JobStatus.FAILED }),
  ]);

  const countByStatus = Object.fromEntries(ContentStatusValues.map((status) => [status, 0]));
  for (const row of articlesByStatus) {
    countByStatus[row._id] = row.count;
  }

  return {
    articlesByStatus: countByStatus,
    articlesTotal: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
    countryCount,
    locationCount,
    failedJobCount,
  };
};
