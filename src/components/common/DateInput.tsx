import React, { useState, useEffect } from 'react';

interface DateInputProps {
  value?: Date;
  onChange: (value: Date) => void;
}

function DateInputComponent({ value, onChange }: DateInputProps) {
  const [internalDate, setInternalDate] = useState('');

  // Sync internal state with external value prop
  useEffect(() => {
    if (value) {
      const formatted = `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}/${value.getFullYear()}`;
      if (formatted !== internalDate) {
        setInternalDate(formatted);
      }
    }
  }, [value]);

  const formatDateInput = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    let formatted = '';
    
    // Handle month (positions 0-1)
    if (numbers.length >= 1) {
      const firstDigit = numbers[0];
      
      // If first digit is 2-9, auto-pad with 0
      if (parseInt(firstDigit) >= 2) {
        formatted = `0${firstDigit}`;
        
        // Add day if more numbers exist
        if (numbers.length >= 2) {
          formatted += '/';
          const month = parseInt(formatted.slice(0, 2));
          formatted += formatDay(numbers.slice(1), month);
        }
      } else {
        // First digit is 0 or 1
        if (numbers.length >= 2) {
          formatted = numbers.slice(0, 2);
          
          // Add day if more numbers exist
          if (numbers.length >= 3) {
            formatted += '/';
            const month = parseInt(formatted);
            formatted += formatDay(numbers.slice(2), month);
          }
        } else {
          formatted = firstDigit;
        }
      }
    }
    
    return formatted;
  };

  const formatDay = (dayNumbers: string, month: number) => {
    if (dayNumbers.length === 0) return '';
    
    const firstDigit = dayNumbers[0];
    const maxDay = getMaxDayInMonth(month);
    
    // If first digit is 4-9, auto-pad with 0
    if (parseInt(firstDigit) >= 4) {
      let result = `0${firstDigit}`;
      
      // Add year if more numbers exist
      if (dayNumbers.length >= 2) {
        result += '/' + dayNumbers.slice(1, 5);
      }
      return result;
    }
    
    // First digit is 0-3
    if (dayNumbers.length >= 2) {
      const twoDigitDay = parseInt(dayNumbers.slice(0, 2));
      
      // If two-digit day exceeds max for month, auto-pad first digit
      if (twoDigitDay > maxDay || (firstDigit === '0' && dayNumbers[1] === '0')) {
        let result = `0${firstDigit}`;
        if (dayNumbers.length >= 2) {
          result += '/' + dayNumbers.slice(1, 5);
        }
        return result;
      }
      
      let result = dayNumbers.slice(0, 2);
      if (dayNumbers.length >= 3) {
        result += '/' + dayNumbers.slice(2, 6);
      }
      return result;
    }
    
    return firstDigit;
  };

  const getMaxDayInMonth = (month: number) => {
    if ([4, 6, 9, 11].includes(month)) return 30;
    if (month === 2) return 29; // Allow 29 for leap year checking later
    return 31;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setInternalDate(formatted);
    
    // Convert to Date object only if valid and complete
    if (formatted.length === 10) {
      const [month, day, year] = formatted.split('/').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      // Validate the date
      if (dateObj.getMonth() === month - 1 && dateObj.getDate() === day) {
        onChange(dateObj);
      }
    }
  };

  const handleBlur = () => {
    // If date is invalid or incomplete, revert to original value
    if (!isValid) {
      if (value) {
        const formatted = `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}/${value.getFullYear()}`;
        setInternalDate(formatted);
      } else {
        setInternalDate('');
      }
    }
  };

  const validateDate = () => {
    if (internalDate.length !== 10) return false;
    
    const [month, day, year] = internalDate.split('/').map(Number);
    
    // Basic validation
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1000 || year > 9999) return false;
    
    // Check if date is valid
    const dateObj = new Date(year, month - 1, day);
    return dateObj.getMonth() === month - 1 && dateObj.getDate() === day;
  };

  const isValid = internalDate.length === 10 && validateDate();

  return (
    <>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Enter Date (MM/DD/YYYY)
      </label>
      <input
        type="text"
        value={internalDate}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="MM/DD/YYYY"
        maxLength={10}
        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
          internalDate.length === 0
            ? 'border-gray-300 focus:ring-blue-500'
            : isValid
            ? 'border-green-500 focus:ring-green-500'
            : 'border-red-500 focus:ring-red-500'
        }`}
      />
      
      {internalDate.length > 0 && (
        <p className={`mt-2 text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
          {isValid ? '✓ Valid date' : '✗ Invalid date'}
        </p>
      )}
    </>
  );
}

export default function DateInput() {
  const [date, setDate] = useState<Date>();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Date Input</h2>
        
        <div className="mb-4">
          <DateInputComponent value={date} onChange={setDate} />
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600 mb-2">
            <strong>How it works:</strong>
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Month: 2-9 → auto-pads to 02-09</li>
            <li>• Day: 4-9 → auto-pads to 04-09</li>
            <li>• Day: Respects month limits (30/31/28/29)</li>
            <li>• onChange only fires when date is complete & valid</li>
          </ul>
          
          <p className="text-sm text-gray-600 mt-4">
            <strong>Current value:</strong> {date ? date.toISOString() : 'None (incomplete or invalid)'}
          </p>
          {date && (
            <p className="text-sm text-gray-600 mt-2">
              <strong>Parsed:</strong> {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setDate(new Date(2025, 11, 25))}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Set to 12/25/2025
          </button>
        </div>
      </div>
    </div>
  );
}