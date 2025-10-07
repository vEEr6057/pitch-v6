"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

interface SpeechRecognitionProps {
  onTranscript: (text: string) => void;
}

// TypeScript interface for the browser's SpeechRecognition API
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  onstart: () => void;
}

// Global speech recognition constructor interfaces
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export default function SpeechRecognition({ onTranscript }: SpeechRecognitionProps) {
  // States for UI and functionality
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  // Refs for persisting values across renders without triggering re-renders
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const finalTranscriptRef = useRef<string>("");
  
  // Initialize speech recognition once on component mount
  useEffect(() => {
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognitionAPI = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setBrowserSupported(false);
      setErrorMessage("Speech recognition is not supported in your browser. Try Chrome, Edge, or Brave.");
      return;
    }
    
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      // Configure recognition event handlers
      recognition.onstart = () => {
        console.log("Recognition started successfully");
        setIsListening(true);
        isListeningRef.current = true;
        setErrorMessage(null);
      };
      
      recognition.onresult = (event) => {
        console.log("Speech result received, event.results.length:", event.results.length, "resultIndex:", event.resultIndex);
        setDebugInfo(`Received ${event.results.length} results`);
        
        let interimTranscript = '';
        
        // Only process NEW results starting from event.resultIndex
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;
          
          console.log(`Result ${i}: "${transcriptText}", isFinal: ${result.isFinal}`);
          
          if (result.isFinal) {
            // Add final results to our accumulated transcript
            finalTranscriptRef.current += transcriptText + ' ';
            console.log("Added to final transcript:", transcriptText);
          } else {
            // Interim results are temporary and get replaced
            interimTranscript += transcriptText;
            console.log("Added to interim transcript:", transcriptText);
          }
        }
        
        // Combine final + current interim results
        const fullText = (finalTranscriptRef.current + interimTranscript).trim();
        console.log("Full transcript:", fullText);
        
        setTranscript(fullText);
        onTranscript(fullText);
        setDebugInfo(`Transcribed: ${fullText.length} characters`);
      };
      
      recognition.onerror = (event) => {
        console.error("Recognition error:", event.error);
        
        if (event.error === 'not-allowed') {
          setErrorMessage("Microphone access denied. Please enable microphone access to use speech recognition.");
        } else {
          setErrorMessage(`Error: ${event.error}. Please try again.`);
        }
        
        setIsListening(false);
        isListeningRef.current = false;
      };
      
      recognition.onend = () => {
        console.log("Recognition ended, isListening:", isListeningRef.current);
        
        // Only try to restart if we're still supposed to be listening
        if (isListeningRef.current) {
          try {
            // Small timeout to prevent rapid restarts
            setTimeout(() => {
              if (isListeningRef.current) {
                recognition.start();
                console.log("Recognition restarted automatically");
              }
            }, 200);
          } catch (error) {
            console.error("Failed to restart recognition:", error);
            setErrorMessage("Recognition stopped unexpectedly. Please try again.");
            setIsListening(false);
            isListeningRef.current = false;
          }
        } else {
          setIsListening(false);
        }
      };
      
      recognitionRef.current = recognition;
      
    } catch (error) {
      console.error("Error setting up speech recognition:", error);
      setBrowserSupported(false);
      setErrorMessage("Failed to initialize speech recognition.");
    }
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          isListeningRef.current = false;
          recognitionRef.current.onend = null; // Remove the event handler to prevent auto-restart
          recognitionRef.current.abort();
        } catch (error) {
          console.error("Error cleaning up recognition:", error);
        }
      }
    };
  }, []); // Empty dependency array means this runs once on mount
  
  // Reset transcript and start fresh
  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    onTranscript('');
    setDebugInfo('');
  }, [onTranscript]);
  
  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      setErrorMessage("Speech recognition is not available in your browser.");
      return;
    }
    
    if (isListening) {
      // Stop listening
      isListeningRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
      setIsListening(false);
    } else {
      // Start listening
      resetTranscript(); // Reset transcript when starting a new session
      setErrorMessage(null);
      isListeningRef.current = true;
      
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        setErrorMessage("Error starting speech recognition. Please try again.");
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  }, [isListening, resetTranscript]);

  return (
    <div className="space-y-3">
      <div className="flex flex-row items-center gap-3 flex-wrap">
        <Button 
          onClick={toggleListening}
          disabled={!browserSupported}
          variant={isListening ? "destructive" : "default"}
          className={isListening ? "animate-pulse" : ""}
        >
          {isListening ? "Stop Recording" : "Start Recording"}
        </Button>
        
        <Button 
          onClick={resetTranscript}
          variant="outline"
          size="sm"
          disabled={!transcript || isListening}
        >
          Clear Text
        </Button>
        
        <span className={`text-sm ${isListening ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
          {isListening 
            ? "Recording in progress... Speech will be captured continuously until you stop." 
            : "Click Start Recording to begin capturing speech"
          }
        </span>
      </div>
      
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      
      {!browserSupported && (
        <p className="text-sm bg-amber-50 text-amber-800 p-2 rounded">
          <span className="font-medium">Browser compatibility issue:</span> For best results, use Chrome, Edge, or Brave browsers.
        </p>
      )}
      
      {isListening && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm">
          <div className="flex items-start">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-ping mt-1.5 mr-2" />
            <div className="text-green-800">
              <p className="font-medium mb-1">Recording Active</p>
              <p>Speak clearly at a normal pace. Your speech is being transcribed continuously.</p>
              <p className="mt-1 text-green-700">Continue speaking until you've completed your pitch, then press Stop.</p>
              {debugInfo && (
                <p className="mt-2 text-xs text-green-600 font-mono">Debug: {debugInfo}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {transcript && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
          <p className="font-medium text-blue-800 mb-1">Current Transcript:</p>
          <p className="text-blue-700">{transcript}</p>
        </div>
      )}
    </div>
  );
}