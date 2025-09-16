# Radio Jamm V.2 - Core System Documentation

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Musical Note System](#musical-note-system)
3. [Chord Generation](#chord-generation)
4. [Chord Progressions](#chord-progressions)
5. [Metronome & Timing](#metronome--timing)
6. [Audio Processing](#audio-processing)
7. [Visualization](#visualization)
8. [Data Flow](#data-flow)

## Core Concepts

### 1. Note Representation
- **Scientific Pitch Notation**: Notes are represented using letters A-G with octave numbers (e.g., C4 = Middle C)
- **Semitone Mapping**: Each note has a corresponding semitone value (C4 = 60, C#4/Db4 = 61, etc.)
- **Enharmonic Equivalents**: Support for both sharp (#) and flat (b) note names

### 2. Musical Intervals
```
P1  m2  M2  m3  M3  P4  d5  P5  m6  M6  m7  M7  P8
 0   1   2   3   4   5   6   7   8   9  10  11  12
```

### 3. Chord Theory Implementation
- **Root Position**: Notes stacked in thirds
- **Inversions**: Different voicings of the same chord
- **Extensions**: Added notes beyond the basic triad (7th, 9th, 11th, 13th)

## Musical Note System

### Note Representation
```typescript
interface Note {
  name: string;    // e.g., 'C', 'C#', 'Db'
  octave: number;  // e.g., 4 (for middle C)
  midiNumber: number; // e.g., 60 for C4
}
```

### Note Utilities
1. **Note to Frequency**
   - Formula: `f(n) = 440 * (2^((n-69)/12))` where n is MIDI note number
   - A4 (69) = 440Hz

2. **Note Transposition**
   - Semitone shift: `transpose(note, semitones) => newNote`
   - Octave shift: `transposeOctave(note, octaves) => newNote`

3. **Note Validation**
   - Valid note names: A-G with optional #/b and octave
   - Enharmonic conversion: C#/Db, D#/Eb, etc.

## Chord Generation

### Core Algorithm
```typescript
function generateChord(root: string, quality: 'major'|'minor', extensions: string[]): Note[] {
  // 1. Convert root to base note (C4, D4, etc.)
  // 2. Calculate intervals based on chord quality
  // 3. Add extensions if specified
  // 4. Return array of Note objects
}
```

### Chord Qualities

#### Triads
| Quality | Formula    | Example (C)  | Intervals      | 
|---------|------------|--------------|----------------|
| Major   | 1-3-5      | C-E-G        | 0, 4, 7 semitones |
| Minor   | 1-♭3-5     | C-E♭-G       | 0, 3, 7 semitones |
| Dim     | 1-♭3-♭5    | C-E♭-G♭      | 0, 3, 6 semitones |
| Aug     | 1-3-♯5     | C-E-G♯       | 0, 4, 8 semitones |

#### Seventh Chords
| Quality     | Formula    | Example (C)  | Intervals           |
|-------------|------------|--------------|---------------------|
| Major 7    | 1-3-5-7    | C-E-G-B      | 0, 4, 7, 11 semitones|
| Dominant 7 | 1-3-5-♭7   | C-E-G-B♭     | 0, 4, 7, 10 semitones|
| Minor 7    | 1-♭3-5-♭7  | C-E♭-G-B♭    | 0, 3, 7, 10 semitones|
| Minor 7♭5  | 1-♭3-♭5-♭7 | C-E♭-G♭-B♭   | 0, 3, 6, 10 semitones|

### Extensions
- **Ninths (9)**: Add major 9th (14 semitones above root)
- **Elevenths (11)**: Add perfect 11th (17 semitones)
- **Thirteenths (13)**: Add major 13th (21 semitones)

### Project Structure
```
src/
├── components/      # Reusable UI components
├── pages/          # Page components
├── utils/          # Utility functions
└── lib/            # Third-party library integrations
```

## Chord Generation System

### Core Functionality
The chord generation system creates musical chords based on:
- Root note (e.g., C, D, E)
- Chord type (Major/Minor)
- Extensions (7th, 9th, 11th, 13th)

### Key Components

#### 1. `getChordNotes` Function
```typescript
function getChordNotes(
  root: string, 
  isMinor: boolean, 
  extension: ChordExtension = 'clean'
): { note: string; octave: number }[]
```

**Parameters:**
- `root`: The root note (e.g., 'C', 'D#')
- `isMinor`: Boolean indicating minor chord
- `extension`: Chord extension type ('clean' | '7th' | '9th' | '11th' | '13th')

**Returns:**
Array of note objects with their respective octaves

#### 2. Chord Progression Generator
- Generates progressions based on music theory rules
- Supports multiple genres (Pop, Rock, Jazz, etc.)
- Converts Roman numerals to actual chord names

### Music Theory Implementation
- **Major Scale Intervals**: W-W-H-W-W-W-H
- **Chord Formulas**:
  - Major: 1-3-5
  - Minor: 1-♭3-5
  - 7th: 1-3-5-♭7
  - 9th: 1-3-5-♭7-9
  - 11th: 1-3-5-♭7-9-11
  - 13th: 1-3-5-♭7-9-11-13

## Metronome System

### Features
- Adjustable BPM (40-240)
- Visual beat indicators
- Tap tempo functionality
- Sound customization (Drums/Shaker)

### Implementation
- Uses Web Audio API for precise timing
- Visual feedback with Framer Motion
- Custom sound engine in `MetronomeSound.ts`

## UI Components

### 1. `GuitarChordVisualizer`
- Renders chord diagrams for guitar
- Supports multiple chord types and voicings
- Interactive fretboard display

### 2. `MetronomeControls`
- BPM adjustment
- Play/Pause functionality
- Sound selection
- Visual beat indicators

### 3. `ChordProgressionGenerator`
- Generates chord progressions
- Genre-based progression patterns
- Interactive UI for progression exploration

## State Management

### Key State Variables
- `selectedRoot`: Currently selected root note
- `isMinor`: Chord type (major/minor)
- `extension`: Current chord extension
- `bpm`: Metronome speed
- `isPlaying`: Metronome playback state

## Deployment

### Requirements
- Node.js (v14+)
- npm or yarn

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```

### Building for Production
```bash
npm run build
```

## Troubleshooting

### Common Issues
1. **White Screen on Load**
   - Check for TypeScript errors in the console
   - Verify all dependencies are installed
   - Ensure proper environment variables are set

2. **Audio Not Playing**
   - Check browser permissions for audio
   - Verify audio files are in the correct location
   - Ensure Web Audio API is supported in the browser

3. **Performance Issues**
   - Limit animations on low-end devices
   - Use React.memo for expensive components
   - Optimize re-renders with useCallback/useMemo

## Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License
[Specify License]

---
*Documentation last updated: August 30, 2025*
