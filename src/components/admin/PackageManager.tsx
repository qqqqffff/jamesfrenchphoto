import { HiOutlinePlusCircle } from "react-icons/hi2";
import { CreatePackageModal } from "../modals";
import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { Package, UserTag } from "../../types";
import PDFViewer from "../common/PDFViewer";
import { downloadData } from "aws-amplify/storage";
import { Badge } from "flowbite-react";
import { badgeColorThemeMap } from "../../utils";

const client = generateClient<Schema>()

export default function(){
    const [createPackageModalVisible, setCreatePackageModalVisible] = useState(false)
    const [apiCall, setApiCall] = useState(false)
    const [userTags, setUserTags] = useState<UserTag[]>([])
    const [packages, setPackages] = useState<Package[]>([])
    const [activePackage, setActivePackage] = useState<Package>()
    const [activePackagePDF, setActivePackagePDF] = useState<File>()

    useEffect(() => {
        const api = async () => {
            const userTags: UserTag[] = []
            const packages: Package[] = []

            //usertags
            userTags.push(...((await client.models.UserTag.list()).data.map((tag) => {
                const mappedTag: UserTag = {
                    ...tag,
                    color: tag.color ?? undefined,
                }
                return mappedTag
            })))

            //packages
            packages.push(...(await Promise.all((await client.models.Package.list()).data.map(async (pack) => {
                const tagResponse = await pack.tag()
                if(!tagResponse || !tagResponse.data) return
                const foundTag = userTags.find((tag) => tag.id === tagResponse.data!.id)
                if(!foundTag) return
                const mappedPackage: Package = {
                    ...pack,
                    tag: foundTag,
                }
                return mappedPackage
            }))).filter((item) => item !== undefined))

            setUserTags(userTags)
            setPackages(packages)
            setApiCall(true)
        }
        if(!apiCall){
            api()
        }
    })

    return (
        <>
            <CreatePackageModal open={createPackageModalVisible} 
                tags={
                    userTags.filter((tag) => (
                        packages
                            .map((pack) => pack.tag.id))
                            .find((packTag) => tag.id === packTag) === undefined)
                }
                onClose={(pack?: Package) => {
                    //TODO: error handling
                    if(pack){
                        setCreatePackageModalVisible(false)
                        setPackages([...packages, pack])
                    }
                    else{
                        setCreatePackageModalVisible(false)
                    }
                }} 
            />
            <div className="grid grid-cols-6 gap-2 mt-4 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2 max-h-800 overflow-y-auto gap-1">
                    <button className="flex flex-row w-full items-center justify-between hover:bg-gray-100 py-1 cursor-pointer rounded-2xl" onClick={() => setCreatePackageModalVisible(true)}>
                        <span className="text-xl ms-4 mb-1">Create A Package</span>
                        <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2"/>
                    </button>
                    <p className="border-b border-gray-300"></p>
                    {
                        packages.map((pack, index) => {
                            
                            const packageClass = `flex flex-row items-center flex-col gap-2 hover:bg-gray-100 rounded-lg py-1 px-2 w-full ${activePackage?.id == pack.id ? 'bg-gray-200' : ''}`
                            return (
                                <button className={packageClass} key={index}
                                    onClick={async () => {
                                        if(activePackage?.id !== pack.id){
                                            console.log(pack.pdfPath.substring(pack.pdfPath.indexOf('_') + 1))
                                            const result = await downloadData({
                                                path: pack.pdfPath,
                                            }).result
                                            const file = new File([await result.body.blob()], pack.pdfPath.substring(pack.pdfPath.indexOf('_') + 1), { type: result.contentType })
                                            
                                            setActivePackage(pack)
                                            setActivePackagePDF(file)
                                        }
                                        else if(activePackage?.id === pack.id){
                                            setActivePackage(undefined)
                                            setActivePackagePDF(undefined)
                                        }
                                    }}
                                >
                                    <span className="flex-col">{pack.name}</span>

                                    <Badge theme={badgeColorThemeMap} color={pack.tag.color}>{pack.tag.name}</Badge>

                                </button>
                                
                            )
                        })
                    }
                </div>
                <div className="col-span-4 border border-gray-400 rounded-lg p-2 flex flex-col items-center">
                    {activePackage && activePackagePDF ? (
                        <>
                            <PDFViewer fileUrl={activePackagePDF} width={600}/>
                        </>
                    ) : (<span>Click on a package to view</span>)}
                </div>
            </div>
        </>
        
    )
}