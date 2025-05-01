import { useState } from "react";
import { Package } from "../../../types";

interface BuilderFormProps {
  selectedPackage: Package
}
enum FormStep {
  'Details' = 'Details',
  'Items' = 'Items',
  'Users' = 'Users',
  'Review' = 'Review'
}
//TODO: add search params state initialization
export const BuilderForm = (props: BuilderFormProps) => {
  const [formStep, setFormStep] = useState<FormStep>(FormStep.Details)

  const handleNext = () => {
    switch(formStep) {
      case FormStep.Details:
        setFormStep(FormStep.Items)
        return
      case FormStep.Items:
        setFormStep(FormStep.Users)
        return
      case FormStep.Users:
        setFormStep(FormStep.Review)
        return
      case FormStep.Review:
        setFormStep(FormStep.Details)
        return
    }
  }

  const handlePrevious = () => {
    switch(formStep) {
      case FormStep.Details:
        setFormStep(FormStep.Review)
        return
      case FormStep.Items:
        setFormStep(FormStep.Details)
        return
      case FormStep.Users:
        setFormStep(FormStep.Items)
        return
      case FormStep.Review:
        setFormStep(FormStep.Users)
        return
    }
  }

  const currentStepIndex = (step: FormStep) => {
    switch(formStep) {
      case FormStep.Details:
        return 0
      case FormStep.Items:
        return 1
      case FormStep.Users:
        return 2
      case FormStep.Review:
        return 3
    }
  }

  return (
    <div className="flex flex-col h-full border">
      <div className="p-6 flex flex-row items-center w-full justify-center">
        <div className="mb-4 ms-[17.5%] w-[80%]">
          <div className="flex items-center justify-between">
            {Object.keys(FormStep).map((step, index) => {
              const stepIndex = currentStepIndex(formStep)
              return (
                <div key={index} className="relative flex-1">
                  <div className="flex items-center">
                    <div 
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center border-2
                        ${index < stepIndex ? 'bg-blue-600 border-blue-600 text-white' :
                          index === stepIndex ? 'border-blue-600 text-blue-600' : 
                          'border-gray-300 text-gray-300'
                        }
                      `}
                    >
                      {index < stepIndex ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule='evenodd' />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    {index < 3 && (
                      <div 
                        className={`flex-1 h-0.5 mx-2 ${index < stepIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                      />
                    )}
                  </div>
                  <div className={`absolute top-10 w-full text-start text-xs font-medium ${index <= stepIndex ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="self-end w-full justify-center flex">
        <span>helloworld</span>
      </div>
    </div>
  )
}