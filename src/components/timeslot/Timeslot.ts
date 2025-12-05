import { Dispatch, SetStateAction } from "react"
import { Timeslot, UserTag } from "../../types"

export interface TimeslotDisplayProps {
    timeslots: Timeslot[],
    activeDate: Date,
    setActiveDate: Dispatch<SetStateAction<Date>>,
    tags: UserTag[],
    activeTag: UserTag,
    setActiveTag: Dispatch<SetStateAction<UserTag>>,
    width: number,
    formatTimeslot: () => JSX.Element[],
    formatRegisteredTimeslot: () => JSX.Element[],
    loading: boolean
}