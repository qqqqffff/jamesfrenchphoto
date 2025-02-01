import { Alert, FlowbiteColors } from "flowbite-react";
import { DynamicStringEnumKeysOf } from "../../../utils";
import { Dispatch, SetStateAction } from "react";
import { invariant } from "@tanstack/react-router";

export interface UploadIssue {
  message: string, 
  type: 'duplicate' | 'invalid-file' | 'small-file', 
  color: DynamicStringEnumKeysOf<FlowbiteColors>,
  id: string[],
  visible: boolean
}

export const IssueNotifications = (props: {issues: UploadIssue[], setIssues: Dispatch<SetStateAction<UploadIssue[]>>}) => {
  return (
    <div className="relative z-10 w-full flex flex-col gap-2 items-center justify-center mt-2">
      {props.issues.map((issue) => {
        if(!issue.visible) return undefined
        return (
          <Alert 
            color={issue.color} 
            className="w-[90%] absolute opacity-75"
            onDismiss={() => {
              const foundIssue = props.issues.findIndex((i) => i.type === issue.type)
              invariant(foundIssue !== -1)
              const tempIssues = [...props.issues]
              tempIssues[foundIssue].visible = false
              props.setIssues(tempIssues)
            }}
          >
            {issue.message}
          </Alert>
        )
      })}
    </div>
  )
}