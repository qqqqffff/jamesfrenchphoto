import { Dispatch, SetStateAction } from "react";
import { UserTag } from "../../types";

interface TagNavigatorProps {
  setActiveTag: Dispatch<SetStateAction<UserTag | undefined>>
  activeTag: UserTag | undefined
}

export const TagNavigator = (props: TagNavigatorProps) => {
  return (
    <>{props.activeTag?.name}</>
  )
}