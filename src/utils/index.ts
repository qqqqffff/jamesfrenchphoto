export function formatTime(time: Date | string | undefined, params?: {timeString: boolean}): string {
    if(!time) return 'N/A'
    if(typeof time == 'string') return time
    if(params && !params.timeString){
        const dateString = time.toLocaleDateString()
        return dateString
    }
    const timeString = time.toLocaleTimeString().toLowerCase().split(':')
    return timeString[0] + ':' + timeString[1] + ' ' + timeString[2].substring(3)
}