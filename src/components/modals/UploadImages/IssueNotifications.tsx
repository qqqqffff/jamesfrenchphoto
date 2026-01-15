import { Alert, FlowbiteColors } from "flowbite-react";
import { DynamicStringEnumKeysOf } from "../../../utils";
import { Dispatch, SetStateAction } from "react";

export interface UploadIssue {
  id: string,
  visible: boolean
}

export enum UploadIssueType {
  'duplicate' = 'duplicate',
  'invalid-file' = 'invalid-file',
  'small-file' = 'small-file'
}

export const IssueNotifications = (props: {
  issues: Map<UploadIssueType, UploadIssue[]>, 
  setIssues: Dispatch<SetStateAction<Map<UploadIssueType, UploadIssue[]>>>
}) => {
  return (
    <div className="flex relative w-full -top-6">
      <div className="absolute z-10 w-full flex flex-col gap-2 items-center justify-center mt-2">
        {Array.from(props.issues.entries()).map(([type, issues]) => {
          return issues.filter(issue => issue.visible).map((issue) => {
            if(!issues) return undefined
            let message = 'Error'
            let color: DynamicStringEnumKeysOf<FlowbiteColors> = type === 'small-file' ? 'yellow' : 'red'

            switch(type) {
              case 'duplicate':
                message = 'Duplicate files uploaded may have been uploaded.'
                break
              case 'invalid-file':
                message = 'Invalid files have been automatically removed!'
                break
              case 'small-file':
                message = 'Uploaded image(s) may be small and display poorly.'
                break
            }

            return (
              <Alert 
                key={issue.id}
                color={color} 
                className="w-[90%] opacity-75"
                onDismiss={() => {
                  const temp = new Map(props.issues)
                  temp.set(type, (temp.get(type) ?? []).map((i) => i.id === issue.id ? { ...i, visible: false } : i))
                  props.setIssues(temp)
                }}
              >
                {message}
              </Alert>
            )
          })
        })}
      </div>
    </div>
    
  )
}