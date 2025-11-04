import React, { useState, useEffect } from 'react';

interface DateInputProps {
  value?: Date;
  onChange: (value: Date) => void;
}

export function DateInput({ value, onChange }: DateInputProps) {
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
      <input
        type="text"
        value={internalDate}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="MM/DD/YYYY"
        maxLength={10}
        className='font-thin py-1 px-2 text-xs ring-transparent border rounded-md focus:outline-none placeholder:text-gray-400 placeholder:italic max-w-[100px]'
      />
    </>
  );
}