import React from 'react';
import { motion } from 'framer-motion';

interface CustomGuitarChordProps {
  chordName: string;
  isMinor: boolean;
  extension: string;
}

// Guitar string notes (from bottom to top: E A D G B E)
const GUITAR_STRINGS = [
  { name: 'E', notes: ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'] },
  { name: 'A', notes: ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'] },
  { name: 'D', notes: ['D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#'] },
  { name: 'G', notes: ['G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#'] },
  { name: 'B', notes: ['B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#'] },
  { name: 'E', notes: ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'] }
];

// Basic chord patterns (fret positions for each string, 0 = open, -1 = muted)
const CHORD_PATTERNS: { [key: string]: number[] } = {
  // Major chords
  'C': [0, 3, 2, 0, 1, 0],     // C major
  'D': [-1, -1, 0, 2, 3, 2],   // D major
  'E': [0, 2, 2, 1, 0, 0],     // E major
  'F': [1, 3, 3, 2, 1, 1],     // F major
  'G': [3, 2, 0, 0, 3, 3],     // G major
  'A': [-1, 0, 2, 2, 2, 0],    // A major
  'B': [-1, 2, 4, 4, 4, 2],    // B major
  
  // Minor chords
  'Cm': [-1, 3, 5, 5, 4, 3],   // C minor
  'Dm': [-1, -1, 0, 2, 3, 1],  // D minor
  'Em': [0, 2, 2, 0, 0, 0],    // E minor
  'Fm': [1, 3, 3, 1, 1, 1],    // F minor
  'Gm': [3, 5, 5, 3, 3, 3],    // G minor
  'Am': [-1, 0, 2, 2, 1, 0],   // A minor
  'Bm': [-1, 2, 4, 4, 3, 2],   // B minor
  
  // Sharp/Flat major chords
  'C#': [-1, 4, 6, 6, 6, 4],   // C# major
  'D#': [-1, -1, 1, 3, 4, 3],  // D# major
  'F#': [2, 4, 4, 3, 2, 2],    // F# major
  'G#': [4, 6, 6, 5, 4, 4],    // G# major
  'A#': [-1, 1, 3, 3, 3, 1],   // A# major
  
  // Sharp/Flat minor chords
  'C#m': [-1, 4, 6, 6, 5, 4],  // C# minor
  'D#m': [-1, -1, 1, 3, 4, 2], // D# minor
  'F#m': [2, 4, 4, 2, 2, 2],   // F# minor
  'G#m': [4, 6, 6, 4, 4, 4],   // G# minor
  'A#m': [-1, 1, 3, 3, 2, 1],  // A# minor
};

const CustomGuitarChord: React.FC<CustomGuitarChordProps> = ({ chordName, isMinor, extension }) => {
  // Generate chord key for lookup
  const getChordKey = (): string => {
    let key = chordName;
    if (isMinor) key += 'm';
    // For now, ignore extensions and use basic chord
    return key;
  };

  // Get chord pattern
  const chordKey = getChordKey();
  const chordPattern = CHORD_PATTERNS[chordKey] || CHORD_PATTERNS['Am']; // Default to Am if not found

  // Generate display name
  const getDisplayName = (): string => {
    let name = chordName;
    if (isMinor) name += 'm';
    if (extension !== 'clean') {
      const extMap: { [key: string]: string } = {
        '7th': '7',
        '9th': '9',
        '11th': '11',
        '13th': '13'
      };
      name += extMap[extension] || '';
    }
    return name;
  };

  return (
    <motion.div 
      className="custom-guitar-chord"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="guitar-chord-title">{getDisplayName()} Guitar Chord</h3>
      
      <div className="guitar-fretboard">
        <svg width="300" height="200" viewBox="0 0 300 200">
          {/* Fret lines (vertical) */}
          {[0, 1, 2, 3, 4].map(fret => (
            <line
              key={`fret-${fret}`}
              x1={50 + fret * 50}
              y1={20}
              x2={50 + fret * 50}
              y2={180}
              stroke="#666"
              strokeWidth={fret === 0 ? "3" : "1"}
            />
          ))}
          
          {/* String lines (horizontal) */}
          {GUITAR_STRINGS.map((string, index) => (
            <g key={`string-${index}`}>
              <line
                x1={50}
                y1={30 + index * 25}
                x2={250}
                y2={30 + index * 25}
                stroke="#333"
                strokeWidth="2"
              />
              {/* String label */}
              <text
                x={30}
                y={35 + index * 25}
                fill="white"
                fontSize="14"
                fontFamily="Montserrat"
                textAnchor="middle"
              >
                {string.name}
              </text>
            </g>
          ))}
          
          {/* Chord dots */}
          {chordPattern.map((fret, stringIndex) => {
            if (fret > 0) {
              return (
                <motion.circle
                  key={`dot-${stringIndex}`}
                  cx={50 + (fret - 0.5) * 50}
                  cy={30 + stringIndex * 25}
                  r="8"
                  fill="#009688"
                  stroke="#ffffff"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: stringIndex * 0.1, duration: 0.3 }}
                />
              );
            } else if (fret === 0) {
              // Open string indicator
              return (
                <motion.circle
                  key={`open-${stringIndex}`}
                  cx={25}
                  cy={30 + stringIndex * 25}
                  r="6"
                  fill="none"
                  stroke="#009688"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: stringIndex * 0.1, duration: 0.3 }}
                />
              );
            }
            return null;
          })}
          
          {/* Fret numbers */}
          {[1, 2, 3, 4].map(fret => (
            <text
              key={`fret-num-${fret}`}
              x={50 + (fret - 0.5) * 50}
              y={195}
              fill="rgba(255, 255, 255, 0.6)"
              fontSize="12"
              fontFamily="Montserrat"
              textAnchor="middle"
            >
              {fret}
            </text>
          ))}
        </svg>
      </div>
      
      {/* Chord info */}
      <div className="chord-info">
        <p className="chord-notes">
          Notes: {chordPattern.map((fret, index) => {
            if (fret >= 0) {
              const note = GUITAR_STRINGS[index].notes[fret];
              return note;
            }
            return null;
          }).filter(Boolean).join(', ')}
        </p>
      </div>
    </motion.div>
  );
};

export default CustomGuitarChord;
