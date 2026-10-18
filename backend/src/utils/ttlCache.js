/*
 * Cache RAM có hạn dùng và giới hạn số phần tử. Lưu cả PROMISE đang chạy để
 * nhiều request cùng khóa chỉ gọi nguồn một lần (tránh dồn tải lên API ngoài).
 * Loader thất bại thì xóa khỏi cache, lần sau thử lại thay vì nhớ lỗi.
 */
export const createTtlCache = ({ ttlMs, maxEntries }) => {
  const entries = new Map();

  const evictOverflow = () => {
    // Map giữ thứ tự chèn nên phần tử đầu là cũ nhất.
    while (entries.size > maxEntries) {
      entries.delete(entries.keys().next().value);
    }
  };

  const getOrLoad = (key, loader) => {
    const hit = entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.promise;

    const promise = loader();
    entries.set(key, { promise, expiresAt: Date.now() + ttlMs });
    evictOverflow();
    promise.catch(() => {
      if (entries.get(key)?.promise === promise) entries.delete(key);
    });
    return promise;
  };

  return { getOrLoad, clear: () => entries.clear() };
};
