/*
 * Chuan hoa phan trang cho moi endpoint list cua admin -- mot noi tinh toan
 * page/limit/skip, tranh lap lai o tung controller (Rule 3).
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const parsePagination = (query = {}) => {
  const page = Math.max(DEFAULT_PAGE, Number.parseInt(query.page, 10) || DEFAULT_PAGE);
  const requestedLimit = Number.parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildPageMeta = ({ page, limit }, total) => ({ page, limit, total });
