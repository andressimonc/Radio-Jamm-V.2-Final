import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiPlus, FiMinus } from 'react-icons/fi';
import { MetronomeSound } from '../utils/MetronomeSound';

interface MetronomeControlsProps {
  className?: string;
  standalone?: boolean;
  initial?: any;
  animate?: any;
  transition?: any;
  onDownbeat?: (beat: number) => void;
  onToggle?: (isPlaying: boolean) => void;
}

export const MetronomeControls = ({ 
  className = '', 
  standalone = false,
  initial = { opacity: 0, y: 20 },
  animate = { opacity: 1, y: 0 },
  transition = { duration: 0.3 },
  onDownbeat,
  onToggle
}: MetronomeControlsProps) => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [loopCount, setLoopCount] = useState(0);
  const [isGreenDownbeat, setIsGreenDownbeat] = useState(false); // Start with blue (false)
  const metronomeRef = useRef<MetronomeSound | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Keep latest onDownbeat callback in a ref to avoid reinitializing metronome
  const onDownbeatRef = useRef<(beatCount: number) => void>();
  useEffect(() => {
    onDownbeatRef.current = onDownbeat;
  }, [onDownbeat]);

  // Initialize metronome sound engine (run once)
  useEffect(() => {
    metronomeRef.current = new MetronomeSound();
    
    // Set up visualizer pulse callback
    if (metronomeRef.current) {
      metronomeRef.current.onBeat = (beat: number) => {
        // Update active beat in the visualizer (0, 1, 2, 3)
        setActiveBeat(beat);
        
        // Call onDownbeat if provided, passing the total beat count
        if (metronomeRef.current) {
          const beatCount = metronomeRef.current.beatCount;
          
          // Check if we should switch colors (every 8 beats)
          if (beat === 0 && beatCount > 0 && beatCount % 8 === 0) {
            console.log('Switching color at beat count:', beatCount);
            setIsGreenDownbeat(prev => !prev);
          }
          
          // Call onDownbeat with the total beat count using ref
          if (onDownbeatRef.current) {
            onDownbeatRef.current(beatCount);
          }
        }
        
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

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !sliderRef.current) return;
      
      const slider = sliderRef.current;
      const rect = slider.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      
      // Calculate the position of the click in the slider
      let position = (clientX - rect.left) / rect.width;
      position = Math.max(0, Math.min(1, position)); // Clamp between 0 and 1
      
      // Calculate new BPM based on position (40-300 range)
      const newBpm = Math.round(40 + (position * 260));
      
      if (newBpm !== bpm) {
        setBpm(newBpm);
        if (metronomeRef.current) {
          metronomeRef.current.setBPM(newBpm);
        }
      }
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, bpm]);

  // Start or stop the metronome
  const togglePlay = useCallback(() => {
    if (!metronomeRef.current) return;
    
    let nextIsPlaying = !isPlaying;
    if (isPlaying) {
      metronomeRef.current.stop();
    } else {
      if (metronomeRef.current.audioContext.state === 'suspended') {
        metronomeRef.current.audioContext.resume();
      }
      // Reset beat count and start with blue when starting
      metronomeRef.current.beatCount = -1; // Will be incremented to 0 on first beat
      setIsGreenDownbeat(false);
      metronomeRef.current.setBPM(bpm);
      metronomeRef.current.start();
    }
    
    setIsPlaying(nextIsPlaying);
    // Notify parent of play state change
    if (onToggle) {
      onToggle(nextIsPlaying);
    }
  }, [isPlaying, bpm, onToggle]);

  // Handle BPM changes
  const changeBpm = useCallback((delta: number) => {
    const newBpm = Math.max(40, Math.min(300, bpm + delta));
    setBpm(newBpm);
    
    if (metronomeRef.current) {
      metronomeRef.current.setBPM(newBpm);
    }
  }, [bpm]);

  // Handle slider change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value);
    setBpm(newBpm);
    
    if (metronomeRef.current) {
      metronomeRef.current.setBPM(newBpm);
    }
  }, []);

  // Handle tap tempo
  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4); // Keep last 4 taps
    setTapTimes(newTapTimes);
    
    if (newTapTimes.length > 1) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / averageInterval);
      
      // Only update if BPM is reasonable (40-300)
      if (calculatedBpm >= 40 && calculatedBpm <= 300) {
        setBpm(calculatedBpm);
        if (metronomeRef.current) {
          metronomeRef.current.setBPM(calculatedBpm);
        }
      }
    }
    
    // Clear tap times after 2 seconds of inactivity
    setTimeout(() => {
      setTapTimes(prev => prev.filter(time => (Date.now() - time) < 2000));
    }, 2000);
  }, [tapTimes]);

  return (
    <motion.div 
      className={`metronome-controls ${className}`}
      style={{
        transform: 'scale(0.9)',
        transformOrigin: 'top right',
        margin: 0,
        padding: 0,
        position: 'relative',
        right: 0
      }}
      initial={initial}
      animate={animate}
      transition={transition}
    >
      {standalone && <h1>Metronome</h1>}
      
      <div className="bpm-controls">
        <motion.button 
          className="bpm-button"
          onClick={() => changeBpm(-1)}
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
          onClick={() => changeBpm(1)}
          whileTap={{ scale: 0.9 }}
        >
          <FiPlus size={24} />
        </motion.button>
      </div>
      
      <div className="visualizer">
        {[0, 1, 2, 3].map((beat) => {
          const isDownbeat = beat === 0;
          const downbeatColor = isGreenDownbeat ? '#4CAF50' : '#2196F3'; // Green or blue
          return (
            <motion.div 
              key={beat}
              className={`visualizer-beat ${activeBeat === beat ? 'active' : ''}`}
              animate={{
                scale: activeBeat === beat ? 1.2 : 1,
                backgroundColor: activeBeat === beat 
                  ? (isDownbeat ? downbeatColor : '#ffffff') 
                  : 'transparent',
                border: isDownbeat 
                  ? `2px solid ${downbeatColor}` 
                  : '2px solid rgba(255, 255, 255, 0.3)'
              }}
              transition={{ duration: 0.1 }}
            />
          );
        })}
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
      
      <div 
        className="bpm-slider-container"
        ref={sliderRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          // Trigger initial move to handle the click position
          const rect = e.currentTarget.getBoundingClientRect();
          const position = (e.clientX - rect.left) / rect.width;
          const newBpm = Math.round(40 + (Math.max(0, Math.min(1, position)) * 260));
          if (newBpm !== bpm) {
            setBpm(newBpm);
            if (metronomeRef.current) {
              metronomeRef.current.setBPM(newBpm);
            }
          }
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.touches[0];
          const position = (touch.clientX - rect.left) / rect.width;
          const newBpm = Math.round(40 + (Math.max(0, Math.min(1, position)) * 260));
          if (newBpm !== bpm) {
            setBpm(newBpm);
            if (metronomeRef.current) {
              metronomeRef.current.setBPM(newBpm);
            }
          }
        }}
      >
        <input 
          type="range" 
          min="40" 
          max="300" 
          value={bpm} 
          onChange={handleSliderChange}
          className="bpm-slider"
          style={{
            position: 'relative',
            zIndex: 2,
            opacity: 0,
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: 'pointer'
          }}
        />
        <div className="slider-track">
          <div 
            className="slider-thumb" 
            style={{
              left: `${((bpm - 40) / 260) * 100}%`,
              transform: 'translateX(-50%)',
              position: 'absolute',
              top: '50%',
              width: '16px',
              height: '16px',
              backgroundColor: '#4CAF50',
              borderRadius: '50%',
              zIndex: 1
            }}
          />
          <div 
            className="slider-fill"
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              width: `${((bpm - 40) / 260) * 100}%`,
              height: '4px',
              backgroundColor: '#4CAF50',
              borderRadius: '2px',
              transform: 'translateY(-50%)'
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default MetronomeControls;
