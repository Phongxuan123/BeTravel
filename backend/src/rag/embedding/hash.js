// djb2 -- hash chuoi don gian, tat dinh, du dung de phan tan tu vao 1 vector.
export function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}
