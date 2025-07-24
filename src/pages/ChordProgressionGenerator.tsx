import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import '../App.css';


// Define available genre types
type Genre = 'Pop/Rock' | 'Blues' | 'Jazz' | 'Reggae' | 'Top';

// Musical notes array
const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord progression database by genre
const CHORD_PROGRESSIONS = {
  'Pop/Rock': [
    { romanNumerals: ['I', 'V', 'vi', 'IV'], name: 'Pop Progression 1' },
    { romanNumerals: ['I', 'vi', 'IV', 'V'], name: 'Pop Progression 2' },
    { romanNumerals: ['vi', 'IV', 'I', 'V'], name: 'Pop Progression 3' },
    { romanNumerals: ['IV', 'I', 'V', 'vi'], name: 'Pop Progression 4' },
    { romanNumerals: ['I', 'IV', 'V'], name: 'Pop Progression 5' },
    { romanNumerals: ['V', 'IV'], name: 'Pop Progression 6' },
    { romanNumerals: ['I', 'V', 'ii', 'IV'], name: 'Pop Progression 7' },
    { romanNumerals: ['IV', 'V', 'I', 'vi'], name: 'Pop Progression 8' },
    { romanNumerals: ['I', 'V', 'IV', 'V'], name: 'Pop Progression 9' },
    { romanNumerals: ['I', 'V', 'IV', 'I'], name: 'Pop Progression 10' }
  ],
  'Blues': [
    { romanNumerals: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'V', 'I', 'I'], name: '12-Bar Blues' },
    { romanNumerals: ['I', 'IV', 'V'], name: 'Blues Progression 1' },
    { romanNumerals: ['ii', 'V', 'I'], name: 'Blues Progression 2' },
    { romanNumerals: ['IV', 'iv'], name: 'Blues Progression 3' },
    { romanNumerals: ['vi', 'V', 'IV', 'iii'], name: 'Blues Progression 4' },
    { romanNumerals: ['I', 'IV', 'I', 'V'], name: 'Blues Progression 5' },
    { romanNumerals: ['V', 'IV', 'I'], name: 'Blues Progression 6' },
    { romanNumerals: ['vi', 'IV', 'I', 'V'], name: 'Blues Progression 7' },
    { romanNumerals: ['ii', 'IV', 'V'], name: 'Blues Progression 8' },
    { romanNumerals: ['iii', 'vi', 'ii', 'V'], name: 'Blues Progression 9' }
  ],
  'Reggae': [
    { romanNumerals: ['I', 'V', 'vi', 'IV'], name: 'Reggae Progression 1' },
    { romanNumerals: ['ii', 'V', 'I'], name: 'Reggae Progression 2' },
    { romanNumerals: ['I', 'IV', 'V'], name: 'Reggae Progression 3' },
    { romanNumerals: ['vi', 'IV', 'I', 'V'], name: 'Reggae Progression 4' },
    { romanNumerals: ['I', 'ii', 'V', 'IV'], name: 'Reggae Progression 5' },
    { romanNumerals: ['I', 'V'], name: 'Reggae Progression 6' },
    { romanNumerals: ['I', 'IV', 'I', 'V'], name: 'Reggae Progression 7' },
    { romanNumerals: ['IV', 'V', 'I'], name: 'Reggae Progression 8' },
    { romanNumerals: ['I', 'iii', 'IV', 'V'], name: 'Reggae Progression 9' },
    { romanNumerals: ['I', 'bVII', 'IV'], name: 'Reggae Progression 10' }
  ],
  'Jazz': [
    { romanNumerals: ['ii', 'V', 'I'], name: 'Jazz Progression 1' },
    { romanNumerals: ['III', 'VI', 'ii', 'V'], name: 'Jazz Progression 2' },
    { romanNumerals: ['ii', 'V', 'I', 'ii', 'V', 'I'], name: 'Jazz Progression 3' },
    { romanNumerals: ['I', 'I#', 'ii', 'bIII'], name: 'Jazz Progression 4' },
    { romanNumerals: ['IV', 'iv'], name: 'Jazz Progression 5' },
    { romanNumerals: ['ii', 'V', 'i'], name: 'Jazz Progression 6' },
    { romanNumerals: ['I', 'vi', 'ii', 'V'], name: 'Jazz Progression 7' },
    { romanNumerals: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], name: 'Jazz Progression 8' },
    { romanNumerals: ['ii', 'bVII', 'I'], name: 'Jazz Progression 9' },
    { romanNumerals: ['I', 'bIII', 'bVI', 'I'], name: 'Jazz Progression 10' }
  ],
  'Top': [
    { romanNumerals: ['I', 'V', 'vi', 'IV'], name: 'Top Progression 1' },
    { romanNumerals: ['vi', 'IV', 'I', 'V'], name: 'Top Progression 2' },
    { romanNumerals: ['I', 'vi', 'IV', 'V'], name: 'Top Progression 3' },
    { romanNumerals: ['ii', 'V', 'I'], name: 'Top Progression 4' },
    { romanNumerals: ['I', 'IV', 'V'], name: 'Top Progression 5' },
    { romanNumerals: ['I', 'V', 'IV', 'V'], name: 'Top Progression 6' },
    { romanNumerals: ['IV', 'I', 'V', 'vi'], name: 'Top Progression 7' },
    { romanNumerals: ['I', 'IV', 'I', 'V'], name: 'Top Progression 8' },
    { romanNumerals: ['I', 'V', 'ii', 'IV'], name: 'Top Progression 9' },
    { romanNumerals: ['IV', 'V', 'I', 'vi'], name: 'Top Progression 10' }
  ]
};

// Scale degree patterns
const MAJOR_SCALE_PATTERN = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE_PATTERN = [0, 2, 3, 5, 7, 8, 10];

// Chord quality mapping for major and minor keys
const MAJOR_KEY_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
const MINOR_KEY_QUALITIES = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];

// Function to convert Roman numeral to chord name based on key
const romanToChord = (roman: string, root: string, isMajor: boolean): string => {
  const rootIndex = ALL_NOTES.indexOf(root);
  const scalePattern = isMajor ? MAJOR_SCALE_PATTERN : MINOR_SCALE_PATTERN;
  const qualities = isMajor ? MAJOR_KEY_QUALITIES : MINOR_KEY_QUALITIES;
  
  // Handle special cases and modifiers
  let degree = 0;
  let quality = '';
  let modifier = '';
  
  // Parse the Roman numeral
  if (roman.includes('b')) {
    // Flattened chord (e.g., bIII, bVII)
    modifier = 'b';
    roman = roman.replace('b', '');
  } else if (roman.includes('#')) {
    // Sharpened chord
    modifier = '#';
    roman = roman.replace('#', '');
  }
  
  // Determine scale degree
  switch (roman.toLowerCase()) {
    case 'i': degree = 0; break;
    case 'ii': degree = 1; break;
    case 'iii': degree = 2; break;
    case 'iv': degree = 3; break;
    case 'v': degree = 4; break;
    case 'vi': degree = 5; break;
    case 'vii': degree = 6; break;
    default: degree = 0;
  }
  
  // Adjust for modifiers
  let actualDegree = degree;
  if (modifier === 'b') {
    actualDegree = (actualDegree - 1 + 7) % 7;
  } else if (modifier === '#') {
    actualDegree = (actualDegree + 1) % 7;
  }
  
  // Calculate the note index
  let noteIndex = (rootIndex + scalePattern[actualDegree]) % 12;
  
  // Apply additional modifier offset
  if (modifier === 'b') {
    noteIndex = (noteIndex - 1 + 12) % 12;
  } else if (modifier === '#') {
    noteIndex = (noteIndex + 1) % 12;
  }
  
  // Get the note name
  const noteName = ALL_NOTES[noteIndex];
  
  // Determine chord quality based on case and position
  if (roman === roman.toLowerCase()) {
    // Lowercase Roman numeral typically indicates minor
    quality = 'Minor';
  } else if (roman.includes('°') || roman.includes('o')) {
    // Diminished chord
    quality = 'Diminished';
  } else {
    // Uppercase Roman numeral typically indicates major
    quality = 'Major';
  }
  
  // Handle specific qualities from the scale
  if (roman === roman.toLowerCase() && !modifier) {
    const scaleQuality = qualities[degree].toLowerCase();
    if (scaleQuality === 'diminished') {
      quality = 'Diminished';
    }
  }
  
  return `${noteName} ${quality}`;
};

const ChordProgressionGenerator = () => {
  // State variables
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [isMinor, setIsMinor] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre>('Top');
  const [progressions, setProgressions] = useState<string[][]>([]);
  const [currentProgressionIndices, setCurrentProgressionIndices] = useState<number[]>([]);
  const [showProgressions, setShowProgressions] = useState(false);
  const navigate = useNavigate();

  // Cycle through root notes
  const cycleRoot = () => {
    const currentIndex = ALL_NOTES.indexOf(selectedRoot);
    const nextIndex = (currentIndex + 1) % ALL_NOTES.length;
    setSelectedRoot(ALL_NOTES[nextIndex]);
    setShowProgressions(false);
  };

  // Toggle between major and minor
  const toggleMajorMinor = () => {
    setIsMinor(!isMinor);
    setShowProgressions(false);
  };

  // Cycle through genres
  const cycleGenre = () => {
    const genres: Genre[] = ['Pop/Rock', 'Blues', 'Jazz', 'Reggae', 'Top'];
    const currentIndex = genres.indexOf(selectedGenre);
    const nextIndex = (currentIndex + 1) % genres.length;
    setSelectedGenre(genres[nextIndex]);
    setShowProgressions(false);
  };

  // Generate chord progressions based on selected filters
  const generateProgressions = () => {
    const availableProgressions = CHORD_PROGRESSIONS[selectedGenre];
    
    // Get two random, unique progression indices
    const availableIndices = Array.from({ length: availableProgressions.length }, (_, i) => i);
    const randomIndices: number[] = [];
    
    // Select two random indices
    for (let i = 0; i < 2; i++) {
      if (availableIndices.length === 0) break;
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      randomIndices.push(availableIndices[randomIndex]);
      availableIndices.splice(randomIndex, 1);
    }
    
    // If we're refreshing and have run out of unique progressions, reset
    if (randomIndices.length < 2 && showProgressions) {
      // We've shown all progressions, start over
      const allIndices = Array.from({ length: availableProgressions.length }, (_, i) => i);
      // Filter out the currently displayed progressions
      const remainingIndices = allIndices.filter(i => !currentProgressionIndices.includes(i));
      
      for (let i = randomIndices.length; i < 2; i++) {
        if (remainingIndices.length === 0) break;
        const randomIndex = Math.floor(Math.random() * remainingIndices.length);
        randomIndices.push(remainingIndices[randomIndex]);
        remainingIndices.splice(randomIndex, 1);
      }
    }
    
    setCurrentProgressionIndices(randomIndices);
    
    // Convert Roman numerals to chord names
    const newProgressions = randomIndices.map(index => {
      const progression = availableProgressions[index];
      return progression.romanNumerals.map(numeral => 
        romanToChord(numeral, selectedRoot, !isMinor)
      );
    });
    
    setProgressions(newProgressions);
    setShowProgressions(true);
  };

  // Handle back button press
  const handleBack = async () => {
    // Wait for the fade-out animation to complete before navigating
    await new Promise(resolve => setTimeout(resolve, 200));
    // Navigate back to the main menu with the menu shown
    navigate('/', { state: { showMenu: true } });
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };
  
  const pageTransition = {
    duration: 0.25
  };

  return (
    <motion.div
      className="chord-progression-generator"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        maxWidth: '600px',
        minWidth: '320px',
        height: '400px',
        border: '2px solid white',
        borderRadius: '16px',
        padding: '20px',
        background: 'rgba(30, 30, 30, 0.5)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Back Button */}
      <motion.button 
        className="back-button fixed top-4 left-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg"
        onClick={handleBack}
        whileTap={{ scale: 0.9 }}
      >
        <FiArrowLeft size={24} />
      </motion.button>
      
      <div className="chord-controls" style={{
        background: 'rgba(40, 40, 40, 0.3)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '20px 15px',
        display: 'flex',
        flexWrap: 'nowrap',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        marginBottom: '20px'
      }}>
        {/* Root Note Selector */}
        <motion.button 
          className="chord-button"
          onClick={cycleRoot}
          whileTap={{ scale: 0.95 }}
          style={{
            whiteSpace: 'nowrap',
            minWidth: '60px'
          }}
        >
          <span className="button-text">{selectedRoot}</span>
        </motion.button>

        {/* Major/Minor Toggle */}
        <motion.button 
          className={`chord-button ${isMinor ? 'minor' : 'major'}`}
          onClick={toggleMajorMinor}
          whileTap={{ scale: 0.95 }}
          style={{
            whiteSpace: 'nowrap',
            minWidth: '80px'
          }}
        >
          <span className="button-text">{isMinor ? 'Minor' : 'Major'}</span>
        </motion.button>

        {/* Genre Selector */}
        <motion.button 
          className="chord-button"
          onClick={cycleGenre}
          whileTap={{ scale: 0.95 }}
          style={{
            whiteSpace: 'nowrap',
            minWidth: '80px',
            maxWidth: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          <span className="button-text">{selectedGenre}</span>
        </motion.button>

        {/* Search Button */}
        <motion.button 
          className="chord-button active"
          onClick={generateProgressions}
          whileTap={{ scale: 0.95 }}
          style={{
            whiteSpace: 'nowrap',
            minWidth: '80px',
            maxWidth: '100px'
          }}
        >
          <span className="button-text">Search</span>
        </motion.button>
      </div>

      <div className="generations" style={{
        backgroundColor: 'rgba(50, 50, 50, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        width: '100%',
        flex: 1,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {showProgressions ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%' }}
          >
            {progressions.map((progression, i) => (
              <div 
                key={i} 
                style={{
                  backgroundColor: 'rgba(30, 30, 30, 0.5)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: i < progressions.length - 1 ? '12px' : '0',
                  width: '100%',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <p style={{ fontSize: '1.125rem', textAlign: 'center', margin: 0 }}>
                  {progression.join(' - ')}
                </p>
              </div>
            ))}
          </motion.div>
        ) : (
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
            Click Search to generate chord progressions
          </div>
        )}
        {/* Refresh Button */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <motion.button
            style={{
              backgroundColor: 'rgba(40, 40, 40, 0.7)',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '14px',
              fontWeight: 500
            }}
            onClick={generateProgressions}
            whileTap={{ scale: 0.95 }}
            whileHover={{ backgroundColor: 'rgba(60, 60, 60, 0.8)' }}
          >
            <FiRefreshCw style={{ marginRight: '8px' }} /> Refresh
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChordProgressionGenerator;
