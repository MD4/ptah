export const easeOutQuint = (x: number): number => 1 - easeOutQuintInvert(x);
export const easeOutQuintInvert = (x: number): number => (1 - x) ** 5;
