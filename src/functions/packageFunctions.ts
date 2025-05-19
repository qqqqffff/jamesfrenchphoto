export function evaluateBooleanOperator(operator?: string): string {
  if(!operator) return ''
  switch(operator) {
    case '>':
      return 'Greater Than'
    case '>=':
      return 'Greater Than or Equal to'
    case '=':
      return 'Equal to'
    case '<':
      return 'Less Than'
    case '<=':
      return 'Less Than or Equal to'
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