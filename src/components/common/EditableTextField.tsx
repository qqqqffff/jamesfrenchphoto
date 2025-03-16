import { ComponentProps, ReactNode, useEffect, useRef, useState } from "react";
import { HiOutlineCheck, HiOutlinePencil } from "react-icons/hi2";

interface EditableTextFieldProps extends ComponentProps<'span'> {
  label?: ReactNode
  text: string
  onSubmitText: (text: string) => void
  onSubmitError?: (message: string) => void
  onCancel?: () => void
  minWidth?: string
  placeholder?: string
}

export const EditableTextField = (props: EditableTextFieldProps) => {
  const [content, setContent] = useState(props.text)
  const [spanContent, setSpanContent] = useState(props.text)
  const [width, setWidth] = useState(0)
  const contentSpan = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setWidth(contentSpan.current?.clientWidth ?? 0)
    if(props.placeholder && inputRef.current){
      setEditing(true)
      inputRef.current.focus()
    }
    if(props.text !== content && spanContent !== content){
      setContent(props.text)
      setSpanContent(props.text)
    }
  }, [spanContent, props.text])

  function handleSubmit(){
    //case unchanged content
    if(props.text === content){
      setEditing(false)
      if(props.onCancel) {
        props.onCancel()
      }
      return
    }
    //case changed content
    else if(props.text !== content){
      props.onSubmitText(content)
      setContent('')
      setEditing(false)
      return
    }
  }

  return (
    <span
      className="text-2xl ms-4 mb-2 flex flex-row items-center gap-2" 
      onMouseEnter={() => setShowEdit(true)}
      onMouseLeave={() => setShowEdit(false)}
    >
      {props?.label}
      <span 
        className={`text-2xl absolute text-transparent ${props.className} -z-10`} 
        ref={contentSpan}
      >
        {`${spanContent}?`}
      </span>
      <input 
        className={`font-thin p-0 text-2xl border-transparent disabled:cursor-default ring-transparent ${props.className}`}
        value={content} 
        type="text" 
        ref={inputRef}
        style={{ width: width, minWidth: props.minWidth }}
        disabled={!editing}
        placeholder={props.placeholder}
        onChange={(event) => {
          if(editing){
            setContent(event.target.value)
            setSpanContent(event.target.value)
          }
        }}
        onKeyDown={(event) => {
          if(event.key === 'Enter'){
            handleSubmit()
          }
          else if(event.key == 'Escape'){
            setEditing(false)
            setContent(props.text)
            setSpanContent(props.text)
            if(props.onCancel){
              props.onCancel()
            }
          }
        }}
      />
      {(showEdit || editing) && (
        <button 
          onClick={async () => {
            if(inputRef.current && !editing){
              setEditing(true)
              setContent(props.text)
              setSpanContent(props.text)
              await new Promise(resolve => setTimeout(resolve, 1))
              inputRef.current.focus()
            }
            else if(editing){
              handleSubmit()
            }
          }}
          className="hover:text-gray-500 hover:cursor-pointer"
        >
          {(!editing) ? (
            <HiOutlinePencil size={24} />
          ) : (
            <HiOutlineCheck size={24} />
          )}
        </button>
      )}
    </span>
  )
}