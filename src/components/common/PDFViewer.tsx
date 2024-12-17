import { FC, useState } from "react";
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Button } from "flowbite-react";
import { HiOutlineMagnifyingGlassPlus, HiOutlineMagnifyingGlassMinus } from "react-icons/hi2";

type PackageManagerProps = {
    fileUrl: File | null
    hieght?: number
    width?: number
}

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const PDFViewer: FC<PackageManagerProps> = ({ fileUrl, width, hieght }) => {
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState(1)

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

    

    return (
        <div className="rounded-lg border border-gray-400">
            <div className="flex flex-row justify-between p-2">
                <div className="flex flex-row items-center gap-2">
                    <Button
                        disabled={pageNumber <= 1}
                        type='button'
                        onClick={() => {
                            setPageNumber((prev) => prev - 1)
                        }}
                        color="light"
                        size="sm"
                    >
                        Previous
                    </Button>
                    <span>
                        Page {pageNumber} of {numPages}
                    </span>
                    <Button
                        disabled={pageNumber >= (numPages ?? 0)}
                        type='button'
                        onClick={() => {
                            setPageNumber((prev) => prev + 1)
                        }}
                        color="light"
                        size="sm"
                    >
                        Next
                    </Button>
                </div>
                <div className="flex flex-row gap-2">
                    <Button
                        disabled={scale >= 2}
                        type='button'
                        onClick={() => {
                            setScale(scale + 0.1)
                        }}
                        color="light"
                        size="sm"
                        pill
                    >
                        <HiOutlineMagnifyingGlassPlus size={22}/>
                    </Button>
                    <Button
                        disabled={scale <= 0.5}
                        type='button'
                        onClick={() => {
                            setScale(scale - 0.1)
                        }}
                        color="light"
                        size="sm"
                        pill
                    >
                        <HiOutlineMagnifyingGlassMinus size={22}/>
                    </Button>
                </div>
            </div>
            <div className="mt-1 items-center justify-center flex flex-row">
                <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
                    <Page pageNumber={pageNumber} width={width} height={hieght} scale={scale} />
                </Document>
            </div>
        </div>
    );
}

export default PDFViewer