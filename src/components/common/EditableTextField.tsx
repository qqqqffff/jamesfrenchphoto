import { ComponentProps, ReactNode, useEffect, useRef, useState } from "react";
import { HiOutlineCheck, HiOutlinePencil } from "react-icons/hi2";

interface EditableTextFieldProps extends ComponentProps<'span'> {
  label: ReactNode
  text: string
  onSubmitText: (text: string) => void
  onSubmitError: (message: string) => void
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
  }, [editedContent])

  function handleSubmit(){
    if(!editedContent || editedContent === ''){
      props.onSubmitError('Set Name is Required!')
      setEditing(false)
      setEditedContent(undefined)
      return
    }
    if(editedContent !== content){
      props.onSubmitText(editedContent)
      setContent(editedContent)
    }
    setEditedContent(undefined)
    setEditing(false)
  }

  return (
    <span
      className="text-2xl ms-4 mb-2 flex flex-row items-center gap-2" 
      onMouseEnter={() => setShowEdit(true)}
      onMouseLeave={() => setShowEdit(false)}
    >
      {props.label}
      <span 
        className="text-2xl absolute text-transparent" 
        ref={contentSpan}
      >
        {`${editedContent ?? content}?`}
      </span>
      <input 
        className="font-thin p-0 text-2xl border-transparent disabled:cursor-default ring-transparent" 
        value={editedContent ?? content} 
        type="text" 
        ref={inputRef}
        style={{ width: width }}
        disabled={!editing}
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
          className="hover:text-gray-500"
        >
          {!editing ? (
              <HiOutlinePencil size={24} />
          ) : (
              <HiOutlineCheck size={24} />
          )}
        </button>
      )}
    </span>
  )
}