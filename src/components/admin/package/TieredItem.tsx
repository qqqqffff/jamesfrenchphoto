import { Dispatch, SetStateAction } from "react"
import { Package, PackageItem } from "../../../types"
import { PriceInput } from "../../common/PriceInput"
import { TextInput, Tooltip } from "flowbite-react"
import { textInputTheme } from "../../../utils"
import { HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineX } from 'react-icons/hi'
import { evaluateBooleanOperator, splitStatement } from "../../../functions/packageFunctions"

interface TieredItemProps { 
  item: PackageItem,
  selectedPackage: Package
  parentUpdatePackage: Dispatch<SetStateAction<Package | undefined>>
  parentUpdatePackageList: Dispatch<SetStateAction<Package[]>>
}

export const TieredItem = (props: TieredItemProps) => {
  if(props.item.statements === undefined) return (<></>)

  return (
    <div className="flex flex-col items-start gap-2 overflow-x-auto max-w-[60%]">
      {props.item.statements.map((statement, index, array) => {
        const { 
          parts,
          variable,
          operator,
          quantity,
          equal,
          final
        } = splitStatement(statement)
        const aboveStatement = index > 0 ? splitStatement(array[index - 1]) : undefined
        const belowStatement = index < array.length - 1 ? splitStatement(array[index + 1]) : undefined

        //TODO: error handle
        if(!variable || !operator || !quantity || !equal || !final) return (<></>)

        const splitEvaluation = evaluateBooleanOperator(operator, quantity).split(/\d+/g)

        return (
          <div className="border rounded-lg flex flex-row min-w-max justify-between px-4 py-1 items-center whitespace-nowrap" key={index}>
            <div className="flex flex-row gap-2 items-center">
              {splitEvaluation[0] !== '' && (<span className="font-extrabold">{splitEvaluation[0].substring(0,1).toLocaleUpperCase()+splitEvaluation[0].substring(1)}</span>)}
              <TextInput 
                theme={textInputTheme}
                sizing="sm"
                className="max-w-[50px] min-w-[50px]"
                value={quantity}
                onBlur={() => {
                  //quantity cannot be less than 1 so set to 1 if it is the lower bound -> -1 the next bound if not the upper bound otherwise to the uperbound
                  //uperbound and lowerbound must be equal if array size = 2
                  const statementsLength = props.item.statements?.length ?? 0
                  
                  if(parseInt(quantity) < 1){
                    const temp = parts
                    temp[2] = index === 0 ? '1' : String(
                      parseInt(splitStatement(props.item.statements?.[index + 1] ?? '').quantity ?? '') +
                      (statementsLength == 2 ? 0 : -1)
                    )
                    const updatedStatement = temp.join(' ')
                    const updatedStatements = props.item.statements?.map((pStatement, pIndex) => index === pIndex ? updatedStatement : pStatement)

                    const updatedPackage: Package = {
                      ...props.selectedPackage,
                      items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                        ...item,
                        statements: updatedStatements
                      }) : item)
                    }

                    props.parentUpdatePackage(updatedPackage)
                    props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                  }
                  if(statementsLength == 2) {
                    const osIndex = index === 0 ? 1 : 0
                    const otherStatement = splitStatement(props.item.statements?.[osIndex] ?? '')
                    const temp = otherStatement.parts
                    temp[2] = quantity

                    const updatedStatement = temp.join(' ')
                    const updatedStatements = props.item.statements?.map((pStatement, pIndex) => osIndex === pIndex ? updatedStatement : pStatement)

                    const updatedPackage: Package = {
                      ...props.selectedPackage,
                      items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                        ...item,
                        statements: updatedStatements
                      }) : item)
                    }

                    props.parentUpdatePackage(updatedPackage)
                    props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                  }
                  if(statementsLength > 2) {
                    //item must be less than the item above and greater than the item below

                    const temp = [...array]

                    if(
                      index === temp.length - 1
                    ) {
                      const twoStatementsAbove = splitStatement(temp[index - 2])
                      if(
                        twoStatementsAbove?.quantity &&
                        !isNaN(parseInt(quantity)) && 
                        !isNaN(parseInt(twoStatementsAbove.quantity)) &&
                        parseInt(quantity) <= parseInt(twoStatementsAbove.quantity) + 1
                      ) {
                        const tempParts = [...parts]
                        tempParts[2] = String(parseInt(twoStatementsAbove.quantity) + 2)
                        temp[index] = tempParts.join(' ')
                      }
                    }

                    if(
                      index !== temp.length - 1 &&
                      aboveStatement?.quantity &&
                      !isNaN(parseInt(quantity)) && 
                      !isNaN(parseInt(aboveStatement.quantity)) &&
                      parseInt(quantity) <= parseInt(aboveStatement.quantity) + 1
                    ) {
                      const tempParts = [...parts]
                      tempParts[2] = String(parseInt(aboveStatement.quantity) + 2)
                      temp[index] = tempParts.join(' ')
                    }

                    if(
                      belowStatement?.quantity &&
                      !isNaN(parseInt(quantity)) &&
                      !isNaN(parseInt(belowStatement.quantity)) &&
                      parseInt(quantity) >= parseInt(belowStatement.quantity) - 1
                    ) {
                      const tempParts = [...parts]
                      tempParts[2] = String(parseInt(belowStatement.quantity) - 2)
                      temp[index] = tempParts.join(' ')
                    }

                    const updatedPackage: Package = {
                      ...props.selectedPackage,
                      items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                        ...item,
                        statements: temp
                      }) : item)
                    }

                    //second to top quantity must be equal to top quantity for full boolean coverage
                    const top = splitStatement(temp[temp.length - 1]).parts
                    const secondTop = splitStatement(temp[temp.length - 2]).parts

                    secondTop[2] = top[2]

                    temp[temp.length - 2] = secondTop.join(' ')


                    props.parentUpdatePackage(updatedPackage)
                    props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                  }
                }}
                onChange={(event) => {
                  const inputValue = event.target.value.charAt(0) === '0' ? event.target.value.slice(1) : event.target.value

                  if(!/^[\d]*$/g.test(inputValue)) {
                    return
                  }
                  
                  const numericValue = parseFloat(inputValue)
                  if(!isNaN(numericValue)) {
                    const temp = parts
                    temp[2] = inputValue
                    const updatedStatement = temp.join(' ')
                    const updatedStatements = props.item.statements?.map((pStatement, pIndex) => index === pIndex ? updatedStatement : pStatement)

                    const updatedPackage: Package = {
                      ...props.selectedPackage,
                      items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                        ...item,
                        statements: updatedStatements
                      }) : item)
                    }

                    props.parentUpdatePackage(updatedPackage)
                    props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                  }

                  if(inputValue === '') {
                    const temp = parts
                    temp[2] = '0'
                    const updatedStatement = temp.join(' ')
                    const updatedStatements = props.item.statements?.map((pStatement, pIndex) => index === pIndex ? updatedStatement : pStatement)

                    const updatedPackage: Package = {
                      ...props.selectedPackage,
                      items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                        ...item,
                        statements: updatedStatements
                      }) : item)
                    }

                    props.parentUpdatePackage(updatedPackage)
                    props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                  }
                }}
              />
              <span className="font-extrabold">{splitEvaluation[1]} price is</span>
              <PriceInput 
                className='max-w-[100px] min-w-[100px]'
                value={final}
                updateState={(value) => {
                  const temp = parts
                  temp[4] = value
                  const updatedStatement = temp.join(' ')
                  
                  const updatedStatements = props.item.statements?.map((pStatement, pIndex) => index === pIndex ? updatedStatement : pStatement)

                  const updatedPackage: Package = {
                    ...props.selectedPackage,
                    items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                      ...item,
                      statements: updatedStatements
                    }) : item)
                  }

                  props.parentUpdatePackage(updatedPackage)
                  props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                }}
              />
            </div>
            <div className="flex flex-row gap-2 ms-2">
              <Tooltip 
                style="light"
                placement="bottom"
                content={'Add Statement Above'}
              >
                <button 
                  onClick={() => {
                    const top = [...array].slice(0, index)
                    const bottom = [...array].slice(index)

                    const temp = [
                      ...top,
                      `x < ${parseInt(quantity) - 2} = ${parseFloat(final) + 1}`,
                      ...bottom,
                    ]

                    for(let i = 0; i < temp.length; i++){
                      const statement = splitStatement(temp[i]).parts
                      statement[1] = '<'
                      if(i === temp.length - 2) {
                        statement[2] = splitStatement(temp[temp.length - 1]).quantity ?? ''
                      }
                      temp[i] = statement.join(' ')
                    }

                    const newBottom = splitStatement(temp[0]).parts
                    newBottom[1] = '<='
                    const newTop = splitStatement(temp[temp.length - 1]).parts
                    newTop[1] = '>='

                    temp[0] = newBottom.join(' ')
                    temp[temp.length - 1] = newTop.join(' ')

                    const updatedPackage: Package = {
                      ...props.selectedPackage,
                      items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                        ...item,
                        statements: temp
                      }) : item)
                    }

                    props.parentUpdatePackage(updatedPackage)
                    props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                  }}
                  disabled={
                    parseInt(quantity) <= 2 || 
                    ((props.item.statements?.length ?? 0) == 2 && index === 1) ||
                    (
                      aboveStatement?.quantity !== undefined && 
                      !isNaN(parseInt(aboveStatement.quantity)) &&
                      (parseInt(quantity) - parseInt(aboveStatement.quantity)) <= 2
                    )
                  }
                  className="disabled:text-gray-400 border rounded-full p-1 enabled:hover:border-gray-700"
                >
                  <HiOutlineArrowUp />
                </button>
              </Tooltip>
              <Tooltip 
                style="light"
                placement="bottom"
                content={'Add Statement Below'}
              >
                <button 
                  onClick={() => {
                    const top = [...array].slice(0, index + 1)
                    const bottom = [...array].slice(index + 1)

                    const temp = [
                      ...top,
                      `x < ${parseInt(quantity) + 2} = ${(parseFloat(final) - 1) > 0 ? parseFloat(final) : 0.01}`,
                      ...bottom,
                    ]

                    for(let i = 0; i < temp.length; i++){
                      const statement = splitStatement(temp[i]).parts
                      statement[1] = '<'
                      if(i === temp.length - 2) {
                        statement[2] = splitStatement(temp[temp.length - 1]).quantity ?? ''
                      }
                      temp[i] = statement.join(' ')
                    }

                    const newBottom = splitStatement(temp[0]).parts
                    newBottom[1] = '<='
                    const newTop = splitStatement(temp[temp.length - 1]).parts
                    newTop[1] = '>='

                    temp[0] = newBottom.join(' ')
                    temp[temp.length - 1] = newTop.join(' ')

                    const updatedPackage: Package = {
                      ...props.selectedPackage,
                      items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                        ...item,
                        statements: temp
                      }) : item)
                    }

                    props.parentUpdatePackage(updatedPackage)
                    props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                  }}
                  disabled={
                    ((props.item.statements?.length ?? 0) == 2 && index === 0) ||
                    (
                      belowStatement?.quantity !== undefined &&
                      !isNaN(parseInt(belowStatement.quantity)) &&
                      (parseInt(belowStatement.quantity) - parseInt(quantity)) <= 2
                    )
                  }
                  className="disabled:text-gray-400 border rounded-full p-1 enabled:hover:border-gray-700"
                >
                  <HiOutlineArrowDown />
                </button>
              </Tooltip>
              <button 
                onClick={() => {
                  const tempStatements = props.item.statements?.filter((pStatement) => {
                    return statement !== pStatement
                  }) ?? []
                  //case -> removed low bound, set index + 1 to be new lower
                  //case -> removed upper bound, set index - 1 to be new upper

                  const tempBottom = splitStatement(tempStatements[0])
                  const bottomParts = tempBottom.parts
                  bottomParts[1] = '<='
                  const tempTop = splitStatement(tempStatements[tempStatements.length - 1])
                  const topParts = tempTop.parts
                  topParts[1] = tempStatements.length === 2 ? '>' : '>='

                  //when removed the top quantity will be chosen
                  if(tempStatements.length === 2) {
                    bottomParts[2] = topParts[2]
                  }

                  tempStatements[0] = bottomParts.join(' ')
                  tempStatements[tempStatements.length - 1] = topParts.join(' ')

                  const updatedPackage: Package = {
                    ...props.selectedPackage,
                    items: props.selectedPackage.items.map((item) => item.id === props.item.id ? ({
                      ...item,
                      statements: tempStatements
                    }) : item)
                  }

                  props.parentUpdatePackage(updatedPackage)
                  props.parentUpdatePackageList((prev) => prev.map((pack) => pack.id === updatedPackage.id ? updatedPackage : pack))
                }}
                className="disabled:text-gray-400 border rounded-full p-1 enabled:hover:border-gray-700"
                disabled={(props.item.statements?.length ?? 2) == 2}
              >
                <HiOutlineX />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}