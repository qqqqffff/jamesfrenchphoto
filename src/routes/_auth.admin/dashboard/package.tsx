import { createFileRoute, useRouter } from '@tanstack/react-router'
import { HiOutlinePlusCircle } from "react-icons/hi2";
import { useState } from "react";
import { Badge } from "flowbite-react";
import { getAllUserTagsQueryOptions } from '../../../services/userService';
import { getPackageDataFromPathQueryOptions, getPackagesByUserTagsQueryOptions } from '../../../services/packageService';
import { badgeColorThemeMap } from '../../../utils';
import { CreatePackageModal } from '../../../components/modals';
import { Package } from '../../../types';
import PDFViewer from '../../../components/common/PDFViewer';
import { useQuery } from '@tanstack/react-query';

export const Route = createFileRoute('/_auth/admin/dashboard/package')({
  component: RouteComponent,
  loader: async ({ context }) => {
    const userTags = await context.queryClient.ensureQueryData(getAllUserTagsQueryOptions({ siCollections: false }))
    const packages = await context.queryClient.ensureQueryData(getPackagesByUserTagsQueryOptions(userTags ?? []))
    return {
      userTags,
      packages,
    }
  },
  wrapInSuspense: true
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const [createPackageModalVisible, setCreatePackageModalVisible] = useState(false)
  const userTags = data.userTags
  const packages = data.packages
  const [activePackage, setActivePackage] = useState<Package>()
  const activePackagePDF = useQuery({
    ...getPackageDataFromPathQueryOptions(activePackage?.pdfPath ?? ''),
    enabled: activePackage !== undefined
  })
  const router = useRouter()
  
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
              router.invalidate()
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
                          setActivePackage(pack)
                        }
                        else if(activePackage?.id === pack.id){
                          setActivePackage(undefined)
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
          {activePackage && activePackagePDF.data ? (
            <>
              <PDFViewer fileUrl={activePackagePDF.data} width={600}/>
            </>
          ) : (<span>Click on a package to view</span>)}
        </div>
      </div>
    </>
  )
}
