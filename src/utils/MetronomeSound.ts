// Metronome sound engine class
export class MetronomeSound {
  audioContext: AudioContext;
  isPlaying: boolean;
  timeoutId: number | null;
  intervalId: number | null;
  bpm: number;
  beatCount: number;
  currentBeat: number;
  onBeat?: (beat: number) => void;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.isPlaying = false;
    this.timeoutId = null;
    this.intervalId = null;
    this.bpm = 120;
    this.beatCount = 0;
    this.currentBeat = 0;
  }

  private scheduleNextBeat() {
    if (!this.isPlaying) return;
    
    const interval = 60000 / this.bpm;
    this.timeoutId = window.setTimeout(() => {
      if (!this.isPlaying) return;
      
      // Play the current beat
      this.playBeat();
      
      // Schedule the next beat
      this.scheduleNextBeat();
    }, interval);
  }

  playBeat() {
    if (!this.audioContext) return;

    // Increment beat count and get current beat
    this.beatCount++;
    const beatInMeasure = this.beatCount % 4;
    this.currentBeat = beatInMeasure;

    // Call the onBeat callback with the current beat
    if (this.onBeat) {
      this.onBeat(beatInMeasure);
    }

    // Create nodes
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // Create a bandpass filter for the wooden resonance
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, this.audioContext.currentTime);
    filter.Q.setValueAtTime(2.0, this.audioContext.currentTime);
    
    // Configure oscillator for a clave/wood block sound
    oscillator.type = 'sine';
    
    // Set initial frequency (higher for downbeat - beat 0, lower for other beats)
    const isDownbeat = beatInMeasure === 0;
    const baseFreq = isDownbeat ? 1780 : 1600;
    
    // Quick frequency sweep down for the "wood" character
    oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      710,
      this.audioContext.currentTime + 0.05
    );
    
    // Volume envelope - very sharp attack, quick decay
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      isDownbeat ? 0.8 : 0.6,
      this.audioContext.currentTime + 0.001
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + (isDownbeat ? 0.08 : 0.06)
    );
    
    // Connect nodes: oscillator -> filter -> gain -> destination
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Start and stop the oscillator
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.beatCount = -1; // Start at -1 so first beat becomes 0
    this.currentBeat = 0;
    
    // Play the first beat immediately with beat 0
    this.playBeat();
    
    // Schedule the next beat
    this.scheduleNextBeat();
  }

  stop() {
    this.isPlaying = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setBPM(newBPM: number) {
    this.bpm = Math.min(Math.max(newBPM, 40), 300); // Clamp between 40-300 BPM
    
    if (this.isPlaying && this.timeoutId) {
      clearTimeout(this.timeoutId);
      const interval = 60000 / this.bpm;
      this.timeoutId = window.setTimeout(() => {
        if (!this.isPlaying) return;
        
        // Move to next beat (0-3)
        this.currentBeat = (this.currentBeat + 1) % 4;
        
        // Play the beat
        this.playBeat();
        
        // Schedule the next beat
        this.scheduleNextBeat();
      }, interval);
    }
  }
}
