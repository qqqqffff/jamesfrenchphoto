import { Package, PackageItem } from "../types"

export function evaluateBooleanOperator(operator?: string, quantity?: string): string {
  if(!operator || !quantity) return ''
  switch(operator) {
    case '>':
      return `more than ${quantity} items`
    case '>=':
      return `${quantity} or more items`
    case '=':
      return 'Equal to'
    case '<':
      return `less than ${quantity} items`
    case '<=':
      return `${quantity} or less items`
  }

  return ''
}

export const splitStatement = (statement: string): {
    parts: string[],
    variable?: string,
    operator?: string,
    quantity?: string,
    equal?: string,
    final?: string,
  } => {
    const parts = statement.split(' ')
    const variable: string  | undefined = parts?.[0]
    const operator: string  | undefined = parts?.[1]
    const quantity: string  | undefined = parts?.[2]
    const equal: string  | undefined = parts?.[3]
    const final: string  | undefined = parts?.[4]

    return {
      parts,
      variable,
      operator,
      quantity,
      equal,
      final,
    }
  }

export const decryptBooleanStatement = (statement: string): string => {
  const split = splitStatement(statement)

  const evaluation = evaluateBooleanOperator(split.operator, split.quantity)

  if(!split.final || isNaN(parseFloat(split.final))) return ''

  return `${evaluation.substring(0,1).toLocaleUpperCase() + evaluation.substring(1)} is ${priceFormatter.format(parseFloat(split.final))}`
}

export const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

/** 
 * @description evaluates the difference between old and new versions of a package
 * @returns true if there is a difference
*/
export const evaluatePackageDif = (oldPackage: Package, newPackage: Package): boolean => {
  if(oldPackage.id !== newPackage.id) return false

  const newItems: Record<string, PackageItem> = Object.fromEntries(newPackage.items
    .filter((item) => !oldPackage.items.some((pItem) => pItem.id === item.id))
    .map((item) => ([item.id, item]))
  )

  if(Object.entries(newItems).length > 0) return true

  const packItems: Record<string, PackageItem> = Object.fromEntries(oldPackage.items.map((item) => ([item.id, item])))

  const removedItems = oldPackage.items.filter((item) => !newPackage.items.some((pItem) => pItem.id === item.id))

  if(removedItems.length > 0) return true

  const differentItemCollections = newPackage.items.some((item) => 
    packItems[item.id].collectionIds.some((id) => !item.collectionIds.some((nId) => nId === id)) ||
    item.collectionIds.some((id) => !packItems[item.id].collectionIds.some((nId) => nId === id))
  )

  if(differentItemCollections) return true

  //deep equality check
  for(let i = 0; i < newPackage.items.length; i++) {
    if(
      packItems[newPackage.items[i].id].name !== newPackage.items[i].name ||
      packItems[newPackage.items[i].id].description !== newPackage.items[i].description ||
      packItems[newPackage.items[i].id].order !== newPackage.items[i].order ||
      packItems[newPackage.items[i].id].quantities !== newPackage.items[i].quantities ||
      packItems[newPackage.items[i].id].collectionIds.some((id) => !newPackage.items[i].collectionIds.some((nId) => nId === id)) ||
      newPackage.items[i].collectionIds.some((id) => !packItems[newPackage.items[i].id].collectionIds.some((nId) => nId === id)) ||
      packItems[newPackage.items[i].id].max !== newPackage.items[i].max ||
      packItems[newPackage.items[i].id].price !== newPackage.items[i].price ||
      packItems[newPackage.items[i].id].hardCap !== newPackage.items[i].hardCap ||
      packItems[newPackage.items[i].id].unique !== newPackage.items[i].unique ||
      packItems[newPackage.items[i].id].dependent !== newPackage.items[i].dependent ||
      packItems[newPackage.items[i].id].statements?.some((statement) => !newPackage.items[i].statements?.some((pStatement) => pStatement === statement)) ||
      newPackage.items[i].statements?.some((statement) => !packItems[newPackage.items[i].id].statements?.some((pStatement) => pStatement === statement))
    ) {
      return true
    }
  }

  return (
    oldPackage.name !== newPackage.name ||
    oldPackage.description !== newPackage.description ||
    oldPackage.tagId !== newPackage.tagId ||
    oldPackage.pdfPath !== newPackage.pdfPath ||
    oldPackage.price !== newPackage.price
  )
}