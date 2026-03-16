interface CollectionSidePanelButtonProps {
  activeConsole?: "sets" | "favorites" | "watermarks" | "share" | "users" | "cover"
  console: "sets" | "favorites" | "watermarks" | "share" | "users" | "cover"
  onClick: () => void
  title: string
  disable?: boolean
}

export const CollectionSidePanelButton = (props: CollectionSidePanelButtonProps) => {
  return (
    <button 
      className={`
        py-1 px-2 enabled:hover:border-gray-300 rounded-lg border border-transparent 
        disabled:opacity-60 disabled:hover:cursor-not-allowed w-full
        ${props?.activeConsole === props.console ? 'text-black' : 'text-gray-400'}
      `}
      onClick={() => {props.onClick()}}
      disabled={props.disable}
    >
      {props.title}
    </button>
  )
}