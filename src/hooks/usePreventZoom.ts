import { useEffect, useRef } from "react";

export default function usePreventZoom() {
  const active = useRef(false);
  useEffect(() => {
    if (active.current) {
      console.log('skipping usePreventZoom');
      return;
    }
    
    console.log('usePreventZoom activating');
    active.current = true;

    function zoom99(e: any) {
      console.log('zoom99');
      e.preventDefault();
      // @ts-ignore
      document.body.style.zoom = 0.99;
    }

    function zoom100(e: any) {
      console.log('zoom100');
      e.preventDefault();
      // @ts-ignore
      document.body.style.zoom = 1;
    }

    // This thing worked on Mac trackpad
    // https://stackoverflow.com/questions/75281208/how-to-disable-page-pinch-to-zoom-trackpad-gesture-or-ctrl-wheel-over-an-eleme
    document.addEventListener('wheel', zoom100, { passive: false });

    // Might still be necessary
    // https://github.com/vercel/next.js/discussions/39685
    document.addEventListener("gesturestart", zoom99);
    document.addEventListener("gesturechange", zoom99);
    document.addEventListener("gestureend", zoom100);

    return () => {
      console.log('usePreventZoom de-activating');
      document.removeEventListener('wheel', zoom100);

      document.removeEventListener("gesturestart", zoom99);
      document.removeEventListener("gesturechange", zoom99);
      document.removeEventListener("gestureend", zoom100);
      active.current = false;
    };
  }, []);
}
