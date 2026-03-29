import { useEffect } from "react";

/** Pass `null` to skip the title update (e.g. when embedded). */
export const useDocumentTitle = (title: string | null) => {
  useEffect(() => {
    if (title === null) return;
    const prev = document.title;
    document.title = `${title} | Genera3D`;
    return () => {
      document.title = prev;
    };
  }, [title]);
};
