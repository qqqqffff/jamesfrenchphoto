import { ConfirmationModal as confirmation } from './Confirmation'
import { CreateCollectionModal as createCollection } from './CreateCollection';
import { CreateTimeslotModal as createTimeslot } from './CreateTimeslot';
import { CreateUserModal as createUser } from './CreateUser';
import { EditTimeslotModal as editTimeslot } from './EditTimeslot';
import { ForgotPasswordModal as forgotPassword } from './ForgotPassword';
import { LinkParticipantModal as linkParticipant } from './LinkParticipant';
import { LinkUserModal as linkUser } from './LinkUser';
import { LoadingModal as loading } from './Loading';
import { PackageItemLoaderModal as packageItemLoader } from './PackageItemLoader';
import { TermsAndConditionsModal as termsAndConditions } from './TermsAndConditions';
import { UnauthorizedEmailModal as unauthorizedEmail } from './UnauthorizedEmail';

import { UploadImagesModal as uploadImages } from './UploadImages/UploadImages'

export type ModalProps = {
    open: boolean;
    onClose: Function;
}

export const ConfirmationModal = confirmation
export const CreateCollectionModal = createCollection
export const CreateTimeslotModal = createTimeslot
export const CreateUserModal = createUser
export const EditTimeslotModal = editTimeslot
export const ForgotPasswordModal = forgotPassword
export const LinkParticipantModal = linkParticipant
export const LinkUserModal = linkUser
export const LoadingModal = loading
export const PackageItemLoaderModal = packageItemLoader
export const TermsAndConditionsModal = termsAndConditions
export const UnauthorizedEmailModal = unauthorizedEmail

export const UploadImagesModal = uploadImages;