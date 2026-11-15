import { useCallback, useEffect, useState } from 'react';

const PRESENTING_ATTR = 'data-presenting';

/*
 * Che do trinh chieu: an sidebar, phong to chu (xem index.css) va vao toan man hinh neu trinh
 * duyet cho phep. Nhan Esc thoat toan man hinh thi cung thoat che do -- dong bo qua su kien
 * fullscreenchange de hai trang thai khong lech nhau.
 */
export function usePresentationMode() {
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    document.documentElement.toggleAttribute(PRESENTING_ATTR, presenting);
  }, [presenting]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.documentElement.removeAttribute(PRESENTING_ATTR);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !presenting;
    setPresenting(next);
    // Toan man hinh la tuy chon: trinh duyet tu choi (iframe, chinh sach) thi van giu che do phong to.
    if (next) {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }, [presenting]);

  return { presenting, toggle };
}
