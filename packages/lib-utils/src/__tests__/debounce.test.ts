import { debounce } from "../debounce";

jest.useFakeTimers();

describe("debounce (trailing)", () => {
  it("calls function once after wait ms", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on each call", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(50);
    debounced();
    jest.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes arguments to the function", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced("hello", 42);
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("hello", 42);
  });
});

describe("debounce (immediate/leading)", () => {
  it("calls function immediately on first invocation", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100, true);

    debounced();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not call again while within wait window", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100, true);

    debounced();
    debounced();
    debounced();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls again after silence exceeds wait ms", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100, true);

    debounced();
    jest.advanceTimersByTime(100);
    debounced();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
