import { ColumnColor, TableColumn } from "../../../types"
import { useState } from "react"

interface AggregateCellProps {
  column: TableColumn
}

export const AggregateCell = (props: AggregateCellProps) => {
  const [hoveredSegment, setHoveredSegment] = useState<number | undefined>()
  const total: {value: string, count: number, color?: ColumnColor}[] = []

  props.column.choices?.forEach((choice) => {
    const count = props.column.values.reduce((prev, cur) => (prev += cur === choice ? 1 : 0), 0)
    const color = props.column.color?.find((color) => color.value === choice)

    total.push({value: choice, count: count, color: color})
  })

  if(props.column.values.some((value) => value === '')) {
    total.push({value: 'Empty', count: props.column.values.reduce((prev, cur) => (prev += cur === '' ? 1 : 0), 0)})
  }

  return (
    <td className="text-ellipsis border py-3 px-3 justify-center max-w-[150px]">
      <div className="w-full">
        <div className="w-full h-6 bg-gray-200 overflow-hidden flex">
          {total.map((segment, index) => {
            return (
              <div 
                key={index}
                className={`
                  border h-full 
                  ${segment.color?.bgColor && !segment.color.bgColor.includes('#') ? `bg-${segment.color.bgColor}` : ''}
                  ${segment.color?.textColor && !segment.color.textColor.includes('#') ? `border-${segment.color.textColor}` : !segment.color ? 'border-gray-400' : ''}
                `}
                style={{ 
                  width: `${(segment.count / props.column.values.length) * 100}%`,
                  background: !segment.color ? 'repeating-linear-gradient(45deg, #ffffff, #ffffff 10px, #d1d5db 10px, #d1d5db 20px)' : '',
                  backgroundColor: segment.color?.bgColor && segment.color.bgColor.includes('#') ? segment.color.bgColor : undefined,
                  borderColor: segment.color?.textColor && segment.color.textColor.includes('#') ? segment.color.textColor : undefined
                }}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(undefined)}
              />
            )
          })}
        </div>

        <div className="flex w-full relative">
          {total.map((segment, index) => {
            return (
              <div
                key={index}
                className="relative"
                style={{ width: `${(segment.count / props.column.values.length) * 100}%` }}
              >
                  {hoveredSegment === index && (
                    <div
                      className={`
                        absolute top-0 left-1/2 transform -translate-x-1/2 bg-white 
                        text-${segment.color?.textColor && !segment.color.textColor.includes('#') ? segment.color.textColor : 'black'} 
                        text-xs mt-1 px-2 py-1 rounded whitespace-nowrap border border-black
                      `}
                      style={{
                        color: segment.color?.textColor && segment.color.textColor.includes('#') ? segment.color.textColor : undefined
                      }}
                    >
                      {segment.count}/{props.column.values.length} ({Number((segment.count / props.column.values.length) * 100).toFixed(1)}%)
                    </div>
                  )}
              </div>
            )
          })}
        </div>
      </div>
    </td>
  )
}