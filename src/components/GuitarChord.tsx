import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface GuitarChordProps {
  chordName: string;
  isMinor: boolean;
  extension: string;
}

const GuitarChord: React.FC<GuitarChordProps> = ({ chordName, isMinor, extension }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Format the chord name for the API
  const formatChordName = (): string => {
    // Convert the chord to the format expected by the API
    let formattedName = chordName;
    
    // Add minor indicator if needed
    if (isMinor) {
      formattedName += 'm';
    }
    
    // Add extension if it's not 'clean'
    if (extension !== 'clean') {
      // Convert extension format from our app to API format
      const extMap: { [key: string]: string } = {
        '7th': '7',
        '9th': '9',
        '11th': '11',
        '13th': '13'
      };
      formattedName += extMap[extension] || '';
    }
    
    return formattedName;
  };

  // Generate the API URL
  const getChordImageUrl = (): string => {
    const chord = formatChordName();
    // Use the scales-chords.com API
    return `https://www.scales-chords.com/chord-charts/guitar-chord-${chord}-1.png`;
  };

  // Reset loading state when chord parameters change
  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
  }, [chordName, isMinor, extension]);

  return (
    <motion.div 
      className="guitar-chord-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="guitar-chord-title">Guitar Chord</h3>
      
      <div className="guitar-chord-diagram">
        {isLoading && <div className="loading-spinner">Loading...</div>}
        
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        
        <img 
          src={getChordImageUrl()}
          alt={`${formatChordName()} guitar chord`}
          style={{ display: isLoading ? 'none' : 'block' }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setErrorMessage('Unable to load chord diagram');
          }}
          width="180"
          height="240"
        />
      </div>
    </motion.div>
  );
};

export default GuitarChord;
