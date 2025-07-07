import { useState } from "react"
import { currentDate, defaultColumnColors } from "../../utils"
import { UserTag } from "../../types"
import { HiOutlineCalendar, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2'

interface CustomDatePickerProps {
  selectDate: (date: Date | null) => void
  selectedDate?: Date
  tags: UserTag[]
}

export const CustomDatePicker = (props: CustomDatePickerProps) => {
  const [activeDate, setActiveDate] = useState(props.selectedDate ?? currentDate)
  const [isOpen, setIsOpen] = useState(false)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString("en-us")
  };

  const formatDisplayDate = (date?: Date) => {
    if(!date) return 'Select a Date'
    return date.toLocaleDateString('en-us', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const navigateMonth = (direction: 1 | -1) => {
    const newDate = new Date(activeDate)
    newDate.setMonth(activeDate.getMonth() + direction)

    setActiveDate(newDate)
  }

  const handleDateClick = (date?: Date) => {
    if(!date || formatDate(date) === formatDate(activeDate)) {
      props.selectDate(null)
      setIsOpen(false)
      return
    }

    setActiveDate(date)
    setIsOpen(false)
    props.selectDate(date)
  }

  

  const getDateClassName = (date?: Date) => {
    if(!date) return ''

    const dateKey = formatDate(date)
    //do something custom if there are more than one tag on a date otherwise display the ascociation
    const taggedDate = props.tags.reduce((prev, cur) => {
      if(cur.timeslots?.some((timeslot) => formatDate(timeslot.start) === dateKey)) {
        prev.push(cur)
      }
      return prev
    }, [] as UserTag[])
    const customDate: [UserTag | null, Date] | undefined = taggedDate.length > 0 ? [taggedDate.length > 1 ? null : taggedDate[0], date] : undefined
    const isSelected = formatDate(props.selectedDate ?? activeDate) === formatDate(date) 
    const isToday = formatDate(date) === formatDate(currentDate)

    let className = 'w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-all duration-200 cursor-pointer '

    if(customDate !== undefined) {
      if(customDate[0] === null || customDate[0] === undefined || !customDate[0].color) {
        className += ' bg-gray-400 hover:bg-gray-200'
      }
      else if(customDate[0].color){
        className += ` text-${defaultColumnColors[customDate[0].color].text} bg-${defaultColumnColors[customDate[0].color].bg} ${defaultColumnColors[customDate[0].color].hover}`
      }
    }
    if(isSelected) {
      className += ` font-extrabold bg-gray-100 ${!isToday ? 'border-2 border-gray-300' : ''}`
    }
    if(isToday) {
      className += ' border-2 border-blue-200'
    }
    if(!className.includes('hover')) {
      className += ' hover:bg-gray-200'
    }

    return className
  }

  const getDateTitle = (date?: Date) => {
    if(!date) return ''
    const dateKey = formatDate(date)
    const taggedDate = props.tags.reduce((prev, cur) => {
      if(cur.timeslots?.some((timeslot) => formatDate(timeslot.start) === dateKey)) {
        prev.push(cur)
      }
      return prev
    }, [] as UserTag[])
    
    const customDate: [UserTag | null, Date] | undefined = taggedDate.length > 0 ? [taggedDate.length > 1 ? null : taggedDate[0], date] : undefined
    
    return customDate !== undefined ? customDate[0] == null ? 'Multiple Tags: ' + dateKey : `${customDate[0].name}: ${dateKey}` : dateKey
  }

  const days = getDaysInMonth(activeDate)

  return (
    <div className="relative">
      <button
        className="w-full px-4 py-2 border rounded-lg cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className='text-gray-900'>
          {formatDisplayDate(props.selectedDate ?? activeDate)}
        </span>
        <HiOutlineCalendar size={24} />
      </button>
      {isOpen && (
        <div className="absolute mt-2 border border-gray-200 rounded-lg p-4 bg-gray-50 z-10 min-w-[350px]">
          <div className="flex items-center justify-between mb-4">
            <button
              className="p-2"
              onClick={() => navigateMonth(-1)}
            >
              <HiOutlineChevronLeft size={24} className="hover:text-black text-gray-500 transition-colors duration-200"/>
            </button>
            <h3 className="text-lg font-semibold text-gray-800">{monthNames[activeDate.getMonth()]} {activeDate.getFullYear()}</h3>
            <button
              className="p-2"
              onClick={() => navigateMonth(1)}
            >
              <HiOutlineChevronRight size={24} className="hover:text-black text-gray-500 transition-colors duration-200"/>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => (
              <div key={index} className="aspect-square">
                {date && (
                  <button
                    onClick={() => handleDateClick(date)}
                    className={getDateClassName(date)}
                    title={getDateTitle(date)}
                  >
                    {date.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}