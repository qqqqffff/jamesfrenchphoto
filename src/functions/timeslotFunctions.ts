import { DateTime, Duration } from "luxon";
import { Segment, Timeslot } from "../types";
import { v4 } from 'uuid'


export const convertSegmentListToTimeslots = (
  activeDate: Date,
  segment: Segment[], 
  existingTimeslots: Timeslot[], 
  options?: {
    noshowFee?: number,
    description?: string,
    cancelationFee?: {
      amount: number,
      window: Duration
    }
  }
): Timeslot[] => {
  const timeslots: Timeslot[] = [...existingTimeslots]
  const minHour = 8

  timeslots.push(...(
    segment.reduce((prev, cur) => {
      //segments startmin starts at 0 and goes up to end min
      let counter = (minHour * 60) + cur.startMin
      const end = (minHour * 60) + cur.endMin
      while(counter < end) {
        const minutes = String(counter % 60)
        const hours = String(Math.floor(counter / 60))
        const startDT = DateTime.fromFormat(
          `${DateTime.fromJSDate(activeDate).toFormat('MM-dd-yyyy')} ${hours.length === 1 ? '0' : ''}${hours}:${minutes.length === 1 ? '0' : ''}${minutes}`, 
          'MM-dd-yyyy hh:mm'
        )
        const endDT = startDT.plus({ minutes: cur.interval })

        if(
          timeslots.some((timeslot) => {
            return (
              (timeslot.start.getTime() >= startDT.toMillis() && timeslot.start.getTime() <= endDT.toMillis()) ||
              (timeslot.end.getTime() >= startDT.toMillis() && timeslot.end.getTime() <= endDT.toMillis())
            )
          })
        ) { }

        const mappedTimeslot: Timeslot = {
          id: v4(),
          tag: cur.userTag,
          noshowFee: options?.noshowFee,
          cancelationFee: options?.cancelationFee,
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          description: options?.description,
          updatedAt: new Date().toISOString(),
        }

        prev.push(mappedTimeslot)
        counter = counter + cur.interval
      }
      return prev
    }, [] as Timeslot[])
  ))

  return timeslots
}

export const convertTimeslotListToSegments = (timeslots: Timeslot[]): Segment[] => {
  const segments: Segment[] = []
  return segments
}