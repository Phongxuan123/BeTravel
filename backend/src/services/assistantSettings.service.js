import AppSetting from "../models/AppSetting.js";
import { env } from "../core/env.js";

/*
 * Cong tac tat nhanh tro ly AI (H1). Hai lop:
 *   - env ASSISTANT_ENABLED la KHOA CHINH: false thi tro ly tat, Admin khong bat lai duoc.
 *   - co `assistant.enabled` trong DB do Admin doi, co hieu luc ngay khong can deploy.
 * Co DB duoc nho trong RAM toi da ASSISTANT_SETTINGS_CACHE_MS de moi cau hoi khong ton them
 * mot truy van; PATCH qua Admin xoa cache cua tien trinh nay ngay lap tuc.
 */
const ENABLED_KEY = "assistant.enabled";
// Chua tung dat cong tac = dang bat (giu hanh vi truoc khi co cong tac Admin).
const DEFAULT_ENABLED = true;

let cachedFlag = null;

export const invalidateAssistantSettingsCache = () => {
  cachedFlag = null;
};

async function loadEnabledFlag() {
  const isCacheFresh = cachedFlag !== null && cachedFlag.expiresAt > Date.now();
  if (isCacheFresh) return cachedFlag.value;
  const setting = await AppSetting.findOne({ key: ENABLED_KEY }).lean();
  const value = typeof setting?.value === "boolean" ? setting.value : DEFAULT_ENABLED;
  cachedFlag = { value, expiresAt: Date.now() + env.ASSISTANT_SETTINGS_CACHE_MS };
  return value;
}

// Dung o assistant.service.js truoc moi luot goi mo hinh.
export async function isAssistantActive() {
  if (!env.ASSISTANT_ENABLED) return false;
  return loadEnabledFlag();
}

const toSettings = (setting) => {
  const enabled = typeof setting?.value === "boolean" ? setting.value : DEFAULT_ENABLED;
  return {
    enabled,
    envEnabled: env.ASSISTANT_ENABLED,
    active: env.ASSISTANT_ENABLED && enabled,
    updatedAt: setting?.updatedAt ?? null,
  };
};

export async function getAssistantSettings() {
  return toSettings(await AppSetting.findOne({ key: ENABLED_KEY }).lean());
}

// Tra ve ca before/after de controller ghi nhat ky.
export async function setAssistantEnabled(enabled, actorId) {
  if (enabled && !env.ASSISTANT_ENABLED) throw new Error("ASSISTANT_ENV_DISABLED");
  const before = await getAssistantSettings();
  const setting = await AppSetting.findOneAndUpdate(
    { key: ENABLED_KEY },
    { $set: { value: enabled, updatedBy: actorId } },
    { upsert: true, returnDocument: "after", lean: true },
  );
  invalidateAssistantSettingsCache();
  return { before, after: toSettings(setting) };
}
