import { Button, Checkbox, Modal, Popover, ToggleSwitch } from "flowbite-react"
import { ModalProps } from "."
import { FC, useEffect, useState } from "react"
import { ColumnColor, UserColumnDisplay } from "../../types"
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { DropdownMenu } from "../common/DropdownMenu"
import { defaultColumnColors } from "../../utils"
import { BiSolidSquareRounded } from 'react-icons/bi'

interface UserColumnModalProps extends ModalProps{
    columnData: { heading: string, tag: string, data: {value: string, id: string}[], id?: string }
}

const client = generateClient<Schema>()

export const UserColumnModal: FC<UserColumnModalProps> = ({open, onClose, columnData}) => {
    const [userColumnDisplay, setUserColumnDisplay] = useState<UserColumnDisplay>()
    const [display, setDisplay] = useState(true)
    const [agregateValues, setAgregateValues] = useState(false)
    const [selectedValue, setSelectedValue] = useState<number>(-1)
    const [bgColor, setBgColor] = useState<string[]>([])
    const [textColor, setTextColor] = useState<string[]>([])
    const [colorPalleteSwitch, setColorPaletteSwitch] = useState(false)

    const [apiCall, setApiCall] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        async function api() {
            let userColumnDisplay: UserColumnDisplay | undefined
            if(columnData.id) {
                const response = await client.models.UserColumnDisplay.get({id: columnData.id})
                console.log(response)
                if(response !== null && response.data !== null){
                    userColumnDisplay = {
                        id: response.data.id,
                        tag: response.data.tag,
                        display: response.data.display ?? false,
                        heading: response.data.heading
                    }

                    const colorColumns: ColumnColor[] = (await response.data.color()).data.map((item) => {
                        return {
                            ...item,
                            bgColor: item.bgColor ?? undefined,
                            textColor: item.textColor ?? undefined
                        }
                    })

                    userColumnDisplay.color = colorColumns
                }
            }
            else {
                const response = await client.models.UserColumnDisplay.listUserColumnDisplayByTag({ tag: 'all-users' }, { filter: { heading: { eq: columnData.heading } } })
                console.log(response, columnData.heading)
                if(response !== null && response.data[0] !== undefined){
                    userColumnDisplay = {
                        id: response.data[0].id,
                        tag: response.data[0].tag,
                        display: response.data[0].display ?? true,
                        heading: response.data[0].heading
                    }

                    const colorColumns: ColumnColor[] = (await response.data[0].color()).data.map((item) => {
                        if(!item) return undefined
                        return {
                            ...item,
                            bgColor: item.bgColor ?? undefined,
                            textColor: item.textColor ?? undefined
                        }
                    }).filter((item) => item !== undefined)

                    userColumnDisplay.color = colorColumns
                }
            }
            setUserColumnDisplay(userColumnDisplay)
            setApiCall(true)
        }
        if(!apiCall){
            api()
        }
    })

    const dataFrequencyMap = new Map<string, {count: number, ids: string[]}>()
    columnData.data.forEach((item) => {
        const temp = dataFrequencyMap.get(item.value)
        if(temp) {
            temp.count += 1
            temp.ids.push(item.id)
        }
        dataFrequencyMap.set(item.value, temp ? temp : { count: 1, ids: [item.id]})
    })

    async function saveDisplayData(){
        let columnDisplay: UserColumnDisplay | undefined
        if(userColumnDisplay !== undefined){
            const response = await client.models.UserColumnDisplay.update({
                id: userColumnDisplay.id,
                display: display
            })
            console.log(response)

            if(response !== null && response.data !== null){
                columnDisplay = {
                    id: response.data.id,
                    tag: response.data.tag,
                    display: response.data.display ?? false,
                    heading: response.data.heading
                }

                const colorColumns: ColumnColor[] = (await response.data.color()).data.map((item) => {
                    if(!item) return
                    return {
                        ...item,
                        bgColor: item.bgColor ?? undefined,
                        textColor: item.textColor ?? undefined
                    }
                }).filter((item) => item !== undefined)
                const dataFrequencyArray = Array.from(dataFrequencyMap).map((item, index) => ({...item, index}))
                console.log(colorColumns, dataFrequencyArray)
                const updatedColors: ColumnColor[] = (await Promise.all(colorColumns.map(async (item) => {
                    let ret: ColumnColor | undefined
                    const colVal = dataFrequencyArray.find((i) => i[0] === item.value)
                    if(colVal){
                        const mappingUpdateResponse = await client.models.ColumnColorMapping.update({
                            id: item.id,
                            columnId: response.data!.id,
                            value: colVal[0],
                            bgColor: bgColor[colVal.index],
                            textColor: textColor[colVal.index]
                        })
                        console.log(mappingUpdateResponse)
                        if(mappingUpdateResponse && mappingUpdateResponse.data){
                            ret = {
                                ...mappingUpdateResponse.data,
                                bgColor: mappingUpdateResponse.data.bgColor ?? undefined,
                                textColor: mappingUpdateResponse.data.textColor ?? undefined
                            }
                        }
                    }
                    else{
                        const mappingUpdateResponse = await client.models.ColumnColorMapping.delete({
                            id: item.id
                        })
                        console.log(mappingUpdateResponse)
                        if(mappingUpdateResponse && mappingUpdateResponse.data){
                            ret = {
                                ...mappingUpdateResponse.data,
                                bgColor: mappingUpdateResponse.data.bgColor ?? undefined,
                                textColor: mappingUpdateResponse.data.textColor ?? undefined
                            }
                        }
                    }
                    return ret
                }))).filter((item) => item !== undefined)

                const updatedColorsMap = updatedColors.map((color) => color.value)
                const addedColors: ColumnColor[] = (await Promise.all(dataFrequencyArray
                    .filter((item) => !updatedColorsMap.includes(item[0]))
                    .map(async (item) => {
                        const colorMapResponse = await client.models.ColumnColorMapping.create({
                            columnId: response.data!.id,
                            value: item[0],
                            bgColor: bgColor[item.index],
                            textColor: textColor[item.index]
                        })
                        console.log(colorMapResponse)
                        if(colorMapResponse.data === null || !colorMapResponse.data.id) return undefined
                        return {
                            ...colorMapResponse.data,
                            bgColor: colorMapResponse.data.bgColor ?? undefined,
                            textColor: colorMapResponse.data.textColor ?? undefined
                        }
                    }
                ))).filter((item) => item !== undefined)
                columnDisplay.color = [...updatedColors, ...addedColors]
            }
        }
        else{
            console.log(columnData.heading)
            const response = await client.models.UserColumnDisplay.create({
                heading: columnData.heading,
                tag: columnData.tag === '' ?  'all-users' : columnData.tag,
                display: display
            })
            console.log(response)

            if(response !== null && response.data !== null){
                columnDisplay = {
                    id: response.data.id,
                    tag: response.data.tag,
                    display: response.data.display ?? false,
                    heading: response.data.heading
                }
                const colors: ColumnColor[] = (await Promise.all(Array.from(dataFrequencyMap).map(async (item, index) => {
                    const colorMapResponse = await client.models.ColumnColorMapping.create({
                        columnId: response.data!.id,
                        value: item[0],
                        bgColor: bgColor[index],
                        textColor: textColor[index]
                    })
                    console.log(colorMapResponse)
                    if(colorMapResponse.data === null || !colorMapResponse.data.id) return undefined
                    return {
                        ...colorMapResponse.data,
                        bgColor: colorMapResponse.data.bgColor ?? undefined,
                        textColor: colorMapResponse.data.textColor ?? undefined
                    }
                }))).filter((item) => item !== undefined)
                columnDisplay.color = colors
                console.log(columnDisplay)
            }
        }

        resetState()
    }

    

    const popoverContent = (ids: string[]) => {
        return (
            <div className="w-64 text-sm text-gray-500 p-2">
                <div className="border-b border-gray-200">
                    <p className="font-semibold text-gray-900">User Email{ids.length > 1 ? 's' : ''}</p>
                </div>
                <div className="flex flex-col gap-1">
                    {ids.map((item, index) => {
                        return (
                            <p key={index}>{item}</p>
                        )
                    })}
                </div>
            </div>
        )
    }

    function resetState() {
        onClose()
        setLoading(false)
        setUserColumnDisplay(undefined)
        setSelectedValue(-1)
        setBgColor([])
        setTextColor([])
        setApiCall(false)
        setDisplay(true)
        setAgregateValues(false)
    }

    return (
        <Modal show={open} onClose={() => {
            resetState()
        }}>
            <Modal.Header>{columnData.heading}</Modal.Header>
            <Modal.Body>
                <div className="grid auto-cols-max grid-cols-2">
                    <div className="flex flex-col">
                        <DropdownMenu heading={(
                            <>
                                <p className="text-xl mb-1">Values</p>
                            </>
                            )}
                            inlineHeading={(
                                <button className="flex flex-row gap-2 text-left items-center ms-4" onClick={() => {
                                    setAgregateValues(!agregateValues)
                                    setSelectedValue(-1)
                                }} type="button">
                                    <Checkbox className="mt-1" checked={agregateValues} readOnly />
                                    <span>Agregate Values</span>
                                </button>
                            )} 
                            initialState
                            items={agregateValues ? Array.from(dataFrequencyMap).map((entry, index) => {
                                const itemColor = userColumnDisplay?.color?.find((color) => color.value == entry[0])
                                const backgroundColor = bgColor[index] ? (
                                    `bg-${bgColor[index]}`
                                ) : (
                                    itemColor?.bgColor ? `bg-${itemColor.bgColor}` : ''
                                )
                                const tc = textColor[index] ? (
                                    `text-${textColor[index]}`
                                ) : (
                                    itemColor?.textColor ? `text-${itemColor.textColor}` : ''
                                )
                                const className = `hover:text-gray-400 hover:underline underline-offset-2 border ${backgroundColor} ${tc} rounded-lg p-1`
                                return (
                                    <Popover key={index} content={popoverContent(entry[1].ids)} placement="right" trigger="hover">
                                        <div className="flex flex-row gap-2 items-center">
                                            <p className="border border-gray-300 rounded-lg p-1">Count: {entry[1].count}</p>
                                            <button className={className}
                                                onClick={() => {
                                                    if(selectedValue && selectedValue == index){
                                                        setSelectedValue(-1)
                                                    }
                                                    else{
                                                        setSelectedValue(index)
                                                        setColorPaletteSwitch(false)
                                                    }
                                                }}
                                            >{entry[0]}</button>
                                        </div>
                                    </Popover>
                                    
                                )
                            }) : (
                                columnData.data.map((item, index) => {
                                    const className = `border ${bgColor[index] ? `bg-${bgColor[index]}` : ''} ${textColor[index] ? `text-${textColor[index]}` : ''} rounded-lg p-1`
                                    return (
                                        <Popover key={index} content={popoverContent([item.id])} placement="right" trigger="hover">
                                            <p className={className}>{item.value}</p>
                                        </Popover>
                                    )
                                })
                            )} 
                        />
                    </div>
                    {
                    selectedValue !== -1 && agregateValues ? (
                        <div className="flex flex-col border items-center gap-2">
                            <p className="text-xl border-b pb-1 px-3">Color Palette</p>
                            <div className="grid grid-cols-3 items-center justify-center gap-2">
                                <p>Background</p>
                                <ToggleSwitch className="place-self-center" checked={colorPalleteSwitch} onChange={setColorPaletteSwitch} />
                                <p>Text</p>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {Object.keys(defaultColumnColors).map((color, index) => {
                                    const className = 'fill-' + color + ' cursor-pointer'
                                    return (<BiSolidSquareRounded key={index} size={48} className={className} onClick={() => {
                                        if(colorPalleteSwitch){
                                            const temp = [...textColor]
                                            temp[selectedValue] = defaultColumnColors[color].text
                                            setTextColor(temp)
                                        }
                                        else {
                                            const temp = [...bgColor]
                                            temp[selectedValue] = defaultColumnColors[color].bg
                                            setBgColor(temp)
                                        }
                                    }}/>)
                                })}
                                <BiSolidSquareRounded size={48} className={`${colorPalleteSwitch ? 'fill-black' : 'fill-transparent border border-black rounded-lg'} cursor-pointer`} onClick={() => {
                                    if(colorPalleteSwitch){
                                        const temp = [...textColor]
                                        temp[selectedValue] = "black"
                                        setTextColor(temp)
                                    }
                                    else {
                                        const temp = [...bgColor]
                                        temp[selectedValue] = "transparent"
                                        setBgColor(temp)
                                    }
                                }}/>
                            </div>
                        </div>
                    ) : (
                        <></>
                    )}
                </div>
                
            </Modal.Body>
            <Modal.Footer className="flex-row flex justify-between">
                <button className="flex flex-row gap-2 text-left items-center" onClick={() => setDisplay(!display)} type="button">
                    <Checkbox className="mt-1" checked={display} readOnly />
                    <span>Display Column</span>
                </button>
                <Button className="" isProcessing={loading} 
                    onClick={async () => {
                        setLoading(true)
                        await saveDisplayData()
                    }}>Save</Button>
            </Modal.Footer>
        </Modal>
    )
}