---
name: Khmer Sonic Studio
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#3d4a43'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a73'
  outline-variant: '#bccac1'
  surface-tint: '#006c50'
  primary: '#006c50'
  on-primary: '#ffffff'
  primary-container: '#3db88f'
  on-primary-container: '#004330'
  inverse-primary: '#65dbb0'
  secondary: '#00668a'
  on-secondary: '#ffffff'
  secondary-container: '#40c2fd'
  on-secondary-container: '#004d6a'
  tertiary: '#4c635c'
  on-tertiary: '#ffffff'
  tertiary-container: '#91aaa2'
  on-tertiary-container: '#283f39'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#83f8cb'
  primary-fixed-dim: '#65dbb0'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#cee8df'
  tertiary-fixed-dim: '#b3ccc3'
  on-tertiary-fixed: '#081f1a'
  on-tertiary-fixed-variant: '#344b45'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

The design system is crafted for a cutting-edge Khmer AI Voice & Lyric Creation mobile application. The brand aesthetic merges ancient cultural resonance with forward-thinking generative audio technology. Its personality is poised, serene, effortless, and deeply focused on creative flow. 

The visual style is **Soft Minimalist / Tactile Light**. By pairing expansive, luminous negative space with featherweight borders and hyper-tactile pill geometry, the interface delivers an uncluttered studio environment directly in the palm of the user's hand. Visual friction is systematically eliminated: there are no heavy skeuomorphic extrusions, aggressive neon accents, or crushing drop shadows. Instead, subtle tonal shifts, crisp structural hairline rules, and refreshing mint-to-sky gradients evoke a calm, inspiring sanctuary where musicians, lyricists, and content creators can craft Cambodian vocals, explore vocal synthesis models, and structure musical compositions seamlessly.

## Colors

The palette establishes an airy, crystalline studio canvas punctuated by restorative botanical mints and atmospheric sky blues. 

### Palette Architecture
- **Primary (`#3DB88F`):** Studio Mint. Used as the core creative action color—primary playback buttons, active lyric capture indicators, primary CTA states, and voice synthesis triggers.
- **Secondary (`#38BDF8`):** Atmospheric Sky. Expresses technical intelligence; utilized for AI engine markers, live waveform visualizer peaks, secondary audio stems, and lyric timestamp scrubbers.
- **Tertiary (`#D6F0E7`):** Mint Milk. A soft tinted wash used for active pill tab fills, highlighted text selections, and subtle pill container backgrounds. Complemented by `#E8F8F2` for ambient card fills.
- **Neutral Core (`#1F2937`):** Charcoal Slate. Serves as the high-contrast foundational ink for headers, primary lyric typography, and active icons, ensuring optimal legibility against bright backgrounds. Secondary text relies on `#4B5563`, and muted subtext/metadata on `#9CA3AF`.
- **Canvas & Surfaces:** Base canvas spans Pure White (`#FFFFFF`) with secondary backing in warm airy grays (`#FAFAFA` and `#F4F6F5`). Hairline perimeter framing uses soft gray (`#E5E7EB`).

## Typography

The typography strategy addresses the dual demand of high-clarity Latin engine terms (e.g., Suno, VoxCMP2, 44.1kHz, BPM) and intricate Khmer script morphology.

### Script Integration Guidelines
- **Primary & Latin Script:** `Plus Jakarta Sans` is employed for numerals, track durations, model tags, and technical labels due to its open apertures and crisp, geometric stance.
- **Khmer Language Stack:** At the application build and font-declaration level, Khmer script strings fall back to `Kantumruy Pro` (or `Battambang`). 
- **Vertical Metrics for Khmer:** Because Khmer characters feature stacked sub-consonants and diacritics, all line heights (`lineHeight`) must remain at least 1.4x to 1.6x the font size. Khmer body text should default to minimum `15px` to guarantee legibility of complex ligature clusters.
- **Lyric Teleprompter Hierarchy:** For live lyric generation and playback, active verses utilize `headline-md` (`20px`) with high-contrast Charcoal (`#1F2937`), while inactive upcoming verses transition to `body-lg` at 40% opacity (`#9CA3AF`).

## Layout & Spacing

The layout philosophy implements a **Fluid Mobile-First Grid** tuned specifically for one-handed handheld ergonomics and fluid audio workspace workflows.

### Mobile Grid & Safe Framing
- **Outer Canvas Margins:** Strict `1.25rem` (20px) margins keep interface elements well inside modern mobile edge sweeps and thumb zones.
- **Component Gutters:** `1rem` (16px) separation between columns in modular control arrays (e.g., dual pitch/reverb dials, 2-column voice style selectors).
- **Rhythmic Rhythm Scale:**
  - `space-xs` (4px): Micro-gaps between audio duration labels and scrub pin dots.
  - `space-sm` (8px): Internal tag padding and horizontal gap between voice chip avatars and labels.
  - `space-md` (12px): Standard inner padding for control pills and input icons.
  - `space-lg` (20px): Inner padding for floating studio panels, lyric generation cards, and section header margins.
  - `space-xl` (28px): Spatial separation between distinct workflow blocks (e.g., prompt input to generated vocal stems).

## Elevation & Depth

To sustain a weightless, pure minimalist ethos, this design system completely eliminates dense, muddy, or dark drop shadows. Depth is achieved via **Tonal Stacking and Delicate Micro-Borders**.

### Surface Hierarchy
1. **Base Ground (Level 0):** Pure `#FFFFFF` or airy `#FAFAFA`. This represents the endless canvas.
2. **Elevated Card Surface (Level 1):** Flat `#FFFFFF` or tinted `#F4F6F5` surrounded by a uniform `1px` subtle outline in `#E5E7EB`.
3. **Interactive Control Pods (Level 2):** Floating playback docks and audio scrubbing trays sit on ultra-translucent surfaces with high-diffusion ambient lift: `0px 8px 24px -4px rgba(61, 184, 143, 0.08)`. The tinted shadow ensures visual softness without muddiness.
4. **Transient Overlays (Level 3):** Modal bottom sheets for AI model parameters utilize crisp `#FFFFFF` surfaces with subtle top hairline borders (`#E5E7EB`) resting over a softly dimmed, light backdrop (`rgba(31, 41, 55, 0.18)` with `backdrop-filter: blur(8px)`).

## Shapes

The geometric identity relies on extreme softness and pill-shaped continuous curvature (`roundedness: 3`).

### Curvature Tokens
- **Pills (`rounded-full` / 9999px):** Applied to all interactive primary buttons, category filters, segment tabs, model selection badges, and playback transport controls.
- **Cards & Studio Trays (`rounded-3xl` / 1.5rem to 2rem):** Outer lyric canvas sheets, prompt entry panels, and AI vocal generation summary cards use generously rounded corners to emphasize a tactile, friendly, non-industrial character.
- **Inputs & Sliders (`rounded-2xl` / 1rem):** Secondary containers, audio parameter sliders, and prompt input boxes leverage generous rounding to feel soft and approachable.

## Components

### Buttons
- **Primary Studio Action (e.g., "Generate Lyrics / បង្កើតទំនុកច្រៀង"):** Fully rounded pill (`rounded-full`), solid `#3DB88F` background, crisp white `#FFFFFF` text (`label-lg`), height 52px. Active press state initiates a micro-scale down (`scale: 0.98`) and subtle tint deepen to `#339C79`.
- **Secondary / Action Pill:** Subtle background in `#E8F8F2` with `#3DB88F` text and an ultra-fine border (`1px solid #D6F0E7`).
- **Ghost Action:** Transparent background, `#1F2937` text, no borders, with active hover or tap revealing a soft `#F4F6F5` highlight.

### Chips & Segmented Tabs
- **Segmented Switcher (e.g., Khmer Voice Models / VoxCMP2 / Suno V3):** Enclosed inside a continuous `#F4F6F5` pill tray. The active item snaps forward as a pure `#FFFFFF` pill with a micro-border of `#E5E7EB` and subtle `#1F2937` text; inactive tabs use `#9CA3AF` text.
- **Tags & Genre Chips:** Pill-shaped badges using soft pastel sky (`#B3E5FC` at 20% opacity) or soft mint (`#D6F0E7`), with `label-sm` text in `#1F2937`.

### Cards & Generation Trays
- **Lyric Display Card:** Background `#FFFFFF`, rounded with `rounded-3xl`, bordered with delicate `1px solid #E5E7EB`. Ample internal padding (`space-lg`). Active singing line glows with a faint background highlight (`#E8F8F2`) and a vertical 3px indicator pill in `#3DB88F`.
- **Vocal Stem Card:** Features secondary gray backing (`#FAFAFA`) with an integrated waveform visualizer canvas.

### Input Fields
- **Lyric & Prompt Box:** Clean white canvas (`#FFFFFF`) with a continuous border of `1px solid #E5E7EB`. Focused state smoothly transitions border to `#3DB88F` with an outer ring of `3px rgba(61, 184, 143, 0.15)`. Placeholder text in `#9CA3AF` supporting bilingual Khmer and English text hints.

### Audio Waveform Visualizers
- **Waveform Track Bars:** Vertical rounded micro-bars (width 2.5px to 3px) spaced by 2px. Unplayed segments are tinted soft `#E5E7EB`; elapsed audio transforms into alternating Studio Mint (`#3DB88F`) and Sky Blue (`#38BDF8`).
- **Scrubber Thumb:** A 14px solid white circle featuring a `2px solid #3DB88F` rim.

### Checkboxes, Radios & Switches
- **Switches (AI Mode Toggles):** 48px by 28px pill track. Off state is `#E5E7EB` with a white round handle. On state fills the track with `#3DB88F`, translating the handle smoothly with a fluid spring curve.
- **Selection Checks:** Circular radio pill with a central `#3DB88F` dot when selected, surrounded by an airy `#D6F0E7` buffer ring.