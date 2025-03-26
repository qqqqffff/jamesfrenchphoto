import { ComponentProps, useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "../../modals";
import { useMutation } from "@tanstack/react-query";
import { uploadColumnFileMutation, UploadColumnFileParams } from "../../../services/tableService";
import { TableColumn } from "../../../types";
import { parsePathName } from "../../../utils";
import { HiOutlineXCircle } from "react-icons/hi2";

interface FileCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  column: TableColumn,
  rowIndex: number
}

export const FileCell = (props: FileCellProps) => {
  const [value, setValue] = useState('')
  const [replaceFileVisible, setReplaceFileVisible] = useState(false)
  const fileRef = useRef<File | null>(null)

  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const uploadFile = useMutation({
    mutationFn: (params: UploadColumnFileParams) => uploadColumnFileMutation(params),
    onSuccess: (data) => {
      if(data){
        props.updateValue(data)
        setValue(data)
        setReplaceFileVisible(false)
        fileRef.current = null
      }
    }
  })

  return (
    <>
      <ConfirmationModal 
        title='Replace File'
        body="Continuing will <b>REPLACE</b> the old file, which will delete the previously uploaded file. This action cannot be undone!"
        denyText="Cancel"
        confirmText="Continue"
        confirmAction={async () => {
          if(fileRef.current){
            await uploadFile.mutateAsync({
              column: props.column,
              index: props.rowIndex,
              file: fileRef.current,
              options: {
                logging: true
              }
            })
          }
        }}
        onClose={() => setReplaceFileVisible(false)}
        open={replaceFileVisible}
      />
      <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
        <div className="flex flex-row items-center gap-2">
          <label 
            className="
              italic text-gray-700 text-sm cursor-pointer border py-1 px-2 rounded-lg
              hover:bg-gray-100 hover:border-gray-500
            " 
            htmlFor="file-upload"
          >
            <span>{value === '' ? 'Upload File' : parsePathName(value)}</span>
          </label>
          {value !== '' && (
            <button
              onClick={() => {
                uploadFile.mutate({
                  column: props.column,
                  index: props.rowIndex,
                  options: {
                    logging: true
                  }
                })
              }}
            >
              <HiOutlineXCircle size={16} className="text-gray-400 hover:text-gray-800" />
            </button>
          )}
        </div>
        
        <input
          multiple={false}
          id="file-upload"
          className="hidden"
          onChange={(event) => {
            if(event.target.files){
              if(value === '') {
                uploadFile.mutate({
                  column: props.column,
                  index: props.rowIndex,
                  file: Array.from(event.target.files)[0],
                  options: {
                    logging: true
                  }
                })
              }
              else {
                fileRef.current = Array.from(event.target.files)[0]
                setReplaceFileVisible(true)
              }
            }
          }}
          onBlur={() => {
            if(props.value !== value){
              props.updateValue(value)
            }
          }}
          type="file"
        />
      </td>
    </>
  )
}