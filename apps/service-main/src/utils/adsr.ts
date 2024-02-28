import { easeOutQuint, easeOutQuintInvert } from "./easing";

export const adsr =
  (
    attackRate: number,
    decayRate: number,
    sustainLevel: number,
    releaseRate: number
  ) =>
  (t: number): number => {
    if (t < attackRate) {
      return easeOutQuint((1 / attackRate) * t);
    }

    if (t < attackRate + decayRate) {
      return (
        easeOutQuintInvert((1 / decayRate) * (t - attackRate)) *
          (1 - sustainLevel) +
        sustainLevel
      );
    }

    if (t > 1 - releaseRate) {
      return (
        easeOutQuintInvert((1 / releaseRate) * (t - (1 - releaseRate))) *
        sustainLevel
      );
    }

    return (
      easeOutQuintInvert((1 / decayRate) * attackRate) * (1 - sustainLevel) +
      sustainLevel
    );
  };
