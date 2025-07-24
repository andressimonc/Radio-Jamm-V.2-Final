import { useState, useEffect, useRef } from "react";
import { PitchDetector } from "pitchy";
import { motion } from "framer-motion";

interface TunerProps {
  className?: string;
}

interface GuitarString {
  name: string;
  freq: number;
  tuned: boolean;
  tuningStartTime: number | null;
}

export default function Tuner({ className = "" }: TunerProps) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [currentNote, setCurrentNote] = useState<string>("");
  const [cents, setCents] = useState<number>(0);
  const [guitarStrings, setGuitarStrings] = useState<GuitarString[]>([
    { name: "E", freq: 82.41, tuned: false, tuningStartTime: null },
    { name: "A", freq: 110.00, tuned: false, tuningStartTime: null },
    { name: "D", freq: 146.83, tuned: false, tuningStartTime: null },
    { name: "G", freq: 196.00, tuned: false, tuningStartTime: null },
    { name: "B", freq: 246.94, tuned: false, tuningStartTime: null },
    { name: "E", freq: 329.63, tuned: false, tuningStartTime: null }
  ]);
  const lastNoteRef = useRef<string>("");
  const noteHoldTimeRef = useRef<number>(0);

  // Get guitar string tuning info and update state
  const updateTuningInfo = (freq: number) => {
    let closest = guitarStrings[0];
    let minDiff = Math.abs(freq - closest.freq);

    for (const string of guitarStrings) {
      const diff = Math.abs(freq - string.freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = string;
      }
    }

    // Calculate cents difference (100 cents = 1 semitone)
    const centsValue = Math.round(1200 * Math.log2(freq / closest.freq));
    
    // Only update if within reasonable tuning range (±50 cents)
    if (Math.abs(centsValue) <= 50) {
      const currentTime = Date.now();
      
      // Check if we're still on the same note
      if (lastNoteRef.current === closest.name) {
        // Check if we've been holding this note long enough and it's well-tuned
        if (Math.abs(centsValue) <= 5 && currentTime - noteHoldTimeRef.current >= 2000) {
          // Mark this string as tuned
          setGuitarStrings(prev => prev.map(str => 
            str.name === closest.name ? { ...str, tuned: true } : str
          ));
        }
      } else {
        // New note detected
        lastNoteRef.current = closest.name;
        noteHoldTimeRef.current = currentTime;
      }
      
      setCurrentNote(closest.name);
      setCents(centsValue);
    }
  };

  useEffect(() => {
    let audioContext: AudioContext;
    let animationFrameId: number;
    let stream: MediaStream;

    const startTuning = async () => {
      try {
        setError("");
        
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser doesn't support microphone access. Please use Chrome or Firefox.");
        }
        
        // Check microphone permissions first
        try {
          const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('Microphone permission status:', permissions.state);
        } catch (permErr) {
          console.log('Permission query not supported, proceeding with getUserMedia');
        }
        
        console.log('Requesting microphone access...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        
        console.log('Microphone access granted!');
        audioContext = new AudioContext();
        
        // Resume audio context if suspended (required by some browsers)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        // Increase FFT size for better frequency resolution
        analyser.fftSize = 4096;
        const buffer = new Float32Array(analyser.fftSize);
        
        // Reduce smoothing for more responsive updates
        analyser.smoothingTimeConstant = 0.2;

        source.connect(analyser);
        setIsListening(true);

        const pitchDetector = PitchDetector.forFloat32Array(analyser.fftSize);

        // Create a buffer for smoothing pitch values
        const pitchHistory: number[] = [];
        const maxHistoryLength = 5; // Number of samples to average
        
        const detectPitch = () => {
          analyser.getFloatTimeDomainData(buffer);
          const [detectedPitch, detectedClarity] = pitchDetector.findPitch(buffer, audioContext.sampleRate);

          // Lower clarity threshold for better sensitivity (was 0.9)
          if (detectedClarity > 0.8 && detectedPitch > 50 && detectedPitch < 2000) {
            // Add to history and maintain max length
            pitchHistory.push(detectedPitch);
            if (pitchHistory.length > maxHistoryLength) {
              pitchHistory.shift();
            }
            
            // Use average of recent pitches for smoother readings
            if (pitchHistory.length > 0) {
              const avgPitch = pitchHistory.reduce((sum, val) => sum + val, 0) / pitchHistory.length;
              updateTuningInfo(avgPitch);
            }
          } else {
            // Clear history when no pitch is detected
            if (pitchHistory.length > 0) {
              pitchHistory.length = 0;
            }
            
            setCurrentNote("");
            setCents(0);
          }

          animationFrameId = requestAnimationFrame(detectPitch);
        };

        detectPitch();
      } catch (err: any) {
        console.error('Microphone access error:', err);
        let errorMessage = "Microphone access denied or not available";
        
        if (err.name === 'NotAllowedError') {
          errorMessage = "Microphone access denied. Please click the microphone icon in your browser's address bar and allow access.";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone and refresh the page.";
        } else if (err.name === 'NotSupportedError') {
          errorMessage = "Your browser doesn't support microphone access. Please use Chrome or Firefox.";
        } else if (err.name === 'NotReadableError') {
          errorMessage = "Microphone is being used by another application. Please close other apps using the microphone.";
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setIsListening(false);
      }
    };

    startTuning();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext) audioContext.close();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsListening(false);
    };
  }, []);

  return (
    <motion.div 
      className={`tuner-container ${className}`}
      style={{
        transform: 'scale(0.4)',
        transformOrigin: 'top right',
        margin: 0,
        marginBottom: '-130px',
        width: '100%',
        maxWidth: '500px',
        minWidth: '280px',
        position: 'relative',
        color: 'white',
        fontFamily: '"Montserrat", sans-serif'
      }}
    >
      <div className="tuner-header">
        <div className="status-indicator">
          {isListening && !error && (
            <div className="listening-indicator">
              <div className="pulse"></div>
              <span style={{ color: 'white' }}>Listening...</span>
            </div>
          )}
        </div>
      </div>
      <div className="tuner-display">
        <div className="current-note">
          <div 
            className="note-name" 
            style={{ 
              fontSize: '1.8rem',
              opacity: currentNote ? 1 : 0.5,
              transform: 'none'
            }}
          >
            {currentNote || 'A'}
          </div>
        </div>
        <div 
          className="tuner-linear-container"
          style={{
            position: 'relative',
            width: '100%',
            minWidth: '280px',
            maxWidth: '500px',
            height: 'auto',
            padding: '0 5px',
            margin: '0 auto'
          }}
        >
          <div 
            className="tuner-indicator"
            style={{
              position: 'absolute',
              top: '5px',
              left: '50%',
              width: 0,
              height: 0,
              borderLeft: 'min(3vw, 15px) solid transparent',
              borderRight: 'min(3vw, 15px) solid transparent',
              borderTop: `min(6vw, 30px) solid ${currentNote && Math.abs(cents) <= 5 ? "#10b981" : currentNote && cents > 0 ? "#ef4444" : currentNote && cents < 0 ? "#f59e0b" : "white"}`,
              transform: 'translateX(-50%)',
              zIndex: 2
            }}
          ></div>
          <div 
            className="tuner-scale"
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '40px',
              height: '8vw',
              maxHeight: '50px',
              marginTop: '15px',
              borderRadius: '5px',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Scale markers */}
            {[-3, -2, -1, 0, 1, 2, 3].map((num) => (
              <div 
                key={num}
                style={{
                  position: 'relative',
                  height: '100%',
                  flex: '1 1 0%',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderRight: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                <span 
                  style={{
                    color: 'white',
                    fontSize: 'clamp(12px, 3vw, 16px)',
                    fontWeight: 'normal',
                    padding: '0 2px',
                    textShadow: '0 0 5px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {num === 0 ? '0' : num > 0 ? `+${num}` : num}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
    </motion.div>
  );
}
