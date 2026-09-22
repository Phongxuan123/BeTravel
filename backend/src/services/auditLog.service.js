import AuditLog from "../models/AuditLog.js";

const RETENTION_DAYS = 180;

/*
 * Ghi mot dong audit log. Goi tuong minh o CUOI moi controller admin sau khi
 * thao tac ghi (CREATE/UPDATE/DELETE/STATUS_CHANGE) thanh cong -- khong dung
 * Express middleware "bat" moi response roi tu doan diff, vi khong the biet
 * chinh xac before/after cho tung loai entity ma khong doc lai tu DB (them
 * mot round-trip, va van co the sai neu response khong phai JSON thuan).
 * Goi tuong minh o dung noi da co san before/after la cach chac chan nhat
 * de "khong bao gio bi bo sot" (Rule 9 -- KISS thang phuc tap khong can thiet).
 */
export const recordAuditLog = async ({
  actorId,
  actorUsername = "",
  action,
  entityType,
  entityId,
  before = null,
  after = null,
  ip = "",
}) => {
  const expiresAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

  await AuditLog.create({
    actorId,
    actorUsername,
    action,
    entityType,
    entityId: String(entityId),
    diff: { before, after },
    ip,
    expiresAt,
  });
};
