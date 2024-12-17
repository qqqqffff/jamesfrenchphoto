import { FC, useState } from "react";
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Button } from "flowbite-react";

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

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

    return (
        <div className="rounded-lg border border-gray-400 mt">
            <div className="mt-1">
                <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
                    <Page pageNumber={pageNumber} width={width} height={hieght} />
                </Document>
            </div>
            <div className="flex flex-row items-center p-2">
                <Button
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber((prev) => prev - 1)}
                    color="light"
                    size="sm"
                >
                    Previous
                </Button>
                <span style={{ margin: '0 10px' }}>
                    Page {pageNumber} of {numPages}
                </span>
                <Button
                    disabled={pageNumber >= (numPages ?? 0)}
                    onClick={() => setPageNumber((prev) => prev + 1)}
                    color="light"
                    size="sm"
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

export default PDFViewer