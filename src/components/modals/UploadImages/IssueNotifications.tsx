import { Alert, FlowbiteColors } from "flowbite-react";
import { DynamicStringEnumKeysOf } from "../../../utils";
import { Dispatch, SetStateAction } from "react";

export interface UploadIssue {
  message: string, 
  type: 'duplicate' | 'invalid-file' | 'small-file', 
  color: DynamicStringEnumKeysOf<FlowbiteColors>,
  id: string,
  visible: boolean
}

export enum UploadIssueType {
  
}

export const IssueNotifications = (props: {issues: UploadIssue[], setIssues: Dispatch<SetStateAction<UploadIssue[]>>}) => {
  return (
    <div className="flex relative w-full -top-6">
      <div className="absolute z-10 w-full flex flex-col gap-2 items-center justify-center mt-2">
        {props.issues.map((issue) => {
          if(!issue.visible) return undefined
          let message = 'Error'
          let color = 'red'
          return (
            <Alert 
              key={issue.type}
              color={issue.color} 
              className="w-[90%] opacity-75"
              onDismiss={() => {
                const foundIssue = props.issues.findIndex((i) => i.type === issue.type)
                
                if(foundIssue === -1) {
                  //TODO: handle error
                }

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
    </div>
    
  )
}