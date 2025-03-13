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
  const [editedContent, setEditedContent] = useState<string>()
  const [width, setWidth] = useState(0)
  const contentSpan = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setWidth(contentSpan.current?.offsetWidth ?? 0)
    if(props.placeholder && inputRef.current){
      setEditing(true)
      inputRef.current.focus()
    }
    if(props.text !== content || props.text !== editedContent){
      setContent(props.text)
      setEditedContent(props.text)
    }
  }, [editedContent, props.text])

  function handleSubmit(){
    //case failed to make edited content
    if(!editedContent || editedContent === ''){
      if(props.onSubmitError) {
        props.onSubmitError('Set Name is Required!')
      }
      setEditing(false)
      setEditedContent(undefined)
      return
    }
    //case unchanged content
    if(props.text === content || props.text == editedContent){
      setEditedContent(undefined)
      setEditing(false)
      if(props.onCancel) {
        props.onCancel()
      }
      return
    }
    //case changed content
    else if(editedContent !== content){
      props.onSubmitText(editedContent)
      setContent(editedContent)
      setEditedContent(undefined)
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
        {`${editedContent ?? content}?`}
      </span>
      <input 
        className={`font-thin p-0 text-2xl border-transparent disabled:cursor-default ring-transparent ${props.className}`}
        value={editedContent ?? content} 
        type="text" 
        ref={inputRef}
        style={{ width: width, minWidth: props.minWidth }}
        disabled={!editing}
        placeholder={props.placeholder}
        onChange={(event) => {
          if(editing){
            setEditedContent(event.target.value)
          }
        }}
        onKeyDown={(event) => {
          if(event.key === 'Enter'){
            handleSubmit()
          }
          else if(event.key == 'Escape'){
            setEditedContent(undefined)
            setEditing(false)
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
              setEditedContent(content)
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