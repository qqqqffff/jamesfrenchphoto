import { CollectPaymentIntent, Timeslot } from "../types"
import { AutoCompleteAddressResponse } from "../types/backend-types"

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

export const generateCancelURL = (intent: CollectPaymentIntent) => {
  switch(intent.type) {
    case 'timeslot': {
      if(intent.captureShortnotice) {
        return window.location.hostname + `/client/dashboard/scheduler?id=${intent.timeslotId}&status=cancel`
      }
      return window.location.hostname + `/orders?type=no-show&status=cancel`
    }
    default: {
      return window.location.hostname + '/client/dashboard?paymentStatus=cancel'
    }
  }
}

export const generateReturnURL = (intent: CollectPaymentIntent) => {
  switch(intent.type) {
    case 'timeslot': {
      if(intent.captureShortnotice) {
        //short notice capture will always redirect to scheduler since the flow is from that screen
        return window.location.hostname + `/client/dashboard/scheduler?id=${intent.timeslotId}&status=success`
      }
      //no show should redirect to a plain screen
      return window.location.hostname + `/orders?type=no-show&status=success`
    }
    default: {
      return window.location.hostname + '/client/dashboard?paymentStatus=success'
    }
  }
}

export const generateApplePaymentLabel = (intent: CollectPaymentIntent) => {
  switch(intent.type) {
    case 'timeslot': {
      if(intent.captureShortnotice && !intent.vaultNoshow) {
        return 'JFP Short Notice Rescheduling Fee'
      }
      else if(!intent.captureShortnotice && intent.vaultNoshow) {
        return 'JFP No Show Hold'
      }
      else if(intent.captureShortnotice && intent.vaultNoshow) {
        return 'JFP Short Notice Rescheduling Fee and No Show Hold'
      }
      return 'Unkown Request'
    }
    default: {
      return 'Unknown Request'
    }
  }
}

export const formatAutoCompleteResponse = (response: AutoCompleteAddressResponse) => {
  if(
    !response.addressLineOne ||
    !response.adminAreaOne ||
    !response.adminAreaTwo ||
    !response.countryCode ||
    !response.postalCode
  ) {
    return null
  }

  return `${response.addressLineOne}, ${response.adminAreaTwo} ${response.adminAreaOne} ${response.postalCode}`
}