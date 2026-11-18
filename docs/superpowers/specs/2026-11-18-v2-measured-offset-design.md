# PTAH V2 — Debug mode, piece 4a: the measured Reaper offset (short design)

Status: approved by the owner, 2026-11-18 (one correction by the author
after approval, marked below).
Code: `~/projects/ptah-v2`, branch `measured-offset`.
Step 4, piece 4, split with the owner into: **4a the measured Reaper
offset** (this), 4b live probes in the Builder (its own design), and the
replay-and-diff screen, dropped (the command line does it).

## Intent

Settings advises the offset to type into Reaper from fixed guesses. Since
the Monitor, the engine measures the real chain. The advice uses what this
rig measured, line by line, and says which lines are measured.

## Goals, non-goals, anti-goals

- Goal: each engine-side line of the breakdown shows the rig's own
  figure once enough was measured, and the word `measured`; the others
  say `estimated`.
- Goal: before enough is measured the page reads as today, plus how far
  the measure is.
- Non-goals: a calibration wizard; measuring the fixtures or a network
  node (needs a sensor); changing how the offset is stored.
- Anti-goals: a number that flickers; a "measured" word on a figure that
  is a guess.

## Approaches

- **A. Swap terms of the existing advice for measured ones (chosen).**
  Any song measures the chain; no new flow.
- B. A calibration wizard playing test notes: rejected, not needed.
- C. Calibration with a microphone or a light sensor: later, hardware.

## What is measured

From the engine's timers since it started (`TimersSnapshot`, the `run`
quantiles, the median `p50`):

| Line | From | Replaces |
|---|---|---|
| `Note in → frame out` | `end_to_end` | `frame-wait` |
| `Frame out → send starts` | `publish_to_sent` of the universe | `output-wait` |
| `Writing to the Enttec` (USB Pro only) | `sent_to_written` of the universe | new line |

Never measured, always `estimated`: the output's own DMX frame (23 ms:
the Enttec or the node emitting it) and the fixtures' lag.

**Correction after approval:** the sketch shown to the owner had `Enttec
USB Pro, sending 23 ms measured`. The engine only times its write to the
USB port, not the widget's DMX frame, so the 23 ms stays an estimate and
the measured write is its own small line.

Rules:

- A line is measured when it has enough samples: 50 notes for `Note in →
  frame out`, 200 frames for the two output lines. Otherwise its estimate
  stands, worded as today.
- The measure is of the running engine. When the page asks for another
  frames-per-second than the engine runs at (a draft), `Note in → frame
  out` is estimated for that rate, as today.
- The timers' median is exact to about 15 % (their buckets); figures are
  rounded to the millisecond.
- `level`: `measured` when every measurable line of every universe is
  measured, `estimated` when none is, else `partly`.

## The wire

`GET /offset-advice` keeps its shape and gains: on each term `measured:
bool`; a term `what: "engine"` (measured `Note in → frame out`), `"send"`
(measured `Frame out → send starts`) and `"write"`; on the advice `notes`
(note samples so far) and `notesNeeded: 50`. The pure function in
`ptah-model` takes the measures as an optional argument; the server reads
them from the engine's telemetry snapshot.

## The page

```
REAPER OFFSET
Type −47 ms into Reaper                      [I typed it into Reaper]
measured on this rig over 312 notes since PTAH started

Main · Enttec USB Pro                                         47 ms
  Note in → frame out              9 ms   measured
  Frame out → send starts          7 ms   measured
  Writing to the Enttec            1 ms   measured
  Enttec USB Pro, one full frame  23 ms   estimated
  Fixtures (LED)                   7 ms   estimated
```

- Under the number, one calm line: `measured on this rig over <n> notes
  since PTAH started` (`level` measured), `partly measured: <n> of 50
  notes` (partly, notes missing) or `partly measured` (partly, notes
  enough), `estimated: play a song to measure (<n> of 50 notes)`
  (estimated).
- Each term line ends with `measured` or `estimated`, calm.
- The block is read again every 10 s while Settings is visible; figures
  change in place, nothing shifts (the lines of a universe are fixed for
  its output kind: the `Writing to the Enttec` line is there for a USB
  Pro from the start and reads `0 ms estimated` until measured).
- Tolerance: where the page compares what Reaper is set to with the
  advice (the `I typed it into Reaper` button, any "differs" wording), a
  difference under 5 ms counts as the same.

## Testing and exit

- Model: each line swaps when its samples suffice and not before; a
  draft rate keeps the estimate for the engine line; `level` in its three
  values; totals and `offsetMs` follow the swapped terms.
- Server: the advice of a running fake engine after 50 notes is
  `measured` on its engine lines; before, `estimated`.
- ds and web: the three status lines, the per-term words, no shift when
  a line turns measured, the 10 s refresh, the 5 ms tolerance.
- Exit: on the demo, play a song, open Settings, read `measured`.

## Calls made by the author

Median, not worst case. Since the engine started, not the last 10 s. 50
notes and 200 frames. The 5 ms tolerance. The 10 s refresh. The Enttec's
own frame stays an estimate.
