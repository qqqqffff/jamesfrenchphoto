import { useState, useRef, useEffect } from 'react';

export const AutoExpandTextarea = (props: { stateUpdate: (value: string) => void, parentValue?: string, placeholder: string}) => {
  const [text, setText] = useState(props.parentValue);
  const textareaRef = useRef(null);

  useEffect(() => {
    if(props.parentValue){
      setText((prev) => {
        if(prev !== props.parentValue){
          return props.parentValue
        }
        return prev
      })
    }
  }, [props.parentValue])

  return (
    <div className="w-full">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(event) => {
          const textarea = event.target;
          setText(textarea.value);

          // Reset height to auto to correctly calculate scroll height
          textarea.style.height = 'auto';
          
          // Set height based on scroll height
          textarea.style.height = `${textarea.scrollHeight}px`;
          props.stateUpdate(textarea.value)
        }}
        placeholder={props.placeholder}
        className="w-full border-1 bg-gray-50 border-gray-300 rounded-lg p-2 resize-none overflow-hidden text-sm min-h-[100px]"
        rows={1}
      />
    </div>
  );
};
