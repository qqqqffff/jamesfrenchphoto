import { CustomFlowbiteTheme } from "flowbite-react"
import { getColorComponent } from "./getColorComponent"

export function formatTime(time: Date | string | undefined, params?: {timeString: boolean}): string {
    if(!time) return 'N/A'
    if(typeof time == 'string') return time
    if(params && !params.timeString){
        const dateString = time.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })
        return dateString
    }
    const temp = time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })
    const timeString = temp.substring(0, temp.lastIndexOf(':')) + temp.substring(temp.indexOf(' '))

    return timeString
}

export const DAY_OFFSET = 24 * 3600 * 1000;

export const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

export const normalizeDate = (date: Date): Date => {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    )
}

export const sortDatesAround = (dates: Date[], date: Date) => {
    const normalReferenceDate = normalizeDate(date)

    return dates.sort((a, b) => {
        const normalizedA = normalizeDate(a)
        const normalizedB = normalizeDate(b)

        const diffA = normalizedA.getTime() - normalReferenceDate.getTime()
        const diffB = normalizedB.getTime() - normalReferenceDate.getTime()

        if ((diffA < 0 && diffB < 0) || (diffA > 0 && diffB > 0)) {
            return normalizedA.getTime() - normalizedB.getTime();
        }

        return diffA - diffB;
    })
}

export type RemoveIndexSignature<T> = {
    [K in keyof T as string extends K ? never : K]: T[K];
};
export type DynamicStringEnum<T> = T | (string & {});
export type DynamicStringEnumKeysOf<T extends object> = DynamicStringEnum<keyof RemoveIndexSignature<T>>;

export function formatFileSize(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024; // Factor for size conversion
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; // Size units

    const i = Math.floor(Math.log(bytes) / Math.log(k)); // Determine the unit index
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)); // Convert size

    return `${size} ${sizes[i]}`;
}

export function parsePathName(path: string): string {
    return path.substring(path.indexOf('_') + 1)
}

export const TZ_OFFSET = (day: Date) => (new Date(day.toLocaleString('en-US', { timeZone: 'America/Chicago' })).getTime() - new Date(day.toLocaleString()).getTime())

export const getTimes = (day: Date) => [
    new Date(day.getTime() + DAY_OFFSET * (16/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (17/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (18/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (19/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (20/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (21/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (22/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (23/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (24/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (25/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (26/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (27/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (28/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (29/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (30/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (31/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (32/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (33/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (34/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (35/48) - TZ_OFFSET(day)),
    new Date(day.getTime() + DAY_OFFSET * (36/48) - TZ_OFFSET(day)),
]

export function parseAttribute(attribute: string){
    switch(attribute){
        case 'email':
            return 'email'
        case 'email_verified':
            return 'verified'
        case 'family_name':
            return 'last'
        case 'given_name':
            return 'first'
        case 'sub':
            return 'userId'
        default:
            return 'attribute'
    }
}

//TODO: de-duplication
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

export const defaultColumnColors: Record<string, {text: string, bg: string}> = {
    'pink-400': {text: 'pink-600', bg: 'pink-200'},
    'rose-500': {text: 'rose-600', bg: 'rose-200'},
    'red-600': {text: 'red-600', bg: 'red-200'},
    'fuchsia-600': {text: 'fuchsia-600', bg: 'fuchsia-200'},
    'purple-600': {text: 'purple-600', bg: 'purple-200'},
    'blue-500': {text: 'blue-600', bg: 'blue-200'},
    'sky-400': {text: 'sky-600', bg: 'sky-200'},
    'cyan-400': {text: 'cyan-600', bg: 'cyan-200'},
    'emerald-500': {text: 'emerald-600', bg: 'emerald-200'},
    'green-400': {text: 'green-600', bg: 'green-200'},
    'lime-400': {text: 'lime-700', bg: 'lime-200'},
    'yellow-400': {text: 'yellow-600', bg: 'yellow-200'},
    'orange-400': {text: 'orange-600', bg: 'orange-200'},
    'amber-400': {text: 'amber-700', bg: 'amber-200'},
}

export const badgeColorThemeMap_hoverable: CustomFlowbiteTheme['badge'] = {
    root: {
        color: {
            'pink-400': "bg-pink-200 text-pink-600 group-hover:bg-pink-200 hover:bg-pink-300",
            'rose-500': "bg-rose-200 text-rose-600 group-hover:bg-rose-200 hover:bg-rose-300",
            'red-600': "bg-red-200 text-red-600 group-hover:bg-red-200 hover:bg-red-300",
            'fuchsia-600': "bg-fuchsia-200 text-fuchsia-600 group-hover:bg-fuchsia-200 hover:bg-fuchsia-300",
            'purple-600': "bg-purple-200 text-purple-600 group-hover:bg-purple-200 hover:bg-purple-300",
            'blue-500': "bg-blue-200 text-blue-600 group-hover:bg-blue-200 hover:bg-blue-300",
            'sky-400': "bg-sky-200 text-sky-600 group-hover:bg-sky-200 hover:bg-sky-300",
            'cyan-400': "bg-cyan-200 text-cyan-600 group-hover:bg-cyan-200 hover:bg-cyan-300",
            'emerald-500': "bg-emerald-200 text-emerald-600 group-hover:bg-emerald-200 hover:bg-emerald-300",
            'green-500': "bg-green-200 text-green-600 group-hover:bg-green-200 hover:bg-green-300",
            'lime-400': "bg-lime-200 text-lime-700 group-hover:bg-lime-200 hover:bg-lime-300",
            'yellow-300': "bg-yellow-200 text-yellow-600 group-hover:bg-yellow-200 hover:bg-yellow-300",
            'orange-400': "bg-orange-200 text-orange-600 group-hover:bg-orange-200 hover:bg-orange-300",
            'amber-600': "bg-amber-200 text-amber-700 group-hover:bg-amber-200 hover:bg-amber-300",
        }
    },
    
}

export const badgeColorThemeMap: CustomFlowbiteTheme['badge'] = {
    root: {
        color: {
            'pink-400': "bg-pink-200 text-pink-600 group-hover:bg-pink-200",
            'rose-500': "bg-rose-200 text-rose-600 group-hover:bg-rose-200",
            'red-600': "bg-red-200 text-red-600 group-hover:bg-red-200",
            'fuchsia-600': "bg-fuchsia-200 text-fuchsia-600 group-hover:bg-fuchsia-200",
            'purple-600': "bg-purple-200 text-purple-600 group-hover:bg-purple-200",
            'blue-500': "bg-blue-200 text-blue-600 group-hover:bg-blue-200",
            'sky-400': "bg-sky-200 text-sky-600 group-hover:bg-sky-200",
            'cyan-400': "bg-cyan-200 text-cyan-600 group-hover:bg-cyan-200",
            'emerald-500': "bg-emerald-200 text-emerald-600 group-hover:bg-emerald-200",
            'green-500': "bg-green-200 text-green-600 group-hover:bg-green-200",
            'lime-400': "bg-lime-200 text-lime-700 group-hover:bg-lime-200",
            'yellow-300': "bg-yellow-200 text-yellow-600 group-hover:bg-yellow-200",
            'orange-400': "bg-orange-200 text-orange-600 group-hover:bg-orange-200",
            'amber-600': "bg-amber-200 text-amber-700 group-hover:bg-amber-200",
        }
    },
    icon: {
        size: {
            
        }
    }
}

export const textInputTheme: CustomFlowbiteTheme['textInput'] = {
    field: {
        input: {
            sizes: {
                'lg': 'px-3.5 py-1.5 text-lg',
                'sm': 'px-2 py-1 text-sm'
            },
            colors: {
                'pink-400': "text-pink-400",
                'rose-500': "text-rose-500",
                'red-600': "text-red-600",
                'fuchsia-600': "text-fuchsia-600",
                'purple-600': "text-purple-600",
                'blue-500': "text-blue-500",
                'sky-400': "text-sky-400",
                'cyan-400': "text-cyan-400",
                'emerald-500': "text-emerald-500",
                'green-500': "text-green-500",
                'lime-400': "text-lime-400",
                'yellow-300': "text-yellow-300",
                'orange-400': "text-orange-400",
                'amber-600': "text-amber-600",
            }
        }
    }
}


export const GetColorComponent = getColorComponent