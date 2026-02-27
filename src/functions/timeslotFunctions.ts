import { DateTime } from "luxon";
import { Segment, Timeslot } from "../types";
import { v4 } from 'uuid'


export const convertSegmentListToTimeslots = (
  activeDate: Date,
  segment: Segment[], 
  existingTimeslots: Timeslot[], 
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
        ) { 
          continue
        }

        const mappedTimeslot: Timeslot = {
          id: v4(),
          tag: cur.userTag,
          noshowFee: cur.options?.noshowFee,
          cancelationFee: cur.options?.cancelationFee,
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          description: cur.options?.description,
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
  const retrieveTimeslotTime = (timeslot: Timeslot, order: 'start' | 'end') => order === 'start' ? timeslot.start.getHours() * 60 + timeslot.start.getMinutes() : timeslot.end.getHours() * 60 + timeslot.end.getMinutes()
  const orderedTimeslots = [...timeslots]
  .sort((a, b) => (retrieveTimeslotTime(a, 'start')) - (retrieveTimeslotTime(b, 'start')))
  if(timeslots.length === 0) return segments

  let currentStartMin = retrieveTimeslotTime(orderedTimeslots[0], 'start')
  let currentEndMin = retrieveTimeslotTime(orderedTimeslots[0], 'end')
  let currentSegment: Segment = {
    id: v4(),
    startMin: currentStartMin,
    endMin: currentEndMin,
    interval: currentEndMin - currentStartMin,
    userTag: orderedTimeslots[0].tag,
    options: {
      noshowFee: orderedTimeslots[0].noshowFee,
      description: orderedTimeslots[0].description,
      cancelationFee: orderedTimeslots[0].cancelationFee
    }
  }

  for(let i = 1; i < orderedTimeslots.length; i++) {
    currentStartMin = retrieveTimeslotTime(orderedTimeslots[i], 'start')
    currentEndMin = retrieveTimeslotTime(orderedTimeslots[i], 'end')

    //append to current segment
    if(
      currentSegment.endMin === currentStartMin &&
      currentSegment.interval === (currentEndMin - currentStartMin) &&
      orderedTimeslots[i].tag?.id === currentSegment.userTag?.id &&
      orderedTimeslots[i].noshowFee === currentSegment.options?.noshowFee &&
      orderedTimeslots[i].description === currentSegment.options?.description &&
      orderedTimeslots[i].cancelationFee?.amount === currentSegment.options?.cancelationFee?.amount &&
      orderedTimeslots[i].cancelationFee?.window.as('hours') === currentSegment.options?.cancelationFee?.window.as('hours')
    ) {
      currentSegment.endMin = currentEndMin
    }
    //create a new segment
    else {
      segments.push(currentSegment)
      currentSegment = {
        id: v4(),
        startMin: currentStartMin,
        endMin: currentEndMin,
        interval: currentEndMin - currentStartMin,
        userTag: orderedTimeslots[i].tag,
        options: {
          noshowFee: orderedTimeslots[i].noshowFee,
          description: orderedTimeslots[i].description,
          cancelationFee: orderedTimeslots[i].cancelationFee,
        }
      }
    }
  }
  return segments
}