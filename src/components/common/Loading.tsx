import { ComponentProps, useEffect, useState } from "react";

const component = (props: ComponentProps<'p'>) => {
    const [dots, setDots] = useState('.')
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(current => {
                switch(current){
                    case '.':
                        return '..'
                    case '..':
                        return '...'
                    default:
                        return '.'
                }
            })
        }, 500)

        return () => clearInterval(interval)
    })
    return (
        <p {...props}>{dots}</p>
    )
}

export default component