import { FC } from "react";
import { ModalProps } from ".";
import { Modal } from "flowbite-react";

export const TermsAndConditionsModal: FC<ModalProps> = ({ open, onClose }) => {
    return (
        <Modal onClose={() => onClose()} show={open}>
            <Modal.Header>Terms and Conditions</Modal.Header>
            <Modal.Body className="max-h-[600px]">
                <div className="mx-2">
                    <h3 className="font-bold">1. Introduction</h3>
                    <p className="ms-4">
                        By creating an account with <strong>James French Photography</strong> ("we," "us," "our"), you ("User," "you") agree to abide by these Terms and Conditions. Please read them carefully, as they constitute a legally binding agreement between you and <strong>James French Photography</strong>. If you do not agree to these terms, you may not create an account or use our services.
                    </p>

                    <h3 className="font-bold">2. User Account</h3>

                    <h4 className="font-semibold">2.1. Account Security</h4>
                    <p className="ms-4">
                        You are responsible for maintaining the confidentiality of your account information and for all activities under your account. Notify us immediately of any unauthorized use of your account.
                    </p>

                    <h3 className="font-bold">3. Communication and Consent to Receive Emails</h3>

                    <h4 className="font-semibold">3.1. Types of Communications</h4>
                    <p className="ms-4">
                        By creating an account, you consent to receive communications from us electronically via the email address associated with your account. These communications may include account notifications, updates, and other information related to our services.
                    </p>

                    <h4 className="font-semibold">3.2. Opt-Out Options</h4>
                    <p className="ms-4">
                        You may opt out of promotional emails at any time by following the unsubscribe instructions included in each email. Even if you opt out, we may still send you transactional or account-related emails that are necessary to maintain your account.
                    </p>

                    <h3 className="font-bold">4. User Responsibilities</h3>

                    <h4 className="font-semibold">4.1. Accurate Information</h4>
                    <p className="ms-4">
                        You agree to provide accurate and complete information when creating your account and to keep your account information updated.
                    </p>

                    <h4 className="font-semibold">4.2. Prohibited Activities</h4>
                    <p className="ms-4">
                        You agree not to misuse our services or violate any applicable laws, including by engaging in illegal, fraudulent, or harmful activities.
                    </p>

                    <h3 className="font-bold">5. Termination</h3>
                    <p className="ms-4">
                        We reserve the right to suspend or terminate your account at our discretion, without prior notice, if we believe you have violated these Terms and Conditions or engaged in any unlawful or harmful conduct.
                    </p>

                    <h3 className="font-bold">6. Changes to Terms and Conditions</h3>
                    <p className="ms-4">
                        We reserve the right to modify these Terms and Conditions at any time. We will notify you of significant changes via email or through our website. By continuing to use our services after such changes, you agree to the updated Terms and Conditions.
                    </p>

                    <h3 className="font-bold">7. Contact Information</h3>
                    <p className="ms-4">
                        If you have any questions or concerns about these Terms and Conditions, please contact us at <strong><a href="mailto:contact@jamesfrenchphotography.com" className="hover:underline underline-offset-2">contact@jamesfrenchphotography.com</a></strong>.
                    </p>

                    <p className="ms-4"><em>Last Updated: 11-4-2024</em></p>
                </div>
            </Modal.Body>
        </Modal>
    )
}