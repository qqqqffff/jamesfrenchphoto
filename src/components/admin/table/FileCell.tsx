import { ComponentProps, useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "../../modals";
import { useMutation } from "@tanstack/react-query";
import { TableService, UploadColumnFileParams } from "../../../services/tableService";
import { TableColumn } from "../../../types";
import { parsePathName } from "../../../utils";
import { HiOutlineXCircle } from "react-icons/hi2";
import { HiOutlineDownload } from "react-icons/hi";
import { DownloadImageMutationParams, PhotoPathService } from "../../../services/photoPathService";
import { CgSpinner } from "react-icons/cg";

interface FileCellProps extends ComponentProps<'td'> {
  TableService: TableService,
  value: string,
  updateValue: (text: string) => void,
  column: TableColumn,
  rowIndex: number,
  PhotoPathService: PhotoPathService,
  search: string,
}

export const FileCell = (props: FileCellProps) => {
  const [value, setValue] = useState('')
  const [replaceFileVisible, setReplaceFileVisible] = useState(false)
  const [deleteFileVisible, setDeleteFileVisible] = useState(false)
  const fileRef = useRef<File | null>(null)

  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const uploadFile = useMutation({
    mutationFn: (params: UploadColumnFileParams) => props.TableService.uploadColumnFileMutation(params),
    onSuccess: (data) => {
      props.updateValue(data)
      setValue(data)
      setReplaceFileVisible(false)
      fileRef.current = null
    }
  })

  const downloadFile = useMutation({
    mutationFn: (params: DownloadImageMutationParams) => props.PhotoPathService.downloadImageMutation(params),
    onSettled: (file) => {
      if (file) {
        try {
          const url = window.URL.createObjectURL(file)
          const link = document.createElement('a')
          link.href = url
          link.download = file.name
          link.click()
          window.URL.revokeObjectURL(url)
        } catch (error) {
          console.error(error)
        }
      }
    },
  })

  const cellColoring = props.rowIndex % 2 ?  'bg-gray-200 bg-opacity-40' : '';
  const selectedSearch = props.search !== '' && value.toLowerCase().includes(props.search)

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
        onClose={() => {
          setReplaceFileVisible(false)
          fileRef.current = null
        }}
        open={replaceFileVisible}
      />
      <ConfirmationModal
        title="Delete File"
        body="Continuing will <b>DELETE</b> this file, which will permanently delete this file. This action cannot be undone!"
        denyText="Cancel"
        confirmText="Delete"
        confirmAction={async () => {
          await uploadFile.mutateAsync({
            column: props.column,
            index: props.rowIndex,
            options: {
              logging: true
            }
          })
        }}
        onClose={() => {
          setDeleteFileVisible(false)
          fileRef.current = null
        }}
        open={deleteFileVisible}
      />
      <td className={`
        text-ellipsis border py-3 px-3 max-w-[150px] 
        ${selectedSearch ? 'outline outline-green-400' : ''}
        ${cellColoring}
      `}>
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
            <div
              className="flex flex-row items-center gap-1"
            >
              <button
                onClick={() => setDeleteFileVisible(true)}
              >
                <HiOutlineXCircle size={16} className="text-gray-400 hover:text-gray-800" />
              </button>
              <button
                disabled={downloadFile.isPending}
                className="disabled:hover:cursor-wait enabled:hover:cursor-pointer"
                onClick={() => {
                  downloadFile.mutate({
                    path: value,
                    options: {
                      logging: true
                    }
                  })
                }}
              >
                {downloadFile.isPending ? (
                  <CgSpinner size={16} className="animate-spin text-gray-400"/>
                ) : (
                  <HiOutlineDownload size={16} className="text-gray-400 hover:text-gray-800"/>
                )}
              </button>
            </div>
          )}
        </div>
        
        <input
          // multiple={false}
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

            event.target.value = ''
          }}
          type="file"
        />
      </td>
    </>
  )
}