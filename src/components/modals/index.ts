import { UploadImagesModal as uploadImages } from './UploadImages/UploadImages'
import { CreateUserModal as createUser } from './CreateUser';
import { ConfirmationModal as confirmation } from './Confirmation'
import { CreateTimeslotModal as createTimeslot } from './CreateTimeslot';
import { TermsAndConditionsModal as termsAndConditions } from './TermsAndConditions';
import { CreateCollectionModal as createCollection } from './CreateCollection';
import { EditTimeslotModal as editTimeslot } from './EditTimeslotModal';
import { UnauthorizedEmailModal as unauthorizedEmail } from './UnauthorizedEmail';
import { LoadingModal as loading } from './Loading';


export type ModalProps = {
    open: boolean;
    onClose: Function;
}

export const UploadImagesModal = uploadImages;
export const CreateUserModal = createUser
export const ConfirmationModal = confirmation
export const CreateTimeslotModal = createTimeslot
export const TermsAndConditionsModal = termsAndConditions
export const CreateCollectionModal = createCollection
export const EditTimeslotModal = editTimeslot
export const UnauthorizedEmailModal = unauthorizedEmail
export const LoadingModal = loading