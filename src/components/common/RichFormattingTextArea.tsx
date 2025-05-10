import { useState, useRef, useEffect } from 'react';

// Component that implements inline formatting within the text input field
export default function InlineFormattedInput() {
  const [inputText, setInputText] = useState('Try typing *bold text* or _italic text_ or #highlighted text# or ~underlined text~');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const displayRef = useRef<HTMLDivElement | null>(null);
  
  // Sync scrolling between the invisible input and the formatted display
  useEffect(() => {
    const syncScroll = () => {
      if (displayRef.current && inputRef.current) {
        displayRef.current.scrollTop = inputRef.current.scrollTop;
        displayRef.current.scrollLeft = inputRef.current.scrollLeft;
      }
    };
    
    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('scroll', syncScroll);
      return () => inputElement.removeEventListener('scroll', syncScroll);
    }
  }, []);
  
  // Process text for formatting
  const getFormattedSections = () => {
    if (!inputText) return [];
    
    const parts = [];
    
    // Define all regex patterns for different formatting styles
    const patterns = [
      { regex: /\*(.*?)\*/g, className: "font-bold" },
      { regex: /_(.*?)_/g, className: "italic" },
      { regex: /#(.*?)#/g, className: "bg-yellow-200 rounded" },
      { regex: /~(.*?)~/g, className: "underline" }
    ];
    
    // Collect all matches from each regex
    const allMatches: {
      start: number,
      end: number,
      fullMatch: string,
      innerText: string,
      className: string
    }[] = [];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(inputText)) !== null) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          fullMatch: match[0],
          innerText: match[1],
          className: pattern.className
        });
      }
    });
    
    // Sort matches by start position
    allMatches.sort((a, b) => a.start - b.start);
    
    // Build the result by adding plain text and formatted sections
    let lastEnd = 0;
    
    for (const match of allMatches) {
      // Add plain text before the match
      if (match.start > lastEnd) {
        parts.push(
          <span key={`plain-${lastEnd}`} className="whitespace-pre-wrap">
            {inputText.substring(lastEnd, match.start)}
          </span>
        );
      }
      
      // Add the formatted text (but still show the markers)
      parts.push(
        <span key={`formatted-${match.start}`} className={match.className}>
          {match.fullMatch}
        </span>
      );
      
      lastEnd = match.end;
    }
    
    // Add any remaining plain text
    if (lastEnd < inputText.length) {
      parts.push(
        <span key={`plain-end`} className="whitespace-pre-wrap">
          {inputText.substring(lastEnd)}
        </span>
      );
    }
    
    return parts;
  };

  const handleFocus = () => {
    // Set cursor position when clicking on the formatted display
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Inline Formatted Input</h2>
      
      <div className="relative mb-4 border border-gray-300 rounded-md">
        {/* The actual editable textarea (transparent, on top) */}
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="absolute inset-0 w-full h-full p-3 bg-transparent z-10 resize-none font-mono text-transparent caret-gray-900"
          rows={5}
          spellCheck="false"
        />
        
        {/* Formatted display (non-editable, behind the textarea) */}
        <div 
          ref={displayRef}
          className="w-full p-3 whitespace-pre-wrap font-mono min-h-[120px] overflow-auto"
          onClick={handleFocus}
        >
          {getFormattedSections()}
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mt-1">
        Use *text* for bold, _text_ for italic, #text# for highlight, ~text~ for underline
      </p>
    </div>
  );
}