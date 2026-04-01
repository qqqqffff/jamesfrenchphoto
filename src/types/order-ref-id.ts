export enum OrderRefID {
  'NoShowFee' = 'REF-TN0000',
  'CancelationFee' = 'REF-TC0000'
}

export function stringToOrderRefID(val: string): OrderRefID | undefined {
  if(Object.values(OrderRefID).includes(val as OrderRefID)) {
    return val as OrderRefID
  }
  return undefined
}