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
  navigateTo: (id: string) => void
}) => {
  let renderCount = 0;
  return (
    <div className="flex relative w-full -top-6">
      <div className="absolute z-10 w-full flex flex-col gap-2 items-center justify-center mt-2">
        {Array.from(props.issues.entries())
        .map(([type, issues]) => {
          if(renderCount >= 3) return null
          return issues.filter(issue => issue.visible)
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((issue) => {
            if(!issues || renderCount >= 3) return undefined
            renderCount++;
            let message = 'Error'
            let color: DynamicStringEnumKeysOf<FlowbiteColors> = type === 'small-file' ? 'yellow' : 'red'

            switch(type) {
              case 'duplicate':
                message = ' may be a duplicate file.'
                break
              case 'invalid-file':
                message = ' is an invalid file!'
                break
              case 'small-file':
                message = ' is small and may display poorly.'
                break
            }

            return (
              <Alert 
                key={issue.id}
                color={color} 
                className={`w-full opacity-75 border ${renderCount > 1 ? '-mt-12' : ''}`}
                onDismiss={() => {
                  const temp = new Map(props.issues)
                  temp.set(type, (temp.get(type) ?? []).map((i) => i.id === issue.id ? { ...i, visible: false } : i))
                  props.setIssues(temp)
                }}
              >
                <div className="flex gap-2">
                  <button 
                    className="font-bold flex flex-row max-w-[225px] truncate hover:underline"
                    onClick={() => {
                      props.navigateTo(issue.id)
                    }}
                  >{issue.id}</button>
                  <span>{message}</span>
                </div>
              </Alert>
            )
          })
        })}
      </div>
    </div>
    
  )
}