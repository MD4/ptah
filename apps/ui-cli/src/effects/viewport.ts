import { useEffect, useMemo, useState } from "react";

export const useViewport = (): {
  width: number;
  height: number;
} => {
  const [width, setWidth] = useState(process.stdout.columns - 2);
  const [height, setHeight] = useState(process.stdout.rows - 1);

  useEffect(() => {
    const callback = () => {
      const { columns, rows } = process.stdout;

      if (columns !== width) {
        setWidth(columns - 2);
      }
      if (rows !== height) {
        setHeight(rows - 1);
      }
    };

    process.stdout.on("resize", callback);

    return () => {
      process.stdout.off("resize", callback);
    };
  }, [width, height]);

  return useMemo(() => ({ width, height }), [width, height]);
};
