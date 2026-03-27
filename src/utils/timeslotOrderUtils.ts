import { Timeslot } from "../types"

export const generateTimeslotInvoiceId = (
  timeslot: Timeslot, 
  userId: string,
  type: 'cancelation' | 'noshow'
) => {
  const prefix = 'INV'
  const typing = type === 'cancelation' ? 'C' : 'N'
  const timeslotPart = timeslot.id.replace(/[^A-z0-9]*/g,'').toUpperCase()
  const userIdPart = userId.replace(/[^A-z0-9]*/g,'').toUpperCase()
  const timestampPart = new Date().getTime()

  return (
    prefix + '-' + 
    typing + '-' +
    timeslotPart + '-' + 
    userIdPart + '-' + 
    timestampPart
  )
}

export const timeslotIdInvoiceIdCompare = (invoiceId: string, timeslotId: string): boolean | null => {
  const parts = invoiceId.split('-')
  if(parts[2] === undefined) return null
  return parts[2] === timeslotId.replace(/[^A-z0-9]*/g, '').toUpperCase()
}

export const retrieveTimeslotOrderTransactionType = (invoiceId: string): 'noshow' | 'cancelation' | null => {
  const parts = invoiceId.split('-')
  if(parts[1] === undefined) return null
  return parts[1] === 'C' ? 'cancelation' : parts[1] === 'N' ? 'noshow' : null
}