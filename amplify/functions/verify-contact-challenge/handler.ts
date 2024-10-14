import { Schema } from "../../data/resource";
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise'

const projectId = 'jamesfrenchphotography'
const action = 'contact'

export const handler: Schema['VerifyContactChallenge']['functionHandler'] = async (event) => {
    let { token } = event.arguments

    const client = new RecaptchaEnterpriseServiceClient()
    const projectPath = client.projectPath(projectId)

    const request = ({
        assessment: {
            event: {
                token: token,
                siteKey: process.env.GOOGLE_RECAPTCHA_SECRET_KEY
            }
        },
        parent: projectPath
    })

    const [ response ] = await client.createAssessment(request)

    if(!response.tokenProperties?.valid || !response.riskAnalysis){
        return JSON.stringify(`Create asssesment failed because ${response.tokenProperties?.invalidReason}`)
    }

    return JSON.stringify({data: {
        score: response.riskAnalysis?.score,
        reasons: response.riskAnalysis?.reasons,
        response: response
    }})
}