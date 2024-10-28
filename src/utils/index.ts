import { getColorComponent } from "./getColorComponent"

export function formatTime(time: Date | string | undefined, params?: {timeString: boolean}): string {
    if(!time) return 'N/A'
    if(typeof time == 'string') return time
    if(params && !params.timeString){
        const dateString = time.toLocaleDateString()
        return dateString
    }
    const timeString = time.toLocaleTimeString().replace(/[^0-9:]/g, '')
    return timeString
}

export const DAY_OFFSET = 24 * 3600 * 1000;

export const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

export const defaultColors = [
    'pink-400',
    'rose-500',
    'red-600',
    'fuchsia-600',
    'purple-600',
    'blue-500',
    'sky-400',
    'cyan-400',
    'emerald-500',
    'green-500',
    'lime-400',
    'yellow-300',
    'orange-400',
    'amber-600',
]

export const GetColorComponent = getColorComponent