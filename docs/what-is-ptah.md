# PTAH — a deep, plain-language guide

## The big picture

**PTAH is a tool for running light shows.** It connects two pieces of equipment that normally can't talk to each other:

1. A **MIDI controller** — a music keyboard, a pad controller, or a box full of knobs and sliders. This is what *you* touch.
2. **DMX lighting** — the professional stage/club lights used everywhere from theatres to weddings to nightclubs. DMX is simply the standard "language" those lights understand.

PTAH listens to your keyboard and, in real time, tells your lights what to do. Press a key — a light flashes. Hold a key — a light swells and fades. Turn a knob — the whole rig shifts color or brightness. You're effectively *playing your lights like an instrument.*

It's the kind of thing that's normally done with expensive, complicated lighting consoles. PTAH does it on your own computer, for free.

## What you need to actually use it

- **A computer** (Mac, Windows, or Linux).
- **A MIDI controller** plugged in (or any software/app that can send MIDI). PTAH creates its own labelled "input" called **ptah** that your gear connects to.
- **A small piece of hardware to reach the lights:** a USB-to-DMX adapter — specifically the popular **Enttec USB DMX Pro** box. You plug it into your computer's USB port, and a DMX cable runs from it to your lights.
- **The lights themselves** — anything DMX-compatible: LED par cans, moving heads, dimmers, smoke machines, etc.

Good news for trying it out: PTAH has a **built-in "debug" preview mode**, so you can design and test a whole show *on screen, with no lights and no adapter plugged in.* When the real adapter is connected, the exact same show drives the physical lights.

## What it's like to open it

You start PTAH with a single command, and it quietly launches everything it needs in the background, then **pops open a control panel in your web browser** automatically. (When you're done, closing it shuts everything back down cleanly.)

The home screen is deliberately simple — just three buttons:

- **Shows**
- **Programs**
- **Settings**

That's the whole app. Everything you do lives under those three ideas.

## The three core ideas

### 1. Programs — your reusable "light effects"

A **Program** is a single effect you build on a visual canvas, by dragging out little boxes and connecting them with wires — no typing, no code. It's a lot like a wiring diagram, or the patch-cable synthesizers you may have seen. Each box has one job. There are three families:

**Inputs (where a value comes from):**
- **Velocity** — *how hard you hit the key.* A soft press → dim; a hard press → bright.
- **Control** — *the position of a specific knob or slider* on your controller.
- **Time** — a steady internal heartbeat, used to make things move and animate on their own (pulsing, sweeping, etc.).
- **Constant** — just a fixed number you set yourself.

**Effects (which reshape the value):**
- **ADSR** — an "envelope" borrowed from synthesizers. It controls the *shape of a fade over time*: how fast the light comes up (Attack), eases back (Decay), how bright it holds (Sustain), and how it fades out when you let go (Release). This is what gives you smooth, musical-feeling swells instead of hard on/off.
- **Math** — combine or bend values: add, multiply, take a sine wave (for smooth oscillating waves), round numbers off, and so on. This is the engine behind rhythmic, wave-like movement.
- **Distortion** — adds wobble, grit, and texture to a value, for less "perfect," more organic-looking movement.

**Output:**
- **Result** — the end of the chain. Whatever value arrives here becomes the final brightness/intensity sent to a light.

So a typical Program reads like a sentence: *"Take how hard I pressed the key → smooth it with an ADSR fade → send that to the output."* You build it once, name it, and reuse it.

### 2. Shows — a complete performance setup

A **Show** is everything you need for one gig or one song, packaged together. It bundles three things:

- **Programs** — which of your effects this show uses.
- **Patch** — *which effect drives which physical light.* Lighting people call each light's address a "channel," and PTAH supports the full standard set of **512 channels** (one "universe"). The patch is where you say "this effect → channel 5," "that effect → channels 10 and 11," and so on. One effect can even feed many lights at once.
- **Mapping** — *which key or control on your MIDI controller triggers which program.* This is how you decide that pressing C3 fires the strobe effect while pressing D3 fires the slow blue swell.

PTAH also gives each show a **dashboard** so you can see what's happening live while you play.

### 3. Settings — connecting your gear

A short setup screen where you tell PTAH the practical details: which **MIDI channel** to listen on (1–16), the name of its MIDI input, and which web address the control panel opens on. Sensible defaults are filled in, so most people barely touch this.

## How it all flows, from finger to light

When you're performing, this happens dozens of times a second, far faster than the eye can see:

1. You press a key or move a control on your MIDI gear.
2. PTAH catches that signal and looks up, in your **mapping**, which Program it should trigger.
3. It runs that Program's wiring — pulling in your velocity/knob values, animating with time, shaping everything through the effects.
4. The final result is converted into a standard lighting value (0 = off, up to 255 = full).
5. Using your **patch**, PTAH sends those values out — through the USB-DMX adapter — to exactly the right lights.
6. Your lights respond instantly. To keep everything smooth, PTAH refreshes the lights about **40 times every second**.

It's also built to be sturdy during a live show: if a calculation ever produces a nonsensical value, PTAH quietly cleans it up rather than letting a light flicker or glitch.

## Where your work is saved

Everything you create — your settings, your effects, your shows — is stored as ordinary files on your own computer, in a hidden folder called **`.ptah`**. They're yours: easy to back up, copy to another machine, or keep forever. PTAH is even careful to keep your old files working when the app updates — it automatically upgrades them and keeps a backup of the original, just in case.

---

**In short:** PTAH turns your computer plus a MIDI controller into a hands-on lighting instrument. You design reusable light effects by visually wiring together simple building blocks, decide which keys trigger them and which lights they control, and then perform your lighting live, in time with the music — with everything saved as your own files and a screen-only preview mode for practising without any equipment.
