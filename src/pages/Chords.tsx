import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import GuitarChordVisualizer from '../components/GuitarChordVisualizer';
import '../App.css';

type ChordExtension = 'clean' | '7th' | '9th' | '11th' | '13th';

// Note definitions for 2 octaves (C to C)
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];

// Position black keys between white keys
// Each white key takes up (100% / 15 keys) = 6.67% of the width
// Black keys should be positioned at the boundary between white keys
const BLACK_KEYS = [
  { note: 'C#', position: 0.5, octave: 1 }, // Between C(0) and D(1)
  { note: 'D#', position: 1.5, octave: 1 }, // Between D(1) and E(2)
  { note: 'F#', position: 3.5, octave: 1 }, // Between F(3) and G(4)
  { note: 'G#', position: 4.5, octave: 1 }, // Between G(4) and A(5)
  { note: 'A#', position: 5.5, octave: 1 }, // Between A(5) and B(6)
  { note: 'C#', position: 7.5, octave: 2 }, // Between C(7) and D(8)
  { note: 'D#', position: 8.5, octave: 2 }, // Between D(8) and E(9)
  { note: 'F#', position: 10.5, octave: 2 }, // Between F(10) and G(11)
  { note: 'G#', position: 11.5, octave: 2 }, // Between G(11) and A(12)
  { note: 'A#', position: 12.5, octave: 2 }, // Between A(12) and B(13)
];

// Third octave keys (for extensions)
const THIRD_OCTAVE_WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const THIRD_OCTAVE_BLACK_KEYS = [
  { note: 'C#', position: 0.5, octave: 3 },
  { note: 'D#', position: 1.5, octave: 3 },
  { note: 'F#', position: 3.5, octave: 3 },
  { note: 'G#', position: 4.5, octave: 3 },
  { note: 'A#', position: 5.5, octave: 3 },
];

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Music theory: calculate chord notes for realistic piano playing
// Left hand: Root in lower octave, Right hand: Always root + triad + selected extension only
const getChordNotes = (root: string, isMinor: boolean, extension: ChordExtension = 'clean'): { note: string; octave: number }[] => {
  const rootIndex = ALL_NOTES.indexOf(root);
  const thirdInterval = isMinor ? 3 : 4; // Minor 3rd = 3 semitones, Major 3rd = 4 semitones
  const fifthInterval = 7; // Perfect 5th = 7 semitones
  
  // Base chord: Left hand root + Right hand root + 3rd + 5th
  const notes = [
    // Left hand: Root in lower octave (octave 1)
    { note: ALL_NOTES[rootIndex], octave: 1 },
    // Right hand: Always include root in octave 2
    { note: ALL_NOTES[rootIndex], octave: 2 },
    // 3rd and 5th in octave 2
    { note: ALL_NOTES[(rootIndex + thirdInterval) % 12], octave: 2 },
    { note: ALL_NOTES[(rootIndex + fifthInterval) % 12], octave: 2 },
  ];

  // Add only the specific extension selected
  switch (extension) {
    case '7th':
      const seventhInterval = isMinor ? 10 : 11; // Minor 7th = 10, Major 7th = 11
      notes.push({ note: ALL_NOTES[(rootIndex + seventhInterval) % 12], octave: 2 });
      break;
    case '9th':
      // 9th = 2nd up an octave (2 semitones + 12 = 14 semitones)
      notes.push({ note: ALL_NOTES[(rootIndex + 2) % 12], octave: 3 });
      break;
    case '11th':
      // 11th = 4th up an octave (5 semitones + 12 = 17 semitones)
      notes.push({ note: ALL_NOTES[(rootIndex + 5) % 12], octave: 3 });
      break;
    case '13th':
      // 13th = 6th up an octave (9 semitones + 12 = 21 semitones)
      notes.push({ note: ALL_NOTES[(rootIndex + 9) % 12], octave: 3 });
      break;
    // 'clean' case: no extension added
  }

  return notes;
};



const Chords = () => {
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [isMinor, setIsMinor] = useState(false);
  const [extension, setExtension] = useState<ChordExtension>('clean');
  const [showThirdOctave, setShowThirdOctave] = useState(false);
  const navigate = useNavigate();

  // Calculate current chord notes
  const chordNotes = getChordNotes(selectedRoot, isMinor, extension);

  // Determine if third octave is needed based on chord notes
  useEffect(() => {
    const needsThirdOctave = chordNotes.some(note => note.octave === 3);
    setShowThirdOctave(needsThirdOctave);
  }, [chordNotes]);

  // Cycle through chord extensions
  const cycleExtension = () => {
    const extensions: ChordExtension[] = ['clean', '7th', '9th', '11th', '13th'];
    const currentIndex = extensions.indexOf(extension);
    const nextIndex = (currentIndex + 1) % extensions.length;
    setExtension(extensions[nextIndex]);
  };

  const handleBack = () => {
    navigate('/', { state: { showMenu: true } });
  };

  const toggleChordType = () => {
    setIsMinor(!isMinor);
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: "tween" as const,
    ease: "anticipate" as const,
    duration: 0.5
  };

  return (
    <motion.div 
      className="page-container"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <motion.button 
        className="back-button"
        onClick={handleBack}
        whileTap={{ scale: 0.9 }}
      >
        <FiArrowLeft size={24} />
      </motion.button>
      
      {/* Chords Container */}
      <div className="chords" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '25px',
        margin: '0 auto',
        width: 'fit-content',
        background: 'rgba(30, 30, 30, 0.3)'
      }}>
        
        {/* Visualizer Container */}
        <div className="visualizer-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          
          {/* Piano Container */}
          <motion.div className="piano-container" style={{
            padding: '15px',
            background: 'rgba(40, 40, 40, 0.5)',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
          }}>
            <div className="keyboard-container">
              <div className="keyboard" style={{
                width: '600px',
                display: 'flex',
                position: 'relative'
              }}>
                {/* All White Keys */}
                {[...WHITE_KEYS, ...(showThirdOctave ? THIRD_OCTAVE_WHITE_KEYS : [])].map((note, index) => {
                  // Determine octave - first 7 keys are octave 1, next 7 are octave 2, rest are octave 3
                  const octave = index < 7 ? 1 : (index < 14 ? 2 : 3);
                  const isChordNote = chordNotes.some(chord => chord.note === note && chord.octave === octave);
                  const isThirdOctave = octave === 3;
                  
                  return (
                    <motion.div 
                      key={`white-${index}`} 
                      className={`white-key ${isThirdOctave ? 'third-octave-key' : ''}`}
                      style={{ width: '30px', height: '150px' }}
                      // Only animate third octave keys
                      {...(isThirdOctave ? {
                        initial: { opacity: 0, scaleX: 0, transformOrigin: 'left' },
                        animate: showThirdOctave ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 },
                        exit: { opacity: 0, scaleX: 0 },
                        transition: { duration: 0.5, ease: 'easeInOut' }
                      } : {})}
                    >
                      <AnimatePresence>
                        {isChordNote && (
                          <motion.div
                            className="chord-dot"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                
                {/* All Black Keys */}
                {[...BLACK_KEYS, ...(showThirdOctave ? THIRD_OCTAVE_BLACK_KEYS.map(key => ({
                  ...key,
                  position: key.position + 14 // Offset by the number of white keys in octaves 1 and 2
                })) : [])].map((keyInfo, index) => {
                  const isThirdOctave = keyInfo.octave === 3;
                  const isChordNote = chordNotes.some(chord => 
                    chord.note === keyInfo.note && chord.octave === keyInfo.octave
                  );
                  
                  // Calculate position relative to the entire keyboard
                  const totalWhiteKeys = WHITE_KEYS.length + (showThirdOctave ? THIRD_OCTAVE_WHITE_KEYS.length : 0);
                  
                  return (
                    <motion.div 
                      key={`black-${index}`} 
                      className={`black-key ${isThirdOctave ? 'third-octave-key' : ''}`}
                      style={{ 
                        left: `${(isThirdOctave ? keyInfo.position : (keyInfo.position + 0.5)) / totalWhiteKeys * 100}%`,
                        // Keep black key positioned correctly
                        display: showThirdOctave || !isThirdOctave ? 'flex' : 'none'
                      }}
                      // Only animate third octave keys
                      {...(isThirdOctave ? {
                        initial: { opacity: 0, scaleX: 0, transformOrigin: 'left' },
                        animate: showThirdOctave ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 },
                        exit: { opacity: 0, scaleX: 0 },
                        transition: { duration: 0.5, ease: 'easeInOut' }
                      } : {})}
                    >
                      <AnimatePresence>
                        {isChordNote && (
                          <motion.div
                            className="chord-dot black-key-dot"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Guitar Container */}
          <motion.div className="guitar-container" style={{
            padding: '15px',
            background: 'rgba(40, 40, 40, 0.5)',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              width: '320px',
              height: '180px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <GuitarChordVisualizer 
                chordRoot={selectedRoot} 
                chordType={isMinor ? 'minor' : 'major'} 
                extension={extension} 
                width={320}
                height={180}
              />
            </div>
          </motion.div>
        </div>

        {/* Chord Controls - Horizontal Layout with Circular Buttons */}
        <div className="chord-controls" style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '30px',
          padding: '20px',
          background: 'rgba(40, 40, 40, 0.5)',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          margin: '20px auto 0',
          width: 'fit-content'
        }}>
          
          {/* Root Note Button */}
          <motion.button 
            onClick={() => {
              const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
              const currentIndex = notes.indexOf(selectedRoot);
              const nextIndex = (currentIndex + 1) % notes.length;
              setSelectedRoot(notes[nextIndex]);
            }}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            whileTap={{ scale: 0.9 }}
          >
            {selectedRoot}
          </motion.button>

          {/* Major/Minor Toggle */}
          <motion.button
            onClick={() => setIsMinor(!isMinor)}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              background: isMinor ? 'rgba(100, 100, 100, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            whileTap={{ scale: 0.9 }}
          >
            {isMinor ? 'Min' : 'Maj'}
          </motion.button>

          {/* Extension Cycle */}
          <motion.button
            onClick={cycleExtension}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: extension === 'clean' ? '10px' : '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            whileTap={{ scale: 0.9 }}
          >
            {extension === 'clean' ? 'Clean' : extension}
          </motion.button>

          {/* Voicings Button */}
          <motion.button
            disabled
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            whileTap={{ scale: 0.9 }}
          >
            Voice
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default Chords;
