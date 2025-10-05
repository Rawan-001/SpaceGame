// Astronaut's Journey - Level 1
// Core game logic: canvas setup, asset loading, entities, controls, particles, obstacles,
// tractor beam, collision, win/lose, and main loop.

(function () {
  'use strict';

  // ------------------------------
  // Canvas and Context
  // ------------------------------
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById('gameCanvas');
  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext('2d');

  // Responsive canvas system - Rectangular format for better gameplay
  const GAME_WIDTH = 1000;
  const GAME_HEIGHT = 600;
  let scaleX = 1;
  let scaleY = 1;
  let offsetX = 0;
  let offsetY = 0;

  const WORLD = {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  };

  // Touch Controls System - Virtual Joystick (moved up to avoid reference errors)
  let joystickActive = false;
  let joystickCenter = { x: 0, y: 0 };
  let joystickRadius = 50;
  
  // Function to force show touch controls
  function forceShowTouchControls() {
    console.log('Forcing touch controls visibility...');
    
    // Check if we're on a laptop/desktop
    const isLaptop = window.innerWidth >= 1025;
    const hasHover = window.matchMedia('(hover: hover)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Only hide touch controls on large screens (1025px and above)
    if (window.innerWidth >= 1025 && (isLaptop || hasHover || !isTouchDevice)) {
      console.log('Large screen detected (1025px+), NOT showing touch controls');
      const joystickContainer = document.querySelector('.joystick-container');
      const actionButtonsContainer = document.querySelector('.action-buttons-container');
      if (joystickContainer) joystickContainer.style.display = 'none';
      if (actionButtonsContainer) actionButtonsContainer.style.display = 'none';
      return;
    }
    
    const joystickContainer = document.querySelector('.joystick-container');
    const actionButtonsContainer = document.querySelector('.action-buttons-container');
    const joystick = document.getElementById('virtualJoystick');
    const knob = document.getElementById('joystickKnob');
    const actionButtons = document.querySelector('.action-buttons');
    
    // Check if device is Huawei tablet
    const isHuawei = /huawei/i.test(navigator.userAgent) || /honor/i.test(navigator.userAgent);
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (joystickContainer) {
      joystickContainer.style.display = 'block';
      joystickContainer.style.opacity = '1';
      joystickContainer.style.visibility = 'visible';
      joystickContainer.style.pointerEvents = 'auto';
      joystickContainer.style.position = 'fixed';
      joystickContainer.style.zIndex = '1000';
      console.log('Joystick container forced visible');
    }
    
    if (actionButtonsContainer) {
      actionButtonsContainer.style.display = 'block';
      actionButtonsContainer.style.opacity = '1';
      actionButtonsContainer.style.visibility = 'visible';
      actionButtonsContainer.style.pointerEvents = 'auto';
      actionButtonsContainer.style.position = 'fixed';
      actionButtonsContainer.style.zIndex = '1000';
      console.log('Action buttons container forced visible');
    }
    
    if (joystick) {
      joystick.style.display = 'block';
      joystick.style.opacity = '1';
      joystick.style.visibility = 'visible';
      joystick.style.pointerEvents = 'auto';
      console.log('Joystick forced visible');
    }
    
    if (knob) {
      knob.style.pointerEvents = 'auto';
      console.log('Joystick knob forced visible');
    }
    
    if (actionButtons) {
      actionButtons.style.display = 'flex';
      actionButtons.style.opacity = '1';
      actionButtons.style.visibility = 'visible';
      actionButtons.style.pointerEvents = 'auto';
      console.log('Action buttons forced visible');
    }
    
    // Special handling for Huawei tablets in landscape mode
    if (isHuawei && isLandscape) {
      console.log('Huawei tablet in landscape mode detected - applying special fixes');
      
      // Force all touch controls to be visible with !important
      const allTouchElements = document.querySelectorAll('.joystick-container, .action-buttons-container, .virtual-joystick, .action-buttons, .action-button');
      allTouchElements.forEach(element => {
        element.style.setProperty('display', 'block', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('pointer-events', 'auto', 'important');
      });
    }
  }
  
  // Action buttons for iPad
  let actionButtons = {
    interact: false,
    exit: false
  };

  // Detect iPad and adjust performance settings (moved up)
  const isIPad = /iPad/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                 (navigator.userAgent.includes('iPad')) ||
                 (navigator.userAgent.includes('iPhone') && window.screen.width >= 768);
  
  // Detect if running on actual iPad (not just Safari on Mac)
  const isRealIPad = /iPad/.test(navigator.userAgent) || 
                     (navigator.userAgent.includes('iPad')) ||
                     (navigator.userAgent.includes('iPhone') && window.screen.width >= 768);

  // Detect low-end devices (Huawei tablets, etc.)
  const isLowEndDevice = /Huawei|HONOR|MediaTek|Snapdragon 4|Snapdragon 6/i.test(navigator.userAgent) ||
                         (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                         (navigator.deviceMemory && navigator.deviceMemory <= 4);

  // Main Loop variables (moved up to avoid reference errors)
  let lastTime = 0;
  let targetFPS = 60;
  let frameInterval = 1000 / targetFPS;

  // Set performance settings based on device
  if (isIPad) {
    if (isRealIPad) {
      targetFPS = 30; // Lower FPS for real iPad to save battery
      console.log('Real iPad detected, using 30 FPS for better performance');
    } else {
      targetFPS = 60; // Full FPS for iPad simulation on desktop
      console.log('iPad simulation detected, using 60 FPS');
    }
    frameInterval = 1000 / targetFPS;
  }
  
  // Additional performance settings for low-end devices
  if (isLowEndDevice) {
    targetFPS = 30; // Lower FPS for low-end devices
    frameInterval = 1000 / targetFPS;
    console.log('Low-end device detected, using 30 FPS for better performance');
  }

  // Initialize responsive canvas
  function initResponsiveCanvas() {
    let resizeTimeout;
    
    function resizeCanvas() {
      // Clear any pending resize
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        console.log('Container size:', { containerWidth, containerHeight });
        
        // Check if we're in landscape mode
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = window.innerWidth <= 1024 || 'ontouchstart' in window;
        
        // Ensure minimum size
        const minWidth = 300;
        const minHeight = 200;
        const effectiveWidth = Math.max(containerWidth, minWidth);
        const effectiveHeight = Math.max(containerHeight, minHeight);
        
        // Calculate scale to fit container while maintaining aspect ratio
        let scaleX_temp = effectiveWidth / GAME_WIDTH;
        let scaleY_temp = effectiveHeight / GAME_HEIGHT;
        let scale;
        
        // Special handling for landscape mode on mobile/tablet
        if (isLandscape && isMobile) {
          // In landscape mode, prioritize fitting the canvas completely
          // Use a more conservative scale to prevent cutoff
          scale = Math.min(scaleX_temp, scaleY_temp, 1.2); // Lower max scale for landscape
          console.log('Landscape mobile mode - using conservative scale:', scale);
        } else {
          // Normal portrait mode or desktop
          scale = Math.min(scaleX_temp, scaleY_temp, 2); // Max scale of 2 for performance
          console.log('Portrait/Desktop mode - using normal scale:', scale);
        }
        
        // Calculate actual canvas size
        const canvasWidth = GAME_WIDTH * scale;
        const canvasHeight = GAME_HEIGHT * scale;
        
        console.log('Calculated scale:', { scale, canvasWidth, canvasHeight, isLandscape, isMobile });
        
        // Set canvas display size
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        
        // Set canvas internal size for crisp rendering
        const devicePixelRatio = window.devicePixelRatio || 1;
        const internalWidth = GAME_WIDTH * devicePixelRatio;
        const internalHeight = GAME_HEIGHT * devicePixelRatio;
        
        // Only resize if dimensions actually changed
        if (canvas.width !== internalWidth || canvas.height !== internalHeight) {
          canvas.width = internalWidth;
          canvas.height = internalHeight;
          
          // Reset context scaling
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(devicePixelRatio, devicePixelRatio);
        }
        
        // Calculate offsets for centering
        offsetX = (containerWidth - canvasWidth) / 2;
        offsetY = (containerHeight - canvasHeight) / 2;
        
        // Update scale factors for coordinate conversion
        scaleX = scale;
        scaleY = scale;
        
        console.log('Canvas resized successfully:', { 
          canvasWidth, 
          canvasHeight, 
          scale, 
          offsetX, 
          offsetY,
          devicePixelRatio,
          isLandscape,
          isMobile
        });
      }, 16); // 60fps throttling
    }
    
    // Initial resize
    resizeCanvas();
    
    // Resize on window resize with throttling
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      console.log('Orientation change detected');
      setTimeout(resizeCanvas, 300); // Longer delay for orientation change
    });
    
    // Additional iPad-specific orientation handling
    if (isRealIPad) {
      window.addEventListener('orientationchange', () => {
        console.log('iPad orientation change detected');
        // Force a more aggressive resize for iPad
        setTimeout(() => {
          resizeCanvas();
          // Also trigger a second resize after a longer delay
          setTimeout(resizeCanvas, 500);
        }, 100);
        
        // Force show touch controls after orientation change
        setTimeout(() => {
          forceShowTouchControls();
        }, 200);
      });
    }
    
    // General orientation change handler for all devices
    window.addEventListener('orientationchange', () => {
      console.log('Orientation change detected');
      setTimeout(() => {
        forceShowTouchControls();
      }, 300);
    });
    
    // Also listen for container size changes
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(canvas.parentElement);
    }
  }

  // Convert screen coordinates to game coordinates
  function screenToGame(screenX, screenY) {
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the actual scale based on canvas display size vs game size
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const actualScaleX = displayWidth / GAME_WIDTH;
    const actualScaleY = displayHeight / GAME_HEIGHT;
    
    const gameX = (screenX - rect.left) / actualScaleX;
    const gameY = (screenY - rect.top) / actualScaleY;
    
    // Debug logging for coordinate conversion
    if (currentScene === 'quiz_active') {
      console.log('Coordinate conversion:', {
        screenX: screenX,
        screenY: screenY,
        rectLeft: rect.left,
        rectTop: rect.top,
        rectWidth: rect.width,
        rectHeight: rect.height,
        actualScaleX: actualScaleX,
        actualScaleY: actualScaleY,
        oldScaleX: scaleX,
        oldScaleY: scaleY,
        gameX: gameX,
        gameY: gameY
      });
    }
    
    return { x: gameX, y: gameY };
  }
  
  // Debug function to log current state
  function logCanvasState() {
    console.log('Canvas State:', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      displayWidth: canvas.style.width,
      displayHeight: canvas.style.height,
      scaleX: scaleX,
      scaleY: scaleY,
      offsetX: offsetX,
      offsetY: offsetY,
      containerWidth: canvas.parentElement.clientWidth,
      containerHeight: canvas.parentElement.clientHeight,
      isIPad: isIPad,
      isRealIPad: isRealIPad
    });
  }
  
  // Make debug function available globally
  window.logCanvasState = logCanvasState;

  // ------------------------------
  // Assets
  // ------------------------------
  const assets = {
    playerRight: new Image(),
    playerLeft: new Image(),
    ship: new Image(),
    ship2: new Image(),
    background: new Image(),
    flying: new Image(),
    flyingAstronaut: new Image(),
    computer: new Image(),
  };

  // ------------------------------
  // Audio System
  // ------------------------------
  const audio = {
    // Background music
    backgroundMusic: null,
    musicVolume: 0.3,
    
    // Sound effects
    beamSound: null,
    winSound: null,
    quizCorrectSound: null,
    quizWrongSound: null,
    thrusterSound: null,
    particleSound: null,
    ship3EngineSound: null,
    ship3FlyingSound: null,
    
    // Celebration sounds
    celebrationMusic: null,
    confettiSound: null,
    victorySound: null,
    fireworksSound: null,
    
    // Audio context for Web Audio API
    audioContext: null,
    initialized: false,
    winSoundPlayed: false,
    celebrationMusicPlayed: false
  };

  // Create audio element for music
  const musicAudio = document.createElement('audio');
  musicAudio.src = 'images/music3.mp3';
  musicAudio.loop = true;
  musicAudio.volume = 0.3; // 30% volume for background music
  musicAudio.muted = false;
  musicAudio.preload = 'auto';

  // Create audio element for celebration music
  const celebrationMusicAudio = document.createElement('audio');
  celebrationMusicAudio.src = 'images/music1.mp3'; // Use existing music1.mp3 for celebration
  celebrationMusicAudio.loop = true;
  celebrationMusicAudio.volume = 0.4; // 40% volume for celebration music
  celebrationMusicAudio.muted = false;
  celebrationMusicAudio.preload = 'auto';

  // Create audio element for Samud (survival) music
  const samudMusicAudio = document.createElement('audio');
  samudMusicAudio.src = 'images/Samud.m4a'; // Use Samud.m4a for survival stage
  samudMusicAudio.loop = true;
  samudMusicAudio.volume = 0.5; // 50% volume for survival music
  samudMusicAudio.muted = false;
  samudMusicAudio.preload = 'auto';

  // Initialize audio immediately
  initAudio();

  // Initialize music button when page loads
  document.addEventListener('DOMContentLoaded', function() {
    updateMusicButton();
    // Initialize responsive canvas
    initResponsiveCanvas();
    // Start music automatically when page loads
    setTimeout(() => {
      startMusic();
    }, 1000); // Start after 1 second to ensure audio context is ready
  });

  // Initialize audio system
  function initAudio() {
    try {
      // Create audio context
      audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Set up audio element for music
      musicAudio.addEventListener('loadedmetadata', () => {
        console.log('Music loaded successfully');
        // Don't auto-play, wait for user interaction
      });
      
      musicAudio.addEventListener('canplaythrough', () => {
        console.log('Music ready to play');
      });
      
      // Load the audio
      musicAudio.load();
      
      // Create sound effects
      createSoundEffects();
      
      audio.initialized = true;
      console.log('Audio system initialized');
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  // Function to start music (called on user interaction)
  function startMusic() {
    if (audio.initialized && musicAudio) {
      try {
        musicAudio.play().then(() => {
          console.log('Music started successfully');
          updateMusicButton();
        }).catch(e => {
          console.warn('Music playback failed:', e);
        });
      } catch (error) {
        console.warn('Music start failed:', error);
      }
    }
  }

  // Function to toggle music on/off
  function toggleMusic() {
    console.log('Toggle music clicked');
    if (musicAudio) {
      console.log('Music audio element found, paused:', musicAudio.paused);
      if (musicAudio.paused) {
        musicAudio.play().then(() => {
          console.log('Music started via button');
          updateMusicButton();
        }).catch(e => {
          console.warn('Music playback failed via button:', e);
        });
      } else {
        musicAudio.pause();
        console.log('Music paused via button');
        updateMusicButton();
      }
    } else {
      console.warn('Music audio element not found');
    }
  }

  // Function to update music button text
  function updateMusicButton() {
    const button = document.getElementById('musicToggle');
    if (button && musicAudio) {
      if (musicAudio.paused) {
        button.textContent = '🎵 تشغيل الموسيقى';
      } else {
        button.textContent = '⏸️ إيقاف الموسيقى';
      }
    }
  }

  // Make toggleMusic globally available
  window.toggleMusic = toggleMusic;

  // Function to start celebration music
  function startCelebrationMusic() {
    if (audio.initialized && celebrationMusicAudio && !audio.celebrationMusicPlayed) {
      try {
        // Stop background music first
        if (musicAudio && !musicAudio.paused) {
          musicAudio.pause();
        }
        
        // Start celebration music
        celebrationMusicAudio.currentTime = 0;
        celebrationMusicAudio.play().then(() => {
          console.log('Celebration music started successfully');
          audio.celebrationMusicPlayed = true;
        }).catch(e => {
          console.warn('Celebration music playback failed:', e);
        });
      } catch (error) {
        console.warn('Celebration music start failed:', error);
      }
    }
  }

  // Function to stop celebration music and return to background music
  function stopCelebrationMusic() {
    if (celebrationMusicAudio && !celebrationMusicAudio.paused) {
      celebrationMusicAudio.pause();
      console.log('Celebration music stopped');
    }
    
    // Resume background music
    if (musicAudio && musicAudio.paused) {
      musicAudio.play().then(() => {
        console.log('Background music resumed');
      }).catch(e => {
        console.warn('Background music resume failed:', e);
      });
    }
  }

  // Function to start Samud (survival) music
  function startSamudMusic() {
    if (audio.initialized && samudMusicAudio) {
      try {
        // Stop background music first
        if (musicAudio && !musicAudio.paused) {
          musicAudio.pause();
        }
        
        // Stop celebration music if playing
        if (celebrationMusicAudio && !celebrationMusicAudio.paused) {
          celebrationMusicAudio.pause();
        }
        
        // Start Samud music
        samudMusicAudio.currentTime = 0;
        samudMusicAudio.play().then(() => {
          console.log('Samud music started successfully');
        }).catch(e => {
          console.warn('Samud music playback failed:', e);
        });
      } catch (error) {
        console.warn('Samud music start failed:', error);
      }
    }
  }

  // Function to stop Samud music and return to background music
  function stopSamudMusic() {
    if (samudMusicAudio && !samudMusicAudio.paused) {
      samudMusicAudio.pause();
      console.log('Samud music stopped');
    }
    
    // Resume background music
    if (musicAudio && musicAudio.paused) {
      musicAudio.play().then(() => {
        console.log('Background music resumed');
      }).catch(e => {
        console.warn('Background music resume failed:', e);
      });
    }
  }


  // Create sound effects using Web Audio API
  function createSoundEffects() {
    if (!audio.audioContext) return;
    
    // Beam sound effect
    audio.beamSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(400, audio.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audio.audioContext.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.1, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.5);
    };

    // Win sound effect
    audio.winSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523, audio.audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, audio.audioContext.currentTime + 0.2); // E5
      oscillator.frequency.setValueAtTime(784, audio.audioContext.currentTime + 0.4); // G5
      
      gainNode.gain.setValueAtTime(0.2, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 1);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 1);
    };

    // Quiz correct sound
    audio.quizCorrectSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audio.audioContext.currentTime); // A4
      oscillator.frequency.setValueAtTime(554, audio.audioContext.currentTime + 0.1); // C#5
      
      gainNode.gain.setValueAtTime(0.15, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.3);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.3);
    };

    // Quiz wrong sound
    audio.quizWrongSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, audio.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audio.audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.1, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.2);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.2);
    };

    // Thruster sound
    audio.thrusterSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150 + Math.random() * 50, audio.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.05, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.1);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.1);
    };

    // Particle sound
    audio.particleSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800 + Math.random() * 400, audio.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.03, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.05);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.05);
    };

    // Ship3 engine sound (powerful engine noise)
    audio.ship3EngineSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      const filter = audio.audioContext.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, audio.audioContext.currentTime);
      
      // Add filter for engine-like sound
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, audio.audioContext.currentTime);
      filter.Q.setValueAtTime(1, audio.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.15, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.3);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.3);
    };

    // Ship3 flying sound (whoosh effect)
    audio.ship3FlyingSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      const filter = audio.audioContext.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, audio.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audio.audioContext.currentTime + 0.5);
      
      // Add filter for whoosh effect
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(100, audio.audioContext.currentTime);
      filter.Q.setValueAtTime(0.5, audio.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.5);
    };

    // Celebration sounds
    // Confetti sound (sparkly effect)
    audio.confettiSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audio.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audio.audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(600, audio.audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.05, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.2);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.2);
    };

    // Victory sound (triumphant fanfare)
    audio.victorySound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      // Victory fanfare melody
      oscillator.frequency.setValueAtTime(523, audio.audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, audio.audioContext.currentTime + 0.2); // E5
      oscillator.frequency.setValueAtTime(784, audio.audioContext.currentTime + 0.4); // G5
      oscillator.frequency.setValueAtTime(1047, audio.audioContext.currentTime + 0.6); // C6
      
      gainNode.gain.setValueAtTime(0.1, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 1.0);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 1.0);
    };

    // Fireworks sound (explosive effect)
    audio.fireworksSound = () => {
      const oscillator = audio.audioContext.createOscillator();
      const gainNode = audio.audioContext.createGain();
      const filter = audio.audioContext.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audio.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(100, audio.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audio.audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.08, audio.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audio.audioContext.currentTime + 0.3);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, audio.audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audio.audioContext.currentTime + 0.3);
    };
  }

  // Play sound effect
  function playSound(soundFunction) {
    if (audio.initialized && soundFunction) {
      try {
        soundFunction();
      } catch (error) {
        console.warn('Sound playback failed:', error);
      }
    } else {
      console.warn('Sound effect not available - audio not initialized or sound function missing');
    }
  }
  assets.playerRight.src = 'images/FlyRight.png';
  assets.playerLeft.src = 'images/FlyLeft.png';
  assets.ship.src = 'images/Ship.png';
  assets.ship2.src = 'images/Ship3.png';
  assets.background.src = 'images/Background.png';
  assets.flying.src = 'images/flyingAstronuat.png';
  assets.flyingAstronaut.src = 'images/flyingAstronuat.png';
  assets.computer.src = 'images/computer.gif';

  let assetsLoaded = 0;
  const neededAssets = Object.keys(assets).length;

  function onAssetLoaded() {
    assetsLoaded += 1;
    if (assetsLoaded >= neededAssets) {
      startGame();
    }
  }

  Object.values(assets).forEach((img) => {
    img.addEventListener('load', onAssetLoaded);
    img.addEventListener('error', () => {
      console.error('Failed to load image:', img.src);
      // Even if an asset fails, allow starting with fallbacks
      onAssetLoaded();
    });
  });

  // ------------------------------
  // Game State
  // ------------------------------
  const player = {
    x: 80,
    y: WORLD.height - 140,
    width: 72,
    height: 72,
    speed: 3, // Increased for faster movement
    dx: 0,
    dy: 0,
    image: assets.playerRight,
    alive: true,
    captured: false,
    floatT: 0,
    floatOffset: 0,
    alpha: 1,
    facing: 'right', // Track player direction
    // Smooth movement interpolation
    targetX: 80,
    targetY: WORLD.height - 140,
    moveSpeed: 0.35, // Faster interpolation speed
  };

  const ship = {
    x: -220, // Start from left side
    y: 80,
    width: 200,
    height: 120,
    speed: 1.5, // Positive speed to move right
    isDocked: false,
    isBeamActive: false,
    beamPulseT: 0,
    floatT: 0,
    floatOffset: 0,
    departing: false,
  };

  // Rescue ship
  const rescueShip = {
    x: WORLD.width + 100,
    y: WORLD.height / 2 - 80,
    width: 140,
    height: 160,
    speed: 0,
    floatOffset: 0,
    arriving: false,
    docked: false,
    departing: false,
    beamActive: false,
    gateX: 0,
    gateY: 0,
    gateWidth: 80,
    gateHeight: 120,
    visible: false,
    arrivalTimer: 0,
    arrivalDelay: 3000 // 3 seconds after ship burns
  };

  const obstacles = []; // {x,y,width,height,speed,color}
  const particles = []; // ship thruster particles
  const playerFlames = []; // blue flames under astronaut

  let gameOver = false;
  let gameWin = false;
  let obstacleTimer = 0;
  
  // Rescue ship messages
  let rescueMessage = {
    visible: false,
    text: "انتظري ستأتي مركبة إنقاذ",
    timer: 0,
    duration: 5000
  };
  
  // Game scenes
  let currentScene = 'main'; // 'main', 'flying', 'cinematic', 'transition_to_inside', 'inside_ship', 'quiz_active', 'outside_ship', 'inside_rescue_ship'
  let sceneTransition = {
    active: false,
    progress: 0,
    speed: 0.12,
    fromScene: '',
    toScene: ''
  };
  
  // Transition to inside ship state
  let transitionToInside = {
    active: false,
    progress: 0,
    speed: 0.08
  };
  
  // Exit ship transition state
  let exitShipTransition = {
    active: false,
    progress: 0,
    speed: 0.05, // Faster exit transition
    fromScene: '',
    toScene: ''
  };

  // Exit confirmation dialog
  let exitConfirmation = {
    visible: false,
    x: 0,
    y: 0,
    width: 400,
    height: 200,
    yesButton: { x: 0, y: 0, width: 80, height: 30, text: 'نعم' },
    noButton: { x: 0, y: 0, width: 80, height: 30, text: 'لا' }
  };
  
  // Inside ship state
  const insideShip = {
    playerX: 0,
    playerY: 0,
    computerX: WORLD.width / 2 - 80, // Centered in rectangular canvas
    computerY: WORLD.height - 395, // Much higher up from bottom
    computerWidth: 160, // Bigger size
    computerHeight: 120, // Bigger size
    tableWidth: 0, // Remove table
    tableHeight: 0, // Remove table
    interactionRadius: 180, // Increased interaction radius for bigger computer
    showInteraction: false,
    // Background parallax for inside ship
    backgroundX: 0,
    backgroundY: 0,
    backgroundSpeed: 0.4, // Slower than player movement for depth effect
    fadeIn: 0,
    fadeSpeed: 0.02,
    // Player floating effect
    floatT: 0,
    floatOffset: 0,
    // Computer floating effect (since it's a GIF)
    computerFloatT: 0,
    computerFloatOffset: 0
  };

  // Inside rescue ship scene
  const insideRescueShip = {
    playerX: 0,
    playerY: 0,
    computerX: WORLD.width / 2 - 80,
    computerY: WORLD.height - 395,
    computerWidth: 160,
    computerHeight: 120,
    tableWidth: 0,
    tableHeight: 0,
    interactionRadius: 180,
    showInteraction: false,
    backgroundX: 0,
    backgroundY: 0,
    backgroundSpeed: 0.4,
    fadeIn: 0,
    fadeSpeed: 0.02,
    floatT: 0,
    floatOffset: 0,
    computerFloatT: 0,
    computerFloatOffset: 0
  };
  
  // Outside of ship state
  const outsideShip = {
    hazards: [],
    spawnTimer: 0,
    spawnRate: 150, // أسرع في الظهور (أكثر عدداً وأصعب)
    gateWidth: 90,
    gateHeight: 180,
    gateX: WORLD.width - 120, // Moved further right for rectangular canvas
    gateY: WORLD.height / 2 - 90, // Default position, will be set properly by initializeGatePosition
    shipX: 40,
    // Survival timer system
    survivalTimer: 0,
    maxSurvivalTime: 3600, // 60 seconds (3600 frames at 60fps) - دقيقة كاملة
    difficultyMultiplier: 1.0,
    shipY: 60,
    // Ship arrival sequence
    shipArriving: false,
    shipArrivalX: WORLD.width + 50, // Start from right
    shipArrivalY: 80,
    shipArrivalSpeed: 3.0,
    shipArrivalBeamActive: false,
    shipArrivalBeamPulseT: 0,
    // Ship movement from right to left
    shipMoving: false,
    shipTargetX: 50, // Target position on the left
    shipSpeed: 2.2,
    // Ship scaling for outside scene - keep normal size
    shipScale: 1.0, // Always normal size
    justExited: false, // Prevent auto-entry immediately after exiting
    // Ship fire effects for final stage
    shipFire: {
      particles: [],
      intensity: 0, // 0 to 1, increases as survival timer approaches max
      floatOffset: 0,
      floatT: 0
    },
    
    // Rescue ship system
    rescueShip: {
      active: false,
      arriving: false,
      arrived: false,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      speed: 2,
      scale: 1.2, // Slightly larger than regular ship
      beamActive: false,
      beamPulseT: 0,
      canBoard: false,
      boardingMessage: '',
      boardingMessageT: 0
    }
  };
  
  // Exit/Enter buttons
  const exitButton = { x: 16, y: WORLD.height - 56, w: 250, h: 50, visible: false };
  const enterButton = { x: 16, y: WORLD.height - 56, w: 190, h: 36, visible: false };
  
  // Clickable speech bubbles
  const speechBubbles = {
    interact: { x: 0, y: 0, w: 0, h: 0, visible: false, text: '' },
    exit: { x: 0, y: 0, w: 0, h: 0, visible: false, text: '' }
  };
  
  // Canvas controls for landscape mode
  const canvasControls = {
    joystick: { x: 0, y: 0, w: 0, h: 0, visible: false },
    interactButton: { x: 0, y: 0, w: 0, h: 0, visible: false },
    exitButton: { x: 0, y: 0, w: 0, h: 0, visible: false }
  };
  
  // Quiz system
  const quiz = {
    active: false,
    currentQuestion: 0,
    score: 0,
    hasWon: false, // Track if player has won before
    canRetryAfterWin: false, // Allow retry after winning
    allQuestions: [
      {
        question: "ما اسم الكوكب الأحمر؟",
        options: ["الأرض", "المشتري", "المريخ", "الزهرة"],
        answer: "المريخ"
      },
      {
        question: "أي كوكب أقرب إلى الشمس؟",
        options: ["عطارد", "الأرض", "الزهرة", "نبتون"],
        answer: "عطارد"
      },
      {
        question: "ما الكوكب الذي نعيش عليه؟",
        options: ["المريخ", "الأرض", "زحل", "أورانوس"],
        answer: "الأرض"
      },
      {
        question: "أي جسم في السماء يضيء بنفسه؟",
        options: ["القمر", "الشمس", "الأرض", "المشتري"],
        answer: "الشمس"
      },
      {
        question: "ماذا نسمي القمر الذي يدور حول الأرض؟",
        options: ["القمر", "فوبوس", "إيو", "تيتان"],
        answer: "القمر"
      },
      {
        question: "ماذا يحتاج رائد الفضاء للتنفس في الفضاء؟",
        options: ["ماء", "أكسجين", "طعام", "خوذة"],
        answer: "أكسجين"
      },
      {
        question: "ما اسم السفينة التي تنقل رواد الفضاء؟",
        options: ["غواصة", "مركبة فضائية", "طائرة", "قمر صناعي"],
        answer: "مركبة فضائية"
      },
      {
        question: "ماذا يرتدي رائد الفضاء خارج المركبة؟",
        options: ["بدلة فضاء", "معطف", "خوذة فقط", "قميص"],
        answer: "بدلة فضاء"
      },
      {
        question: "كم كوكبًا في المجموعة الشمسية؟",
        options: ["9", "7", "8", "10"],
        answer: "8"
      },
      {
        question: "ما أكبر كوكب في النظام الشمسي؟",
        options: ["الأرض", "زحل", "المشتري", "نبتون"],
        answer: "المشتري"
      },
      {
        question: "ما أصغر كوكب في النظام الشمسي؟",
        options: ["عطارد", "المريخ", "الأرض", "بلوتو"],
        answer: "عطارد"
      },
      {
        question: "ما الكوكب الذي له حلقات جميلة؟",
        options: ["زحل", "أورانوس", "المريخ", "الأرض"],
        answer: "زحل"
      },
      {
        question: "ما الكوكب المعروف بالكوكب الأزرق؟",
        options: ["الأرض", "نبتون", "المريخ", "زحل"],
        answer: "نبتون"
      },
      {
        question: "أي كوكب هو الأقرب للأرض؟",
        options: ["الزهرة", "عطارد", "زحل", "المشتري"],
        answer: "الزهرة"
      },

      {
        question: "ماذا يستخدم رواد الفضاء للتواصل في الفضاء؟",
        options: ["الأعلام", "الراديو", "الورق", "الإنترنت فقط"],
        answer: "الراديو"
      },
      {
        question: "ما الطعام الذي يأكله رواد الفضاء؟",
        options: ["طعام مجفف", "طعام عادي", "طعام ساخن فقط", "طعام نباتي فقط"],
        answer: "طعام مجفف"
      },
      {
        question: "هل يستطيع رواد الفضاء النوم في الفضاء؟",
        options: ["لا", "نعم", "فقط ساعة", "لا يوجد نوم"],
        answer: "نعم"
      },
      {
        question: "كيف ينام رواد الفضاء في الفضاء؟",
        options: ["على أسرّة", "في أكياس نوم مربوطة", "على الأرض", "واقفين"],
        answer: "في أكياس نوم مربوطة"
      },
      {
        question: "هل يوجد جاذبية قوية داخل محطة الفضاء الدولية؟",
        options: ["نعم قوية", "لا، ضعيفة جدًا", "متوسطة", "لا جاذبية"],
        answer: "لا، ضعيفة جدًا"
      },
      {
        question: "ماذا يحدث للماء في الفضاء؟",
        options: ["يتجمد", "يتحول لكرات تطفو", "يختفي", "يتبخر فورًا"],
        answer: "يتحول لكرات تطفو"
      },
      {
        question: "هل يمكن للنار أن تشتعل في الفضاء بسهولة؟",
        options: ["نعم دائمًا", "لا، تحتاج للأكسجين", "فقط عند الشمس", "تشتعل بلا هواء"],
        answer: "لا، تحتاج للأكسجين"
      },
      {
        question: "ما اسم المجرة التي نعيش فيها؟",
        options: ["درب التبانة", "أندروميدا", "زحل", "سحابة ماجلان"],
        answer: "درب التبانة"
      },
      {
        question: "هل القمر يضيء بنفسه؟",
        options: ["نعم", "لا، يعكس ضوء الشمس", "أحيانًا", "فقط في الليل"],
        answer: "لا، يعكس ضوء الشمس"
      },
      {
        question: "ما هي محطة الفضاء الدولية؟",
        options: ["قمر صناعي", "بيت كبير لرواد الفضاء", "كوكب", "مركبة فضائية صغيرة"],
        answer: "بيت كبير لرواد الفضاء"
      },
      {
        question: "كيف يشرب رائد الفضاء الماء؟",
        options: ["من أكياس خاصة", "من الكوب", "من الصنبور", "لا يشرب"],
        answer: "من أكياس خاصة"
      },
      {
        question: "ما الكوكب الذي يشتهر بالبقعة الحمراء الكبيرة؟",
        options: ["زحل", "المريخ", "المشتري", "نبتون"],
        answer: "المشتري"
      },
      {
        question: "ماذا يستخدم العلماء لمشاهدة الفضاء البعيد؟",
        options: ["المجهر", "التلسكوب", "النظارات", "الكاميرا"],
        answer: "التلسكوب"
      },
      {
        question: "ما هي الشمس؟",
        options: ["كوكب", "نجم", "قمر", "مجرة"],
        answer: "نجم"
      },
      {
        question: "ما اسم الكوكب الذي نراه ككرة زرقاء من الفضاء؟",
        options: ["المريخ", "الأرض", "نبتون", "زحل"],
        answer: "الأرض"
      }
    ],
    questions: [], // Will be filled with random 5 questions
    selectedAnswer: null,
    showResult: false,
    completed: false,
    canRetry: false
  };
  
  // Celebration system
  const celebration = {
    active: false,
    duration: 8000, // 8 seconds celebration
    startTime: 0,
    particles: [],
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'],
    confettiCount: 50
  };

  // Timer celebration system
  const timerCelebration = {
    active: false,
    duration: 10000, // 10 seconds celebration
    startTime: 0,
    particles: [],
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#ff4757', '#2ed573', '#ffa502'],
    confettiCount: 100,
    ribbons: []
  };
  
  // Flying scene state
  const flyingScene = {
    backgroundX: 0,
    backgroundY: 0,
    backgroundSpeed: 0.7, // Enhanced parallax speed multiplier
    fadeIn: 0,
    fadeSpeed: 0.03, // Faster fade in
    sceneTransition: {
      active: false,
      direction: '', // 'left', 'right', 'up', 'down'
      progress: 0,
      speed: 0.08 // Faster scene transitions
    },
    // Ship and beam for flying scene
    shipX: WORLD.width - 300, // Ship position on the right - adjusted for wider canvas
    shipY: 80,
    shipWidth: 200,
    shipHeight: 120,
    beamActive: false,
    beamPulseT: 0,
    shipFloatT: 0,
    shipFloatOffset: 0,
    // Ship scaling animation
    shipScale: 0.1, // Start very small
    targetScale: 3.0, // Target much larger size (3x bigger)
    scaleSpeed: 0.08, // Speed of scaling (much faster)
    scaleComplete: false,
    // Continuous scaling during flight
    minScale: 2.5, // Minimum scale during flight (2.5x bigger)
    maxScale: 5.0, // Maximum scale during flight (5x bigger)
    scaleDirection: 1, // 1 for growing, -1 for shrinking
    continuousScaling: true // Enable continuous scaling during flight
  };
  
  // Cinematic state after win
  const cinematic = {
    active: false,
    x: WORLD.width - 80, // Start from right side - adjusted for wider canvas
    y: 50, // Start from top
    vx: -2.2,
    vy: 1.2,
    scale: 1,
    scaleSpeed: 0.004,
    angle: -0.28, // slight tilt like preview image
    targetX: 50, // Target left side
    targetY: WORLD.height - 150, // Target bottom
    moving: false,
  };
  let winAt = 0;

  // ------------------------------
  // Input Handling
  // ------------------------------
  const keys = new Set();

  function handleKeyDown(e) {
    const key = e.key;
    
    // Start music on first key press
    if (!musicAudio.paused || musicAudio.currentTime === 0) {
      startMusic();
    }
    
    // Computer interaction - removed F1 key, now handled by mouse clicks
    // This section is kept for backward compatibility but F1 is no longer used
    
    // Exit ship - removed F3 key, now handled by mouse clicks
    // This section is kept for backward compatibility but F3 is no longer used
    
    // Action buttons are now handled by direct click/touch events
    
    // Scene switching with smooth transition
    if (key === 'f' || key === 'F') {
      e.preventDefault();
      if (!sceneTransition.active) {
        if (currentScene === 'main') {
          startSceneTransition('main', 'flying');
        } else if (currentScene === 'flying') {
          startSceneTransition('flying', 'main');
        }
      }
      return;
    }
    
    // Toggle beam in flying scene
    if (key === 'b' || key === 'B') {
      e.preventDefault();
      if (currentScene === 'flying') {
        flyingScene.beamActive = !flyingScene.beamActive;
        if (flyingScene.beamActive) {
          flyingScene.beamPulseT = 0; // Reset beam pulse
        }
      }
      return;
    }
    
    // Enter ship with Space key when in beam
    if (key === ' ') {
      e.preventDefault();
      if (currentScene === 'main' && ship.isBeamActive && isPlayerInBeam()) {
        // Enter ship immediately when in beam
        currentScene = 'inside_ship';
        insideShip.playerX = WORLD.width / 2 - player.width / 2;
        insideShip.playerY = WORLD.height / 2 - player.height / 2;
        // Reset ship arrival state when entering
        outsideShip.shipArriving = false;
        outsideShip.shipArrivalBeamActive = false;
        player.captured = false;
        player.alpha = 1;
        // Reset survival timer when entering ship
        outsideShip.survivalTimer = 0;
        outsideShip.difficultyMultiplier = 1.0;
      }
      return;
    }
    
    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
      e.preventDefault();
      keys.add(key);
      updatePlayerVelocity();
      if (key === 'ArrowLeft') player.image = assets.playerLeft;
      if (key === 'ArrowRight') player.image = assets.playerRight;
    }
  }

  function handleKeyUp(e) {
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
      e.preventDefault();
      keys.delete(key);
      updatePlayerVelocity();
    }
  }

  function updatePlayerVelocity() {
    let vx = 0;
    let vy = 0;
    if (keys.has('ArrowLeft')) {
      vx -= 1;
      player.facing = 'left'; // Left arrow = face left
    }
    if (keys.has('ArrowRight')) {
      vx += 1;
      player.facing = 'right'; // Right arrow = face right
    }
    if (keys.has('ArrowUp')) vy -= 1;
    if (keys.has('ArrowDown')) vy += 1;

    if (vx !== 0 && vy !== 0) {
      const inv = Math.SQRT1_2; // 1/√2 to keep diagonal speed consistent
      vx *= inv;
      vy *= inv;
    }

    // Direct velocity calculation for immediate response
    player.dx = vx * player.speed;
    player.dy = vy * player.speed;
  }
  
  // Start transition to inside ship
  function startTransitionToInside() {
    transitionToInside.active = true;
    transitionToInside.progress = 0;
    currentScene = 'transition_to_inside';
  }
  
  // Select random questions
  function selectRandomQuestions() {
    const shuffled = [...quiz.allQuestions].sort(() => 0.5 - Math.random());
    quiz.questions = shuffled.slice(0, 5);
  }
  
  // Start quiz
  function startQuiz() {
    selectRandomQuestions(); // Select 5 random questions
    quiz.active = true;
    quiz.currentQuestion = 0;
    quiz.score = 0;
    quiz.selectedAnswer = null;
    quiz.showResult = false;
    quiz.completed = false;
    quiz.canRetry = false;
    currentScene = 'quiz_active';
  }
  
  // Start ship arrival sequence
  function startShipArrival() {
    outsideShip.shipArriving = true;
    outsideShip.shipArrivalX = WORLD.width + 50; // Start from right
    outsideShip.shipArrivalY = 80;
    outsideShip.shipArrivalBeamActive = false;
    outsideShip.shipArrivalBeamPulseT = 0;
    outsideShip.shipMoving = true; // Start moving from right to left
  }
  
  // Check if player is near computer
  function isPlayerNearComputer() {
    const playerCenterX = insideShip.playerX + player.width / 2;
    const playerCenterY = insideShip.playerY + player.height / 2;
    // Computer position includes parallax offset + floating effect
    const computerCenterX = (insideShip.computerX + insideShip.backgroundX) + insideShip.computerWidth / 2;
    const computerCenterY = (insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset) + insideShip.computerHeight / 2;
    
    const distance = Math.sqrt(
      Math.pow(playerCenterX - computerCenterX, 2) + 
      Math.pow(playerCenterY - computerCenterY, 2)
    );
    
    return distance <= insideShip.interactionRadius;
  }

  function isPlayerNearRescueComputer() {
    const playerCenterX = insideRescueShip.playerX + player.width / 2;
    const playerCenterY = insideRescueShip.playerY + player.height / 2;
    // Computer position includes parallax offset + floating effect
    const computerCenterX = (insideRescueShip.computerX + insideRescueShip.backgroundX) + insideRescueShip.computerWidth / 2;
    const computerCenterY = (insideRescueShip.computerY + insideRescueShip.backgroundY + insideRescueShip.computerFloatOffset) + insideRescueShip.computerHeight / 2;
    
    const distance = Math.sqrt(
      Math.pow(playerCenterX - computerCenterX, 2) + 
      Math.pow(playerCenterY - computerCenterY, 2)
    );
    
    return distance <= insideRescueShip.interactionRadius;
  }
  
  // Check if player is in flying scene beam
  function isPlayerInFlyingBeam() {
    if (!flyingScene.beamActive) return false;
    
    // Beam center point
    const beamCenterX = flyingScene.shipX + flyingScene.shipWidth * 0.62;
    const beamCenterY = flyingScene.shipY + flyingScene.shipHeight * 0.45;
    
    // Player center point
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    
    // Calculate distance between player and beam center
    const distance = Math.sqrt(
      Math.pow(playerCenterX - beamCenterX, 2) + 
      Math.pow(playerCenterY - beamCenterY, 2)
    );
    
    // Debug: log distance when close
    if (distance < 100) {
      console.log('Flying beam distance:', distance, 'Beam active:', flyingScene.beamActive);
    }
    
    // Only activate when very close (50 pixels for better detection)
    return distance <= 50;
  }
  
  // Check if player is in arrival beam (outside ship scene)
  function isPlayerInArrivalBeam() {
    if (!outsideShip.shipArrivalBeamActive) return false;
    
    // Beam center point
    const beamCenterX = outsideShip.shipArrivalX + 200 * 0.62;
    const beamCenterY = outsideShip.shipArrivalY + 120 * 0.45;
    
    // Player center point
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    
    // Calculate distance between player and beam center
    const distance = Math.sqrt(
      Math.pow(playerCenterX - beamCenterX, 2) + 
      Math.pow(playerCenterY - beamCenterY, 2)
    );
    
    // Debug: log distance when close
    if (distance < 100) {
      console.log('Arrival beam distance:', distance, 'Beam active:', outsideShip.shipArrivalBeamActive);
    }
    
    // Only activate when very close (50 pixels for better detection)
    return distance <= 50;
  }

  window.addEventListener('keydown', handleKeyDown, { passive: false });
  window.addEventListener('keyup', handleKeyUp, { passive: false });
  
  // Mouse click handling for quiz
  canvas.addEventListener('click', handleMouseClick);
  
  // Touch handling for quiz (separate from joystick)
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  // Touch controls initialization
  initTouchControls();
  
  // Initialize action buttons (always, not just on touch devices)
  initActionButtons();
  
  function handleMouseClick(e) {
    const gameCoords = screenToGame(e.clientX, e.clientY);
    const x = gameCoords.x;
    const y = gameCoords.y;

    // Check for restart button in game over screen
    if (gameOver) {
      const buttonX = WORLD.width / 2 - 100;
      const buttonY = WORLD.height / 2 + 80;
      const buttonWidth = 200;
      const buttonHeight = 50;
      
      if (x >= buttonX && x <= buttonX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight) {
        console.log('Restart button clicked in game over screen');
        window.location.reload();
        return;
      }
    }

    // Check for canvas joystick (landscape mode)
    if (canvasControls.joystick.visible) {
      const joystick = canvasControls.joystick;
      if (x >= joystick.x && x <= joystick.x + joystick.w && y >= joystick.y && y <= joystick.y + joystick.h) {
        console.log('Canvas joystick clicked');
        // Handle joystick interaction
        return;
      }
    }

    // Check for canvas controls first (landscape mode)
    if (canvasControls.interactButton.visible) {
      const button = canvasControls.interactButton;
      if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
        console.log('Canvas interact button clicked');
        handleInteractButton();
        return;
      }
    }
    
    if (canvasControls.exitButton.visible) {
      const button = canvasControls.exitButton;
      if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
        console.log('Canvas exit button clicked');
        handleExitButton();
        return;
      }
    }
    
    // Check for speech bubble clicks
    if (speechBubbles.interact.visible) {
      const bubble = speechBubbles.interact;
      if (x >= bubble.x && x <= bubble.x + bubble.w && y >= bubble.y && y <= bubble.y + bubble.h) {
        console.log('Interact speech bubble clicked');
        handleInteractButton();
        return;
      }
    }
    
    if (speechBubbles.exit.visible) {
      const bubble = speechBubbles.exit;
      console.log('Exit speech bubble visible, checking click at:', x, y);
      console.log('Exit bubble bounds:', bubble.x, bubble.y, bubble.w, bubble.h);
      if (x >= bubble.x && x <= bubble.x + bubble.w && y >= bubble.y && y <= bubble.y + bubble.h) {
        console.log('Exit speech bubble clicked - calling handleExitButton');
        handleExitButton();
        return;
      }
      console.log('Click not within exit bubble bounds');
    } else {
      console.log('Exit speech bubble not visible');
    }

    // Exit confirmation dialog
    if (exitConfirmation.visible) {
      console.log('Exit confirmation visible, checking button clicks at:', x, y);
      console.log('Yes button bounds:', exitConfirmation.yesButton.x, exitConfirmation.yesButton.y, exitConfirmation.yesButton.width, exitConfirmation.yesButton.height);
      
      // Yes button
      if (x >= exitConfirmation.yesButton.x && x <= exitConfirmation.yesButton.x + exitConfirmation.yesButton.width && 
          y >= exitConfirmation.yesButton.y && y <= exitConfirmation.yesButton.y + exitConfirmation.yesButton.height) {
        console.log('Yes button clicked - starting exit transition');
        hideExitConfirmation();
        startExitShipTransition('inside_ship', 'outside_ship');
        return;
      }
      
      // No button
      console.log('No button bounds:', exitConfirmation.noButton.x, exitConfirmation.noButton.y, exitConfirmation.noButton.width, exitConfirmation.noButton.height);
      if (x >= exitConfirmation.noButton.x && x <= exitConfirmation.noButton.x + exitConfirmation.noButton.width && 
          y >= exitConfirmation.noButton.y && y <= exitConfirmation.noButton.y + exitConfirmation.noButton.height) {
        console.log('No button clicked - staying in ship');
        hideExitConfirmation();
        return;
      }
      
      console.log('No button clicked - coordinates not within bounds');
    }

    // Inside-ship: Exit button
    if (currentScene === 'inside_ship' && exitButton.visible) {
      if (x >= exitButton.x && x <= exitButton.x + exitButton.w && y >= exitButton.y && y <= exitButton.y + exitButton.h) {
        currentScene = 'outside_ship';
        player.alpha = 1;
        // Position player near the gate (on the left side of the gate)
        player.x = outsideShip.gateX - player.width - 20;
        player.y = outsideShip.gateY + outsideShip.gateHeight / 2 - player.height / 2;
        
        // Reset ship arrival state to ensure ship appears (same as F3)
        outsideShip.shipArriving = true;
        outsideShip.shipArrivalX = WORLD.width + 50; // Start from right
        outsideShip.shipArrivalY = 80;
        outsideShip.shipArrivalBeamActive = false; // No beam needed
        outsideShip.shipArrivalBeamPulseT = 0;
        outsideShip.shipMoving = true; // Start moving from right to left
        
        // Start Samud music for survival stage
        startSamudMusic();
        return;
      }
    }

    // Outside: Enter button
    if (currentScene === 'outside_ship' && enterButton.visible) {
      if (x >= enterButton.x && x <= enterButton.x + enterButton.w && y >= enterButton.y && y <= enterButton.y + enterButton.h) {
        currentScene = 'inside_ship';
        insideShip.playerX = 16 + player.width;
        insideShip.playerY = clamp(player.y, 0, WORLD.height - player.height);
        // Reset ship arrival state when entering
        outsideShip.shipArriving = false;
        outsideShip.shipArrivalBeamActive = false;
        // Reset survival timer when entering ship
        outsideShip.survivalTimer = 0;
        outsideShip.difficultyMultiplier = 1.0;
        
        // Stop Samud music and return to background music
        stopSamudMusic();
        return;
      }
    }

    if (currentScene !== 'quiz_active') return;
    
    // Check if click is on retry button in results
    if (quiz.completed && quiz.canRetry) {
      const resultsBoxWidth = 500;
      const resultsBoxHeight = 300;
      const resultsBoxX = (WORLD.width - resultsBoxWidth) / 2;
      const resultsBoxY = (WORLD.height - resultsBoxHeight) / 2;
      const retryButtonX = resultsBoxX + 50;
      const retryButtonY = resultsBoxY + 200;
      const retryButtonW = 150;
      const retryButtonH = 40;
      
      if (x >= retryButtonX && x <= retryButtonX + retryButtonW && 
          y >= retryButtonY && y <= retryButtonY + retryButtonH) {
        startQuiz(); // Restart quiz
        return;
      }
    }
    
    // Check if click is on an answer button
    const quizBoxWidth = Math.min(750, WORLD.width - 50);
    const quizBoxHeight = Math.min(550, WORLD.height - 50);
    const quizBoxX = (WORLD.width - quizBoxWidth) / 2;
    const quizBoxY = (WORLD.height - quizBoxHeight) / 2;
    
    const buttonWidth = Math.min(320, quizBoxWidth - 80); // Slightly wider buttons
    const buttonHeight = 55; // Slightly taller buttons
    const buttonSpacing = 25; // More spacing for better touch accuracy
    const startY = quizBoxY + 160;
    
    // Check buttons in normal order with improved accuracy
    for (let index = 0; index < quiz.questions[quiz.currentQuestion].options.length; index++) {
      const option = quiz.questions[quiz.currentQuestion].options[index];
      const buttonX = quizBoxX + (quizBoxWidth - buttonWidth) / 2;
      const buttonY = startY + index * (buttonHeight + buttonSpacing);
      
      // Add tolerance for better accuracy (larger for better usability)
      const tolerance = 20; // Increased tolerance for better click accuracy
      const isInside = x >= (buttonX - tolerance) && 
                      x <= (buttonX + buttonWidth + tolerance) && 
                      y >= (buttonY - tolerance) && 
                      y <= (buttonY + buttonHeight + tolerance);
      
      // Debug logging to understand the issue
      console.log(`Button ${index} (${option}):`, {
        buttonX: buttonX,
        buttonY: buttonY,
        buttonWidth: buttonWidth,
        buttonHeight: buttonHeight,
        clickX: x,
        clickY: y,
        tolerance: tolerance,
        isInside: isInside,
        bounds: {
          left: buttonX - tolerance,
          right: buttonX + buttonWidth + tolerance,
          top: buttonY - tolerance,
          bottom: buttonY + buttonHeight + tolerance
        }
      });
      
      if (isInside) {
        console.log('Quiz button clicked:', option, 'at index:', index);
        selectAnswer(option);
        return; // Exit after first match
      }
    }
  }
  
  // Handle touch events for quiz
  function handleTouchEnd(e) {
    // Only handle touch events when quiz is active
    if (currentScene !== 'quiz_active') return;
    
    // Prevent default touch behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Get touch coordinates
    const touch = e.changedTouches[0];
    if (!touch) return;
    
    const gameCoords = screenToGame(touch.clientX, touch.clientY);
    const x = gameCoords.x;
    const y = gameCoords.y;
    
    // Use the same logic as mouse click for quiz buttons
    const quizBoxWidth = Math.min(750, WORLD.width - 50);
    const quizBoxHeight = Math.min(550, WORLD.height - 50);
    const quizBoxX = (WORLD.width - quizBoxWidth) / 2;
    const quizBoxY = (WORLD.height - quizBoxHeight) / 2;
    
    const buttonWidth = Math.min(300, quizBoxWidth - 100);
    const buttonHeight = 50;
    const buttonSpacing = 20;
    const startY = quizBoxY + 160;
    
    // Check buttons with improved accuracy
    for (let index = 0; index < quiz.questions[quiz.currentQuestion].options.length; index++) {
      const option = quiz.questions[quiz.currentQuestion].options[index];
      const buttonX = quizBoxX + (quizBoxWidth - buttonWidth) / 2;
      const buttonY = startY + index * (buttonHeight + buttonSpacing);
      
      // Add tolerance for touch accuracy
      const tolerance = 25; // Larger tolerance for touch
      const isInside = x >= (buttonX - tolerance) && 
                      x <= (buttonX + buttonWidth + tolerance) && 
                      y >= (buttonY - tolerance) && 
                      y <= (buttonY + buttonHeight + tolerance);
      
      if (isInside) {
        console.log('Quiz button touched:', option, 'at index:', index);
        selectAnswer(option);
        return; // Exit after first match
      }
    }
  }
  
  
  function initTouchControls() {
    // Check if we're on a touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check if we're on a laptop/desktop with large screen
    const isLaptop = window.innerWidth >= 1025;
    
    // Check if device has mouse (hover capability)
    const hasHover = window.matchMedia('(hover: hover)').matches;
    
    // Only hide touch controls on large screens (1025px and above)
    if (window.innerWidth >= 1025 && (isLaptop || hasHover || !isTouchDevice)) {
      console.log('Large screen detected (1025px+), hiding touch controls');
      const joystickContainer = document.querySelector('.joystick-container');
      const actionButtonsContainer = document.querySelector('.action-buttons-container');
      if (joystickContainer) joystickContainer.style.display = 'none';
      if (actionButtonsContainer) actionButtonsContainer.style.display = 'none';
      return;
    }
    
    const joystick = document.getElementById('virtualJoystick');
    const knob = document.getElementById('joystickKnob');
    
    if (!joystick || !knob) {
      console.log('Joystick elements not found');
      return;
    }
    
    console.log('Initializing touch controls...');
    
    // Force show joystick on iPad
    if (isIPad) {
      joystick.style.display = 'block';
      joystick.style.opacity = '1';
      joystick.style.pointerEvents = 'auto';
      knob.style.pointerEvents = 'auto';
      console.log('iPad detected, forcing joystick visibility');
    }
    
    // Force show all touch controls on any tablet/mobile device
    forceShowTouchControls();
    
    // Get joystick position and size
    const updateJoystickBounds = () => {
      const rect = joystick.getBoundingClientRect();
      joystickCenter.x = rect.left + rect.width / 2;
      joystickCenter.y = rect.top + rect.height / 2;
      joystickRadius = rect.width / 2 - 25; // Leave some margin for the knob
    };
    
    // Update bounds initially and on resize
    updateJoystickBounds();
    window.addEventListener('resize', () => {
      updateJoystickBounds();
      // Force show controls after resize
      setTimeout(forceShowTouchControls, 100);
    });
    
    // Touch events
    joystick.addEventListener('touchstart', (e) => {
      console.log('Touch start detected on joystick');
      e.preventDefault();
      e.stopPropagation();
      joystickActive = true;
      knob.classList.add('active');
      
      // Start music on first touch
      if (!musicAudio.paused || musicAudio.currentTime === 0) {
        startMusic();
      }
      
      if (e.touches && e.touches.length > 0) {
        updateJoystickPosition(e.touches[0]);
      }
    }, { passive: false });
    
    joystick.addEventListener('touchmove', (e) => {
      if (joystickActive) {
        console.log('Touch move detected on joystick');
        e.preventDefault();
        e.stopPropagation();
        if (e.touches && e.touches.length > 0) {
          updateJoystickPosition(e.touches[0]);
        }
      }
    }, { passive: false });
    
    joystick.addEventListener('touchend', (e) => {
      console.log('Touch end detected on joystick');
      e.preventDefault();
      e.stopPropagation();
      resetJoystick();
    }, { passive: false });
    
    joystick.addEventListener('touchcancel', (e) => {
      console.log('Touch cancel detected on joystick');
      e.preventDefault();
      e.stopPropagation();
      resetJoystick();
    }, { passive: false });
    
    // Mouse events for testing on desktop
    joystick.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      joystickActive = true;
      knob.classList.add('active');
      
      if (!musicAudio.paused || musicAudio.currentTime === 0) {
        startMusic();
      }
      
      updateJoystickPosition(e);
    });
    
    joystick.addEventListener('mousemove', (e) => {
      if (joystickActive) {
        e.preventDefault();
        e.stopPropagation();
        updateJoystickPosition(e);
      }
    });
    
    joystick.addEventListener('mouseup', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetJoystick();
    });
    
    joystick.addEventListener('mouseleave', (e) => {
      if (joystickActive) {
        resetJoystick();
      }
    });
    
    // Initialize iPad gestures
    initIPadGestures();
  }
  
  function initIPadGestures() {
    // Only initialize on iPad
    if (!isIPad) return;
    
    console.log('Initializing iPad gestures, isRealIPad:', isRealIPad);
    
    let lastTouchTime = 0;
    let touchCount = 0;
    
    // Double tap to interact
    canvas.addEventListener('touchend', (e) => {
      const currentTime = Date.now();
      if (currentTime - lastTouchTime < 300) {
        touchCount++;
        if (touchCount === 2) {
          // Double tap detected
          e.preventDefault();
          e.stopPropagation();
          
          if (currentScene === 'inside_ship') {
            insideShip.showInteraction = isPlayerNearComputer();
            if (insideShip.showInteraction) {
              startQuiz();
            }
          }
          touchCount = 0;
        }
      } else {
        touchCount = 1;
      }
      lastTouchTime = currentTime;
    }, { passive: false });
    
    // Pinch to zoom (for future enhancement)
    let initialDistance = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      }
    }, { passive: true });
    
    // Swipe gestures
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }
    }, { passive: true });
    
    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const endTime = Date.now();
        
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const deltaTime = endTime - startTime;
        
        // Swipe detection
        if (deltaTime < 300 && Math.abs(deltaX) > 50) {
          if (deltaX > 0) {
            // Swipe right - move player right
            keys.add('ArrowRight');
            setTimeout(() => keys.delete('ArrowRight'), 100);
          } else {
            // Swipe left - move player left
            keys.add('ArrowLeft');
            setTimeout(() => keys.delete('ArrowLeft'), 100);
          }
        }
        
        if (deltaTime < 300 && Math.abs(deltaY) > 50) {
          if (deltaY > 0) {
            // Swipe down - move player down
            keys.add('ArrowDown');
            setTimeout(() => keys.delete('ArrowDown'), 100);
          } else {
            // Swipe up - move player up
            keys.add('ArrowUp');
            setTimeout(() => keys.delete('ArrowUp'), 100);
          }
        }
      }
    }, { passive: true });
  }
  
  function handleInteractButton() {
    if (currentScene === 'inside_ship') {
      insideShip.showInteraction = isPlayerNearComputer();
      if (insideShip.showInteraction) {
        startQuiz();
      }
    } else if (currentScene === 'outside_ship') {
      // Check if near gate
      const nearGate = player.x + player.width >= outsideShip.gateX - 20 && 
                      player.x <= outsideShip.gateX + outsideShip.gateWidth + 20 &&
                      player.y + player.height >= outsideShip.gateY - 20 && 
                      player.y <= outsideShip.gateY + outsideShip.gateHeight + 20;
      
      if (nearGate) {
        startTransitionToInside();
      }
    } else if (currentScene === 'flying') {
      // Check if near flying ship
      const shipCenterX = flyingScene.shipX + flyingScene.shipWidth * 0.62;
      const shipCenterY = flyingScene.shipY + flyingScene.shipHeight * 0.45;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;
      const distance = Math.sqrt(
        Math.pow(playerCenterX - shipCenterX, 2) + 
        Math.pow(playerCenterY - shipCenterY, 2)
      );
      
      if (distance <= 50) {
        startTransitionToInside();
      }
    }
  }

  function handleExitButton() {
    if (currentScene === 'inside_ship') {
      if (!exitConfirmation.visible) {
        showExitConfirmation();
      }
    }
  }

  function handleConfirmationClick(e) {
    if (!exitConfirmation.visible) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('Canvas click on confirmation dialog at:', x, y);
    console.log('Yes button bounds:', exitConfirmation.yesButton.x, exitConfirmation.yesButton.y, exitConfirmation.yesButton.width, exitConfirmation.yesButton.height);
    console.log('No button bounds:', exitConfirmation.noButton.x, exitConfirmation.noButton.y, exitConfirmation.noButton.width, exitConfirmation.noButton.height);
    
    // Yes button
    if (x >= exitConfirmation.yesButton.x && x <= exitConfirmation.yesButton.x + exitConfirmation.yesButton.width && 
        y >= exitConfirmation.yesButton.y && y <= exitConfirmation.yesButton.y + exitConfirmation.yesButton.height) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Yes button clicked - exiting ship');
      hideExitConfirmation();
      startExitShipTransition('inside_ship', 'outside_ship');
      return;
    }
    
    // No button
    if (x >= exitConfirmation.noButton.x && x <= exitConfirmation.noButton.x + exitConfirmation.noButton.width && 
        y >= exitConfirmation.noButton.y && y <= exitConfirmation.noButton.y + exitConfirmation.noButton.height) {
      e.preventDefault();
      e.stopPropagation();
      console.log('No button clicked - staying in ship');
      hideExitConfirmation();
      return;
    }
    
    console.log('Canvas click not on confirmation buttons');
  }

  function handleConfirmationTouch(e) {
    if (!exitConfirmation.visible) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches ? e.touches[0] : e.changedTouches[0];
    const gameCoords = screenToGame(touch.clientX, touch.clientY);
    const x = gameCoords.x;
    const y = gameCoords.y;
    
    console.log('Touch event on confirmation dialog at:', x, y);
    console.log('Yes button bounds:', exitConfirmation.yesButton.x, exitConfirmation.yesButton.y, exitConfirmation.yesButton.width, exitConfirmation.yesButton.height);
    console.log('No button bounds:', exitConfirmation.noButton.x, exitConfirmation.noButton.y, exitConfirmation.noButton.width, exitConfirmation.noButton.height);
    
    // Yes button
    if (x >= exitConfirmation.yesButton.x && x <= exitConfirmation.yesButton.x + exitConfirmation.yesButton.width && 
        y >= exitConfirmation.yesButton.y && y <= exitConfirmation.yesButton.y + exitConfirmation.yesButton.height) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Yes button touched - exiting ship');
      hideExitConfirmation();
      startExitShipTransition('inside_ship', 'outside_ship');
      return;
    }
    
    // No button
    if (x >= exitConfirmation.noButton.x && x <= exitConfirmation.noButton.x + exitConfirmation.noButton.width && 
        y >= exitConfirmation.noButton.y && y <= exitConfirmation.noButton.y + exitConfirmation.noButton.height) {
      e.preventDefault();
      e.stopPropagation();
      console.log('No button touched - staying in ship');
      hideExitConfirmation();
      return;
    }
    
    console.log('Touch not on confirmation buttons');
  }

  function initActionButtons() {
    console.log('initActionButtons() called');
    const interactButton = document.getElementById('interactButton');
    const exitButton = document.getElementById('exitButton');
    const restartButton = document.getElementById('restartButton');
    
    console.log('Buttons found:', { 
      interactButton: !!interactButton, 
      exitButton: !!exitButton, 
      restartButton: !!restartButton
    });
    
    if (interactButton) {
      interactButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Interact button clicked');
        handleInteractButton();
      });
      
      interactButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Interact button touched');
        handleInteractButton();
      }, { passive: false });
    }
    
    if (exitButton) {
      exitButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Exit button clicked');
        handleExitButton();
      });
      
      exitButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Exit button touched');
        handleExitButton();
      }, { passive: false });
    }
    
    // Add event listeners for confirmation dialog buttons
    document.addEventListener('click', handleConfirmationClick);
    document.addEventListener('touchstart', handleConfirmationTouch, { passive: false });
    document.addEventListener('touchend', handleConfirmationTouch, { passive: false });
    
    if (restartButton) {
      restartButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Restart button touch start');
      }, { passive: false });
      
      restartButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Restart button touch end - reloading page like F5');
        window.location.reload();
      }, { passive: false });
      
      restartButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Restart button clicked - reloading page like F5');
        window.location.reload();
      });
    }
  }
  
  function updateJoystickPosition(touch) {
    if (!joystickActive) return;
    
    const knob = document.getElementById('joystickKnob');
    if (!knob) return;
    
    const touchX = touch.clientX || touch.pageX;
    const touchY = touch.clientY || touch.pageY;
    
    console.log('Joystick position update:', { touchX, touchY, centerX: joystickCenter.x, centerY: joystickCenter.y });
    
    // Calculate distance from center
    const deltaX = touchX - joystickCenter.x;
    const deltaY = touchY - joystickCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Limit knob movement to joystick radius
    const limitedDistance = Math.min(distance, joystickRadius);
    const angle = Math.atan2(deltaY, deltaX);
    
    const newX = Math.cos(angle) * limitedDistance;
    const newY = Math.sin(angle) * limitedDistance;
    
    // Update knob position
    knob.style.transform = `translate(calc(-50% + ${newX}px), calc(-50% + ${newY}px))`;
    
    // Calculate movement direction based on joystick position
    const normalizedX = newX / joystickRadius;
    const normalizedY = newY / joystickRadius;
    
    console.log('Normalized joystick values:', { normalizedX, normalizedY });
    
    // Update player movement
    updatePlayerFromJoystick(normalizedX, normalizedY);
  }
  
  function resetJoystick() {
    joystickActive = false;
    const knob = document.getElementById('joystickKnob');
    if (knob) {
      knob.classList.remove('active');
      knob.style.transform = 'translate(-50%, -50%)';
    }
    
    // Stop all movement
    keys.clear();
    updatePlayerVelocity();
  }
  
  function updatePlayerFromJoystick(x, y) {
    // Clear previous keys
    keys.clear();
    
    // Add movement keys based on joystick position
    const threshold = 0.3; // Dead zone
    
    if (Math.abs(x) > threshold) {
      if (x > 0) {
        keys.add('ArrowRight');
        player.image = assets.playerRight;
        player.facing = 'right';
      } else {
        keys.add('ArrowLeft');
        player.image = assets.playerLeft;
        player.facing = 'left';
      }
    }
    
    if (Math.abs(y) > threshold) {
      if (y > 0) {
        keys.add('ArrowDown');
      } else {
        keys.add('ArrowUp');
      }
    }
    
    updatePlayerVelocity();
  }
  
  
  function selectAnswer(selectedOption) {
    // Prevent multiple clicks
    if (quiz.selectedAnswer !== null) return;
    
    quiz.selectedAnswer = selectedOption;
    const isCorrect = selectedOption === quiz.questions[quiz.currentQuestion].answer;
    
    if (isCorrect) {
      quiz.score += 1;
      // Play correct sound
      playSound(audio.quizCorrectSound);
    } else {
      // Play wrong sound
      playSound(audio.quizWrongSound);
    }
    
    // Move to next question after a very short delay to show result
    setTimeout(() => {
      quiz.currentQuestion += 1;
      quiz.selectedAnswer = null;
      
      if (quiz.currentQuestion >= quiz.questions.length) {
        // Quiz completed
        endQuiz();
      }
    }, 200);
  }
  
  function endQuiz() {
    quiz.active = false;
    quiz.completed = true;
    quiz.canRetry = true; // Allow retry
    
    // Check if player won (all questions correct)
    if (quiz.score === quiz.questions.length) {
      quiz.hasWon = true;
      quiz.canRetryAfterWin = true; // Enable retry after winning
      startCelebration();
    }
    
    // Show results screen
    showQuizResults();
  }
  
  function startCelebration() {
    celebration.active = true;
    celebration.startTime = performance.now();
    celebration.particles = [];
    
    // Create confetti particles
    for (let i = 0; i < celebration.confettiCount; i++) {
      celebration.particles.push({
        x: Math.random() * WORLD.width,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 8 + 4,
        color: celebration.colors[Math.floor(Math.random() * celebration.colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 1.0
      });
    }
  }

  // Start timer celebration
  function startTimerCelebration() {
    timerCelebration.active = true;
    timerCelebration.startTime = performance.now();
    timerCelebration.particles = [];
    timerCelebration.ribbons = [];
    
    // Create confetti particles
    for (let i = 0; i < timerCelebration.confettiCount; i++) {
      timerCelebration.particles.push({
        x: Math.random() * WORLD.width,
        y: -10,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 3,
        color: timerCelebration.colors[Math.floor(Math.random() * timerCelebration.colors.length)],
        size: Math.random() * 12 + 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1.0
      });
    }
    
    // Create colorful ribbons
    for (let i = 0; i < 20; i++) {
      timerCelebration.ribbons.push({
        x: Math.random() * WORLD.width,
        y: -20,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 1,
        color: timerCelebration.colors[Math.floor(Math.random() * timerCelebration.colors.length)],
        width: Math.random() * 20 + 10,
        height: Math.random() * 100 + 50,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1
      });
    }
  }
  
  function showQuizResults() {
    // Create a simple results display - no delay
    currentScene = 'inside_ship';
  }

  // ------------------------------
  // Scene Transition
  // ------------------------------
  function startSceneTransition(from, to) {
    sceneTransition.active = true;
    sceneTransition.progress = 0;
    sceneTransition.fromScene = from;
    sceneTransition.toScene = to;
  }

  function showExitConfirmation() {
    // Prevent multiple calls
    if (exitConfirmation.visible) {
      console.log('Exit confirmation already visible, ignoring show call');
      return;
    }
    
    // Position dialog in center of screen
    exitConfirmation.x = (WORLD.width - exitConfirmation.width) / 2;
    exitConfirmation.y = (WORLD.height - exitConfirmation.height) / 2;
    
    // Position buttons
    exitConfirmation.yesButton.x = exitConfirmation.x + 80;
    exitConfirmation.yesButton.y = exitConfirmation.y + 140;
    exitConfirmation.noButton.x = exitConfirmation.x + 240;
    exitConfirmation.noButton.y = exitConfirmation.y + 140;
    
    exitConfirmation.visible = true;
    console.log('Exit confirmation dialog shown');
  }

  function hideExitConfirmation() {
    if (!exitConfirmation.visible) {
      console.log('Exit confirmation already hidden, ignoring hide call');
      return;
    }
    exitConfirmation.visible = false;
    console.log('Exit confirmation dialog hidden');
  }

  function startExitShipTransition(from, to) {
    console.log('Starting exit ship transition from', from, 'to', to);
    
    // Hide exit confirmation dialog if visible
    if (exitConfirmation.visible) {
      hideExitConfirmation();
    }
    
    // Ensure gate position is initialized before starting transition
    if (outsideShip.gateX === undefined || outsideShip.gateY === undefined || outsideShip.gateX === 0) {
      console.log('Initializing gate position');
      initializeGatePosition();
    }
    
    // IMMEDIATE TRANSITION - No animation, just switch scenes
    console.log('Changing scene from', currentScene, 'to', to);
    currentScene = to;
    console.log('Scene changed to:', currentScene);
    
    // Setup player position for outside ship scene
    if (to === 'outside_ship') {
      player.alpha = 1;
      
      // إعادة تعيين حالة اللاعب لتجنب الدخول التلقائي
      player.captured = false;
      player.beamPullT = 0;
      
      // إعادة تعيين حالة اللاعب بالكامل
      player.alpha = 1;
      player.dx = 0;
      player.dy = 0;
      
      // التحقق من صحة قيم البوابة
      if (outsideShip.gateX === undefined || outsideShip.gateY === undefined) {
        console.log('Gate position not initialized, using default values');
        outsideShip.gateX = WORLD.width - 100;
        outsideShip.gateY = WORLD.height / 2;
      }
      
      // تحديد موقع اللاعب الصحيح خارج البوابة - أبعد قليلاً لتجنب الدخول التلقائي
      player.x = Math.max(10, outsideShip.gateX - player.width - 80); // أبعد من البوابة مع حماية من الخروج من الشاشة
      player.y = Math.max(10, Math.min(WORLD.height - player.height - 10, outsideShip.gateY + outsideShip.gateHeight / 2 - player.height / 2)); // في منتصف البوابة مع حماية من الخروج من الشاشة
      
      console.log('Player positioned at:', player.x, player.y, 'Gate at:', outsideShip.gateX, outsideShip.gateY);
      
      // إعادة ضبط حالة وصول السفينة لضمان ظهورها
      outsideShip.shipArriving = true;
      outsideShip.shipArrivalX = WORLD.width + 50; // البدء من اليمين
      outsideShip.shipArrivalY = 80;
      outsideShip.shipArrivalBeamActive = false; // الشعاع غير مفعل عند الخروج
      outsideShip.shipArrivalBeamPulseT = 0;
      outsideShip.shipMoving = true; // بدء الحركة من اليمين إلى اليسار
      
      // إعادة تعيين مؤقت البقاء والصعوبة
      outsideShip.survivalTimer = 0;
      outsideShip.difficultyMultiplier = 1.0;
      
      // إعادة تعيين تأثيرات النيران
      outsideShip.shipFire.intensity = 0;
      outsideShip.shipFire.particles = [];
      outsideShip.shipFire.floatT = 0;
      outsideShip.shipFire.floatOffset = 0;
      
      // Start Samud music for survival stage
      console.log('Starting Samud music for survival stage');
      startSamudMusic();
    }
    
    console.log('Exit transition completed immediately! Scene is now:', currentScene);
  }

  function updateSceneTransition() {
    if (!sceneTransition.active) return;
    
    sceneTransition.progress += sceneTransition.speed;
    
    if (sceneTransition.progress >= 1) {
      // Transition complete
      sceneTransition.progress = 1;
      currentScene = sceneTransition.toScene;
      
      // Reset flying scene when entering
      if (sceneTransition.toScene === 'flying') {
        flyingScene.fadeIn = 0;
        // Position player at center for better experience
        player.x = WORLD.width / 2 - player.width / 2;
        player.y = WORLD.height / 2 - player.height / 2;
        flyingScene.backgroundX = 0;
        flyingScene.backgroundY = 0;
        // Reset scaling animation - start with bigger size immediately
        flyingScene.shipScale = 2.0; // Start bigger immediately
        flyingScene.scaleComplete = false;
        flyingScene.scaleDirection = 1;
      }
      
      // Complete transition
      sceneTransition.active = false;
      sceneTransition.progress = 0;
    }
  }

  function updateExitShipTransition() {
    // No longer needed - transitions are immediate
    return;
  }

  // ------------------------------
  // Obstacles
  // ------------------------------
  function spawnObstacle() {
    const height = 20 + Math.random() * 25; // smaller obstacles
    const width = 20 + Math.random() * 35; // smaller obstacles
    const y = 40 + Math.random() * (WORLD.height - 80 - height);
    const speed = 0.9 + Math.random() * 1.1; // slower movement
    const hue = 200 + Math.random() * 40; // bluish rocks
    obstacles.push({
      x: WORLD.width + width,
      y,
      width,
      height,
      speed,
      color: `hsl(${hue}, 40%, 70%)`,
    });
  }

  // Spawn obstacles periodically

  // ------------------------------
  // Thruster Particles (Flying Ship)
  // ------------------------------
  function spawnFlyingShipThrusterParticles() {
    // Emit from back side of ship in flying scene
    const offsetY = flyingScene.shipFloatOffset || 0;
    const emitX = flyingScene.shipX + 20; // front of ship (since it's flipped)
    const emitY = flyingScene.shipY + offsetY + flyingScene.shipHeight * 0.6;
    const count = 6; // dense trail
    for (let i = 0; i < count; i++) {
      const size = 2 + Math.random() * 4;
      const life = 20 + Math.random() * 20;
      // trail goes opposite to ship movement (to the right)
      const speed = 1 + Math.random() * 2;
      const vy = (Math.random() - 0.5) * 1.2;
      const colorPick = Math.random();
      const color = colorPick < 0.33 ? 'rgba(255,160,54,0.9)' : colorPick < 0.66 ? 'rgba(255,210,64,0.85)' : 'rgba(255,80,48,0.9)';
      particles.push({ x: emitX, y: emitY, vx: speed, vy, size, life, maxLife: life, color });
    }
  }

  // ------------------------------
  // Thruster Particles (Ship)
  // ------------------------------
  function spawnThrusterParticles() {
    // Emit from back side of ship depending on direction
    const offsetY = ship.floatOffset || 0;
    const movingLeft = ship.speed < 0;
    const emitX = movingLeft ? ship.x + ship.width - 20 : ship.x + 20; // Normal: emit from back
    const emitY = ship.y + offsetY + ship.height * 0.6;
    const count = 6; // dense trail
    for (let i = 0; i < count; i++) {
      const size = 2 + Math.random() * 4;
      const life = 20 + Math.random() * 20;
      // trail goes opposite to ship movement
      const base = movingLeft ? 1 : -1;
      const speed = base * (1 + Math.random() * 2);
      const vy = (Math.random() - 0.5) * 1.2;
      const colorPick = Math.random();
      const color = colorPick < 0.33 ? 'rgba(255,160,54,0.9)' : colorPick < 0.66 ? 'rgba(255,210,64,0.85)' : 'rgba(255,80,48,0.9)';
      particles.push({ x: emitX, y: emitY, vx: speed, vy, size, life, maxLife: life, color });
    }
    
    // Play thruster sound occasionally
    if (Math.random() < 0.1) {
      playSound(audio.thrusterSound);
    }
  }

  // ------------------------------
  // Thruster Particles (Ship3 Cinematic)
  // ------------------------------
  function spawnShip3ThrusterParticles() {
    // Emit from back of Ship3 during movement
    const emitX = cinematic.x + 20; // back of ship
    const emitY = cinematic.y + cinematic.scale * 60; // center height
    const count = 4;
    for (let i = 0; i < count; i++) {
      const size = 2 + Math.random() * 3;
      const life = 15 + Math.random() * 20;
      const vx = 1.5 + Math.random() * 2; // forward direction
      const vy = (Math.random() - 0.5) * 1;
      const colorPick = Math.random();
      const color = colorPick < 0.33 ? 'rgba(255,180,60,0.9)' : colorPick < 0.66 ? 'rgba(255,220,80,0.85)' : 'rgba(255,100,50,0.9)';
      particles.push({ x: emitX, y: emitY, vx, vy, size, life, maxLife: life, color });
    }
    
    // Play Ship3 engine sound when emitting particles
    if (Math.random() < 0.15) {
      playSound(audio.ship3EngineSound);
    }
  }

  // ------------------------------
  // Thruster Particles (Ship2 Cinematic)
  // ------------------------------
  function spawnShip2ThrusterParticles() {
    // Emit from three engines of Ship2, aligned with rotation and scale
    const baseW = 220;
    const baseH = 140;
    const w = baseW * cinematic.scale;
    const h = baseH * cinematic.scale;

    // Engine nozzle positions in local image space (approximation)
    const engines = [
      { x: 0.75, y: 0.55 }, // top-left engine
      { x: 0.65, y: 0.75 }, // middle engine
      { x: 0.85, y: 0.85 }, // bottom-right engine
    ];

    const cx = cinematic.x + w * 0.5;
    const cy = cinematic.y + h * 0.5;

    const cosA = Math.cos(cinematic.angle);
    const sinA = Math.sin(cinematic.angle);

    for (const e of engines) {
      // nozzle world position after rotation
      const nx = cinematic.x + e.x * w;
      const ny = cinematic.y + e.y * h;
      const dx = nx - cx;
      const dy = ny - cy;
      const rx = cx + dx * cosA - dy * sinA;
      const ry = cy + dx * sinA + dy * cosA;

      // Emit several particles per engine drifting opposite to motion
      const count = 5;
      for (let i = 0; i < count; i++) {
        const size = 3 + Math.random() * 5;
        const life = 25 + Math.random() * 25;
        const speed = 1.8 + Math.random() * 2.2;
        const spread = 0.25; // slight spread around flame direction
        const dirX = Math.cos(cinematic.angle) * 1 + spread * (Math.random() - 0.5);
        const dirY = Math.sin(cinematic.angle) * 1 + spread * (Math.random() - 0.5);
        const vx = dirX * speed;
        const vy = dirY * speed;
        const colorPick = Math.random();
        const color = colorPick < 0.33 ? 'rgba(255,180,60,0.9)' : colorPick < 0.66 ? 'rgba(255,220,80,0.85)' : 'rgba(255,100,50,0.9)';
        particles.push({ x: rx, y: ry, vx, vy, size, life, maxLife: life, color });
      }
    }
  }

  // Draw simple flame cones under rotation for visual punch (non-particle)
  function drawShip2Flames(x, y, w, h, angle) {
    const engines = [
      { x: 0.75, y: 0.55, len: 65 }, // top-left thruster
      { x: 0.65, y: 0.75, len: 55 }, // middle thruster
      { x: 0.85, y: 0.85, len: 60 }, // bottom-right thruster
    ];
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (const e of engines) {
      const nx = x + e.x * w;
      const ny = y + e.y * h;
      const dx = nx - cx;
      const dy = ny - cy;
      const rx = cx + dx * cosA - dy * sinA;
      const ry = cy + dx * sinA + dy * cosA;
      {
        const len = e.len * (0.9 + Math.random() * 0.2);
        const tipX = rx + Math.cos(angle) * len;
        const tipY = ry + Math.sin(angle) * len;
        const pulse = 0.8 + 0.2 * Math.sin(performance.now() * 0.01 + len);
        const width = 12 * pulse;
        ctx.save();
        const grad = ctx.createLinearGradient(rx, ry, tipX, tipY);
        grad.addColorStop(0, 'rgba(255,240,200,0.95)');
        grad.addColorStop(0.5, 'rgba(255,160,70,0.85)');
        grad.addColorStop(1, 'rgba(255,80,50,0.00)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ------------------------------
  // Player Blue Flame Particles
  // ------------------------------
  function spawnPlayerFlameParticles() {
    // Emit from bottom-center of the astronaut
    const emitX = player.x + player.width * 0.5;
    const emitY = player.y + player.height + (player.floatOffset || 0);
    const count = 4; // subtle but constant
    for (let i = 0; i < count; i++) {
      const size = 2 + Math.random() * 3;
      const life = 16 + Math.random() * 18;
      const vx = (Math.random() - 0.5) * 0.8;
      const vy = 1.2 + Math.random() * 1.6; // downward
      const colorPick = Math.random();
      // Blue/cyan hues
      const color = colorPick < 0.33
        ? 'rgba(100, 200, 255, 0.9)'
        : colorPick < 0.66
        ? 'rgba(70, 160, 255, 0.9)'
        : 'rgba(120, 220, 255, 0.9)';
      playerFlames.push({ x: emitX, y: emitY, vx, vy, size, life, maxLife: life, color });
    }
    
    // Play particle sound occasionally
    if (Math.random() < 0.05) {
      playSound(audio.particleSound);
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updatePlayerFlames() {
    for (let i = playerFlames.length - 1; i >= 0; i--) {
      const p = playerFlames[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.life <= 0) playerFlames.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color.replace(/0\.[0-9]+\)/, `${(0.2 + 0.7 * alpha).toFixed(2)})`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayerFlames() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of playerFlames) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const fade = (0.18 + 0.72 * alpha).toFixed(2);
      ctx.fillStyle = p.color.replace(/0\.[0-9]+\)/, `${fade})`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------
  // Safe drawing helpers
  // ------------------------------
  function isImageReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  // ------------------------------
  // Collision Helpers
  // ------------------------------
  function aabbIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // ------------------------------
  // Tractor Beam Area
  // ------------------------------
  function isPlayerInBeam() {
    if (!ship.isBeamActive) return false;
    
    // Beam center point
    const beamCenterX = ship.x + ship.width * 0.62;
    const beamCenterY = ship.y + (ship.floatOffset || 0) + ship.height * 0.45;
    
    // Player center point
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    
    // Calculate distance between player and beam center
    const distance = Math.sqrt(
      Math.pow(playerCenterX - beamCenterX, 2) + 
      Math.pow(playerCenterY - beamCenterY, 2)
    );
    
    // Debug: log distance when close
    if (distance < 100) {
      console.log('Beam distance:', distance, 'Beam active:', ship.isBeamActive);
    }
    
    // Only activate when very close (50 pixels for better detection)
    return distance <= 50;
  }

  // ------------------------------
  // Update Loop
  // ------------------------------
  function update() {
    if (gameOver) return;

    // Update scene transition
    updateSceneTransition();
    
    // Update transition to inside
    updateTransitionToInside();
    
    // Update exit ship transition
    updateExitShipTransition();

    // Handle different scenes
    if (currentScene === 'flying') {
      updateFlyingScene();
      return;
    }
    
    if (currentScene === 'cinematic') {
      updateCinematicScene();
      return;
    }
    
    if (currentScene === 'transition_to_inside') {
      updateTransitionToInsideScene();
      return;
    }
    
    // Update rescue ship boarding transition (works in any scene)
    updateRescueBoardingTransition();
    
    // Update victory celebration (works in any scene)
    updateVictoryCelebration();
    
    if (currentScene === 'inside_ship') {
      updateInsideShipScene();
      updateCelebration();
      updateTimerCelebration();
      return;
    }
    
    if (currentScene === 'quiz_active') {
      updateQuizScene();
      return;
    }
    
    if (currentScene === 'outside_ship') {
      updateOutsideShipScene();
      updateRescueShip();
      return;
    }

    if (currentScene === 'inside_rescue_ship') {
      updateInsideRescueShipScene();
      updateCelebration();
      updateTimerCelebration();
      return;
    }

    // Main game scene
    updateMainScene();
  }

  function updateFlyingScene() {
    // Direct movement for more responsive controls
    player.x += player.dx;
    player.y += player.dy;
    
    // Keep player within background image bounds (not canvas bounds)
    // Background is scaled to cover screen, so we need to account for parallax
    const bgWidth = assets.background.naturalWidth;
    const bgHeight = assets.background.naturalHeight;
    const scaleX = WORLD.width / bgWidth;
    const scaleY = WORLD.height / bgHeight;
    const scale = Math.max(scaleX, scaleY);
    const scaledWidth = bgWidth * scale;
    const scaledHeight = bgHeight * scale;
    const centerX = (WORLD.width - scaledWidth) / 2;
    const centerY = (WORLD.height - scaledHeight) / 2;
    
    // Calculate bounds based on background image with parallax
    const margin = 10; // Small margin from background edges
    const minX = centerX + flyingScene.backgroundX + margin;
    const maxX = centerX + scaledWidth + flyingScene.backgroundX - player.width - margin;
    const minY = centerY + flyingScene.backgroundY + margin;
    const maxY = centerY + scaledHeight + flyingScene.backgroundY - player.height - margin;
    
    player.x = clamp(player.x, minX, maxX);
    player.y = clamp(player.y, minY, maxY);
    
    // Consistent parallax background movement
    const parallaxX = -normalDx * flyingScene.backgroundSpeed;
    const parallaxY = -normalDy * flyingScene.backgroundSpeed * 0.3;
    flyingScene.backgroundX += parallaxX;
    flyingScene.backgroundY += parallaxY;
    
    // Fade in effect
    if (flyingScene.fadeIn < 1) {
      flyingScene.fadeIn = Math.min(1, flyingScene.fadeIn + flyingScene.fadeSpeed);
    }
    
    // Player floating motion (visual bobbing) - with thrusters in flying scene
    player.floatT += 0.05;
    player.floatOffset = Math.sin(player.floatT) * 4; // 4px bob
    
    // Spawn player flame particles in flying scene
    spawnPlayerFlameParticles();
    updatePlayerFlames();
    
    // Spawn ship thruster particles in flying scene
    spawnFlyingShipThrusterParticles();
    updateParticles();
    
    // Update ship floating motion
    flyingScene.shipFloatT += 0.03;
    flyingScene.shipFloatOffset = Math.sin(flyingScene.shipFloatT) * 3;
    
    // Update ship scaling animation - ALWAYS scale during flight
    if (flyingScene.continuousScaling) {
      // Continuous scaling during flight (breathing effect)
      flyingScene.shipScale += flyingScene.scaleSpeed * flyingScene.scaleDirection;
      
      // Change direction when reaching limits
      if (flyingScene.shipScale >= flyingScene.maxScale) {
        flyingScene.shipScale = flyingScene.maxScale;
        flyingScene.scaleDirection = -1; // Start shrinking
      } else if (flyingScene.shipScale <= flyingScene.minScale) {
        flyingScene.shipScale = flyingScene.minScale;
        flyingScene.scaleDirection = 1; // Start growing
      }
    }
    
    // Auto ship entry - check if player is near flying ship (no key press needed)
    if (flyingScene.beamActive) {
      // Check if player is near the flying ship (within 50 pixels)
      const shipCenterX = flyingScene.shipX + flyingScene.shipWidth * 0.62;
      const shipCenterY = flyingScene.shipY + flyingScene.shipHeight * 0.45;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;
      const distance = Math.sqrt(
        Math.pow(playerCenterX - shipCenterX, 2) + 
        Math.pow(playerCenterY - shipCenterY, 2)
      );
      
      // If player is near ship, enter automatically
      if (distance < 50) {
        console.log('Player auto-entering flying ship');
        // Return to inside ship scene
        currentScene = 'inside_ship';
        // Position player in center of inside ship
        insideShip.playerX = WORLD.width / 2 - player.width / 2;
        insideShip.playerY = WORLD.height / 2 - player.height / 2;
        // Reset ship arrival state when entering
        outsideShip.shipArriving = false;
        outsideShip.shipArrivalBeamActive = false;
        
        // Stop Samud music and return to background music
        stopSamudMusic();
      }
    }
  }

  function updateCinematicScene() {
    if (cinematic.moving) {
      // Move Ship3 from top-right to bottom-left
      const dx = cinematic.targetX - cinematic.x;
      const dy = cinematic.targetY - cinematic.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        // Move towards target
        const speed = 2.5;
        cinematic.x += (dx / distance) * speed;
        cinematic.y += (dy / distance) * speed;
        
        // Play Ship3 engine sound while moving
        if (Math.random() < 0.1) {
          playSound(audio.ship3EngineSound);
        }
        
        // Play Ship3 flying sound occasionally
        if (Math.random() < 0.05) {
          playSound(audio.ship3FlyingSound);
        }
      } else {
        // Reached target, start transition to inside ship
        cinematic.moving = false;
        startTransitionToInside();
      }
    } else {
      // Move Ship2 diagonally during cinematic and slowly scale up
      cinematic.x += cinematic.vx;
      cinematic.y += cinematic.vy;
      cinematic.scale += cinematic.scaleSpeed;
      
      // Play Ship3 engine sound while moving diagonally
      if (Math.random() < 0.08) {
        playSound(audio.ship3EngineSound);
      }
    }
    
    // Ship2 thruster particles during cinematic
    spawnShip2ThrusterParticles();
    
    // Update particles
    updateParticles();
  }
  
  function updateTransitionToInside() {
    if (transitionToInside.active) {
      transitionToInside.progress += transitionToInside.speed;
      if (transitionToInside.progress >= 1) {
        transitionToInside.progress = 1;
        transitionToInside.active = false;
        currentScene = 'inside_ship';
        // Initialize inside ship state
        insideShip.playerX = WORLD.width / 2 - player.width / 2;
        insideShip.playerY = WORLD.height / 2 - player.height / 2; // Center position
        insideShip.backgroundX = 0;
        insideShip.backgroundY = 0;
        insideShip.fadeIn = 0;
        insideShip.floatT = 0;
        
        // Stop Samud music and return to background music
        stopSamudMusic();
        insideShip.floatOffset = 0;
      }
    }
  }
  
  function updateTransitionToInsideScene() {
    // Just update the transition progress
    updateTransitionToInside();
  }
  
  function updateInsideShipScene() {
    // Update player position with smooth movement
    if (keys.has('ArrowLeft')) {
      insideShip.playerX -= player.speed;
      player.facing = 'left'; // Update facing direction
    }
    if (keys.has('ArrowRight')) {
      insideShip.playerX += player.speed;
      player.facing = 'right'; // Update facing direction
    }
    if (keys.has('ArrowUp')) {
      insideShip.playerY -= player.speed;
    }
    if (keys.has('ArrowDown')) {
      insideShip.playerY += player.speed;
    }
    
    // Keep player within canvas bounds with proper margins
    const margin = 5; // Small margin from canvas edges
    insideShip.playerX = clamp(insideShip.playerX, margin, WORLD.width - player.width - margin);
    insideShip.playerY = clamp(insideShip.playerY, margin, WORLD.height - player.height - margin);
    
    // Update player velocity for parallax calculation
    let vx = 0;
    let vy = 0;
    if (keys.has('ArrowLeft')) vx -= 1;
    if (keys.has('ArrowRight')) vx += 1;
    if (keys.has('ArrowUp')) vy -= 1;
    if (keys.has('ArrowDown')) vy += 1;
    
    if (vx !== 0 && vy !== 0) {
      const inv = Math.SQRT1_2; // 1/√2 to keep diagonal speed consistent
      vx *= inv;
      vy *= inv;
    }
    
    player.dx = vx * player.speed;
    player.dy = vy * player.speed;
    
    // Update background parallax (opposite to player movement)
    const parallaxX = -player.dx * insideShip.backgroundSpeed;
    const parallaxY = -player.dy * insideShip.backgroundSpeed * 0.1; // Very slight vertical movement
    insideShip.backgroundX += parallaxX;
    insideShip.backgroundY += parallaxY;
    
    // Update fade in effect
    if (insideShip.fadeIn < 1) {
      insideShip.fadeIn = Math.min(1, insideShip.fadeIn + insideShip.fadeSpeed);
    }
    
    // Update player floating effect
    insideShip.floatT += 0.05;
    insideShip.floatOffset = Math.sin(insideShip.floatT) * 3; // Gentle floating motion
    
    // Update computer floating effect (since it's a GIF)
    insideShip.computerFloatT += 0.03;
    insideShip.computerFloatOffset = Math.sin(insideShip.computerFloatT) * 2; // Gentle floating motion
    
    // Check computer interaction
    insideShip.showInteraction = isPlayerNearComputer();
    
    // Exit gate proximity (left edge)
    exitButton.visible = insideShip.playerX <= 10;
  }
  
  function updateQuizScene() {
    // Quiz logic will be handled in the drawing function
    // This is where we would handle quiz interactions if needed
  }

  function updateInsideRescueShipScene() {
    // Similar to inside ship scene but for rescue ship
    if (keys.has('ArrowLeft')) {
      insideRescueShip.playerX -= player.speed;
      player.facing = 'left';
    }
    if (keys.has('ArrowRight')) {
      insideRescueShip.playerX += player.speed;
      player.facing = 'right';
    }
    if (keys.has('ArrowUp')) {
      insideRescueShip.playerY -= player.speed;
    }
    if (keys.has('ArrowDown')) {
      insideRescueShip.playerY += player.speed;
    }
    
    // Keep player within canvas bounds
    const margin = 5;
    insideRescueShip.playerX = clamp(insideRescueShip.playerX, margin, WORLD.width - player.width - margin);
    insideRescueShip.playerY = clamp(insideRescueShip.playerY, margin, WORLD.height - player.height - margin);
    
    // Update background parallax
    let vx = 0;
    let vy = 0;
    if (keys.has('ArrowLeft')) vx -= 1;
    if (keys.has('ArrowRight')) vx += 1;
    if (keys.has('ArrowUp')) vy -= 1;
    if (keys.has('ArrowDown')) vy += 1;
    
    const parallaxX = vx * insideRescueShip.backgroundSpeed;
    const parallaxY = vy * insideRescueShip.backgroundSpeed;
    
    insideRescueShip.backgroundX += parallaxX;
    insideRescueShip.backgroundY += parallaxY;
    
    // Update fade in effect
    if (insideRescueShip.fadeIn < 1) {
      insideRescueShip.fadeIn = Math.min(1, insideRescueShip.fadeIn + insideRescueShip.fadeSpeed);
    }
    
    // Update player floating effect
    insideRescueShip.floatT += 0.05;
    insideRescueShip.floatOffset = Math.sin(insideRescueShip.floatT) * 3;
    
    // Update computer floating effect
    insideRescueShip.computerFloatT += 0.03;
    insideRescueShip.computerFloatOffset = Math.sin(insideRescueShip.computerFloatT) * 2;
    
    // Update victory celebration only
    updateVictoryCelebration();
  }
  
  function updateCelebration() {
    if (!celebration.active) return;
    
    const elapsed = performance.now() - celebration.startTime;
    
    // End celebration after duration
    if (elapsed >= celebration.duration) {
      celebration.active = false;
      return;
    }
    
    // Update confetti particles
    for (let i = celebration.particles.length - 1; i >= 0; i--) {
      const particle = celebration.particles[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;
      
      // Add gravity
      particle.vy += 0.1;
      
      // Fade out over time
      particle.life = Math.max(0, 1 - (elapsed / celebration.duration));
      
      // Remove particles that are off screen or faded out
      if (particle.y > WORLD.height + 50 || particle.life <= 0) {
        celebration.particles.splice(i, 1);
      }
    }
  }

  function updateTimerCelebration() {
    if (!timerCelebration.active) return;
    
    const elapsed = performance.now() - timerCelebration.startTime;
    
    // End celebration after duration
    if (elapsed >= timerCelebration.duration) {
      timerCelebration.active = false;
      return;
    }
    
    // Update confetti particles
    for (let i = timerCelebration.particles.length - 1; i >= 0; i--) {
      const particle = timerCelebration.particles[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;
      
      // Add gravity
      particle.vy += 0.08;
      
      // Fade out over time
      particle.life = Math.max(0, 1 - (elapsed / timerCelebration.duration));
      
      // Remove particles that are off screen or faded out
      if (particle.y > WORLD.height + 50 || particle.life <= 0) {
        timerCelebration.particles.splice(i, 1);
      }
    }
    
    // Update ribbons
    for (let i = timerCelebration.ribbons.length - 1; i >= 0; i--) {
      const ribbon = timerCelebration.ribbons[i];
      
      // Update position
      ribbon.x += ribbon.vx;
      ribbon.y += ribbon.vy;
      ribbon.rotation += ribbon.rotationSpeed;
      
      // Add gravity
      ribbon.vy += 0.05;
      
      // Remove ribbons that are off screen
      if (ribbon.y > WORLD.height + 100) {
        timerCelebration.ribbons.splice(i, 1);
      }
    }
  }

  function updateMainScene() {
    // Direct movement for more responsive controls
    player.x += player.dx;
    player.y += player.dy;
    
    // Keep player within canvas bounds with proper margins
    const margin = 5; // Small margin from canvas edges
    const minX = margin;
    const maxX = WORLD.width - player.width - margin;
    const minY = margin;
    const maxY = WORLD.height - player.height - margin;
    
    player.x = clamp(player.x, minX, maxX);
    player.y = clamp(player.y, minY, maxY);

    // Ship movement & state
    if (cinematic.active) {
      // Move Ship2 diagonally during cinematic and slowly scale up
      cinematic.x += cinematic.vx * 0.8; // Slower cinematic movement
      cinematic.y += cinematic.vy * 0.8;
      cinematic.scale += cinematic.scaleSpeed * 0.7; // Slower scaling
    } else if (ship.departing) {
      // Fast movement to the left for immediate departure
      ship.x += ship.speed; // Use the fast speed set when departing
    } else if (!ship.isDocked) {
      ship.x += ship.speed;
      const dockX = WORLD.width - ship.width - 50; // Dock on the right side
      if (ship.x >= dockX) {
        ship.x = dockX;
        ship.isDocked = true;
        // Beam is now manual - player must press B to activate
      }
    }
    // thrusters always on (not during cinematic)
    if (!cinematic.active) {
      spawnThrusterParticles();
    } else {
      // Ship2 thruster particles during cinematic
      spawnShip2ThrusterParticles();
    }

    // Beam pulse
    if (!cinematic.active && ship.isDocked && ship.isBeamActive) {
      ship.beamPulseT += 0.08;
      console.log('Beam pulsing, isDocked:', ship.isDocked, 'isBeamActive:', ship.isBeamActive, 'currentScene:', currentScene);
    }

    // Ship floating motion
    if (!cinematic.active) {
      ship.floatT += 0.03;
      ship.floatOffset = Math.sin(ship.floatT) * 3;
    } else {
      ship.floatOffset = 0;
    }

    // Player floating motion (visual bobbing)
    player.floatT += 0.05;
    player.floatOffset = Math.sin(player.floatT) * 4; // 4px bob

    // Particles
    updateParticles(); // Always update particles (both Ship and Ship2)
    // Player flames spawn and update
    if (!cinematic.active) {
      spawnPlayerFlameParticles();
      updatePlayerFlames();
    }


  // Auto ship entry - check if player is near ship (no key press needed)
  if (!cinematic.active && !gameWin && ship.isDocked && currentScene === 'main') {
    // Check if player is near the ship (within 50 pixels)
    const shipCenterX = ship.x + ship.width * 0.62;
    const shipCenterY = ship.y + (ship.floatOffset || 0) + ship.height * 0.45;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const distance = Math.sqrt(
      Math.pow(playerCenterX - shipCenterX, 2) + 
      Math.pow(playerCenterY - shipCenterY, 2)
    );
    
    // If player is near ship, enter automatically
    if (distance < 50) {
      console.log('Player auto-entering ship');
      player.captured = true;
      player.beamPullT = 0;
      playSound(audio.beamSound);
    }
  }
  
  // Handle manual ship entry sequence
  if (!cinematic.active && player.captured && !gameWin && currentScene === 'main') {
    const targetX = ship.x + ship.width * 0.62 - player.width / 2;
    const targetY = ship.y + (ship.floatOffset || 0) + ship.height * 0.45;
    
    // Smooth movement to ship entrance
    player.beamPullT = (player.beamPullT || 0) + 0.02;
    const moveSpeed = Math.min(0.15, 0.05 + player.beamPullT * 0.02);
    
    player.x += (targetX - player.x) * moveSpeed;
    player.y += (targetY - player.y) * moveSpeed;
    
    // Fade effect
    player.alpha = Math.max(0, player.alpha - 0.04);
    
    // Add particle trail
    if (Math.random() < 0.3) {
      particles.push({
        x: player.x + player.width / 2 + (Math.random() - 0.5) * 20,
        y: player.y + player.height / 2 + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 2 + Math.random() * 3,
        life: 15 + Math.random() * 10,
        maxLife: 15 + Math.random() * 10,
        color: 'rgba(120, 200, 255, 0.8)'
      });
    }
    
    if (player.alpha <= 0.02) {
      player.alpha = 0;
      gameWin = true;
      ship.departing = true;
      ship.speed = -12;
      winAt = performance.now();
    }
  }

    // After win: when ship leaves to the left, immediately start cinematic
    if (gameWin && !cinematic.active) {
      const shipGone = ship.x + ship.width < -40;
      if (shipGone) {
        cinematic.active = true;
        currentScene = 'cinematic';
        // reset cinematic starting position for Ship3
        cinematic.x = WORLD.width - 50;
        cinematic.y = 50;
        cinematic.scale = 1;
        cinematic.moving = true; // Start moving to target
      }
    }

    // Obstacles
    obstacleTimer += 1;
    if (obstacleTimer % 120 === 0) { // spawn less frequently
      spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= o.speed;
      if (o.x + o.width < -50) {
        obstacles.splice(i, 1);
        continue;
      }
      // Collision with player (disabled while boarding or after win/cinematic)
      if (!player.captured && !gameWin && !cinematic.active) {
        if (aabbIntersect(player.x, player.y, player.width, player.height, o.x, o.y, o.width, o.height)) {
          gameOver = true;
        }
      }
    }

    // (win handled above)
  }

  function spawnOutsideHazard() {
    const size = 25 + Math.random() * 35; // Bigger hazards
    const fromTop = Math.random() < 0.5;
    const baseSpeed = 1.2 + Math.random() * 1.6; // أسرع بكثير في الصمود
    const speed = baseSpeed * outsideShip.difficultyMultiplier; // Apply difficulty multiplier
    const angle = (Math.random() * 0.3 - 0.15); // زاوية أكثر (أصعب)
    const y = 20 + Math.random() * (WORLD.height - 40 - size);
    outsideShip.hazards.push({
      x: -size, // Start from left side instead of right
      y,
      width: size,
      height: size,
      speed,
      vy: speed * Math.tan(angle) * (fromTop ? 1 : -1),
      color: `hsl(${180 + Math.floor(Math.random()*60)}, 50%, 65%)`,
    });
  }

  // Ship fire effects for final stage
  function spawnShipFireParticle() {
    if (outsideShip.shipFire.intensity <= 0) return;
    
    // Limit particles on low-end devices
    const maxParticles = isLowEndDevice ? 15 : 30;
    if (outsideShip.shipFire.particles.length >= maxParticles) return;
    
    const shipX = outsideShip.shipArrivalX;
    const shipY = outsideShip.shipArrivalY;
    const shipWidth = 200;
    const shipHeight = 120;
    
    // Spawn fire particles from the bottom of the ship
    const baseX = shipX + shipWidth * 0.3 + Math.random() * shipWidth * 0.4;
    const baseY = shipY + shipHeight * 0.8;
    
    // Reduce particle complexity on low-end devices
    const particleSize = isLowEndDevice ? (2 + Math.random() * 2) : (3 + Math.random() * 4);
    const particleLife = isLowEndDevice ? (15 + Math.random() * 20) : (20 + Math.random() * 30);
    
    outsideShip.shipFire.particles.push({
      x: baseX,
      y: baseY,
      vx: (Math.random() - 0.5) * 2,
      vy: -2 - Math.random() * 3,
      size: particleSize,
      life: particleLife,
      maxLife: particleLife,
      color: `hsl(${Math.random() * 60 + 10}, 100%, ${50 + Math.random() * 30}%)`, // Orange to red
      alpha: 0.8 + Math.random() * 0.2
    });
  }

  function updateShipFireEffects() {
    // Update fire intensity based on survival timer
    const progress = outsideShip.survivalTimer / outsideShip.maxSurvivalTime;
    outsideShip.shipFire.intensity = Math.min(1, progress * 2.0); // Full intensity at 50% survival time
    
    // Update floating animation
    outsideShip.shipFire.floatT += 0.05;
    outsideShip.shipFire.floatOffset = Math.sin(outsideShip.shipFire.floatT) * 3;
    
    // Spawn fire particles based on intensity - reduced frequency on low-end devices
    const spawnRate = isLowEndDevice ? 0.3 : 0.5;
    if (outsideShip.shipFire.intensity > 0.1 && Math.random() < outsideShip.shipFire.intensity * spawnRate) {
      spawnShipFireParticle();
    }
    
    // Play fire sound when intensity is high - reduced frequency on low-end devices
    const soundRate = isLowEndDevice ? 0.05 : 0.1;
    if (outsideShip.shipFire.intensity > 0.5 && Math.random() < soundRate) {
      playSound(audio.beamSound); // Use existing sound for fire crackling
    }
    
    // Update existing fire particles - skip some updates on low-end devices
    const updateStep = isLowEndDevice ? 2 : 1; // Update every other particle on low-end devices
    for (let i = outsideShip.shipFire.particles.length - 1; i >= 0; i -= updateStep) {
      const p = outsideShip.shipFire.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vy += 0.1; // Gravity effect
      p.alpha = Math.max(0, p.life / p.maxLife);
      
      if (p.life <= 0 || p.y > WORLD.height + 50) {
        outsideShip.shipFire.particles.splice(i, 1);
      }
    }
    
    // Check if rescue ship should be called
    if (outsideShip.shipFire.intensity > 0.8 && !outsideShip.rescueShip.active) {
      // Show rescue message
      rescueMessage.visible = true;
      rescueMessage.timer = 0;
      startRescueShip();
    }
  }
  
  // Start rescue ship sequence
  function startRescueShip() {
    console.log('Rescue ship called!');
    outsideShip.rescueShip.active = true;
    outsideShip.rescueShip.arriving = true;
    outsideShip.rescueShip.arrived = false;
    outsideShip.rescueShip.x = WORLD.width + 100; // Start from right side
    outsideShip.rescueShip.y = 100;
    outsideShip.rescueShip.targetX = WORLD.width - 250; // Position near player
    outsideShip.rescueShip.targetY = 100;
    outsideShip.rescueShip.beamActive = false;
    outsideShip.rescueShip.canBoard = false;
    outsideShip.rescueShip.boardingMessage = '';
    outsideShip.rescueShip.boardingMessageT = 0;
    
    console.log('Rescue ship started:', {
      active: outsideShip.rescueShip.active,
      arriving: outsideShip.rescueShip.arriving,
      x: outsideShip.rescueShip.x,
      y: outsideShip.rescueShip.y,
      targetX: outsideShip.rescueShip.targetX,
      targetY: outsideShip.rescueShip.targetY
    });
    
    // Play rescue ship sound
    playSound(audio.beamSound);
  }
  
  // Update rescue ship
  function updateRescueShip() {
    if (!outsideShip.rescueShip.active) return;
    
    if (outsideShip.rescueShip.arriving) {
      // Move rescue ship towards target
      const dx = outsideShip.rescueShip.targetX - outsideShip.rescueShip.x;
      const dy = outsideShip.rescueShip.targetY - outsideShip.rescueShip.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        outsideShip.rescueShip.x += (dx / distance) * outsideShip.rescueShip.speed;
        outsideShip.rescueShip.y += (dy / distance) * outsideShip.rescueShip.speed;
      } else {
        // Arrived at target
        outsideShip.rescueShip.arriving = false;
        outsideShip.rescueShip.arrived = true;
        outsideShip.rescueShip.beamActive = true;
        outsideShip.rescueShip.canBoard = true;
        outsideShip.rescueShip.boardingMessage = 'مركبة الإنقاذ وصلت! اقترب للركوب التلقائي';
        outsideShip.rescueShip.boardingMessageT = 180; // 3 seconds at 60fps
        
        console.log('Rescue ship arrived and ready for boarding!', {
          x: outsideShip.rescueShip.x,
          y: outsideShip.rescueShip.y,
          canBoard: outsideShip.rescueShip.canBoard
        });
      }
    }
    
    if (outsideShip.rescueShip.arrived) {
      // Update beam animation
      outsideShip.rescueShip.beamPulseT += 0.1;
      
      // Update boarding message timer
      if (outsideShip.rescueShip.boardingMessageT > 0) {
        outsideShip.rescueShip.boardingMessageT--;
      }
    }
  }

  function drawShipFireEffects() {
    if (outsideShip.shipFire.intensity <= 0) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    // Draw fire particles - skip some on low-end devices
    const drawStep = isLowEndDevice ? 2 : 1;
    for (let i = 0; i < outsideShip.shipFire.particles.length; i += drawStep) {
      const p = outsideShip.shipFire.particles[i];
      ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect only on high-end devices
      if (!isLowEndDevice) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
  
  // Draw rescue ship
  function drawRescueShip() {
    if (!outsideShip.rescueShip.active) return;
    
    ctx.save();
    
    // Draw rescue ship
    const shipWidth = 200 * outsideShip.rescueShip.scale;
    const shipHeight = 120 * outsideShip.rescueShip.scale;
    
    // Add glow effect for rescue ship
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.9;
    
    // Flip ship horizontally when moving from right to left
    ctx.scale(-1, 1);
    ctx.drawImage(assets.ship, -(outsideShip.rescueShip.x + shipWidth), outsideShip.rescueShip.y, shipWidth, shipHeight);
    ctx.restore();
    
    // Draw rescue beam if active
    if (outsideShip.rescueShip.beamActive) {
      drawRescueBeam();
    }
    
    // Draw boarding message
    if (outsideShip.rescueShip.boardingMessageT > 0) {
      ctx.save();
      ctx.font = 'bold 20px Segoe UI, Roboto, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      
      const messageY = outsideShip.rescueShip.y + shipHeight + 30;
      ctx.strokeText(outsideShip.rescueShip.boardingMessage, outsideShip.rescueShip.x + shipWidth/2, messageY);
      ctx.fillText(outsideShip.rescueShip.boardingMessage, outsideShip.rescueShip.x + shipWidth/2, messageY);
      ctx.restore();
    }
  }
  
  // Draw rescue beam
  function drawRescueBeam() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const beamWidth = 8;
    const beamHeight = 100;
    const beamX = outsideShip.rescueShip.x + (200 * outsideShip.rescueShip.scale) / 2 - beamWidth / 2;
    const beamY = outsideShip.rescueShip.y + (120 * outsideShip.rescueShip.scale);
    
    // Animated beam
    const pulse = Math.sin(outsideShip.rescueShip.beamPulseT) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(0, 255, 255, ${pulse * 0.8})`;
    ctx.fillRect(beamX, beamY, beamWidth, beamHeight);
    
    // Beam particles
    for (let i = 0; i < 5; i++) {
      const particleX = beamX + Math.random() * beamWidth;
      const particleY = beamY + Math.random() * beamHeight;
      const particleSize = Math.random() * 3 + 1;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8})`;
      ctx.beginPath();
      ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  // Board rescue ship and end game
  function boardRescueShip() {
    // Prevent multiple calls
    if (rescueBoardingTransition.active || currentScene === 'inside_rescue_ship') {
      return;
    }
    
    console.log('Boarding rescue ship!');
    
    // Play victory sound
    playSound(audio.beamSound);
    
    // Set game as completed
    gameWin = true;
    
    // Start victory celebration immediately
    startVictoryCelebration();
    
    // Start rescue ship boarding transition immediately
    startRescueShipBoardingTransition();
    
    console.log('Victory celebration started:', victoryCelebration.active);
    console.log('Ribbons created:', victoryCelebration.ribbons.length);
  }

  // Rescue ship boarding transition system
  const rescueBoardingTransition = {
    active: false,
    progress: 0,
    duration: 3000, // 3 seconds
    startTime: 0,
    backgroundScale: 0.1,
    backgroundOpacity: 0,
    playerScale: 1,
    playerOpacity: 1,
    beamIntensity: 0
  };

  function startRescueShipBoardingTransition() {
    console.log('Starting rescue ship boarding transition');
    rescueBoardingTransition.active = true;
    rescueBoardingTransition.progress = 0;
    rescueBoardingTransition.startTime = Date.now();
    rescueBoardingTransition.backgroundScale = 0.1;
    rescueBoardingTransition.backgroundOpacity = 0;
    rescueBoardingTransition.playerScale = 1;
    rescueBoardingTransition.playerOpacity = 1;
    rescueBoardingTransition.beamIntensity = 0;
  }

  function updateRescueBoardingTransition() {
    if (!rescueBoardingTransition.active) return;

    const elapsed = Date.now() - rescueBoardingTransition.startTime;
    rescueBoardingTransition.progress = Math.min(elapsed / rescueBoardingTransition.duration, 1);

    // Animate background scaling and opacity
    if (rescueBoardingTransition.progress < 0.5) {
      // First half: scale up background and fade in
      const phase = rescueBoardingTransition.progress * 2;
      rescueBoardingTransition.backgroundScale = 0.1 + (phase * 0.9);
      rescueBoardingTransition.backgroundOpacity = phase;
      rescueBoardingTransition.beamIntensity = phase;
    } else {
      // Second half: fade out player and complete transition
      const phase = (rescueBoardingTransition.progress - 0.5) * 2;
      rescueBoardingTransition.playerScale = 1 - (phase * 0.5);
      rescueBoardingTransition.playerOpacity = 1 - phase;
      rescueBoardingTransition.backgroundScale = 1;
      rescueBoardingTransition.backgroundOpacity = 1;
    }

    // Complete transition
    if (rescueBoardingTransition.progress >= 1) {
      console.log('Rescue ship boarding transition completed');
      rescueBoardingTransition.active = false;
      currentScene = 'inside_rescue_ship';
      insideRescueShip.playerX = WORLD.width / 2 - player.width / 2;
      insideRescueShip.playerY = WORLD.height / 2 - player.height / 2;
      startVictoryCelebration();
    }
  }

  function drawRescueBoardingTransition() {
    if (!rescueBoardingTransition.active) return;

    console.log('Drawing rescue boarding transition, progress:', rescueBoardingTransition.progress);
    ctx.save();

    // Clear canvas first
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);

    // Draw simple black background for celebration
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Draw rescue ship with beam effect
    if (outsideShip.rescueShip.active) {
      const shipWidth = 200 * outsideShip.rescueShip.scale;
      const shipHeight = 120 * outsideShip.rescueShip.scale;
      
      // Draw beam with intensity
      if (rescueBoardingTransition.beamIntensity > 0) {
        drawRescueBeamWithIntensity(rescueBoardingTransition.beamIntensity);
      }
      
      // Draw rescue ship
      ctx.drawImage(assets.ship, -(outsideShip.rescueShip.x + shipWidth), outsideShip.rescueShip.y, shipWidth, shipHeight);
    }

    // Draw player with scaling and opacity
    ctx.globalAlpha = rescueBoardingTransition.playerOpacity;
    const playerScale = rescueBoardingTransition.playerScale;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    
    ctx.translate(playerCenterX, playerCenterY);
    ctx.scale(playerScale, playerScale);
    ctx.translate(-playerCenterX, -playerCenterY);
    
    drawPlayer(player.x, player.y);
    
    ctx.restore();
    
    // Draw victory celebration during transition (on top of everything)
    if (victoryCelebration.active) {
      console.log('Drawing victory celebration in transition!');
      drawVictoryCelebration();
    }
  }

  function drawRescueBeamWithIntensity(intensity) {
    const beamWidth = 8 * intensity;
    const beamX = outsideShip.rescueShip.x + (200 * outsideShip.rescueShip.scale) / 2 - beamWidth / 2;
    const beamY = outsideShip.rescueShip.y + (120 * outsideShip.rescueShip.scale);
    const beamHeight = WORLD.height - beamY;

    // Create gradient for beam
    const gradient = ctx.createLinearGradient(beamX, beamY, beamX, beamY + beamHeight);
    gradient.addColorStop(0, `rgba(0, 255, 255, ${0.8 * intensity})`);
    gradient.addColorStop(0.5, `rgba(0, 200, 255, ${0.6 * intensity})`);
    gradient.addColorStop(1, `rgba(0, 150, 255, ${0.3 * intensity})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(beamX, beamY, beamWidth, beamHeight);

    // Add pulsing effect
    const pulse = Math.sin(outsideShip.rescueShip.beamPulseT) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * intensity * pulse})`;
    ctx.fillRect(beamX - 2, beamY, beamWidth + 4, beamHeight);
  }

  // Victory celebration system
  const victoryCelebration = {
    active: false,
    ribbons: [],
    confetti: [],
    message1: 'لقد فزتي!',
    message2: 'انتِ رائدة فضاء المستقبل',
    message1T: 0,
    message2T: 0,
    maxMessageT: 300, // 5 seconds
    fadeOut: 0,
    fadeOutSpeed: 0.01
  };

  function startVictoryCelebration() {
    console.log('Starting victory celebration!');
    console.log('Before starting:', {
      active: victoryCelebration.active,
      ribbonsCount: victoryCelebration.ribbons.length
    });
    
    victoryCelebration.active = true;
    victoryCelebration.message1T = victoryCelebration.maxMessageT;
    victoryCelebration.message2T = victoryCelebration.maxMessageT;
    victoryCelebration.fadeOut = 0;
    
    // Start celebration music
    startCelebrationMusic();
    
    // Play victory sound
    playSound(audio.victorySound);
    
    // Create flying ribbons
    for (let i = 0; i < 30; i++) {
      victoryCelebration.ribbons.push({
        x: Math.random() * WORLD.width,
        y: -50,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2 + 3, // Faster vertical movement
        color: `hsl(${Math.random() * 360}, 80%, 70%)`,
        width: Math.random() * 12 + 6,
        height: Math.random() * 40 + 30,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 1,
        lifeSpeed: 0.001
      });
    }
    
    // Create confetti particles
    for (let i = 0; i < 50; i++) {
      victoryCelebration.confetti.push({
        x: Math.random() * WORLD.width,
        y: -30,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2, // Faster vertical movement
        color: `hsl(${Math.random() * 360}, 90%, 60%)`,
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
        lifeSpeed: 0.001
      });
    }
    
    console.log('Victory celebration started with', victoryCelebration.ribbons.length, 'ribbons');
    console.log('After starting:', {
      active: victoryCelebration.active,
      ribbonsCount: victoryCelebration.ribbons.length,
      message1T: victoryCelebration.message1T,
      message2T: victoryCelebration.message2T
    });
  }

  function updateVictoryCelebration() {
    if (!victoryCelebration.active) return;
    
    // console.log('Updating victory celebration!', {
    //   active: victoryCelebration.active,
    //   ribbonsCount: victoryCelebration.ribbons.length,
    //   message1T: victoryCelebration.message1T,
    //   message2T: victoryCelebration.message2T
    // });

    // Update message timers
    if (victoryCelebration.message1T > 0) {
      victoryCelebration.message1T--;
    }
    if (victoryCelebration.message2T > 0) {
      victoryCelebration.message2T--;
    }

    // Update fade out effect
    if (victoryCelebration.message1T <= 0 && victoryCelebration.message2T <= 0) {
      victoryCelebration.fadeOut = Math.min(1, victoryCelebration.fadeOut + victoryCelebration.fadeOutSpeed);
    }
    
    // Play random celebration sounds
    if (Math.random() < 0.1) { // 10% chance each frame
      if (Math.random() < 0.5) {
        playSound(audio.confettiSound);
      } else {
        playSound(audio.fireworksSound);
      }
    }

    // Update ribbons
    for (let i = victoryCelebration.ribbons.length - 1; i >= 0; i--) {
      const ribbon = victoryCelebration.ribbons[i];
      ribbon.x += ribbon.vx;
      ribbon.y += ribbon.vy;
      ribbon.rotation += ribbon.rotationSpeed;
      ribbon.life -= ribbon.lifeSpeed;
      
      // Debug first ribbon
      // if (i === 0) {
      //   console.log('First ribbon:', {
      //     x: ribbon.x,
      //     y: ribbon.y,
      //     vx: ribbon.vx,
      //     vy: ribbon.vy,
      //     life: ribbon.life
      //   });
      // }
      
      // Remove ribbons that fall off screen or fade out
      if (ribbon.y > WORLD.height + 20 || ribbon.life <= 0) {
        victoryCelebration.ribbons.splice(i, 1);
      }
    }
    
    // Add new ribbons occasionally
    if (Math.random() < 0.1 && victoryCelebration.ribbons.length < 50) {
      victoryCelebration.ribbons.push({
        x: Math.random() * WORLD.width,
        y: -50,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2 + 3,
        color: `hsl(${Math.random() * 360}, 80%, 70%)`,
        width: Math.random() * 12 + 6,
        height: Math.random() * 40 + 30,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 1,
        lifeSpeed: 0.001
      });
    }
    
    // Update confetti
    for (let i = victoryCelebration.confetti.length - 1; i >= 0; i--) {
      const confetti = victoryCelebration.confetti[i];
      confetti.x += confetti.vx;
      confetti.y += confetti.vy;
      confetti.rotation += confetti.rotationSpeed;
      confetti.life -= confetti.lifeSpeed;
      
      // Remove confetti that falls off screen or fades out
      if (confetti.y > WORLD.height + 20 || confetti.life <= 0) {
        victoryCelebration.confetti.splice(i, 1);
      }
    }
  }

  function drawVictoryCelebration() {
    if (!victoryCelebration.active) {
      console.log('Victory celebration not active!');
      return;
    }
    
    // console.log('Drawing victory celebration!', {
    //   active: victoryCelebration.active,
    //   ribbonsCount: victoryCelebration.ribbons.length,
    //   message1T: victoryCelebration.message1T,
    //   message2T: victoryCelebration.message2T
    // });

    // Draw flying ribbons
    ctx.save();
    // console.log('Drawing', victoryCelebration.ribbons.length, 'ribbons');
    for (const ribbon of victoryCelebration.ribbons) {
      ctx.save();
      ctx.translate(ribbon.x, ribbon.y);
      ctx.rotate(ribbon.rotation);
      ctx.globalAlpha = ribbon.life;
      ctx.fillStyle = ribbon.color;
      ctx.fillRect(-ribbon.width/2, -ribbon.height/2, ribbon.width, ribbon.height);
      ctx.restore();
    }
    ctx.restore();
    
    // Draw confetti particles
    ctx.save();
    for (const confetti of victoryCelebration.confetti) {
      ctx.save();
      ctx.translate(confetti.x, confetti.y);
      ctx.rotate(confetti.rotation);
      ctx.globalAlpha = confetti.life;
      ctx.fillStyle = confetti.color;
      
      // Draw different shapes
      if (Math.random() > 0.5) {
        // Square confetti
        ctx.fillRect(-confetti.size/2, -confetti.size/2, confetti.size, confetti.size);
      } else {
        // Circle confetti
        ctx.beginPath();
        ctx.arc(0, 0, confetti.size/2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    // Draw messages
    if (victoryCelebration.message1T > 0 || victoryCelebration.message2T > 0) {
      ctx.save();
      
      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // First message - "لقد فزتي!"
      if (victoryCelebration.message1T > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 48px Arial';
        
        const message1Y = WORLD.height / 2 - 30;
        ctx.strokeText(victoryCelebration.message1, WORLD.width / 2, message1Y);
        ctx.fillText(victoryCelebration.message1, WORLD.width / 2, message1Y);
      }
      
      // Second message - "انتِ رائدة فضاء المستقبل"
      if (victoryCelebration.message2T > 0) {
        ctx.fillStyle = '#87CEEB';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.font = 'bold 24px Arial';
        
        const message2Y = WORLD.height / 2 + 30;
        ctx.strokeText(victoryCelebration.message2, WORLD.width / 2, message2Y);
        ctx.fillText(victoryCelebration.message2, WORLD.width / 2, message2Y);
      }
      
      ctx.restore();
    }
    
    // Draw fade out effect
    if (victoryCelebration.fadeOut > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${victoryCelebration.fadeOut})`;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.restore();
    }
  }

  function drawInsideRescueShipScene() {
    // Draw background
    if (isImageReady(assets.hall)) {
      ctx.drawImage(
        assets.hall,
        insideRescueShip.backgroundX,
        insideRescueShip.backgroundY,
        WORLD.width,
        WORLD.height
      );
    }

    // Don't draw player - only show celebration
    // drawPlayer(insideRescueShip.playerX, insideRescueShip.playerY + insideRescueShip.floatOffset);

    // Draw victory celebration (only thing visible after victory)
    if (victoryCelebration.active) {
      console.log('Drawing victory celebration in inside rescue ship scene!');
      drawVictoryCelebration();
    }
  }

  function updateOutsideShipScene() {
    // Direct movement for more responsive controls
    player.x += player.dx;
    player.y += player.dy;
    
    // Keep player within canvas bounds with proper margins
    const margin = 5; // Small margin from canvas edges
    const minX = margin;
    const maxX = WORLD.width - player.width - margin;
    const minY = margin;
    const maxY = WORLD.height - player.height - margin;
    
    player.x = clamp(player.x, minX, maxX);
    player.y = clamp(player.y, minY, maxY);
    
    // Player floating motion (visual bobbing) - with thrusters in outside scene
    player.floatT += 0.05;
    player.floatOffset = Math.sin(player.floatT) * 4; // 4px bob
    
    // Spawn player flame particles in outside scene
    spawnPlayerFlameParticles();
    updatePlayerFlames();
    
    // Update ship fire effects for final stage
    updateShipFireEffects();
    
    // Update rescue ship
    updateRescueShip();
    
    // Auto rescue ship entry - check if player is near rescue ship (no key press needed)
    if (outsideShip.rescueShip.active && outsideShip.rescueShip.canBoard && currentScene === 'outside_ship' && !rescueBoardingTransition.active) {
      // Check if player is near the rescue ship (within 80 pixels - same as regular ship)
      const shipWidth = 200 * outsideShip.rescueShip.scale;
      const shipHeight = 120 * outsideShip.rescueShip.scale;
      const rescueShipCenterX = outsideShip.rescueShip.x + shipWidth * 0.62;
      const rescueShipCenterY = outsideShip.rescueShip.y + shipHeight * 0.45;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;
      const distance = Math.sqrt(
        Math.pow(playerCenterX - rescueShipCenterX, 2) + 
        Math.pow(playerCenterY - rescueShipCenterY, 2)
      );
      
      // Debug info
      if (distance < 120) { // Show debug info when close
        console.log('Rescue ship debug:', {
          active: outsideShip.rescueShip.active,
          canBoard: outsideShip.rescueShip.canBoard,
          currentScene: currentScene,
          transitionActive: rescueBoardingTransition.active,
          distance: distance,
          playerPos: {x: player.x, y: player.y},
          shipPos: {x: outsideShip.rescueShip.x, y: outsideShip.rescueShip.y},
          shipCenter: {x: rescueShipCenterX, y: rescueShipCenterY},
          shipSize: {width: shipWidth, height: shipHeight}
        });
      }
      
      // If player is near rescue ship, enter automatically (same distance as regular ship)
      if (distance < 80) {
        console.log('Player auto-entering rescue ship');
        boardRescueShip();
      }
    }
    
    // Update timer celebration
    updateTimerCelebration();
    
    // Stop celebration if player dies or leaves the scene
    if (gameOver || currentScene !== 'outside_ship') {
      timerCelebration.active = false;
    }

    // Ship arrival sequence - move from right to left
    if (outsideShip.shipArriving && outsideShip.shipMoving) {
      outsideShip.shipArrivalX -= outsideShip.shipArrivalSpeed;
      
      // Stop ship when it reaches the target position on the left
      if (outsideShip.shipArrivalX <= outsideShip.shipTargetX) {
        outsideShip.shipArrivalX = outsideShip.shipTargetX;
        outsideShip.shipArriving = true; // Keep ship arriving state for auto entry
        outsideShip.shipMoving = false;
        // Ship is now ready for auto entry - player just needs to approach
      }
    }
    
    // Update beam pulse
    if (outsideShip.shipArrivalBeamActive) {
      outsideShip.shipArrivalBeamPulseT += 0.08;
    }
    
    // No scaling animation - ship stays normal size
    
    // No need for justExited flag anymore

    // Update survival timer and difficulty - make it harder
    outsideShip.survivalTimer += 1;
    outsideShip.difficultyMultiplier = 1.0 + (outsideShip.survivalTimer / outsideShip.maxSurvivalTime) * 2.5; // Max 3.5x difficulty (أصعب بكثير)
    
    // Check if timer reached 0 and start celebration (only if player is alive and in outside ship scene)
    const timeLeft = Math.max(0, outsideShip.maxSurvivalTime - outsideShip.survivalTimer);
    if (timeLeft <= 0 && !gameOver && !timerCelebration.active && currentScene === 'outside_ship') {
      startTimerCelebration();
    }
    
    // Hazards spawn and move - make it harder
    outsideShip.spawnTimer += 1;
    const adjustedSpawnRate = Math.max(80, Math.floor(outsideShip.spawnRate / (outsideShip.difficultyMultiplier * 0.8))); // أكثر عدداً وأسرع
    if (outsideShip.spawnTimer % adjustedSpawnRate === 0) {
      spawnOutsideHazard();
    }
    for (let i = outsideShip.hazards.length - 1; i >= 0; i--) {
      const h = outsideShip.hazards[i];
      // Reverse movement - move from left to right instead of right to left
      h.x += h.speed;
      h.y += h.vy * 0.25;
      if (h.x > WORLD.width + 40 || h.y < -60 || h.y > WORLD.height + 60) {
        outsideShip.hazards.splice(i, 1);
        continue;
      }
      if (!gameOver && aabbIntersect(player.x, player.y, player.width, player.height, h.x, h.y, h.width, h.height)) {
        gameOver = true;
      }
    }

    
    // Check if player is in arrival beam and can return to inside ship
    // Auto ship entry - check if player is near arrival ship (no key press needed)
    if (outsideShip.shipArriving && outsideShip.shipArrivalBeamActive && currentScene === 'outside_ship') {
      // Add longer delay to prevent immediate re-entry after exiting
      if (outsideShip.survivalTimer > 120) { // Wait 2 seconds before allowing auto-entry
        // Check if player is near the arrival ship (within 60 pixels)
        const shipCenterX = outsideShip.shipArrivalX + 200 * 0.62;
        const shipCenterY = outsideShip.shipArrivalY + 120 * 0.45;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const distance = Math.sqrt(
          Math.pow(playerCenterX - shipCenterX, 2) + 
          Math.pow(playerCenterY - shipCenterY, 2)
        );
        
        // If player is near ship, enter automatically
        if (distance < 60) {
          console.log('Player auto-entering arrival ship');
          player.captured = true;
          player.beamPullT = 0;
          playSound(audio.beamSound);
        }
      }
    }
    
    // Handle manual ship entry sequence outside ship
    if (player.captured && outsideShip.shipArriving && currentScene === 'outside_ship') {
      const targetX = outsideShip.shipArrivalX + 200 * 0.62 - player.width / 2;
      const targetY = outsideShip.shipArrivalY + 120 * 0.45;
      
      // Smooth movement to ship entrance
      player.beamPullT = (player.beamPullT || 0) + 0.02;
      const moveSpeed = Math.min(0.15, 0.05 + player.beamPullT * 0.02);
      
      player.x += (targetX - player.x) * moveSpeed;
      player.y += (targetY - player.y) * moveSpeed;
      
      // Fade effect
      player.alpha = Math.max(0, player.alpha - 0.04);
      
      // Add particle trail
      if (Math.random() < 0.3) {
        particles.push({
          x: player.x + player.width / 2 + (Math.random() - 0.5) * 20,
          y: player.y + player.height / 2 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 2 + Math.random() * 3,
          life: 15 + Math.random() * 10,
          maxLife: 15 + Math.random() * 10,
          color: 'rgba(120, 200, 255, 0.8)'
        });
      }
      
      if (player.alpha <= 0.02) {
        player.alpha = 0;
        // Return to inside ship scene
        currentScene = 'inside_ship';
        // Position player in center of inside ship
        insideShip.playerX = WORLD.width / 2 - player.width / 2;
        insideShip.playerY = WORLD.height / 2 - player.height / 2;
        // Reset ship arrival state when entering
        outsideShip.shipArriving = false;
        outsideShip.shipArrivalBeamActive = false;
        player.captured = false;
        player.alpha = 1;
        // Reset survival timer when entering ship
        outsideShip.survivalTimer = 0;
        
        // Stop Samud music and return to background music
        stopSamudMusic();
        outsideShip.difficultyMultiplier = 1.0;
      }
    }
    
    // Show enter button when near the gate (right side of background image)
    const nearGate = player.x + player.width >= outsideShip.gateX - 20 && // Near gate area
                     player.y + player.height > outsideShip.gateY &&
                     player.y < outsideShip.gateY + outsideShip.gateHeight;
    enterButton.visible = nearGate && !gameOver;
  }

  // ------------------------------
  // Draw Loop
  // ------------------------------
  function drawShip() {
    // Ship body with floating offset
    ctx.save();
    
    // Flip ship horizontally when departing left at high speed
    if (ship.departing && ship.speed < 0) {
      ctx.scale(-1, 1);
      ctx.drawImage(assets.ship, -(ship.x + ship.width), ship.y + (ship.floatOffset || 0), ship.width, ship.height);
    } else {
      ctx.drawImage(assets.ship, ship.x, ship.y + (ship.floatOffset || 0), ship.width, ship.height);
    }
    
    ctx.restore();
  }

  function drawBeam() {
    if (!(ship.isDocked && ship.isBeamActive)) return;
    const topY = ship.y + (ship.floatOffset || 0) + ship.height * 0.8;
    const bottomY = Math.min(WORLD.height, topY + 260);
    const centerX = ship.x + ship.width * 0.62; // Normal right-docked ship
    const topHalfWidth = ship.width * 0.2;
    const bottomHalfWidth = ship.width * 0.6;

    const pulse = 0.55 + 0.25 * Math.sin(ship.beamPulseT);
    const alpha = 0.22 + 0.13 * Math.sin(ship.beamPulseT * 1.3);

    // Create gradient
    const grad = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
    grad.addColorStop(0, `rgba(120, 200, 255, ${0.0})`);
    grad.addColorStop(0.5, `rgba(120, 200, 255, ${alpha})`);
    grad.addColorStop(1, `rgba(120, 200, 255, ${alpha * 0.85})`);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(beamCenterX - topHalfWidth * pulse, topY);
    ctx.lineTo(beamCenterX + topHalfWidth * pulse, topY);
    ctx.lineTo(beamCenterX + bottomHalfWidth * pulse, bottomY);
    ctx.lineTo(beamCenterX - bottomHalfWidth * pulse, bottomY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Soft faded edges using side gradients
    const feather = 18;
    ctx.globalCompositeOperation = 'lighter';
    // Left edge feather
    const leftInnerTop = beamCenterX - topHalfWidth * pulse;
    const leftInnerBottom = beamCenterX - bottomHalfWidth * pulse;
    const leftGrad = ctx.createLinearGradient(leftInnerTop, 0, leftInnerTop - feather, 0);
    leftGrad.addColorStop(0, `rgba(120, 200, 255, ${alpha * 0.6})`);
    leftGrad.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = leftGrad;
    ctx.beginPath();
    ctx.moveTo(leftInnerTop, topY);
    ctx.lineTo(leftInnerBottom, bottomY);
    ctx.lineTo(leftInnerBottom - feather, bottomY);
    ctx.lineTo(leftInnerTop - feather, topY);
    ctx.closePath();
    ctx.fill();
    // Right edge feather
    const rightInnerTop = beamCenterX + topHalfWidth * pulse;
    const rightInnerBottom = beamCenterX + bottomHalfWidth * pulse;
    const rightGrad = ctx.createLinearGradient(rightInnerTop, 0, rightInnerTop + feather, 0);
    rightGrad.addColorStop(0, `rgba(120, 200, 255, ${alpha * 0.6})`);
    rightGrad.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.moveTo(rightInnerTop, topY);
    ctx.lineTo(rightInnerBottom, bottomY);
    ctx.lineTo(rightInnerBottom + feather, bottomY);
    ctx.lineTo(rightInnerTop + feather, topY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawArrivalBeam() {
    if (!outsideShip.shipArrivalBeamActive) return;
    const shipWidth = 200;
    const shipHeight = 120;
    const topY = outsideShip.shipArrivalY + shipHeight * 0.8;
    const bottomY = Math.min(WORLD.height, topY + 260);
    const centerX = outsideShip.shipArrivalX + shipWidth * 0.62;
    const topHalfWidth = shipWidth * 0.2;
    const bottomHalfWidth = shipWidth * 0.6;

    const pulse = 0.55 + 0.25 * Math.sin(outsideShip.shipArrivalBeamPulseT);
    const alpha = 0.22 + 0.13 * Math.sin(outsideShip.shipArrivalBeamPulseT * 1.3);

    // Create gradient
    const grad = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
    grad.addColorStop(0, `rgba(120, 200, 255, ${0.0})`);
    grad.addColorStop(0.5, `rgba(120, 200, 255, ${alpha})`);
    grad.addColorStop(1, `rgba(120, 200, 255, ${alpha * 0.85})`);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX - topHalfWidth * pulse, topY);
    ctx.lineTo(centerX + topHalfWidth * pulse, topY);
    ctx.lineTo(centerX + bottomHalfWidth * pulse, bottomY);
    ctx.lineTo(centerX - bottomHalfWidth * pulse, bottomY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Soft faded edges using side gradients
    const feather = 18;
    ctx.globalCompositeOperation = 'lighter';
    // Left edge feather
    const leftInnerTop = centerX - topHalfWidth * pulse;
    const leftInnerBottom = centerX - bottomHalfWidth * pulse;
    const leftGrad = ctx.createLinearGradient(leftInnerTop, 0, leftInnerTop - feather, 0);
    leftGrad.addColorStop(0, `rgba(120, 200, 255, ${alpha * 0.6})`);
    leftGrad.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = leftGrad;
    ctx.beginPath();
    ctx.moveTo(leftInnerTop, topY);
    ctx.lineTo(leftInnerBottom, bottomY);
    ctx.lineTo(leftInnerBottom - feather, bottomY);
    ctx.lineTo(leftInnerTop - feather, topY);
    ctx.closePath();
    ctx.fill();
    // Right edge feather
    const rightInnerTop = centerX + topHalfWidth * pulse;
    const rightInnerBottom = centerX + bottomHalfWidth * pulse;
    const rightGrad = ctx.createLinearGradient(rightInnerTop, 0, rightInnerTop + feather, 0);
    rightGrad.addColorStop(0, `rgba(120, 200, 255, ${alpha * 0.6})`);
    rightGrad.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.moveTo(rightInnerTop, topY);
    ctx.lineTo(rightInnerBottom, bottomY);
    ctx.lineTo(rightInnerBottom + feather, bottomY);
    ctx.lineTo(rightInnerTop + feather, topY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    const y = player.y + (player.floatOffset || 0);
    ctx.save();
    ctx.globalAlpha = player.alpha;
    
    // Use the correct image based on facing direction
    const imageToUse = player.facing === 'left' ? assets.playerLeft : assets.playerRight;
    ctx.drawImage(imageToUse, player.x, y, player.width, player.height);
    
    ctx.restore();
  }

  function drawObstacles() {
    for (const o of obstacles) {
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.width, o.height, 8);
      ctx.fill();
      // subtle craters
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(o.x + o.width * 0.3, o.y + o.height * 0.4, Math.min(6, o.width * 0.15), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(o.x + o.width * 0.7, o.y + o.height * 0.65, Math.min(5, o.width * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawUI() {
    ctx.save();
    ctx.font = '18px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    
    if (currentScene === 'flying') {
      ctx.fillText('الأسهم للتحرك — اضغط F للعودة للمشهد الرئيسي — اضغط B لتفعيل الشعاع', WORLD.width / 2, 28);
      ctx.fillText('اقتربي من السفينة للدخول تلقائياً', WORLD.width / 2, 50);
    } else if (currentScene === 'main' && ship.isBeamActive && isPlayerInBeam()) {
      ctx.fillStyle = 'rgba(120, 200, 255, 1)';
      ctx.font = 'bold 20px Segoe UI, Roboto, Arial';
      ctx.fillText('تم التقاطك! جاري الدخول إلى المركبة...', WORLD.width / 2, 28);
    } else {
      ctx.fillText('اقتربي من السفينة للدخول تلقائياً', WORLD.width / 2, 50);
    }
    
    ctx.restore();
  }

  // ------------------------------
  // Flying Scene Drawing
  // ------------------------------
  function drawFlyingBackground() {
    if (!isImageReady(assets.background)) return;
    
    ctx.save();
    
    // Draw black background layer first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    // Full opacity for background
    ctx.globalAlpha = 1.0;
    
    // Draw background to cover full screen
    const bgWidth = assets.background.naturalWidth;
    const bgHeight = assets.background.naturalHeight;
    
    // Calculate scale to cover the entire screen while maintaining aspect ratio
    const scaleX = WORLD.width / bgWidth;
    const scaleY = WORLD.height / bgHeight;
    const scale = Math.max(scaleX, scaleY);
    
    const scaledWidth = bgWidth * scale;
    const scaledHeight = bgHeight * scale;
    
    // Center the background and apply parallax offset
    const centerX = (WORLD.width - scaledWidth) / 2;
    const centerY = (WORLD.height - scaledHeight) / 2;
    
    const drawX = centerX + flyingScene.backgroundX;
    const drawY = centerY + flyingScene.backgroundY;
    
    // Draw background image
    ctx.drawImage(
      assets.background,
      drawX,
      drawY,
      scaledWidth,
      scaledHeight
    );
    
    ctx.restore();
  }

  function drawFlyingShip() {
    if (!isImageReady(assets.ship)) return;
    
    ctx.save();
    ctx.globalAlpha = 0.9;
    
    // Calculate scaled dimensions
    const scaledWidth = flyingScene.shipWidth * flyingScene.shipScale;
    const scaledHeight = flyingScene.shipHeight * flyingScene.shipScale;
    
    // Calculate position to keep ship centered during scaling
    const centerX = flyingScene.shipX + flyingScene.shipWidth / 2;
    const centerY = flyingScene.shipY + flyingScene.shipHeight / 2;
    const scaledX = centerX - scaledWidth / 2;
    const scaledY = centerY - scaledHeight / 2 + flyingScene.shipFloatOffset;
    
    ctx.drawImage(
      assets.ship, 
      scaledX, 
      scaledY, 
      scaledWidth, 
      scaledHeight
    );
    ctx.restore();
  }
  
  function drawFlyingBeam() {
    if (!flyingScene.beamActive) return;
    
    // Apply scaling to beam as well
    const scaledWidth = flyingScene.shipWidth * flyingScene.shipScale;
    const scaledHeight = flyingScene.shipHeight * flyingScene.shipScale;
    const centerX = flyingScene.shipX + flyingScene.shipWidth / 2;
    const centerY = flyingScene.shipY + flyingScene.shipHeight / 2;
    const scaledX = centerX - scaledWidth / 2;
    const scaledY = centerY - scaledHeight / 2 + flyingScene.shipFloatOffset;
    
    const topY = scaledY + scaledHeight * 0.8;
    const bottomY = Math.min(WORLD.height, topY + 260);
    const beamCenterX = scaledX + scaledWidth * 0.62;
    const topHalfWidth = scaledWidth * 0.2;
    const bottomHalfWidth = scaledWidth * 0.6;

    const pulse = 0.55 + 0.25 * Math.sin(flyingScene.beamPulseT);
    const alpha = 0.22 + 0.13 * Math.sin(flyingScene.beamPulseT * 1.3);

    // Create gradient
    const grad = ctx.createLinearGradient(beamCenterX, topY, beamCenterX, bottomY);
    grad.addColorStop(0, `rgba(120, 200, 255, ${0.0})`);
    grad.addColorStop(0.5, `rgba(120, 200, 255, ${alpha})`);
    grad.addColorStop(1, `rgba(120, 200, 255, ${alpha * 0.85})`);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(beamCenterX - topHalfWidth * pulse, topY);
    ctx.lineTo(beamCenterX + topHalfWidth * pulse, topY);
    ctx.lineTo(beamCenterX + bottomHalfWidth * pulse, bottomY);
    ctx.lineTo(beamCenterX - bottomHalfWidth * pulse, bottomY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Soft faded edges using side gradients
    const feather = 18;
    ctx.globalCompositeOperation = 'lighter';
    // Left edge feather
    const leftInnerTop = beamCenterX - topHalfWidth * pulse;
    const leftInnerBottom = beamCenterX - bottomHalfWidth * pulse;
    const leftGrad = ctx.createLinearGradient(leftInnerTop, 0, leftInnerTop - feather, 0);
    leftGrad.addColorStop(0, `rgba(120, 200, 255, ${alpha * 0.6})`);
    leftGrad.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = leftGrad;
    ctx.beginPath();
    ctx.moveTo(leftInnerTop, topY);
    ctx.lineTo(leftInnerBottom, bottomY);
    ctx.lineTo(leftInnerBottom - feather, bottomY);
    ctx.lineTo(leftInnerTop - feather, topY);
    ctx.closePath();
    ctx.fill();
    // Right edge feather
    const rightInnerTop = beamCenterX + topHalfWidth * pulse;
    const rightInnerBottom = beamCenterX + bottomHalfWidth * pulse;
    const rightGrad = ctx.createLinearGradient(rightInnerTop, 0, rightInnerTop + feather, 0);
    rightGrad.addColorStop(0, `rgba(120, 200, 255, ${alpha * 0.6})`);
    rightGrad.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.moveTo(rightInnerTop, topY);
    ctx.lineTo(rightInnerBottom, bottomY);
    ctx.lineTo(rightInnerBottom + feather, bottomY);
    ctx.lineTo(rightInnerTop + feather, topY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFlyingPlayer() {
    // Always draw player in flying scene
    const y = player.y + (player.floatOffset || 0);
    ctx.save();
    ctx.globalAlpha = 1; // Make sure player is fully visible
    ctx.globalCompositeOperation = 'source-over'; // Ensure player is drawn on top
    
    // Much bigger size for flying scene
    const scale = 4.5; // Increased from 3.5 to 4.5
    const scaledWidth = player.width * scale;
    const scaledHeight = player.height * scale;
    const offsetX = (scaledWidth - player.width) / 2;
    const offsetY = (scaledHeight - player.height) / 2;
    
    // Use flying.png with reversed flip logic for astronaut
    if (isImageReady(assets.flyingAstronuat)) {
      if (player.facing === 'right') {
        // Flip the flying image when facing right
        ctx.scale(-1, 1);
        ctx.drawImage(assets.flying, -(player.x - offsetX + scaledWidth), y - offsetY, scaledWidth, scaledHeight);
      } else {
        // Normal flying image when facing left
        ctx.drawImage(assets.flying, player.x - offsetX, y - offsetY, scaledWidth, scaledHeight);
      }
    } else {
      // Fallback to regular player sprites
      const imageToUse = player.facing === 'left' ? assets.playerLeft : assets.playerRight;
      ctx.drawImage(imageToUse, player.x - offsetX, y - offsetY, scaledWidth, scaledHeight);
    }
    
    ctx.restore();
  }


  function drawSceneTransitionEffect() {
    ctx.save();
    
    // Create a fade effect based on transition progress
    const alpha = flyingScene.sceneTransition.progress;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    // Add direction indicator
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '24px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    
    let message = '';
    switch (flyingScene.sceneTransition.direction) {
      case 'up':
        message = 'الانتقال إلى المشهد التالي...';
        break;
      case 'down':
        message = 'العودة إلى المشهد السابق...';
        break;
      case 'left':
        message = 'الانتقال إلى اليسار...';
        break;
      case 'right':
        message = 'الانتقال إلى اليمين...';
        break;
    }
    
    ctx.fillText(message, WORLD.width / 2, WORLD.height / 2);
    ctx.restore();
  }

  function drawGameOver() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.font = 'bold 48px Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'center';
    ctx.fillText('انتهت اللعبة!', WORLD.width / 2, WORLD.height / 2);
    ctx.font = '24px Segoe UI, Roboto, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('اضغطي على زر إعادة اللعب أدناه', WORLD.width / 2, WORLD.height / 2 + 40);
    
    // Draw restart button
    const buttonX = WORLD.width / 2 - 100;
    const buttonY = WORLD.height / 2 + 80;
    const buttonWidth = 200;
    const buttonHeight = 50;
    
    // Button background
    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Button border
    ctx.strokeStyle = 'rgba(255, 150, 150, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Button text
    ctx.font = '18px Segoe UI, Roboto, Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('🔄 إعادة اللعب', buttonX + buttonWidth/2, buttonY + buttonHeight/2 + 6);
    
    ctx.restore();
  }

  function drawGameWin() {
    ctx.save();
    // Darker background for better visibility
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.font = 'bold 48px Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#65d46e';
    ctx.textAlign = 'center';
    ctx.fillText('أحسنت! لقد فزتي!', WORLD.width / 2, WORLD.height / 2);
    ctx.font = '24px Segoe UI, Roboto, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('رائد الفضاء صعد إلى السفينة', WORLD.width / 2, WORLD.height / 2 + 40);
    ctx.restore();
    
    // Play win sound when game win screen is shown
    if (!audio.winSoundPlayed) {
      playSound(audio.winSound);
      audio.winSoundPlayed = true;
    }
  }

  function draw() {
    // Always clear the canvas first
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);

    // Handle rescue ship boarding transition first (overrides everything)
    if (rescueBoardingTransition.active) {
      drawRescueBoardingTransition();
    } else if (sceneTransition.active) {
      // Handle scene transition
      drawSceneTransition();
    } else {
      // Handle different scenes - each scene clears its own content
      if (currentScene === 'flying') {
        drawFlyingScene();
      } else if (currentScene === 'cinematic') {
        drawCinematicScene();
      } else if (currentScene === 'transition_to_inside') {
        drawTransitionToInsideScene();
      } else if (currentScene === 'inside_ship') {
        drawInsideShipScene();
      } else if (currentScene === 'quiz_active') {
        drawQuizScene();
      } else if (currentScene === 'outside_ship') {
        drawOutsideShipScene();
      } else if (currentScene === 'inside_rescue_ship') {
        drawInsideRescueShipScene();
      } else {
        drawMainScene();
      }
    }
    
    // Draw exit confirmation dialog if visible (always on top)
    if (exitConfirmation.visible) {
      drawExitConfirmationDialog();
    }
  }

  function drawSceneTransition() {
    const progress = sceneTransition.progress;
    
    // Clear the canvas completely first
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    
    if (progress < 0.5) {
      // First half: fade out from scene
      ctx.save();
      ctx.globalAlpha = 1 - (progress * 2);
      
      if (sceneTransition.fromScene === 'main') {
        drawMainScene();
      } else if (sceneTransition.fromScene === 'flying') {
        drawFlyingScene();
      }
      
      ctx.restore();
    } else {
      // Second half: fade in to scene
      ctx.save();
      ctx.globalAlpha = (progress - 0.5) * 2;
      
      if (sceneTransition.toScene === 'flying') {
        drawFlyingScene();
      } else if (sceneTransition.toScene === 'main') {
        drawMainScene();
      }
      
      ctx.restore();
    }
  }

  function drawExitShipTransition() {
    // No longer needed - transitions are immediate
    return;
  }

  function drawFlyingScene() {
    // Clear any previous content
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    
    // Draw black background layer first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    // Draw space background only
    drawFlyingBackground();
    
    // Draw ship beam first (behind everything)
    drawFlyingBeam();
    
    // Draw ship
    drawFlyingShip();
    
    // Draw ship thruster particles
    drawParticles();
    
    // Draw player flames first (behind player)
    drawPlayerFlames();
    
    // Player with thrusters
    drawFlyingPlayer();
    
    // UI
    drawUI();
  }
  
  function drawTransitionToInsideScene() {
    // Draw current scene with fade effect
    if (transitionToInside.progress < 0.5) {
      // Fade out from cinematic scene
      ctx.save();
      ctx.globalAlpha = 1 - (transitionToInside.progress * 2);
      drawCinematicScene();
      ctx.restore();
    } else {
      // Fade in to inside ship scene
      ctx.save();
      ctx.globalAlpha = (transitionToInside.progress - 0.5) * 2;
      drawInsideShipScene();
      ctx.restore();
    }
    
    // Draw black overlay for transition effect
    ctx.save();
    ctx.globalAlpha = transitionToInside.progress;
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.restore();
  }
  
  function drawInsideShipScene() {
    // Draw animated background with parallax effect
    drawInsideShipBackground();
    
    // Computer table removed - computer is now floating
    
    // Draw computer (moves with background parallax + floating effect)
    if (isImageReady(assets.computer)) {
      ctx.drawImage(
        assets.computer, 
        insideShip.computerX + insideShip.backgroundX, 
        insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset, 
        insideShip.computerWidth, 
        insideShip.computerHeight
      );
    }
    
    // Draw floating player (astronaut)
    drawInsideShipPlayer();
    
    // Draw celebration if active
    if (celebration.active) {
      drawCelebration();
    }
    
    // Draw timer celebration if active
    if (timerCelebration.active) {
      drawTimerCelebration();
    }
    
    // Draw left gate
    drawGate(outsideShip.gateX, outsideShip.gateY, outsideShip.gateWidth, outsideShip.gateHeight);

    // Exit arrow removed

    // Draw interaction prompt
    if (insideShip.showInteraction) {
      ctx.save();
      ctx.font = 'bold 18px Segoe UI, Roboto, Arial';
      ctx.textAlign = 'center';
      
      // Different text based on win status
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      let text = isTouchDevice ? 'اضغطي 🎮️ للعب' : 'اضغط للعب';
      if (quiz.hasWon && quiz.canRetryAfterWin) {
        text = isTouchDevice ? 'اضغطي 🎮️ للعب مرة أخرى' : 'اضغط للعب مرة أخرى';
      }
      
      const textWidth = ctx.measureText(text).width;
      const boxPadding = 12;
      const boxX = insideShip.playerX + player.width / 2 - textWidth / 2 - boxPadding;
      const boxY = insideShip.playerY - 35;
      const boxWidth = textWidth + boxPadding * 2;
      const boxHeight = 30;
      
      // Store speech bubble position for click detection
      speechBubbles.interact = { 
        x: boxX, 
        y: boxY, 
        w: boxWidth, 
        h: boxHeight, 
        visible: true, 
        text: text 
      };
      
      // Draw background box for better visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      
      // Draw border with different color for retry
      if (quiz.hasWon && quiz.canRetryAfterWin) {
        ctx.strokeStyle = 'rgba(100, 255, 100, 0.9)'; // Green for retry
      } else {
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.9)'; // Blue for first time
      }
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      // Draw text
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.fillText(
        text,
        insideShip.playerX + player.width / 2,
        insideShip.playerY - 15
      );
      ctx.restore();
    }
    
    // Draw Exit Ship button - positioned slightly to the right and up
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const exitText = isTouchDevice ? '  اضغطي 🚪 للخروج' : '  اضغطي للخروج';
    if (exitButton.visible) {
      // Adjust position: move right by 50px and up by 20px from original position
      const adjustedX = exitButton.x + 100;
      const adjustedY = exitButton.y - 100;
      console.log('Drawing exit button at:', adjustedX, adjustedY, 'size:', exitButton.w, exitButton.h);
      drawClickableButton(adjustedX, adjustedY, exitButton.w, exitButton.h, exitText, 'exit');
    }

    // Draw canvas controls for landscape mode
    drawCanvasControls();
    
    // Draw UI
    ctx.save();
    ctx.font = '18px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    if (quiz.completed) {
      ctx.fillText('🎉 مبروك! لقد أكملتِ جميع الأسئلة! 🎉', WORLD.width / 2, 28);
    } else {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouchDevice) {
        ctx.fillText('استخدم الـ JoyStick للتحرك — اضغطي 🔧 للتفاعل مع الكمبيوتر — اضغط 🚪 للخروج من المركبة', WORLD.width / 2, 28);
      } else {
        ctx.fillText('الأسهم للتحرك بحرية — اضغطي للعب — اضغطي للخروج من المركبة', WORLD.width / 2, 28);
      }
    }
    ctx.restore();
  }

  function drawInsideShipSceneWithoutPlayer() {
    // Draw animated background with parallax effect
    drawInsideShipBackground();
    
    // Computer table removed - computer is now floating
    
    // Draw computer (moves with background parallax + floating effect)
    if (isImageReady(assets.computer)) {
      ctx.drawImage(
        assets.computer, 
        insideShip.computerX + insideShip.backgroundX, 
        insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset, 
        insideShip.computerWidth, 
        insideShip.computerHeight
      );
    }
    
    // Note: No player drawing in this version - used during transition
    
    // Draw celebration if active
    if (celebration.active) {
      drawCelebration();
    }
    
    // Draw timer celebration if active
    if (timerCelebration.active) {
      drawTimerCelebration();
    }
    
    // Draw left gate
    drawGate(outsideShip.gateX, outsideShip.gateY, outsideShip.gateWidth, outsideShip.gateHeight);

    // Draw interaction prompt
    if (insideShip.showInteraction) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(insideShip.computerX + insideShip.backgroundX - 10, insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset - 30, insideShip.computerWidth + 20, 25);
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouchDevice) {
        ctx.fillText('اضغطي 🔧 للتفاعل', insideShip.computerX + insideShip.backgroundX + insideShip.computerWidth / 2, insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset - 10);
      } else {
        ctx.fillText('اضغطي للعب', insideShip.computerX + insideShip.backgroundX + insideShip.computerWidth / 2, insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset - 10);
      }
      ctx.restore();
    }

    // Draw canvas controls for landscape mode
    drawCanvasControls();
    
    // Draw UI
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, WORLD.width, 50);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    if (quiz.completed) {
      ctx.fillText('🎉 مبروك! لقد أكملت جميع الأسئلة! 🎉', WORLD.width / 2, 28);
    } else {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouchDevice) {
        ctx.fillText('استخدم الـ JoyStick للتحرك — اضغطي 🔧 للتفاعل مع الكمبيوتر — اضغط 🚪 للخروج من المركبة', WORLD.width / 2, 28);
      } else {
        ctx.fillText('الأسهم للتحرك بحرية — اضغطي للعب — اضغطي للخروج من المركبة', WORLD.width / 2, 28);
      }
    }
    ctx.restore();
  }

  function drawInsideShipEnvironmentOnly() {
    // Draw animated background with parallax effect
    drawInsideShipBackground();
    
    // Computer table removed - computer is now floating
    
    // Draw computer (moves with background parallax + floating effect)
    if (isImageReady(assets.computer)) {
      ctx.drawImage(
        assets.computer, 
        insideShip.computerX + insideShip.backgroundX, 
        insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset, 
        insideShip.computerWidth, 
        insideShip.computerHeight
      );
    }
    
    // Draw celebration if active
    if (celebration.active) {
      drawCelebration();
    }
    
    // Draw timer celebration if active
    if (timerCelebration.active) {
      drawTimerCelebration();
    }
    
    // Draw left gate
    drawGate(outsideShip.gateX, outsideShip.gateY, outsideShip.gateWidth, outsideShip.gateHeight);

    // Draw interaction prompt
    if (insideShip.showInteraction) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(insideShip.computerX + insideShip.backgroundX - 10, insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset - 30, insideShip.computerWidth + 20, 25);
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouchDevice) {
        ctx.fillText('اضغطي 🔧 للتفاعل', insideShip.computerX + insideShip.backgroundX + insideShip.computerWidth / 2, insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset - 10);
      } else {
        ctx.fillText('اضغطي للعب', insideShip.computerX + insideShip.backgroundX + insideShip.computerWidth / 2, insideShip.computerY + insideShip.backgroundY + insideShip.computerFloatOffset - 10);
      }
      ctx.restore();
    }

    // Draw canvas controls for landscape mode
    drawCanvasControls();
    
    // Draw UI
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, WORLD.width, 50);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    if (quiz.completed) {
      ctx.fillText('🎉 مبروك! لقد أكملت جميع الأسئلة! 🎉', WORLD.width / 2, 28);
    } else {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouchDevice) {
        ctx.fillText('استخدم الـ JoyStick للتحرك — اضغط 🔧 للتفاعل مع الكمبيوتر — اضغط 🚪 للخروج من المركبة', WORLD.width / 2, 28);
      } else {
        ctx.fillText('الأسهم للتحرك بحرية — اضغط للعب — اضغط للخروج من المركبة', WORLD.width / 2, 28);
      }
    }
    ctx.restore();
  }

  function drawOutsideShipEnvironmentOnly() {
    // Clear and draw space background
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    
    // Draw black background layer first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    drawStarsBackground();

    // Draw arrival beam first (behind ship)
    drawArrivalBeam();

    // Draw arriving ship if active
    if (outsideShip.shipArriving || outsideShip.shipArrivalBeamActive) {
      if (isImageReady(assets.ship)) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        // Flip ship horizontally when moving from right to left
        ctx.scale(-1, 1);
        ctx.drawImage(assets.ship, -(outsideShip.shipArrivalX + 200), outsideShip.shipArrivalY, 200, 120);
        ctx.restore();
      }
    } else {
      // Stationary ship near left
      if (isImageReady(assets.ship)) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        // Flip ship horizontally for stationary position
        ctx.scale(-1, 1);
        ctx.drawImage(assets.ship, -(outsideShip.shipX + 200), outsideShip.shipY, 200, 120);
        ctx.restore();
      }
    }

    // Gate
    drawGate(outsideShip.gateX, outsideShip.gateY, outsideShip.gateWidth, outsideShip.gateHeight);

    // Hazards
    for (const h of outsideShip.hazards) {
      ctx.fillStyle = h.color;
      ctx.beginPath();
      ctx.roundRect(h.x, h.y, h.width, h.height, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(h.x + h.width * 0.4, h.y + h.height * 0.55, Math.min(7, h.width * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }

    // Enter button
    enterButton.visible && drawButton(enterButton.x, enterButton.y, enterButton.w, enterButton.h, 'ادخل السفينة');

    // Draw timer celebration if active
    if (timerCelebration.active) {
      drawTimerCelebration();
    }

    // UI
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, WORLD.width, 50);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    
    const timeLeft = Math.max(0, outsideShip.survivalTime - outsideShip.survivalTimer);
    const timeText = `الوقت المتبقي: ${Math.floor(timeLeft / 60)}:${String(Math.floor(timeLeft % 60)).padStart(2, '0')}`;
    const difficultyText = `الصعوبة: ${outsideShip.difficultyMultiplier.toFixed(1)}x`;
    
    ctx.font = '16px Segoe UI, Roboto, Arial';
    ctx.fillStyle = timeLeft < 600 ? 'rgba(255,100,100,0.9)' : 'rgba(255,255,255,0.9)'; // Red if less than 10 seconds
    ctx.fillText(timeText, WORLD.width / 2, 80);
    ctx.fillText(difficultyText, WORLD.width / 2, 100);
    
    ctx.restore();

    if (gameOver) drawGameOver();
  }
  
  function drawInsideShipBackground() {
    if (!isImageReady(assets.background)) return;
    
    ctx.save();
    
    // Draw black background layer first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    // Apply fade in effect and dim the background
    ctx.globalAlpha = insideShip.fadeIn * 0.6; // Dim the background to 60% opacity
    
    // Calculate background dimensions
    const bgWidth = assets.background.naturalWidth;
    const bgHeight = assets.background.naturalHeight;
    
    // Scale to cover the entire screen while maintaining aspect ratio
    const scaleX = WORLD.width / bgWidth;
    const scaleY = WORLD.height / bgHeight;
    const scale = Math.max(scaleX, scaleY);
    
    const scaledWidth = bgWidth * scale;
    const scaledHeight = bgHeight * scale;
    
    // Center the background and apply parallax offset
    const centerX = (WORLD.width - scaledWidth) / 2;
    const centerY = (WORLD.height - scaledHeight) / 2;
    
    const drawX = centerX + insideShip.backgroundX;
    const drawY = centerY + insideShip.backgroundY;
    
    // Draw background image (dimmed)
    ctx.drawImage(
      assets.background,
      drawX,
      drawY,
      scaledWidth,
      scaledHeight
    );
    
    ctx.restore();
  }
  
  function drawInsideShipPlayer() {
    // Draw floating astronaut (no thrusters)
    const y = insideShip.playerY + insideShip.floatOffset;
    
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    
    // Scale up the player sprite for better visibility
    const scale = 3.5;
    const scaledWidth = player.width * scale;
    const scaledHeight = player.height * scale;
    const offsetX = (scaledWidth - player.width) / 2;
    const offsetY = (scaledHeight - player.height) / 2;
    
    // Use flyingAstronaut.png for astronaut inside ship
    if (isImageReady(assets.flyingAstronaut)) {
      if (player.facing === 'right') {
        // Flip the flying astronaut image when facing right
        ctx.scale(-1, 1);
        ctx.drawImage(
          assets.flyingAstronaut, 
          -(insideShip.playerX - offsetX + scaledWidth), 
          y - offsetY, 
          scaledWidth, 
          scaledHeight
        );
      } else {
        // Normal flying astronaut image when facing left
        ctx.drawImage(
          assets.flyingAstronaut, 
          insideShip.playerX - offsetX, 
          y - offsetY, 
          scaledWidth, 
          scaledHeight
        );
      }
    } else {
      // Fallback to regular player sprites
      const imageToUse = player.facing === 'left' ? assets.playerLeft : assets.playerRight;
      ctx.drawImage(
        imageToUse, 
        insideShip.playerX - offsetX, 
        y - offsetY, 
        scaledWidth, 
        scaledHeight
      );
    }
    
    ctx.restore();
  }
  
  function drawCelebration() {
    ctx.save();
    // Darken backdrop behind celebration
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    // Draw confetti particles
    for (const particle of celebration.particles) {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      
      // Draw colorful confetti squares
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
      
      ctx.restore();
    }
    
    // Draw celebration message
    const elapsed = performance.now() - celebration.startTime;
    const messageAlpha = Math.min(1, elapsed / 1000); // Fade in over 1 second
    
    ctx.save();
    ctx.globalAlpha = messageAlpha;
    ctx.font = 'bold 32px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('🎉 مبروك! 🎉', WORLD.width / 2, WORLD.height / 2 - 50);
    
    ctx.font = 'bold 24px Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('لقد أكملتِ جميع الأسئلة بنجاح!', WORLD.width / 2, WORLD.height / 2);
    
    ctx.font = '18px Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#feca57';
    ctx.fillText('أنتِ رائدة فضاء ذكية!', WORLD.width / 2, WORLD.height / 2 + 40);
    ctx.restore();
    
    ctx.restore();
  }

  function drawTimerCelebration() {
    ctx.save();
    // Darken backdrop behind celebration
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Draw confetti particles
    for (const particle of timerCelebration.particles) {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      
      // Draw colorful confetti squares
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
      
      ctx.restore();
    }
    
    // Draw colorful ribbons
    for (const ribbon of timerCelebration.ribbons) {
      ctx.save();
      ctx.translate(ribbon.x, ribbon.y);
      ctx.rotate(ribbon.rotation);
      ctx.fillStyle = ribbon.color;
      ctx.globalAlpha = 0.8;
      
      // Draw ribbon
      ctx.fillRect(-ribbon.width/2, -ribbon.height/2, ribbon.width, ribbon.height);
      ctx.restore();
    }
    
    // Draw celebration message
    const elapsed = performance.now() - timerCelebration.startTime;
    const messageAlpha = Math.min(1, elapsed / 1000); // Fade in over 1 second
    
    ctx.save();
    ctx.globalAlpha = messageAlpha;
    ctx.font = 'bold 36px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('🎊 مبروك! لقد نجحتِ في الصمود! 🎊', WORLD.width / 2, WORLD.height / 2 - 60);
    
    ctx.font = 'bold 28px Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('لقد صمدتِ لمدة 50 ثانية!', WORLD.width / 2, WORLD.height / 2 - 10);
    
    ctx.font = 'bold 20px Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('أنت رائد فضاء شجاعة!', WORLD.width / 2, WORLD.height / 2 + 30);
    
    ctx.font = '18px Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#feca57';
    ctx.restore();
    
    ctx.restore();
  }
  
  function drawQuizScene() {
    // Draw dimmed background using the ship background
    drawInsideShipBackground();
    
    // Add additional dark overlay for quiz
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.restore();
    
    // Check if quiz is completed
    if (quiz.currentQuestion >= quiz.questions.length) {
      drawQuizResults();
      return;
    }
    
    // Draw quiz interface - responsive sizing
    const quizBoxWidth = Math.min(750, WORLD.width - 50);
    const quizBoxHeight = Math.min(550, WORLD.height - 50);
    const quizBoxX = (WORLD.width - quizBoxWidth) / 2;
    const quizBoxY = (WORLD.height - quizBoxHeight) / 2;
    
    // Quiz box background
    ctx.save();
    ctx.fillStyle = 'rgba(40, 40, 60, 0.95)';
    ctx.fillRect(quizBoxX, quizBoxY, quizBoxWidth, quizBoxHeight);
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(quizBoxX, quizBoxY, quizBoxWidth, quizBoxHeight);
    ctx.restore();
    
    // Question counter
    ctx.save();
    ctx.font = '18px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(
      `السؤال ${quiz.currentQuestion + 1} / ${quiz.questions.length}`, 
      WORLD.width / 2, 
      quizBoxY + 40
    );
    ctx.restore();
    
    // Question text
    ctx.save();
    ctx.font = '20px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText(
      quiz.questions[quiz.currentQuestion].question, 
      WORLD.width / 2, 
      quizBoxY + 100
    );
    ctx.restore();
    
    // Answer buttons - responsive sizing
    const buttonWidth = Math.min(320, quizBoxWidth - 80); // Slightly wider buttons
    const buttonHeight = 55; // Slightly taller buttons
    const buttonSpacing = 25; // More spacing for better touch accuracy
    const startY = quizBoxY + 160;
    
    quiz.questions[quiz.currentQuestion].options.forEach((option, index) => {
      const buttonX = quizBoxX + (quizBoxWidth - buttonWidth) / 2;
      const buttonY = startY + index * (buttonHeight + buttonSpacing);
      
      // Button background - highlight selected answer
      ctx.save();
      if (quiz.selectedAnswer === option) {
        const isCorrect = option === quiz.questions[quiz.currentQuestion].answer;
        ctx.fillStyle = isCorrect ? 'rgba(100, 200, 100, 0.9)' : 'rgba(200, 100, 100, 0.9)';
        ctx.strokeStyle = isCorrect ? 'rgba(150, 255, 150, 1)' : 'rgba(255, 150, 150, 1)';
        ctx.lineWidth = 3;
      } else {
        // Check for hover effect (simplified - always show hover for better visibility)
        ctx.fillStyle = 'rgba(80, 100, 140, 0.9)';
        ctx.strokeStyle = 'rgba(120, 170, 255, 1)';
        ctx.lineWidth = 2;
      }
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
      ctx.restore();
      
      // Button text
      ctx.save();
      ctx.font = 'bold 16px Segoe UI, Roboto, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillText(option, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 6);
      ctx.restore();
    });
    
    // Show result message if answer selected
    if (quiz.selectedAnswer) {
      const isCorrect = quiz.selectedAnswer === quiz.questions[quiz.currentQuestion].answer;
      ctx.save();
      ctx.font = '18px Segoe UI, Roboto, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = isCorrect ? 'rgba(100, 255, 100, 0.9)' : 'rgba(255, 100, 100, 0.9)';
      ctx.fillText(
        isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة!', 
        WORLD.width / 2, 
        quizBoxY + quizBoxHeight - 60
      );
      ctx.restore();
    }
    
    // Score display
    ctx.save();
    ctx.font = '16px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`النقاط: ${quiz.score}`, WORLD.width / 2, quizBoxY + quizBoxHeight - 30);
    ctx.restore();
  }
  
  function drawQuizResults() {
    // Draw results screen
    const resultsBoxWidth = 500;
    const resultsBoxHeight = 300;
    const resultsBoxX = (WORLD.width - resultsBoxWidth) / 2;
    const resultsBoxY = (WORLD.height - resultsBoxHeight) / 2;
    
    // Results box background
    ctx.save();
    ctx.fillStyle = 'rgba(40, 40, 60, 0.95)';
    ctx.fillRect(resultsBoxX, resultsBoxY, resultsBoxWidth, resultsBoxHeight);
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(resultsBoxX, resultsBoxY, resultsBoxWidth, resultsBoxHeight);
    ctx.restore();
    
    // Results title
    ctx.save();
    ctx.font = 'bold 24px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText('نتائج الاختبار', WORLD.width / 2, resultsBoxY + 60);
    ctx.restore();
    
    // Final score
    ctx.save();
    ctx.font = '20px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(
      `النقاط النهائية: ${quiz.score} / ${quiz.questions.length}`, 
      WORLD.width / 2, 
      resultsBoxY + 120
    );
    ctx.restore();
    
    // Performance message
    const percentage = (quiz.score / quiz.questions.length) * 100;
    let message = '';
    let color = '';
    
    if (percentage >= 80) {
      message = 'ممتاز! لقد أبدعت في الاختبار!';
      color = 'rgba(100, 255, 100, 0.9)';
    } else if (percentage >= 60) {
      message = 'جيد جداً! يمكنك تحسين أدائك أكثر';
      color = 'rgba(255, 255, 100, 0.9)';
    } else {
      message = 'حاول مرة أخرى! التعلم يحتاج صبر';
      color = 'rgba(255, 150, 100, 0.9)';
    }
    
    ctx.save();
    ctx.font = '18px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(message, WORLD.width / 2, resultsBoxY + 180);
    ctx.restore();
    
    // Retry button
    if (quiz.canRetry) {
      const retryButtonX = resultsBoxX + 50;
      const retryButtonY = resultsBoxY + 200;
      const retryButtonW = 150;
      const retryButtonH = 40;
      
      // Draw retry button
      ctx.save();
      ctx.fillStyle = 'rgba(100, 150, 255, 0.8)';
      ctx.fillRect(retryButtonX, retryButtonY, retryButtonW, retryButtonH);
      ctx.strokeStyle = 'rgba(150, 200, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(retryButtonX, retryButtonY, retryButtonW, retryButtonH);
      
      // Button text
      ctx.font = '16px Segoe UI, Roboto, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('إعادة اللعب', retryButtonX + retryButtonW/2, retryButtonY + retryButtonH/2 + 6);
      ctx.restore();
    }
    
    // Return message
    ctx.save();
    ctx.font = '16px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('العودة إلى السفينة...', WORLD.width / 2, resultsBoxY + 260);
    ctx.restore();
  }

  function drawCinematicScene() {
    // Parallax stars background (subtle)
    drawStarsBackground();
    
    // Cinematic scene: draw Ship3 (Ship3.png) moving from top-right to bottom-left
    const baseW = 200;
    const baseH = 120;
    const w = baseW * cinematic.scale;
    const h = baseH * cinematic.scale;
    
    if (isImageReady(assets.ship2)) {
      ctx.drawImage(assets.ship2, cinematic.x, cinematic.y, w, h);
    }
    
    // Add some thruster particles for Ship3
    if (cinematic.moving) {
      spawnShip3ThrusterParticles();
    }
  }
  
  function drawOutsideShipScene() {
    // Clear and draw space background
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    
    // Draw black background layer first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    drawStarsBackground();

    // Draw arrival beam first (behind ship)
    drawArrivalBeam();

    // Draw rescue ship (always if active)
    drawRescueShip();
    
    // Draw arriving ship if active
    if (outsideShip.shipArriving || outsideShip.shipArrivalBeamActive) {
      if (isImageReady(assets.ship)) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        
        // Add floating effect for final stage
        const floatOffset = outsideShip.shipFire.floatOffset;
        const shipY = outsideShip.shipArrivalY + floatOffset;
        
        // Flip ship horizontally when moving from right to left
        ctx.scale(-1, 1);
        ctx.drawImage(assets.ship, -(outsideShip.shipArrivalX + 200), shipY, 200, 120);
        ctx.restore();
        
        // Draw ship fire effects
        drawShipFireEffects();
      }
    } else {
      // Stationary ship near left
      if (isImageReady(assets.ship)) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        
        // Add floating effect for final stage
        const floatOffset = outsideShip.shipFire.floatOffset;
        const shipY = outsideShip.shipY + floatOffset;
        
        // Flip ship horizontally for stationary position
        ctx.scale(-1, 1);
        ctx.drawImage(assets.ship, -(outsideShip.shipX + 200), shipY, 200, 120);
        ctx.restore();
        
        // Draw ship fire effects
        drawShipFireEffects();
      }
      
      // Draw rescue ship
      drawRescueShip();
    }

    // Gate
    drawGate(outsideShip.gateX, outsideShip.gateY, outsideShip.gateWidth, outsideShip.gateHeight);

    // Hazards
    for (const h of outsideShip.hazards) {
      ctx.fillStyle = h.color;
      ctx.beginPath();
      ctx.roundRect(h.x, h.y, h.width, h.height, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(h.x + h.width * 0.4, h.y + h.height * 0.55, Math.min(7, h.width * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player flames first (behind player)
    drawPlayerFlames();
    
    // Player
    drawPlayer();

    // Enter button
    enterButton.visible && drawButton(enterButton.x, enterButton.y, enterButton.w, enterButton.h, 'ادخل السفينة');

    // Draw timer celebration if active
    if (timerCelebration.active) {
      drawTimerCelebration();
    }
    
    // Draw victory celebration if active (during rescue ship boarding)
    if (victoryCelebration.active) {
      console.log('Drawing victory celebration in outside ship scene!');
      drawVictoryCelebration();
    }

    // UI
    ctx.save();
    ctx.font = '18px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    if (outsideShip.shipArriving || outsideShip.shipArrivalBeamActive) {
      ctx.fillText('اصمدي لأطول وقت ممكن ستأتي مركبة الإنقاذ', WORLD.width / 2, 28);
    } else {
      ctx.fillText('خارج المركبة — تجنبي الأجرام وعد عبر البوابة', WORLD.width / 2, 28);
    }
    
    // Display survival timer
    const timeLeft = Math.max(0, outsideShip.maxSurvivalTime - outsideShip.survivalTimer);
    const minutes = Math.floor(timeLeft / 3600);
    const seconds = Math.floor((timeLeft % 3600) / 60);
    const timeText = `الوقت المتبقي: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    const difficultyText = `الصعوبة: ${outsideShip.difficultyMultiplier.toFixed(1)}x`;
    
    ctx.font = '16px Segoe UI, Roboto, Arial';
    ctx.fillStyle = timeLeft < 600 ? 'rgba(255,100,100,0.9)' : 'rgba(255,255,255,0.9)'; // Red if less than 10 seconds
    ctx.fillText(timeText, WORLD.width / 2, 80);
    ctx.fillText(difficultyText, WORLD.width / 2, 100);
    
    // Show fire warning when ship fire is active
    if (outsideShip.shipFire.intensity > 0.1) {
      ctx.font = 'bold 18px Segoe UI, Roboto, Arial';
      ctx.fillStyle = 'rgba(255,100,0,0.9)';
      ctx.fillText('المركبة متعطلة  ', WORLD.width / 2, 120);
    }
    
    // Show rescue message
    if (rescueMessage.visible) {
      ctx.font = 'bold 20px Segoe UI, Roboto, Arial';
      ctx.fillStyle = 'rgba(0,255,255,0.9)';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      
      const messageY = WORLD.height / 2 + 50;
      ctx.strokeText(rescueMessage.text, WORLD.width / 2, messageY);
      ctx.fillText(rescueMessage.text, WORLD.width / 2, messageY);
    }
    
    ctx.restore();

    if (gameOver) drawGameOver();
  }

  function drawOutsideShipSceneWithoutPlayer() {
    // Clear and draw space background
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    
    // Draw black background layer first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    drawStarsBackground();

    // Draw arrival beam first (behind ship)
    drawArrivalBeam();

    // Draw rescue ship (always if active)
    drawRescueShip();

    // Draw arriving ship if active
    if (outsideShip.shipArriving || outsideShip.shipArrivalBeamActive) {
      if (isImageReady(assets.ship)) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        // Flip ship horizontally when moving from right to left
        ctx.scale(-1, 1);
        ctx.drawImage(assets.ship, -(outsideShip.shipArrivalX + 200), outsideShip.shipArrivalY, 200, 120);
        ctx.restore();
      }
    } else {
      // Stationary ship near left
      if (isImageReady(assets.ship)) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        // Flip ship horizontally for stationary position
        ctx.scale(-1, 1);
        ctx.drawImage(assets.ship, -(outsideShip.shipX + 200), outsideShip.shipY, 200, 120);
        ctx.restore();
      }
    }

    // Gate
    drawGate(outsideShip.gateX, outsideShip.gateY, outsideShip.gateWidth, outsideShip.gateHeight);

    // Hazards
    for (const h of outsideShip.hazards) {
      ctx.fillStyle = h.color;
      ctx.beginPath();
      ctx.roundRect(h.x, h.y, h.width, h.height, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(h.x + h.width * 0.4, h.y + h.height * 0.55, Math.min(7, h.width * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }

    // Note: No player drawing in this version - used during transition
  }

  function drawGate(x, y, w, h) {
    ctx.save();
    const grad = ctx.createLinearGradient(x - 20, y, x + w + 20, y);
    grad.addColorStop(0, 'rgba(80,160,255,0)');
    grad.addColorStop(0.5, 'rgba(80,160,255,0.35)');
    grad.addColorStop(1, 'rgba(80,160,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 16, y - 8, w + 32, h + 16);

    ctx.strokeStyle = 'rgba(120,200,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.stroke();

    const inner = ctx.createLinearGradient(x, y, x + w, y + h);
    inner.addColorStop(0, 'rgba(120,200,255,0.2)');
    inner.addColorStop(1, 'rgba(120,200,255,0.06)');
    ctx.fillStyle = inner;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.restore();
  }

  function drawExitArrow() {
    // This function is now empty - arrow removed
  }

  function drawButton(x, y, w, h, label) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.font = '16px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(label, x + w / 2, y + h / 2 + 6);
    ctx.restore();
  }
  
  function drawClickableButton(x, y, w, h, label, bubbleType) {
    // Store button position for click detection
    if (bubbleType) {
      speechBubbles[bubbleType] = { x, y, w, h, visible: true, text: label };
      console.log('Updated speech bubble for', bubbleType, 'at:', x, y, 'size:', w, h);
    }
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.font = '16px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(label, x + w / 2, y + h / 2 + 6);
    ctx.restore();
  }
  
  function drawCanvasControls() {
    // Only show in landscape mode on iPad
    const isLandscape = window.innerWidth > window.innerHeight;
    const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (!isLandscape || !isIPad) return;
    
    ctx.save();
    
    // Draw joystick area (LEFT side)
    const joystickX = 20;
    const joystickY = WORLD.height - 120;
    const joystickSize = 100;
    
    canvasControls.joystick = { x: joystickX, y: joystickY, w: joystickSize, h: joystickSize, visible: true };
    
    // Joystick base
    ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.beginPath();
    ctx.arc(joystickX + joystickSize/2, joystickY + joystickSize/2, joystickSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Joystick border
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Joystick knob
    const knobX = joystickX + joystickSize/2;
    const knobY = joystickY + joystickSize/2;
    const knobRadius = 20;
    
    ctx.fillStyle = 'rgba(200, 200, 200, 0.9)';
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(100, 100, 100, 1)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw action buttons (RIGHT side)
    const buttonY = WORLD.height - 120;
    const buttonWidth = 80;
    const buttonHeight = 40;
    const buttonSpacing = 50;
    
    // Interact button (right side)
    const interactX = WORLD.width - 100;
    canvasControls.interactButton = { x: interactX, y: buttonY, w: buttonWidth, h: buttonHeight, visible: true };
    
    ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.fillRect(interactX, buttonY, buttonWidth, buttonHeight);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(interactX, buttonY, buttonWidth, buttonHeight);
    
    ctx.font = '14px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText('🎮 لعب', interactX + buttonWidth/2, buttonY + buttonHeight/2 + 5);
    
    // Exit button (right side, below interact)
    const exitX = WORLD.width - 100;
    const exitY = buttonY + buttonSpacing;
    canvasControls.exitButton = { x: exitX, y: exitY, w: buttonWidth, h: buttonHeight, visible: true };
    
    ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.fillRect(exitX, exitY, buttonWidth, buttonHeight);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(exitX, exitY, buttonWidth, buttonHeight);
    
    ctx.font = '14px Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText('🚪 خروج', exitX + buttonWidth/2, exitY + buttonHeight/2 + 5);
    
    ctx.restore();
  }

  function drawMainScene() {
    // Clear any previous content
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    
    // Draw black background layer first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    
    // Parallax stars background (subtle)
    drawStarsBackground();

    // Beam should be below the ship as the first layer above background
    drawBeam();

    // Entities
    drawShip();
    drawParticles();
    // Blue flames must be under the astronaut
    drawPlayerFlames();
    drawPlayer();
    drawObstacles();
    drawUI();

    if (gameOver) drawGameOver();
  }

  // Simple dynamic stars for extra depth
  const stars = Array.from({ length: 100 }).map(() => ({
    x: Math.random() * WORLD.width,
    y: Math.random() * WORLD.height,
    r: Math.random() * 1.6 + 0.3,
    tw: Math.random() * Math.PI * 2,
    sp: 0.002 + Math.random() * 0.004,
    vx: -0.12 - Math.random() * 0.18, // faster wind motion
    vy: 0.05 + Math.random() * 0.08,
  }));

  let windTime = 0;
  const STAR_SPEED = 2.6; // global multiplier for star drift speed

  function drawStarsBackground() {
    ctx.save();
    for (const s of stars) {
      s.tw += s.sp;
      // move with wind and wrap (faster)
      s.x += s.vx * STAR_SPEED;
      s.y += s.vy * STAR_SPEED;
      if (s.x < -2) s.x = WORLD.width + 2;
      if (s.x > WORLD.width + 2) s.x = -2;
      if (s.y > WORLD.height + 2) s.y = -2;
      if (s.y < -2) s.y = WORLD.height + 2;
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(s.tw));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // soft moving air wisps
    windTime += 0.012; // slightly faster wisps
    ctx.globalCompositeOperation = 'screen';
    const w = WORLD.width;
    const h = WORLD.height;
    for (let i = 0; i < 3; i++) {
      const offset = ((windTime * (20 + i * 8)) % (h + 120)) - 60;
      const grad = ctx.createLinearGradient(0, offset, w, offset + 120);
      grad.addColorStop(0, 'rgba(80,120,200,0.00)');
      grad.addColorStop(0.5, 'rgba(120,170,240,0.06)');
      grad.addColorStop(1, 'rgba(180,220,255,0.00)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.rect(-20, offset - 20, w + 40, 120);
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------
  // Main Loop
  // ------------------------------
  
  
  function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    
    if (deltaTime >= frameInterval) {
      update();
      draw();
      lastTime = currentTime - (deltaTime % frameInterval);
    }
    
    requestAnimationFrame(gameLoop);
  }

  function initializeGatePosition() {
    // Calculate gate position based on background image dimensions
    const bgWidth = assets.background.naturalWidth;
    const bgHeight = assets.background.naturalHeight;
    const scaleX = WORLD.width / bgWidth;
    const scaleY = WORLD.height / bgHeight;
    const scale = Math.max(scaleX, scaleY);
    const scaledWidth = bgWidth * scale;
    const scaledHeight = bgHeight * scale;
    const centerX = (WORLD.width - scaledWidth) / 2;
    const centerY = (WORLD.height - scaledHeight) / 2;
    
    // Set gate position to right edge of background image
    outsideShip.gateX = centerX + scaledWidth - outsideShip.gateWidth;
    outsideShip.gateY = centerY + scaledHeight / 2 - outsideShip.gateHeight / 2;
  }

  function restartGame() {
    console.log('restartGame() called - starting game restart...');
    
    // Reset all game states
    currentScene = 'outside_ship';
    gameOver = false;
    gameWin = false;
    obstacleTimer = 0;
    winAt = 0;
    
    // Start Samud music for survival stage
    startSamudMusic();
    
    console.log('Game states reset:', { currentScene, gameOver, gameWin });
    
    // Reset player
    player.x = 50;
    player.y = WORLD.height / 2 - player.height / 2;
    player.alpha = 1;
    player.speed = 3;
    player.captured = false;
    
    // Reset outside ship state
    outsideShip.hazards.length = 0;
    outsideShip.spawnTimer = 0;
    outsideShip.survivalTimer = 0;
    outsideShip.difficultyMultiplier = 1.0;
    outsideShip.shipArriving = false;
    outsideShip.shipArrivalX = WORLD.width + 50;
    outsideShip.shipMoving = false;
    outsideShip.justExited = false;
    outsideShip.shipArrivalBeamActive = false;
    
    // Reset inside ship state
    insideShip.playerX = WORLD.width / 2 - player.width / 2;
    insideShip.backgroundX = 0;
    insideShip.backgroundY = 0;
    insideShip.computerFloatOffset = 0;
    insideShip.computerFloatT = 0;
    
    // Reset flying scene
    flyingScene.shipScale = 0.1;
    flyingScene.scaleComplete = false;
    flyingScene.continuousScaling = false;
    flyingScene.beamActive = false;
    flyingScene.fadeIn = 0;
    
    // Reset quiz
    quiz.active = false;
    quiz.completed = false;
    quiz.canRetry = false;
    quiz.selectedAnswer = null;
    quiz.showResult = false;
    quiz.questions.length = 0;
    
    // Reset celebrations
    celebration.active = false;
    celebration.particles = [];
    timerCelebration.active = false;
    timerCelebration.particles = [];
    
    // Reset particles
    particles.length = 0;
    playerFlames.length = 0;
    
    // Reset cinematic
    cinematic.active = false;
    cinematic.phase = 0;
    cinematic.timer = 0;
    
    // Reset ship state
    ship.isDocked = false;
    ship.departing = false;
    ship.speed = 0;
    ship.floatOffset = 0;
    
    // Reset obstacles
    obstacles.length = 0;
    
    // Action buttons are now handled by direct events
    
    // Reset joystick
    resetJoystick();
    joystickActive = false;
    
    // Reinitialize gate position
    initializeGatePosition();
    
    // Restart music if it was stopped
    if (musicAudio && musicAudio.paused) {
      startMusic();
    }
    
    console.log('Game restarted!');
  }

  function startGame() {
    // Initialize gate position
    initializeGatePosition();
    // Initialize audio system
    initAudio();
    startMusic(); 
    // Kick off loop
    requestAnimationFrame(gameLoop);
  }

  function drawExitConfirmationDialog() {
    // Draw semi-transparent overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.restore();

    // Draw dialog box
    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.fillRect(exitConfirmation.x, exitConfirmation.y, exitConfirmation.width, exitConfirmation.height);
    ctx.strokeRect(exitConfirmation.x, exitConfirmation.y, exitConfirmation.width, exitConfirmation.height);
    ctx.restore();

    // Draw title
    ctx.save();
    ctx.fillStyle = 'rgba(255, 100, 100, 1)';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ تحذير! ⚠️', exitConfirmation.x + exitConfirmation.width / 2, exitConfirmation.y + 35);
    ctx.restore();

    // Draw warning message
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('هل أنتِ متأكدة من الخروج من المركبة؟', exitConfirmation.x + exitConfirmation.width / 2, exitConfirmation.y + 65);
    ctx.fillText('هذه ستكون المرحلة الأخيرة - الصمود لأطول وقت ممكن!', exitConfirmation.x + exitConfirmation.width / 2, exitConfirmation.y + 90);
    ctx.fillText('إذا خرجت، لن تتمكني من العودة!', exitConfirmation.x + exitConfirmation.width / 2, exitConfirmation.y + 115);
    ctx.restore();

    // Draw Yes button
    ctx.save();
    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.strokeStyle = 'rgba(255, 150, 150, 1)';
    ctx.lineWidth = 2;
    ctx.fillRect(exitConfirmation.yesButton.x, exitConfirmation.yesButton.y, exitConfirmation.yesButton.width, exitConfirmation.yesButton.height);
    ctx.strokeRect(exitConfirmation.yesButton.x, exitConfirmation.yesButton.y, exitConfirmation.yesButton.width, exitConfirmation.yesButton.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(exitConfirmation.yesButton.text, exitConfirmation.yesButton.x + exitConfirmation.yesButton.width / 2, exitConfirmation.yesButton.y + 20);
    ctx.restore();

    // Draw No button
    ctx.save();
    ctx.fillStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.strokeStyle = 'rgba(150, 200, 255, 1)';
    ctx.lineWidth = 2;
    ctx.fillRect(exitConfirmation.noButton.x, exitConfirmation.noButton.y, exitConfirmation.noButton.width, exitConfirmation.noButton.height);
    ctx.strokeRect(exitConfirmation.noButton.x, exitConfirmation.noButton.y, exitConfirmation.noButton.width, exitConfirmation.noButton.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(exitConfirmation.noButton.text, exitConfirmation.noButton.x + exitConfirmation.noButton.width / 2, exitConfirmation.noButton.y + 20);
    ctx.restore();
  }
})();

// Force show controls on page load
setTimeout(() => {
  forceShowTouchControls();
}, 500);
