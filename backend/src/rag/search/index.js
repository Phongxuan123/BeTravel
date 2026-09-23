import { env } from "../../core/env.js";
import { createMemorySearchDriver } from "./memory.driver.js";
import { createAtlasSearchDriver } from "./atlas.driver.js";

let cachedDriver = null;

export function getSearchDriver() {
  if (cachedDriver) return cachedDriver;
  cachedDriver = env.SEARCH_DRIVER === "atlas" ? createAtlasSearchDriver() : createMemorySearchDriver();
  return cachedDriver;
}

export function __setSearchDriverForTest(driver) {
  cachedDriver = driver;
}
