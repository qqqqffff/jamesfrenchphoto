import { FC, useState } from "react";
import { ModalProps } from ".";
import { Button, Dropdown, Label, Modal, TextInput } from "flowbite-react";
import { HiOutlineXMark } from "react-icons/hi2";
import PDFViewer from "../common/PDFViewer";
import { uploadData } from "aws-amplify/storage";
import { v4 } from 'uuid'
import { Package, UserTag } from "../../types";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { textInputTheme } from "../../utils";

const client = generateClient<Schema>()

interface CreatePackageProps extends ModalProps {
    tags: UserTag[]
}

export const CreatePackageModal: FC<CreatePackageProps> = ({ onClose, open, tags }) => {
    const [fileUpload, setFileUpload] = useState<{key: string, value: File}>()
    const [activeTag, setActiveTag] = useState<UserTag>()
    const [name, setName] = useState<string>('')
    const [submitting, setSubmitting] = useState(false)

    async function SubmitPackage(){
        setSubmitting(true)

        let pack: Package | undefined

        if(fileUpload && name && activeTag){
            const path = (await uploadData({
                path: `packages/${v4()}_${fileUpload.value.name.replace(/\s/g, '_').replace(/[^a-zA-Z._]+/g, '')}`,
                data: fileUpload.value
            }).result).path

            console.log(path)

            const response = await client.models.Package.create({
                name: name,
                tagId: activeTag.id,
                pdfPath: path,
            })

            console.log(response)

            if(response.data){
                pack = {
                    ...response.data,
                    tag: activeTag
                }
            }
        }

        setSubmitting(false)
        setFileUpload(undefined)
        setName('')
        setActiveTag(undefined)
        onClose(pack)
    }

    function packageTagDropdownLabel(tag?: UserTag) {
        if(tags.length == 0) {
            return (
                <span>None</span>
            )
        }
        if(tag){
            return (
                <span className={`text-${tag.color ?? 'black'}`}>{tag.name}</span>
            )
        }
        return (
            <span>Select a Tag</span>
        )
    }


    return (
        <Modal show={open} onClose={() => {
            setFileUpload(undefined)
            onClose()
        }}>
            <Modal.Header>Create a new package</Modal.Header>
            <Modal.Body className="flex flex-col">
                {/* //TODO: add error component */}
                <div className="flex flex-row gap-4">
                    <div className="flex flex-col gap-2 mb-4 w-[60%]">
                        <Label className="ms-2 font-medium text-lg" htmlFor="name">Package Name:</Label>
                        <TextInput sizing='md' theme={textInputTheme} placeholder="Package Name" type="text" id="name" name="name" onChange={(event) => setName(event.target.value)} value={name} />
                    </div>
                    <div className="flex flex-col gap-2 mb-4 w-[40%]">
                        <Label className="ms-2 font-medium text-lg" htmlFor="name">Package Tag:</Label>
                        <Dropdown
                            label={packageTagDropdownLabel(activeTag)}
                            color="light"
                            disabled={tags.length == 0}
                        >
                            {tags.map((tag, index) => {
                                return (
                                    <Dropdown.Item key={index} onClick={() => setActiveTag(tag)}>
                                        {packageTagDropdownLabel(tag)}
                                    </Dropdown.Item>
                                )
                            })}
                        </Dropdown>
                    </div>
                </div>
                
                { fileUpload === undefined ? (
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF Files Only</p>
                            </div>
                            <input id="dropzone-file" type="file" className="hidden" 
                                accept="application/pdf"
                                onChange={async (event) => {
                                    if(event.target.files){
                                        const files = Array.from(event.target.files)
                                        console.log(files[0].type, files)
                                        const blob = new Blob([await files[0].arrayBuffer()], { type: files[0].type })

                                        const fileUpload = { 
                                            key: URL.createObjectURL(blob), 
                                            value: files[0] 
                                        }
                                        
                                        setFileUpload(fileUpload)
                                    }
                                }}/>
                        </label>
                    </div>
                ) : (<></>)}
                <Label className="ms-2 font-semibold text-xl mt-3" htmlFor="name">Preview:</Label>
                {fileUpload ? 
                    (<>
                        <div className="flex flex-col gap-1">
                            <PDFViewer fileUrl={fileUpload.value} width={573} />
                            <div className="flex flex-row ms-6 justify-between me-16">
                                <span className="underline font-semibold">File Name:</span>
                                <span className="underline font-semibold">Size:</span>
                            </div>
                            <div className="flex flex-row ms-6 justify-between me-6">
                                <span>{fileUpload.value.name}</span>
                                <div className="flex flex-row gap-2">
                                    <span>{(fileUpload.value.size * 0.000001).toFixed(4)} MB</span>
                                    <button className="hover:border-gray-500 border border-transparent rounded-full p-0.5" type='button' 
                                        onClick={() => setFileUpload(undefined)}
                                    >
                                        <HiOutlineXMark size={20}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                    </>) 
                    : 
                    (<div className="flex flex-col">
                        <span className=" italic text-sm ms-6">Upload files to preview them here!</span>
                        <span className=" italic text-sm ms-6">Note: Only one tag is allowed per package</span>
                    </div>)
                }     
            </Modal.Body>
            <Modal.Footer className="flex flex-row justify-end border-t mt-4">
                <Button className="text-xl w-[40%] max-w-[8rem] mt-4" onClick={SubmitPackage} isProcessing={submitting} disabled={!(fileUpload && name && activeTag)}>Upload</Button>
            </Modal.Footer>
        </Modal>
    )
}