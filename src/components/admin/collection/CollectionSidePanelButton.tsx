interface CollectionSidePanelButtonProps {
  activeConsole?: "sets" | "favorites" | "watermarks" | "share" | "users" | "cover"
  console: "sets" | "favorites" | "watermarks" | "share" | "users" | "cover"
  onClick: () => void
  title: string
}

export const CollectionSidePanelButton = (props: CollectionSidePanelButtonProps) => {
  return (
    <button 
      className={`
        py-1 px-2 hover:border-gray-300 rounded-lg border border-transparent 
        ${props?.activeConsole === props.console ? 'text-black' : 'text-gray-400'}
      `}
      onClick={() => {props.onClick()}}
    >
      {props.title}
    </button>
  )
}