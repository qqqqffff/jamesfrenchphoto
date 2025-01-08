import { Timeslot } from "../../types"

export interface TimeslotDisplayProps {
    timeslots: Timeslot[],
    activeDate: Date,
    setActiveDate: (date: Date) => void,
    width: number
    formatTimeslot: () => JSX.Element[],
    formatRegisteredTimeslot: () => JSX.Element[],
    loading: boolean
}