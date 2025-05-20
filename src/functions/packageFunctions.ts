export function evaluateBooleanOperator(operator?: string): string {
  if(!operator) return ''
  switch(operator) {
    case '>':
      return 'or More'
    case '>=':
      return 'or More'
    case '=':
      return 'Equal to'
    case '<':
      return 'or Less'
    case '<=':
      return 'or Less'
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

  return `${split.quantity} items ${evaluateBooleanOperator(split.operator).toLowerCase()} is $${split.final}`
}