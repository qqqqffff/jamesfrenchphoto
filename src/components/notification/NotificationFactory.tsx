import { FC } from "react"

//TODO: complete me
export const NotificationFactory: FC<{items: string[]}> = ({items}) => {
    return (
        <div className="">
            {items.map((item) => {
                return (item)
            })}
        </div>
    )
}