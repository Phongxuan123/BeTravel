import { httpStatusForCode } from "./errors.js";

/*
 * Envelope thống nhất cho toàn bộ API:
 *   { ok: true,  data, meta? }
 *   { ok: false, error: { code, message, details? } }
 * Mobile đã dựng 18 màn hình trên dạng {ok, data} nên backend theo dạng này.
 */
export const ok = (res, data, meta) =>
  res.status(200).json(meta ? { ok: true, data, meta } : { ok: true, data });

export const created = (res, data) => res.status(201).json({ ok: true, data });

export const fail = (res, code, message, details, httpStatus) =>
  res
    .status(httpStatus ?? httpStatusForCode(code))
    .json({ ok: false, error: { code, message, ...(details ? { details } : {}) } });
