import { ApplePayConfig, useEligibleMethods, SdkInstance, usePayPal } from "@paypal/react-paypal-js/sdk-v6"
import { useEffect, useRef, useState } from "react"
import { CollectPaymentIntent, PaymentType } from '../../types'
import { generateApplePaymentLabel } from "../../functions/paymentFunctions"


interface ApplePayCheckoutFormProps {
  formtype: PaymentType
  intent: CollectPaymentIntent
}

export const ApplePayCheckoutForm = (props: ApplePayCheckoutFormProps) => {
  const eligible = useEligibleMethods()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const paypal = usePayPal()

  useEffect(() => {
    if(
      eligible.eligiblePaymentMethods && 
      paypal.sdkInstance
    ) {
      const applePayEligible = eligible.eligiblePaymentMethods.isEligible('applepay')
      const applePayConfig = eligible.eligiblePaymentMethods.getDetails('applepay').config
      if(applePayEligible && containerRef.current) {
        containerRef.current.innerHTML = 
        `<apple-pay-button id="apple-pay-button" buttonstyle="black" type="buy" locale="en">`

        document.getElementById('apple-pay-button')?.addEventListener('click', () => {
          if(paypal.sdkInstance) {
            const session = paypal.sdkInstance.createApplePayOneTimePaymentSession()

            const paymentRequest: ApplePayJS.ApplePayPaymentRequest = {
              ...session.formatConfigForPaymentRequest(applePayConfig),
              countryCode: 'US',
              currencyCode: 'USD',
              requiredBillingContactFields: ['postalAddress', 'email'],
              total: {
                label: generateApplePaymentLabel(props.intent),
                amount: props.intent.amount.toFixed(2)
              }
            }

            const appleSdkSession = new ApplePaySession(4, paymentRequest)

            appleSdkSession.onvalidatemerchant = async (event) => {
              const payload = await session.validateMerchant({
                validationUrl: event.validationURL,
                displayName: 'James French Photography',
                domainName: window.location.href.includes('staging') ? 'staging.jamesfrenchphoto.com' : 'jamesfrenchphoto.com'
              })
              appleSdkSession.completeMerchantValidation(payload.merchantSession)
            }

            appleSdkSession.onpaymentauthorized = async (event) => {
              //TODO: handle order creationg based on form type
            }

            appleSdkSession.begin()
          }
          
          
        })
      }
    }
  }, [eligible.eligiblePaymentMethods, paypal.sdkInstance])

  return (
    <div ref={containerRef}></div>
  )
}