import { DateTime } from "luxon";
import { Segment, Timeslot } from "../types";
import { v4 } from 'uuid'


export const convertSegmentListToTimeslots = (
  activeDate: Date,
  segment: Segment[], 
  existingTimeslots: Timeslot[], 
): Timeslot[] => {
  const timeslots: Timeslot[] = []
  const MIN_TIME = 8 * 60

  for(let i = 0; i < segment.length; i++) {
    let counter = segment[i].startMin
    while(counter < segment[i].endMin) {
      const offsetCounter = MIN_TIME + counter
      const minutes = String(offsetCounter % 60)
      const hours = String(Math.floor(offsetCounter / 60))
      const startDT = DateTime.fromFormat(
        `${DateTime.fromJSDate(activeDate).toFormat('MM-dd-yyyy')} ${hours.length === 1 ? '0' : ''}${hours}:${minutes.length === 1 ? '0' : ''}${minutes}`, 
        'MM-dd-yyyy hh:mm'
      )
      const endDT = startDT.plus({ minutes: segment[i].interval })

      const foundExistingTimeslot = existingTimeslots.find((timeslot) => (
        (timeslot.start.getTime() >= startDT.toMillis() && timeslot.start.getTime() <= endDT.toMillis()) ||
        (timeslot.end.getTime() >= startDT.toMillis() && timeslot.end.getTime() <= endDT.toMillis())
      ))

      if(foundExistingTimeslot === undefined) {
        const mappedTimeslot: Timeslot = {
          id: v4(),
          tag: segment[i].userTag,
          noshowFee: segment[i].options?.noshowFee,
          cancelationFee: segment[i].options?.cancelationFee,
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          description: segment[i].options?.description,
          updatedAt: new Date().toISOString(),
        }

        timeslots.push(mappedTimeslot)
      }
      else {
        timeslots.push(foundExistingTimeslot)
      }
      counter += segment[i].interval
    }
  }

  // timeslots.push(...(
  //   segment.reduce((prev, cur, _, array) => {
  //     //segments startmin starts at 0 and goes up to end min
  //     let counter = (minHour * 60) + cur.startMin
  //     const end = (minHour * 60) + cur.endMin
  //     const maxDepth = 200;
  //     let i = 0
  //     while(counter < end) {
  //       const minutes = String(counter % 60)
  //       const hours = String(Math.floor(counter / 60))
  //       const startDT = DateTime.fromFormat(
  //         `${DateTime.fromJSDate(activeDate).toFormat('MM-dd-yyyy')} ${hours.length === 1 ? '0' : ''}${hours}:${minutes.length === 1 ? '0' : ''}${minutes}`, 
  //         'MM-dd-yyyy hh:mm'
  //       )
  //       const endDT = startDT.plus({ minutes: cur.interval })

  //       if(
  //         timeslots.some((timeslot) => {
  //           return (
  //             (timeslot.start.getTime() >= startDT.toMillis() && timeslot.start.getTime() <= endDT.toMillis()) ||
  //             (timeslot.end.getTime() >= startDT.toMillis() && timeslot.end.getTime() <= endDT.toMillis())
  //           )
  //         })
  //       ) { 
  //         continue
  //       }

        
  //       counter = counter + cur.interval
  //       i++;
  //       if(i>=maxDepth) break;
  //     }
  //     console.log(array)
  //     return prev
  //   }, [] as Timeslot[])
  // ))

  return timeslots
}

export const convertTimeslotListToSegments = (timeslots: Timeslot[]): Segment[] => {
  const segments: Segment[] = []
  const BASE_TIME = 60 * 8
  const retrieveTimeslotTime = (timeslot: Timeslot, order: 'start' | 'end') => (order === 'start' ? timeslot.start.getHours() * 60 + timeslot.start.getMinutes() : timeslot.end.getHours() * 60 + timeslot.end.getMinutes()) - BASE_TIME
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
      segments.push({...currentSegment})
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

  if(!segments.some((segment) => segment.id === currentSegment.id)) {
    segments.push({...currentSegment})
  }

  return segments
}

export const timeslotListComparison = (a: Timeslot[], b: Timeslot[]) => {
  return a.every((aTimeslot) => (
    b.some((bTimeslot) => (
      aTimeslot.id === bTimeslot.id &&
      aTimeslot.tag?.id === bTimeslot.tag?.id &&
      aTimeslot.register === bTimeslot.register &&
      aTimeslot.noshowFee === bTimeslot.noshowFee &&
      (
        (aTimeslot.cancelationFee === undefined && bTimeslot.cancelationFee === undefined) ||
        (
          aTimeslot.cancelationFee?.amount === bTimeslot.cancelationFee?.amount &&
          aTimeslot.cancelationFee?.window.toISO() === bTimeslot.cancelationFee?.window.toISO()
        )
      ) &&
      aTimeslot.start.getTime() === bTimeslot.start.getTime() &&
      aTimeslot.end.getTime() === bTimeslot.end.getTime() &&
      aTimeslot.participantId === bTimeslot.participantId &&
      aTimeslot.description === bTimeslot.description
    )
  )))
}