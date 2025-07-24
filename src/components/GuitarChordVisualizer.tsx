import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GuitarChordVisualizerProps {
  chordRoot: string;
  chordType: string;
  extension: string;
  width?: number;
  height?: number;
}

// Define chord positions - this could be expanded to a more comprehensive database
const chordPositions: Record<string, Record<string, number[][]>> = {
  'C': {
    'major': [[0, 3, 2, 0, 1, 0]], // Open C shape
    'minor': [[0, 3, 5, 5, 4, 3]]   // Cm barre shape
  },
  'C#': {
    'major': [[0, 4, 6, 6, 6, 4]], // C# major with open E string
    'minor': [[0, 4, 6, 6, 5, 4]]  // C# minor with open E string
  },
  'D': {
    'major': [[0, 0, 0, 2, 3, 2]], // Open D shape
    'minor': [[0, 0, 0, 2, 3, 1]]  // Dm open shape
  },
  'D#': {
    'major': [[0, 6, 8, 8, 8, 6]], // D# major with open E string
    'minor': [[0, 6, 8, 8, 7, 6]]  // D# minor with open E string
  },
  'E': {
    'major': [[0, 2, 2, 1, 0, 0]], // Open E shape
    'minor': [[0, 2, 2, 0, 0, 0]]  // Em open shape
  },
  'F': {
    'major': [[1, 3, 3, 2, 1, 1]], // F major barre
    'minor': [[1, 3, 3, 1, 1, 1]]  // Fm barre
  },
  'F#': {
    'major': [[2, 4, 4, 3, 2, 2]], // F# major barre
    'minor': [[2, 4, 4, 2, 2, 2]]  // F# minor barre
  },
  'G': {
    'major': [[3, 2, 0, 0, 0, 3]], // Open G shape
    'minor': [[3, 5, 5, 3, 3, 3]]  // Gm barre
  },
  'G#': {
    'major': [[4, 6, 6, 5, 4, 4]], // G# major barre
    'minor': [[4, 6, 6, 4, 4, 4]]  // G# minor barre
  },
  'A': {
    'major': [[0, 0, 2, 2, 2, 0]], // Open A shape
    'minor': [[0, 0, 2, 2, 1, 0]]  // Am open shape
  },
  'A#': {
    'major': [[0, 1, 3, 3, 3, 1]], // A# major with open E string
    'minor': [[0, 1, 3, 3, 2, 1]]  // A# minor with open E string
  },
  'B': {
    'major': [[0, 2, 4, 4, 4, 2]], // B major with open low E
    'minor': [[0, 2, 4, 4, 3, 2]]  // B minor with open low E
  }
};

// Strings from bottom to top (low E to high E)
const STRINGS = ['E', 'A', 'D', 'G', 'B', 'E'];

const GuitarChordVisualizer: React.FC<GuitarChordVisualizerProps> = ({
  chordRoot,
  chordType,
  // extension parameter not used after title removal
  width = 280,
  height = 220
}) => {
  // Get the positions for this chord
  const positions = chordPositions[chordRoot]?.[chordType.toLowerCase()] || [[-1, -1, -1, -1, -1, -1]];
  
  // Variables for drawing
  const stringSpacing = height / 7;
  const defaultFretCount = 5;
  const [displayedMaxFret, setDisplayedMaxFret] = useState(defaultFretCount);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Calculate if we need extended frets and how many
  const highestFret = Math.max(...positions[0].filter(fret => fret > 0));
  const needsExtension = highestFret > defaultFretCount;
  const targetMaxFret = needsExtension ? Math.max(highestFret, defaultFretCount) : defaultFretCount;
  
  // Always use the target max fret for spacing to avoid jumps
  const fretSpacing = width * 0.8 / Math.max(displayedMaxFret, targetMaxFret);
  
  // Handle extension animation with smooth transitions
  useEffect(() => {
    if (targetMaxFret !== displayedMaxFret) {
      setIsAnimating(true);
      // Immediately update the displayed max to prevent spacing jumps
      setDisplayedMaxFret(targetMaxFret);
      // Reset animation state after transition completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [targetMaxFret, displayedMaxFret]);
  
  // Animation variants using Framer Motion's types
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        when: "beforeChildren",
        staggerChildren: 0.05
      }
    }
  } as const;
  
  const childVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  } as const;
  
  const extendedFretVariants = {
    hidden: { 
      opacity: 0,
      scaleY: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    visible: {
      opacity: 0.8,
      scaleY: 1,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.1
      }
    }
  } as const;
  
  const extendedFretNumberVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.8,
      y: 8
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.3
      }
    }
  } as const;

  return (
    <motion.div 
      className="guitar-chord-visualizer"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Fretboard background */}
        <rect
          x={width * 0.1}
          y={35}
          width={width * 0.8}
          height={height - 55}
          fill="#2c2c2c"
          rx={5}
          ry={5}
          opacity={0.6}
        />

        {/* Strings - properly positioned with increased spacing */}
        {STRINGS.map((string, index) => {
          // More spread out positioning - add more margin at top and bottom
          const stringY = 50 + ((index) / (STRINGS.length - 1.5)) * (height - 80);
          return (
            <motion.g key={`string-${index}`} variants={childVariants}>
              {/* String line */}
              <line
                x1={width * 0.1}
                y1={stringY}
                x2={width * 0.9}
                y2={stringY}
                stroke="#999"
                strokeWidth={index === 0 ? 2.5 : index === 5 ? 1.5 : 2} // Thicker for bass strings
                opacity={0.7}
              />
              
              {/* String label - simple text without any outlines */}
              <text
                x={width * 0.05}
                y={stringY}
                fill="white"
                fontSize="12"
                fontFamily="'Montserrat', sans-serif"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {string}
              </text>
            </motion.g>
          );
        })}
        
        {/* All Frets with smooth layout animations */}
        {[...Array(displayedMaxFret + 1)].map((_, index) => {
          const isExtended = index > defaultFretCount;
          return (
            <motion.line
              key={`fret-${index}`}
              layout
              variants={isExtended ? extendedFretVariants : childVariants}
              initial={isExtended ? "hidden" : "visible"}
              animate="visible"
              exit="hidden"
              x1={width * 0.1 + index * fretSpacing}
              y1={50}
              x2={width * 0.1 + index * fretSpacing}
              y2={height - 20}
              stroke={index === 0 ? "#ccc" : "#888"}
              strokeWidth={index === 0 ? 3 : 1}
              transition={{
                layout: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }}
            />
          );
        })}
        

        
        {/* Default Fret numbers */}
        {[...Array(defaultFretCount)].map((_, index) => (
          <motion.text
            key={`fret-number-${index + 1}`}
            variants={childVariants}
            x={width * 0.1 + (index + 0.5) * fretSpacing}
            y={height - 5}
            fill="white"
            fontSize="10"
            textAnchor="middle"
            fontFamily="'Montserrat', sans-serif"
          >
            {index + 1}
          </motion.text>
        ))}
        
        {/* Fret numbers for extended frets only */}
        {[...Array(displayedMaxFret)].map((_, index) => {
          const fretIndex = index + 1;
          if (fretIndex <= defaultFretCount) return null; // Only show extended fret numbers
          
          return (
            <motion.text
              key={`fret-number-${fretIndex}`}
              layout
              variants={extendedFretNumberVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              x={width * 0.1 + (fretIndex - 0.5) * fretSpacing}
              y={height - 5}
              fill="white"
              fontSize="10"
              textAnchor="middle"
              fontFamily="'Montserrat', sans-serif"
              transition={{
                layout: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }}
            >
              {fretIndex}
            </motion.text>
          );
        })}
        
        {/* Finger positions */}
        {positions[0].map((fret, stringIndex) => {
          // Reverse the string index to match our flipped display
          const reverseStringIndex = 5 - stringIndex;
          
          // Skip muted strings
          if (fret === -1) {
            return (
              <motion.text
                key={`mute-${stringIndex}`}
                variants={childVariants}
                x={width * 0.05}
                y={50 + ((reverseStringIndex) / (STRINGS.length - 1.5)) * (height - 80)}
                fill="#ff6b6b"
                fontSize="16"
                fontFamily="'Montserrat', sans-serif"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="bold"
              >
                X
              </motion.text>
            );
          }
          
          // Open string
          if (fret === 0) {
            return (
              <motion.circle
                key={`open-${stringIndex}`}
                variants={childVariants}
                cx={width * 0.05}
                cy={50 + ((reverseStringIndex) / (STRINGS.length - 1.5)) * (height - 80)}
                r={8}
                stroke="white"
                strokeWidth={1.5}
                fill="transparent"
              />
            );
          }
          
          // Fretted note
          const xPos = width * 0.1 + (fret - 0.5) * fretSpacing;
          const yPos = 50 + ((reverseStringIndex) / (STRINGS.length - 1.5)) * (height - 80);
          
          return (
            <motion.g key={`finger-${stringIndex}`} variants={childVariants}>
              <circle
                cx={xPos}
                cy={yPos}
                r={12}
                fill="#4dabf7"
                stroke="#1c7ed6"
                strokeWidth={1.5}
              />
              <text
                x={xPos}
                y={yPos + 5}
                fill="white"
                fontSize="14"
                textAnchor="middle"
                fontFamily="'Montserrat', sans-serif"
              >
                {fret}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </motion.div>
  );
};

export default GuitarChordVisualizer;
