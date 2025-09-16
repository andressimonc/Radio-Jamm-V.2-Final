import { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { MetronomeControls } from '../components/MetronomeControls';
import Tuner from "../components/Tuner";
import GuitarChordVisualizer from "../components/GuitarChordVisualizer"; 
import '../App.css';

// Note definitions and music theory constants

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Third octave keys (for extensions)
const THIRD_OCTAVE_WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const THIRD_OCTAVE_BLACK_KEYS = [
  { note: 'C#', position: 0.5, octave: 3 },
  { note: 'D#', position: 1.5, octave: 3 },
  { note: 'F#', position: 3.5, octave: 3 },
  { note: 'G#', position: 4.5, octave: 3 },
  { note: 'A#', position: 5.5, octave: 3 },
];

type ChordExtension = 'clean' | '7th' | '9th' | '11th' | '13th';

// Music theory: calculate chord notes for realistic piano playing
const getChordNotes = (root: string, isMinor: boolean, extension: ChordExtension = 'clean'): { note: string; octave: number }[] => {
  const rootIndex = ALL_NOTES.indexOf(root);
  const thirdInterval = isMinor ? 3 : 4;
  const fifthInterval = 7;
  
  const notes = [
    { note: ALL_NOTES[rootIndex], octave: 1 },
    { note: ALL_NOTES[rootIndex], octave: 2 },
    { note: ALL_NOTES[(rootIndex + thirdInterval) % 12], octave: 2 },
    { note: ALL_NOTES[(rootIndex + fifthInterval) % 12], octave: 2 },
  ];

  switch (extension) {
    case '7th':
      const seventhInterval = isMinor ? 10 : 11;
      notes.push({ note: ALL_NOTES[(rootIndex + seventhInterval) % 12], octave: 2 });
      break;
    case '9th':
      notes.push({ note: ALL_NOTES[(rootIndex + 2) % 12], octave: 3 });
      break;
    case '11th':
      notes.push({ note: ALL_NOTES[(rootIndex + 5) % 12], octave: 3 });
      break;
    case '13th':
      notes.push({ note: ALL_NOTES[(rootIndex + 9) % 12], octave: 3 });
      break;
  }

  return notes;
};

// Add these helper functions for chord note generation
const getNoteIndex = (note: string): number => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return notes.indexOf(note);
};

const getChordNotesHelper = (root: string, type: string, extension: string = ''): string[] => {
  const notes: string[] = [];
  
  // Left hand: Just the root note in first octave
  notes.push(`${root}1`);
  
  // Right hand: Root, third, fifth in second octave
  const rootIndex = getNoteIndex(root);
  const thirdInterval = type === 'minor' ? 3 : 4;
  const fifthInterval = 7;
  
  notes.push(`${root}2`);
  notes.push(`${getNoteByInterval(rootIndex, thirdInterval)}2`);
  notes.push(`${getNoteByInterval(rootIndex, fifthInterval)}2`);
  
  // Add extension note in third octave if specified
  if (extension) {
    let extensionNote = '';
    
    if (extension.includes('7')) {
      const seventhInterval = type === 'minor' ? 10 : 11;
      extensionNote = getNoteByInterval(rootIndex, seventhInterval);
    } else if (extension.includes('9')) {
      extensionNote = getNoteByInterval(rootIndex, 2); // 2 semitones up from root
    } else if (extension.includes('11')) {
      extensionNote = getNoteByInterval(rootIndex, 5); // 5 semitones up from root
    } else if (extension.includes('13')) {
      extensionNote = getNoteByInterval(rootIndex, 9); // 9 semitones up from root
    }
    
    if (extensionNote) {
      notes.push(`${extensionNote}3`);
    }
  }
  
  return notes;
};

// Helper function to get note name by interval
const getNoteByInterval = (rootIndex: number, semitones: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return notes[(rootIndex + semitones) % 12];
};

const parseChord = (chord: string) => {
  // Handle common chord notations like C, Cm, Cmaj7, etc.
  const rootRegex = /^([A-G][#b]?)/;
  const typeRegex = /(?:m(?!a|i|o)|min|minor|maj|major|dim|aug)/i;
  const extensionRegex = /(?:7|9|11|13|maj7|min7|maj9|min9|add9|sus2|sus4|6|m6)/i;
  
  const rootMatch = chord.match(rootRegex);
  let typeMatch = chord.match(typeRegex);
  const extensionMatch = chord.match(extensionRegex);
  
  // Default to major if no type is specified
  const type = typeMatch ? 
    (typeMatch[0].toLowerCase().startsWith('m') ? 'minor' : 'major') : 
    'major';
  
  return {
    root: rootMatch ? rootMatch[0] : 'C',
    type: type,
    extension: extensionMatch ? extensionMatch[0] : ''
  };
};

function Home() {
  const location = useLocation();
  // Splash screen removed – always start with menu visible
  const [showMenu, setShowMenu] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedSoundRef = useRef<string | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  
  // Keep selectedSound ref in sync
  useEffect(() => {
    selectedSoundRef.current = selectedSound;
  }, [selectedSound]);
  // Animation state for UI transitions
  const [isAnimating] = useState(false);
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [isMinor, setIsMinor] = useState(false);
  const [extension, setExtension] = useState<ChordExtension>('clean');
  const [showThirdOctave, setShowThirdOctave] = useState(false);
  const navigate = useNavigate();
  
  // Calculate current chord notes
  const chordNotes = getChordNotes(selectedRoot, isMinor, extension);

  // Cleanup effect for audio resources
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Determine if third octave is needed based on chord notes
  useEffect(() => {
    const needsThirdOctave = chordNotes.some(note => note.octave === 3);
    setShowThirdOctave(needsThirdOctave);
  }, [chordNotes]);

  // Use layoutEffect to handle state changes before browser paint
  useLayoutEffect(() => {
    // If location state has showMenu=true, show the menu immediately
    if (location.state && (location.state as any).showMenu) {
      setShowMenu(true);
    }
  }, [location]);

  const handleCircleClick = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setTimeout(() => {
        setShowMenu(true);
        setIsPlaying(false);
      }, 500);
    }
  };

  const handleBackClick = () => {
    // Trigger smooth transition when going back to main view
    setIsPlaying(true);
    setTimeout(() => {
      setShowMenu(false);
      setIsPlaying(false);
    }, 200);
  };

  // Cycle through chord extensions
  const cycleExtension = () => {
    const extensions: ChordExtension[] = ['clean', '7th', '9th', '11th', '13th'];
    const currentIndex = extensions.indexOf(extension);
    const nextIndex = (currentIndex + 1) % extensions.length;
    setExtension(extensions[nextIndex]);
  };

  const toggleChordType = () => {
    setIsMinor(!isMinor);
  };

  // State for Chord Progression Generator
  const [progressionRoot, setProgressionRoot] = useState('C');
  const [progressionIsMinor, setProgressionIsMinor] = useState(false);
  const [genre, setGenre] = useState('Pop');
  const [progressions, setProgressions] = useState<string[][]>([]);
  const [showProgressions, setShowProgressions] = useState(false);
  const [selectedChord, setSelectedChord] = useState<{progressionIndex: number, chordIndex: number} | null>(null);
  const [selectedChordDetails, setSelectedChordDetails] = useState<{ root: string, type: string, extension: string } | null>(null);

  // Available genres for chord progressions
  const genres = ['Pop', 'Rock', 'Jazz', 'Blues', 'Electronic', 'Folk'];

  // Function to cycle through root notes for chord progressions
  const cycleProgressionRoot = () => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const currentIndex = notes.indexOf(progressionRoot);
    const nextIndex = (currentIndex + 1) % notes.length;
    setProgressionRoot(notes[nextIndex]);
  };

  // Function to toggle between major and minor for chord progressions
  const toggleProgressionMinor = () => {
    setProgressionIsMinor(!progressionIsMinor);
  };

  // Function to cycle through genres
  const cycleGenre = () => {
    const currentIndex = genres.indexOf(genre);
    const nextIndex = (currentIndex + 1) % genres.length;
    setGenre(genres[nextIndex]);
  };

  // Function to generate chord progressions based on root, mode, and genre
  const generateProgressions = () => {
    // Define common progressions for different genres
    const progressionsByGenre: { [key: string]: string[][] } = {
      'Pop': [
        ['I', 'V', 'vi', 'IV'],
        ['I', 'IV', 'V'],
        ['vi', 'IV', 'I', 'V'],
        ['I', 'V', 'IV', 'V']
      ],
      'Rock': [
        ['I', 'IV', 'V'],
        ['I', 'V', 'IV'],
        ['ii', 'IV', 'V'],
        ['I', 'bVII', 'IV']
      ],
      'Jazz': [
        ['ii', 'V', 'I'],
        ['I', 'vi', 'ii', 'V'],
        ['iii', 'VI', 'ii', 'V', 'I'],
        ['I', 'IV', 'iii', 'VI']
      ],
      'Blues': [
        ['I', 'IV', 'I', 'V', 'IV', 'I'],
        ['I', 'I7', 'IV', 'IV7', 'I', 'V7', 'I'],
        ['i', 'iv', 'i', 'V7', 'i'],
        ['I7', 'IV7', 'V7', 'IV7']
      ],
      'Electronic': [
        ['I', 'V', 'vi', 'IV'],
        ['vi', 'IV', 'I', 'V'],
        ['I', 'IV', 'ii', 'V'],
        ['i', 'VII', 'VI', 'V']
      ],
      'Folk': [
        ['I', 'V', 'I', 'IV'],
        ['i', 'VII', 'VI', 'V'],
        ['I', 'vi', 'ii', 'V'],
        ['I', 'V', 'vi', 'iii', 'IV']
      ]
    };

    // Get progressions for selected genre
    const selectedProgressions = progressionsByGenre[genre] || progressionsByGenre['Pop'];
    
    // Convert roman numerals to actual chords based on root and mode
    const romanToChord = (roman: string): string => {
      const major = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const idx = major.indexOf(progressionRoot);
      
      // Handle different roman numerals
      if (roman === 'I') return progressionIsMinor ? `${progressionRoot}m` : progressionRoot;
      if (roman === 'I7') return progressionIsMinor ? `${progressionRoot}m7` : `${progressionRoot}7`;
      if (roman === 'ii') return progressionIsMinor ? `${major[(idx + 1) % 12]}dim` : `${major[(idx + 2) % 12]}m`;
      if (roman === 'iii') return progressionIsMinor ? `${major[(idx + 3) % 12]}` : `${major[(idx + 4) % 12]}m`;
      if (roman === 'IV' || roman === 'iv') return progressionIsMinor ? `${major[(idx + 5) % 12]}m` : `${major[(idx + 5) % 12]}`;
      if (roman === 'IV7') return progressionIsMinor ? `${major[(idx + 5) % 12]}m7` : `${major[(idx + 5) % 12]}7`;
      if (roman === 'V' || roman === 'v') return progressionIsMinor ? `${major[(idx + 7) % 12]}m` : `${major[(idx + 7) % 12]}`;
      if (roman === 'V7') return `${major[(idx + 7) % 12]}7`; // Dominant 7th in both modes
      if (roman === 'vi') return progressionIsMinor ? `${major[(idx + 8) % 12]}` : `${major[(idx + 9) % 12]}m`;
      if (roman === 'VII') return `${major[(idx + 10) % 12]}`;
      if (roman === 'bVII') return `${major[(idx + 10) % 12]}`;
      if (roman === 'VI') return progressionIsMinor ? `${major[(idx + 8) % 12]}` : `${major[(idx + 9) % 12]}`;
      return roman;
    };

    // Select one random progression
    const randomIndex = Math.floor(Math.random() * selectedProgressions.length);
    const selectedProgression = selectedProgressions[randomIndex];
    
    // Convert to actual chords
    const actualProgression = selectedProgression.map(romanToChord);
    
    // Update state with single progression
    setProgressions([actualProgression]);
    setShowProgressions(true);
  };

  // Function to refresh to a new progression with same filters
  const refreshProgression = () => {
    generateProgressions();
  };

  // State for chord progression automation
  const [isAutomationActive, setIsAutomationActive] = useState(false);
  const [autoChordIndex, setAutoChordIndex] = useState(0);
  const beatCountRef = useRef(0);
  const progressionsRef = useRef(progressions);
  const selectedChordRef = useRef(selectedChord);

  // Keep refs in sync with state
  useEffect(() => {
    progressionsRef.current = progressions;
  }, [progressions]);

  useEffect(() => {
    selectedChordRef.current = selectedChord;
  }, [selectedChord]);

  // Function to stop any currently playing sound
  const stopCurrentSound = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      } catch (e) {
        console.log('Error stopping sound:', e);
      }
      currentSourceRef.current = null;
    }
  };

  // Function to load a sound into an AudioBuffer
  const loadSound = async (soundType: string): Promise<AudioBuffer | null> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Check if we already loaded this sound
      if (audioBuffersRef.current[soundType]) {
        return audioBuffersRef.current[soundType];
      }
      
      const soundUrl = getSoundUrl(soundType);
      const response = await fetch(soundUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Cache the buffer
      audioBuffersRef.current[soundType] = audioBuffer;
      return audioBuffer;
      
    } catch (error) {
      console.error('Error loading sound:', error);
      return null;
    }
  };

  // Function to play the sound once
  const playSoundOnce = async (soundType: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Make sure the context is running (required on some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Stop any currently playing sound
      stopCurrentSound();
      
      const buffer = await loadSound(soundType);
      if (!buffer) return;
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      
      // Store the source so we can stop it later
      currentSourceRef.current = source;
      
      // Set up cleanup when the sound finishes
      source.onended = () => {
        if (currentSourceRef.current === source) {
          currentSourceRef.current = null;
        }
      };
      
      source.start(0);
      
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Handle metronome downbeat for chord progression
  const handleMetronomeDownbeat = useCallback((beatCount: number) => {
    console.log('=== HOME COMPONENT DOWNBEAT HANDLER ===');
    console.log('Beat count received:', beatCount);
    
    // Play sound only on beat 0 (downbeat)
    if (beatCount % 4 === 0 && selectedSoundRef.current) {
      console.log('Downbeat - playing sound');
      playSoundOnce(selectedSoundRef.current);
    }
    
    // Get current values from state to ensure we have the latest
    const currentIsAutomationActive = isAutomationActive;
    const currentSelectedChord = selectedChord;
    const currentProgressions = progressions;
    
    console.log('Automation active:', currentIsAutomationActive);
    console.log('Selected chord:', currentSelectedChord);
    
    if (!currentIsAutomationActive || !currentSelectedChord) {
      console.log('Automation not active or no chord selected, returning');
      return;
    }
    
    // Update beat count ref
    beatCountRef.current = beatCount;
    
    console.log('Checking if should change chord...');
    console.log('Beat count % 8 =', beatCount % 8);
    
    // Change chord every 8 beats (when metronome color changes)
    if (beatCount > 0 && beatCount % 8 === 0) {
      console.log('*** CHANGING CHORD (on color change) ***');
      
      const currentProgression = currentProgressions[currentSelectedChord.progressionIndex] || [];
      console.log('Current progression:', currentProgression);
      
      if (currentProgression.length === 0) return;
      
      setAutoChordIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % currentProgression.length;
        console.log('Next chord index:', nextIndex);
        console.log('Next chord:', currentProgression[nextIndex]);
        
        // Update the selected chord
        const newChord = {
          progressionIndex: currentSelectedChord.progressionIndex,
          chordIndex: nextIndex
        };
        
        console.log('Setting new chord:', newChord);
        setSelectedChord(newChord);
        
        // Update chord details
        const chord = currentProgression[nextIndex];
        if (chord) {
          const details = parseChord(chord);
          console.log('Parsed chord details:', details);
          
          setSelectedChordDetails(details);
          setSelectedRoot(details.root);
          setIsMinor(details.type === 'minor');
          // Ensure the extension is a valid ChordExtension or default to 'clean'
          const validExtensions: ChordExtension[] = ['clean', '7th', '9th', '11th', '13th'];
          const defaultExtension: ChordExtension = 'clean';
          const newExtension = details.extension && validExtensions.includes(details.extension as any) 
            ? details.extension as ChordExtension 
            : defaultExtension;
          setExtension(newExtension);
          
          console.log('*** CHORD CHANGE COMPLETE ***');
        }
        
        return nextIndex;
      });
    } else {
      console.log('Not time to change chord yet');
    }
  }, [isAutomationActive, selectedChord, progressions]);

  // Handle sound selection (switches sound immediately if metronome is playing)
  const handleSoundSelect = async (soundType: string) => {
    console.log(`Selected ${soundType} sound`);
    
    // Stop any currently playing sound
    stopCurrentSound();
    
    // Update the selected sound
    setSelectedSound(soundType);
    selectedSoundRef.current = soundType;
    
    // Preload the sound if metronome is playing
    if (isPlaying) {
      try {
        await loadSound(soundType);
      } catch (error) {
        console.error('Error preloading sound:', error);
      }
    }
    
    // Test the sound URL to make sure it's accessible
    try {
      const soundUrl = getSoundUrl(soundType);
      console.log('Testing sound URL:', soundUrl);
      const testAudio = new Audio(soundUrl);
      testAudio.onerror = (e) => console.error('Sound URL test failed:', e);
      testAudio.onloadeddata = () => console.log('Sound URL test successful - audio can load');
    } catch (error) {
      console.error('Error testing sound URL:', error);
    }
  };

  // Get sound URL for a sound type
  const getSoundUrl = (soundType: string): string => {
    // Convert to lowercase for comparison but keep original for the filename
    const soundTypeLower = soundType.toLowerCase();
    const soundFileName = soundTypeLower === 'drums' ? 'Drums.wav' : 
                          soundTypeLower === 'shaker' ? 'Shaker.wav' : 
                          'Drums.wav'; // default to Drums if unknown type
    console.log(`Getting URL for sound: ${soundType} -> ${soundFileName}`);
    
    const { data: urlData } = supabase.storage
      .from('metronome-sounds')
      .getPublicUrl(soundFileName);
    
    console.log('Generated sound URL:', urlData.publicUrl);
    return urlData.publicUrl;
  };

  // Handle extension change
  // Handle extension change with type safety
  const handleExtensionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ChordExtension;
    setExtension(value);
  };

  // Handle metronome toggle
  const handleMetronomeToggle = (newIsPlaying: boolean) => {
    console.log('=== METRONOME TOGGLE HANDLER ===');
    console.log('New play state:', newIsPlaying);
    
    if (!newIsPlaying) {
      // Stop any playing sound when metronome stops
      stopCurrentSound();
      
      // Close audio context if it exists
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          audioContextRef.current = null;
        }).catch(console.error);
      }
    } else {
      // Initialize audio context on play
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Preload the selected sound if any
      if (selectedSoundRef.current) {
        loadSound(selectedSoundRef.current);
      }
    }
    
    setIsPlaying(newIsPlaying);
    setIsAutomationActive(newIsPlaying);
    
    if (newIsPlaying) {
      // Reset beat count when starting
      beatCountRef.current = 0;
      
      // Only update chord if we have a valid selection
      const currentSelectedChord = selectedChordRef.current;
      if (currentSelectedChord) {
        const firstChordIndex = 0;
        const newChord = {
          progressionIndex: currentSelectedChord.progressionIndex,
          chordIndex: firstChordIndex
        };
        
        console.log('Resetting to first chord:', newChord);
        setSelectedChord(newChord);
        setAutoChordIndex(firstChordIndex);
        
        // Update chord details
        const currentProgression = progressionsRef.current[newChord.progressionIndex] || [];
        const chord = currentProgression[firstChordIndex];
        if (chord) {
          const details = parseChord(chord);
          console.log('Setting initial chord details:', details);
          
          setSelectedChordDetails(details);
          setSelectedRoot(details.root);
          setIsMinor(details.type === 'minor');
          // Ensure the extension is a valid ChordExtension or default to 'clean'
          const validExtensions: ChordExtension[] = ['clean', '7th', '9th', '11th', '13th'];
          const defaultExtension: ChordExtension = 'clean';
          const newExtension = details.extension && validExtensions.includes(details.extension as any) 
            ? details.extension as ChordExtension 
            : defaultExtension;
          setExtension(newExtension);
        }
      }
    }
  };

  // Update handleChordClick to reset automation when manually selecting a chord
  const handleChordClick = (progressionIndex: number, chordIndex: number) => {
    setSelectedChord({ progressionIndex, chordIndex });
    
    // Get the chord name from the progressions array
    const chord = progressions[progressionIndex]?.[chordIndex];
    
    if (chord) {
      // Parse the chord to get its components
      const details = parseChord(chord);
      setSelectedChordDetails(details);
      
      // Update the UI state to match the selected chord
      setSelectedRoot(details.root);
      setIsMinor(details.type === 'minor');
      // Ensure the extension is a valid ChordExtension or default to 'clean'
      const validExtensions: ChordExtension[] = ['clean', '7th', '9th', '11th', '13th'];
      const defaultExtension: ChordExtension = 'clean';
      const newExtension = details.extension && validExtensions.includes(details.extension as any) 
        ? details.extension as ChordExtension 
        : defaultExtension;
      setExtension(newExtension);
      
      // Reset automation state when manually selecting a chord
      if (isAutomationActive) {
        setAutoChordIndex(chordIndex);
        beatCountRef.current = 0;
      }
    }
  };

  const isChordSelected = (progressionIndex: number, chordIndex: number) => {
    return selectedChord?.progressionIndex === progressionIndex && 
           selectedChord?.chordIndex === chordIndex;
  };

  // Standardized page transition variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };
  
  const pageTransition = {
    duration: 0.3
  };

  const fadeInAnimation = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.3 }
  };

  // Helper function to get note index in the chromatic scale
  const getNoteIndex = (note: string): number => {
    const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return chromatic.indexOf(note);
  };

  // Helper function to get note name by interval
  const getNoteByInterval = (rootIndex: number, semitones: number): string => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return notes[(rootIndex + semitones) % 12];
  };

  const renderPianoKeys = () => {
    // Get the active notes for the current chord with octaves (e.g., ["C1", "C2", "E2", "G2"])
    const activeNotes = getChordNotesHelper(selectedRoot, isMinor ? 'minor' : 'major', extension);
    
    // Create a map of note+octave to check if active
    const activeNotesMap = new Set(activeNotes);
    
    // Define the white and black keys for two octaves with their octave numbers
    const whiteKeys = [
      { note: 'C', octave: 1 }, { note: 'D', octave: 1 }, { note: 'E', octave: 1 },
      { note: 'F', octave: 1 }, { note: 'G', octave: 1 }, { note: 'A', octave: 1 },
      { note: 'B', octave: 1 }, { note: 'C', octave: 2 }, { note: 'D', octave: 2 },
      { note: 'E', octave: 2 }, { note: 'F', octave: 2 }, { note: 'G', octave: 2 },
      { note: 'A', octave: 2 }, { note: 'B', octave: 2 }, { note: 'C', octave: 3 }
    ];
    
    // Black keys with their positions and octave numbers
    const blackKeys = [
      { note: 'C#', position: 0.5, octave: 1 },
      { note: 'D#', position: 1.5, octave: 1 },
      { note: 'F#', position: 3.5, octave: 1 },
      { note: 'G#', position: 4.5, octave: 1 },
      { note: 'A#', position: 5.5, octave: 1 },
      { note: 'C#', position: 7.5, octave: 2 },
      { note: 'D#', position: 8.5, octave: 2 },
      { note: 'F#', position: 10.5, octave: 2 },
      { note: 'G#', position: 11.5, octave: 2 },
      { note: 'A#', position: 12.5, octave: 2 }
    ];
    
    // Check if a note is active
    const isNoteActive = (note: string, octave: number) => {
      return activeNotesMap.has(`${note}${octave}`);
    };
    
    return (
      <div className="piano-keyboard" style={{ 
        position: 'relative', 
        height: '100%',
        width: '100%',
        display: 'flex'
      }}>
        {/* Render white keys */}
        {whiteKeys.map(({note, octave}, i) => {
          const isActive = isNoteActive(note, octave);
          return (
            <div
              key={`${note}-${octave}-${i}`}
              className={`white-key ${isActive ? 'active' : ''}`}
              style={{
                flex: '1 0 auto',
                minWidth: '30px',
                height: '150px',
                backgroundColor: isActive ? 'rgba(76, 175, 80, 0.8)' : 'white',
                border: '1px solid #333',
                borderRadius: '0 0 4px 4px',
                position: 'relative',
                zIndex: 1,
                transition: 'background-color 0.3s ease'
              }}
            >
              {isActive && (
                <div
                  className="chord-dot"
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    boxShadow: '0 0 5px rgba(0,0,0,0.3)'
                  }}
                />
              )}
            </div>
          );
        })}
        
        {/* Render black keys */}
        {blackKeys.map(({ note, position, octave }, i) => {
          const isActive = isNoteActive(note, octave);
          return (
            <div
              key={`${note}-${octave}-${i}`}
              className={`black-key ${isActive ? 'active' : ''}`}
              style={{
                width: '20px',
                height: '90px',
                backgroundColor: isActive ? 'rgba(76, 175, 80, 0.8)' : '#333',
                position: 'absolute',
                left: `calc(${(position / whiteKeys.length) * 100}% + 10px)`,
                zIndex: 2,
                borderRadius: '0 0 3px 3px',
                transition: 'background-color 0.3s ease'
              }}
            >
              {isActive && (
                <div
                  className="chord-dot"
                  style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    boxShadow: '0 0 5px rgba(0,0,0,0.3)'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div 
      className="app-container root-container"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      <AnimatePresence mode="wait">
        {!showMenu ? (
          <motion.div
            key="circle"
            className="circle"
            onClick={handleCircleClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: isAnimating ? 0 : 1, scale: isAnimating ? 0.8 : 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
          </motion.div>
        ) : (
          <>
            <motion.div
              key="menu"
              className="menu-container"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
            </motion.div>
            
            <div 
              className="radio-jamm-container"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                width: '100%',
                maxWidth: '1600px',
                margin: '0 auto 40px',
                gap: '40px',
                padding: '40px',
                boxSizing: 'border-box',
                position: 'relative',
                border: '1px solid white',
                outline: '1px solid red',
                outlineOffset: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Left: Chord Progression Generator */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '20px',
                flex: '0 0 400px',
                maxWidth: '400px',
                position: 'relative',
                minHeight: '600px'  
              }}>
                <div className="chord-progression-generator" style={{
                  border: '2px solid #4CAF50',
                  borderRadius: '16px',
                  padding: '20px',
                  background: 'rgba(30, 30, 30, 0.5)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minWidth: '350px', 
                  maxWidth: '400px',  
                  marginBottom: '20px',
                  flex: '1',  
                  minHeight: '400px'  
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '20px',
                    background: 'rgba(76, 175, 80, 0.8)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: 10
                  }}>
                    Chord Progressions
                  </div>

                  <div className="chord-controls" style={{
                    background: 'rgba(40, 40, 40, 0.3)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '15px',
                    display: 'flex',
                    flexWrap: 'nowrap',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '100%',
                    marginBottom: '20px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': {
                      display: 'none'
                    }
                  }}>
                    {/* Root Note Selector */}
                    <motion.button 
                      className="chord-button"
                      onClick={cycleProgressionRoot}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        minWidth: '60px',
                        height: '60px',
                        padding: '0 12px',
                        borderRadius: '30px',
                        background: 'rgba(255, 255, 255, 0.07)',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '500',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                        flexShrink: 0
                      }}
                    >
                      <div>{progressionRoot}</div>
                      <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Root</div>
                    </motion.button>

                    {/* Major/Minor Toggle */}
                    <motion.button 
                      className={`chord-button ${progressionIsMinor ? 'minor' : 'major'}`}
                      onClick={toggleProgressionMinor}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        minWidth: '70px',
                        height: '60px',
                        padding: '0 12px',
                        borderRadius: '30px',
                        background: progressionIsMinor 
                          ? 'rgba(100, 100, 100, 0.2)' 
                          : 'rgba(255, 255, 255, 0.07)',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '500',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                        flexShrink: 0
                      }}
                    >
                      {progressionIsMinor ? 'Minor' : 'Major'}
                    </motion.button>

                    {/* Genre Selector */}
                    <motion.button 
                      className="chord-button"
                      onClick={cycleGenre}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        minWidth: '80px',
                        height: '60px',
                        padding: '0 12px',
                        borderRadius: '30px',
                        background: 'rgba(255, 255, 255, 0.07)',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '500',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                        flexShrink: 0
                      }}
                    >
                      {genre}
                    </motion.button>

                    {/* Search Button */}
                    <motion.button
                      className="chord-button active"
                      onClick={refreshProgression}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        minWidth: '60px',
                        height: '60px',
                        padding: '0 20px',
                        borderRadius: '30px',
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.2))',
                        border: '2px solid rgba(76, 175, 80, 0.4)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '500',
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
                        flexShrink: 0
                      }}
                    >
                      <div>Search</div>
                      <div style={{ 
                        fontSize: '11px', 
                        opacity: 0.8, 
                        marginTop: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>↻</span> New
                      </div>
                    </motion.button>
                  </div>

                  <div className="chord-display-container" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    flex: 1,
                    width: '100%',
                    overflowY: 'auto',
                    paddingRight: '10px'
                  }}>
                    <AnimatePresence>
                      {showProgressions ? (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          style={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            flex: 1
                          }}
                        >
                          {progressions.map((progression, i) => (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1, duration: 0.2 }}
                              style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                borderRadius: '12px',
                                padding: '15px',
                                border: '1px solid rgba(76, 175, 80, 0.2)'
                              }}
                            >
                              <div 
                                className="big-chord"
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  padding: '30px',
                                  borderRadius: '16px',
                                  border: '3px solid rgba(76, 175, 80, 0.4)',
                                  backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                  marginRight: '20px',
                                  minHeight: '100%',
                                  boxSizing: 'border-box',
                                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                                }}>
                                {selectedChord?.progressionIndex === i && progressions[selectedChord.progressionIndex]?.[selectedChord.chordIndex] && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                      fontSize: '5.5rem',
                                      fontWeight: 'bold',
                                      color: 'rgba(255, 255, 255, 0.95)',
                                      textShadow: '0 4px 15px rgba(76, 175, 80, 0.6)',
                                      textAlign: 'center',
                                      lineHeight: 1,
                                      margin: '10px 0'
                                    }}
                                  >
                                    {progressions[selectedChord.progressionIndex][selectedChord.chordIndex]}
                                  </motion.div>
                                )}
                              </div>
                              
                              <div 
                                className="vertical-chords"
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  alignItems: 'center',
                                  marginLeft: '15px',
                                  width: '90px' // Increased width to better accommodate three-character chords
                                }}>
                                {progression.slice(0, 4).map((chord, chordIndex) => {
                                  // Calculate font size based on chord length and characters
                                  const chordLength = chord.length;
                                  let fontSize = '1rem'; // Base size for 1-2 characters
                                  
                                  // Adjust for three-character chords (like C#m, D#m, etc.)
                                  if (chordLength === 3 && chord.includes('m')) {
                                    fontSize = '0.9rem';
                                  } 
                                  // Adjust for longer chords (4+ characters)
                                  else if (chordLength > 3) {
                                    fontSize = '0.85rem';
                                  }

                                  return (
                                    <motion.div 
                                      key={chordIndex}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleChordClick(i, chordIndex)}
                                      style={{
                                        minWidth: '70px',
                                        width: '100%',
                                        maxWidth: '90px',
                                        height: '60px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isChordSelected(i, chordIndex) 
                                          ? 'rgba(76, 175, 80, 0.4)'
                                          : 'rgba(76, 175, 80, 0.1)',
                                        borderRadius: '8px',
                                        border: `1px solid ${
                                          isChordSelected(i, chordIndex) 
                                            ? 'rgba(76, 175, 80, 0.8)'
                                            : 'rgba(76, 175, 80, 0.4)'
                                        }`,
                                        fontSize: fontSize,
                                        fontWeight: '500',
                                        color: isChordSelected(i, chordIndex) 
                                          ? 'white' 
                                          : 'rgba(255, 255, 255, 0.7)',
                                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        opacity: selectedChord === null || isChordSelected(i, chordIndex) ? 1 : 0.5,
                                        whiteSpace: 'nowrap',
                                        overflow: 'visible',
                                        padding: '0 10px',
                                        textAlign: 'center',
                                        boxSizing: 'border-box',
                                        letterSpacing: '0.5px' // Slightly increase letter spacing for better readability
                                      }}
                                    >
                                      {chord}
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          ))}
                          
                          {/* Refresh Button - positioned underneath all progressions */}
                          <motion.div
                            style={{
                              marginTop: '20px',
                              display: 'flex',
                              justifyContent: 'center'
                            }}
                          >
                            <motion.button
                              style={{
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                color: 'white',
                                padding: '10px 24px',
                                borderRadius: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                border: '1px solid rgba(76, 175, 80, 0.4)',
                                fontSize: '14px',
                                fontWeight: 500
                              }}
                              onClick={refreshProgression}
                              whileTap={{ scale: 0.95 }}
                              whileHover={{ 
                                backgroundColor: 'rgba(76, 175, 80, 0.3)',
                                boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)'
                              }}
                            >
                              <span style={{ marginRight: '8px' }}>↻</span> New Progressions
                            </motion.button>
                          </motion.div>
                        </motion.div>
                      ) : (
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '14px',
                          textAlign: 'center',
                          padding: '20px',
                          gap: '20px'
                        }}>
                          <div>Click the search button to generate chord progressions</div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Metronome Sounds Container - Fixed at bottom */}
                <div className="metronome-sounds" style={{
                  width: '100%',
                  height: '180px',
                  border: '2px solid #FF9800',
                  borderRadius: '16px',
                  padding: '20px',
                  background: 'rgba(30, 30, 30, 0.5)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  position: 'relative',  
                  marginTop: 'auto',     
                  zIndex: 10
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '20px',
                    background: '#FF9800',
                    color: 'white',
                    padding: '2px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 10
                  }}>
                    Metronome Sounds
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '15px'
                  }}>
                    <div style={{
                      color: 'white',
                      fontSize: '14px',
                      textAlign: 'center',
                      opacity: 0.8,
                      marginBottom: '5px'
                    }}>
                      Select a sound:
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '20px',
                      marginTop: '5px',
                      flexWrap: 'wrap'
                    }}>
                      {['Drums', 'Shaker'].map((sound) => {
                        const isSelected = selectedSound === sound;
                        return (
                          <motion.button
                            key={sound}
                            onClick={() => handleSoundSelect(sound)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              padding: '15px 25px',
                              backgroundColor: isSelected 
                                ? 'rgba(255, 152, 0, 0.4)' 
                                : 'rgba(255, 152, 0, 0.15)',
                              border: isSelected 
                                ? '1px solid rgba(255, 152, 0, 0.8)' 
                                : '1px solid rgba(255, 152, 0, 0.4)',
                              borderRadius: '10px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '15px',
                              flex: '1 1 120px',
                              maxWidth: '160px',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 0 10px rgba(255, 152, 0, 0.5)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 152, 0, 0.25)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 152, 0, 0.15)';
                              }
                            }}
                          >
                            {sound}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle: Chords Container */}
              <div className="chords-container" style={{
                flex: '1 1 45%',
                minWidth: '500px',
                height: '100%',
                border: '2px solid #FF5722',
                borderRadius: '16px',
                padding: '20px',
                background: 'rgba(30, 30, 30, 0.5)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                position: 'relative',
                outline: '1px solid #FF5722',
                outlineOffset: '5px'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '20px',
                  background: 'rgba(255, 87, 34, 0.8)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  Middle Container (45%)
                </div>
                {/* Visualizer Container */}
                <div className="visualizer-container" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  width: '100%'
                }}>
                  
                  {/* Piano Container */}
                  <motion.div className="piano-container" style={{
                    padding: '15px',
                    background: 'rgba(40, 40, 40, 0.5)',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                    width: '100%',
                    overflow: 'hidden'
                  }}>
                    {renderPianoKeys()}
                  </motion.div>

                  {/* Guitar Container */}
                  <motion.div className="guitar-container" style={{
                    padding: '15px',
                    marginTop: '20px',
                    background: 'rgba(40, 40, 40, 0.5)',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      marginBottom: '10px',
                      color: 'white'
                    }}>
                      {selectedRoot} {isMinor ? 'Minor' : 'Major'} {extension}
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
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

                {/* Chord Controls */}
                <div className="chord-controls" style={{ 
                  background: 'rgba(40, 40, 40, 0.3)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255, 255, 255, 0.2)', 
                  padding: '15px', 
                  display: 'flex', 
                  flexWrap: 'nowrap', 
                  justifyContent: 'center',
                  gap: '10px', 
                  width: '100%', 
                  marginTop: '20px',
                  overflowX: 'auto' 
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontSize: '0.9rem' }}>Root:</span>
                    <select 
                      value={selectedRoot} 
                      onChange={(e) => setSelectedRoot(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(76, 175, 80, 0.4)',
                        borderRadius: '8px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
                        <option key={note} value={note}>{note}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontSize: '0.9rem' }}>Type:</span>
                    <button
                      onClick={() => setIsMinor(!isMinor)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: isMinor ? 'rgba(76, 175, 80, 0.4)' : 'rgba(76, 175, 80, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(76, 175, 80, 0.4)',
                        borderRadius: '8px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {isMinor ? 'Minor' : 'Major'}
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontSize: '0.9rem' }}>Extension:</span>
                    <select 
                      value={extension} 
                      onChange={(e) => setExtension(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(76, 175, 80, 0.4)',
                        borderRadius: '8px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Clean</option>
                      <option value="7">7th</option>
                      <option value="9">9th</option>
                      <option value="maj7">maj7</option>
                      <option value="m7">m7</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right: Tools Container */}
              <div className="tools-container" style={{
                flex: '0 1 30%',
                minWidth: '300px',
                height: 'auto',
                border: '2px solid #2196F3',
                borderRadius: '16px',
                padding: '20px',
                background: 'rgba(30, 30, 30, 0.5)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                position: 'relative',
                outline: '1px solid #2196F3',
                outlineOffset: '5px'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '20px',
                  background: 'rgba(33, 150, 243, 0.8)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  Right Container (30%)
                </div>
                {/* Tuner */}
                <div style={{ flex: 1 }}>
                  <Tuner 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  />
                </div>
                {/* Metronome */}
                <div style={{ flex: 1 }}>
                  <MetronomeControls 
                    onDownbeat={handleMetronomeDownbeat}
                    onToggle={handleMetronomeToggle}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Home;
