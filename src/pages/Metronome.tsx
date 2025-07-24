import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiPlay, FiPause, FiPlus, FiMinus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import '../App.css';

// Metronome sound engine class
class MetronomeSound {
  audioContext: AudioContext;
  isPlaying: boolean;
  intervalId: number | null;
  bpm: number;
  beatCount: number;
  currentBeat: number;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.isPlaying = false;
    this.intervalId = null;
    this.bpm = 120;
    this.beatCount = 0;
    this.currentBeat = 0;
  }

  playBeat() {
    if (!this.audioContext) return;

    // Create nodes
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // Create a bandpass filter for the wooden resonance
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, this.audioContext.currentTime); // Lowered by 2 semitones
    filter.Q.setValueAtTime(2.0, this.audioContext.currentTime);
    
    // Configure oscillator for a clave/wood block sound
    oscillator.type = 'sine';
    
    // Set initial frequency (higher for downbeat, slightly lower for other beats)
    const isDownbeat = this.currentBeat === 0;
    const baseFreq = isDownbeat ? 1780 : 1600; // Lowered by 2 semitones (2000 * 0.89, 1800 * 0.89)
    
    // Quick frequency sweep down for the "wood" character
    oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      710, // End frequency (800 * 0.89)
      this.audioContext.currentTime + 0.05 // Very quick sweep
    );
    
    // Volume envelope - very sharp attack, quick decay
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      isDownbeat ? 0.8 : 0.6, // Slightly louder on downbeat
      this.audioContext.currentTime + 0.001 // Instant attack
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001, // Quick decay to silence
      this.audioContext.currentTime + (isDownbeat ? 0.08 : 0.06) // Slightly longer decay for downbeat
    );
    
    // Connect nodes: oscillator -> filter -> gain -> destination
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Start and stop the oscillator
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1); // Short duration
    
    // Move to next beat (4/4 time signature)
    this.currentBeat = (this.currentBeat + 1) % 4;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.beatCount = 0;
    const interval = 60000 / this.bpm; // Convert BPM to milliseconds
    
    this.playBeat(); // Play first beat immediately
    this.intervalId = window.setInterval(() => {
      this.playBeat();
    }, interval);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setBPM(newBPM: number) {
    this.bpm = newBPM;
    
    // If metronome is playing, update the interval without restarting
    if (this.isPlaying && this.intervalId) {
      // Clear the current interval
      clearInterval(this.intervalId);
      
      // Calculate the new interval based on BPM
      const interval = 60000 / this.bpm;
      
      // Set a new interval with the updated tempo
      this.intervalId = window.setInterval(() => {
        this.playBeat();
      }, interval);
    }
  }
}

const Metronome = () => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1); // -1 means no active beat
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const metronomeRef = useRef<MetronomeSound | null>(null);
  const navigate = useNavigate();
  
  
  // Initialize metronome sound engine
  useEffect(() => {
    metronomeRef.current = new MetronomeSound();
    
    // Set up visualizer pulse callback
    if (metronomeRef.current) {
      const originalPlayBeat = metronomeRef.current.playBeat;
      metronomeRef.current.playBeat = function() {
        originalPlayBeat.call(this);
        // Update active beat in the visualizer (0, 1, 2, 3, then repeat)
        setActiveBeat(this.currentBeat % 4);
        
        // Reset the active beat after a short delay to show the pulse
        setTimeout(() => setActiveBeat(-1), 150);
      };
    }
    
    return () => {
      if (metronomeRef.current) {
        metronomeRef.current.stop();
      }
    };
  }, []);
  
  // Start or stop the metronome
  const togglePlay = () => {
    if (!metronomeRef.current) return;
    
    if (isPlaying) {
      // Stop the metronome
      metronomeRef.current.stop();
      setIsPlaying(false);
    } else {
      // Start playing
      // Resume audio context if it was suspended (browsers require user interaction)
      if (metronomeRef.current.audioContext.state === 'suspended') {
        metronomeRef.current.audioContext.resume();
      }
      
      metronomeRef.current.setBPM(bpm);
      metronomeRef.current.start();
      setIsPlaying(true);
    }
  };
  
  // Handle BPM changes
  const handleBpmChange = (increment: boolean) => {
    const newBpm = increment ? bpm + 1 : bpm - 1;
    setBpm(newBpm);
    
    // Only update metronome tempo immediately if currently playing
    if (isPlaying && metronomeRef.current) {
      metronomeRef.current.setBPM(newBpm);
    }
  };
  
  // Handle BPM slider change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(event.target.value);
    setBpm(newBpm);
    
    // Only update metronome tempo immediately if currently playing
    if (isPlaying && metronomeRef.current) {
      metronomeRef.current.setBPM(newBpm);
    }
  };
  
  // Handle tap tempo
  const handleTapTempo = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-8); // Keep last 8 taps
    setTapTimes(newTapTimes);
    
    if (newTapTimes.length >= 2) {
      // Calculate BPM from last two taps
      const lastTap = newTapTimes[newTapTimes.length - 1];
      const secondLastTap = newTapTimes[newTapTimes.length - 2];
      const timeDiff = lastTap - secondLastTap;
      const calculatedBpm = Math.round(60000 / timeDiff);
      
      // Only update if BPM is reasonable (40-300)
      if (calculatedBpm >= 40 && calculatedBpm <= 300) {
        setBpm(calculatedBpm);
        if (isPlaying && metronomeRef.current) {
          metronomeRef.current.setBPM(calculatedBpm);
        }
      }
    }
    
    // Clear old taps after 3 seconds of inactivity
    setTimeout(() => {
      setTapTimes(prev => prev.filter(time => now - time < 3000));
    }, 3000);
  };
  
  
  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      className="metronome-container"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
    >
      <motion.button 
        className="back-button"
        onClick={() => {
          // Stop the metronome if it's playing before navigating back
          if (isPlaying && metronomeRef.current) {
            metronomeRef.current.stop();
          }
          // Navigate back to the practice tools menu instead of home
          navigate('/', { state: { showMenu: true } })
        }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <FiArrowLeft size={24} />
      </motion.button>
      <h1>Metronome</h1>
      
      <div className="bpm-controls">
        <motion.button 
          className="bpm-button"
          onClick={() => handleBpmChange(false)}
          whileTap={{ scale: 0.9 }}
        >
          <FiMinus size={24} />
        </motion.button>
        
        <div className="bpm-display">
          <span className="bpm-value">{bpm}</span>
          <span className="bpm-label">BPM</span>
        </div>
        
        <motion.button 
          className="bpm-button"
          onClick={() => handleBpmChange(true)}
          whileTap={{ scale: 0.9 }}
        >
          <FiPlus size={24} />
        </motion.button>
      </div>
      
      <div className="visualizer">
        {[0, 1, 2, 3].map((beat) => (
          <motion.div 
            key={beat}
            className={`visualizer-beat ${activeBeat === beat ? 'active' : ''}`}
            animate={{
              scale: activeBeat === beat ? 1.2 : 1,
              backgroundColor: activeBeat === beat ? '#ffffff' : 'transparent'
            }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
      
      <div className="control-buttons">
        <motion.button 
          className="play-button"
          onClick={togglePlay}
          whileTap={{ scale: 0.95 }}
        >
          {isPlaying ? <FiPause size={32} /> : <FiPlay size={32} />}
        </motion.button>
        
        <motion.button 
          className="tap-button"
          onClick={handleTapTempo}
          whileTap={{ scale: 0.9 }}
        >
          TAP
        </motion.button>
      </div>
      
      <div className="bpm-slider-container">
        <input 
          type="range"
          min="55"
          max="222"
          value={bpm}
          onChange={handleSliderChange}
          className="bpm-slider"
        />
        <div className="slider-labels">
          <span>55</span>
          <span>222</span>
        </div>
      </div>
    </motion.div>
  );
};

export default Metronome;
