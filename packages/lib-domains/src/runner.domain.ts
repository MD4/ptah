import { clamp, easeOutQuint, easeOutQuintInvert } from "@ptah/lib-utils";

export type * from "./runner.domain.types";

export const adsr =
  (
    attackRate: number,
    decayRate: number,
    sustainLevel: number,
    releaseRate: number,
  ) =>
  (t: number): number => {
    if (t < attackRate) {
      return clamp(easeOutQuint((1 / attackRate) * t), 0, 1);
    }

    if (t < attackRate + decayRate) {
      return clamp(
        easeOutQuintInvert((1 / decayRate) * (t - attackRate)) *
          (1 - sustainLevel) +
          sustainLevel,
        0,
        1,
      );
    }

    if (t > 1 - releaseRate) {
      return clamp(
        easeOutQuintInvert((1 / releaseRate) * (t - (1 - releaseRate))) *
          sustainLevel,
        0,
        1,
      );
    }

    return clamp(sustainLevel, 0, 1);
  };

export const distortion =
  (value: number, drive: number, tone: number, level: number) =>
  (time: number): number => {
    return (
      value * level +
      (1 - level) / 2 +
      drive * 3 * Math.sin(tone * time * 50) * 0.1 +
      drive * 3 * Math.cos((tone / 3) * time * 70) * 0.1
    );
  };

export const mathNodeOperatorHasSecondValue = (operation: string): boolean =>
  ["add", "substract", "divide", "multiply", "modulo", "power"].includes(
    operation,
  );
