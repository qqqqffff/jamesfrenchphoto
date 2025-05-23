import { IEmail } from '../types';
import { sendEmail } from '../emailService';

const template = `<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><title></title><!--[if !mso]><!-- --><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]--><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style type="text/css">#outlook a { padding:0; }
          .ReadMsgBody { width:100%; }
          .ExternalClass { width:100%; }
          .ExternalClass * { line-height:100%; }
          body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
          table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
          img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
          p { display:block;margin:13px 0; }</style><!--[if !mso]><!--><style type="text/css">@media only screen and (max-width:480px) {
            @-ms-viewport { width:320px; }
            @viewport { width:320px; }
          }</style><!--<![endif]--><!--[if mso]>
        <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
        </xml>
        <![endif]--><!--[if lte mso 11]>
        <style type="text/css">
          .outlook-group-fix { width:100% !important; }
        </style>
        <![endif]--><!--[if !mso]><!--><link href="https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700" rel="stylesheet" type="text/css"><style type="text/css">@import url(https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700);</style><!--<![endif]--><style type="text/css">@media only screen and (min-width:480px) {
        .mj-column-per-100 { width:100% !important; max-width: 100%; }
      }</style><style type="text/css"></style><style type="text/css">a {
      color: #F48668;
      text-decoration: none;
      }</style><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="background-color:#FAFAFA;"><div style="background-color:#FAFAFA;"><!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]--><div style="Margin:0px auto;border-radius:8px;max-width:600px;"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-radius:8px;"><tbody><tr><td style="direction:ltr;font-size:0px;padding:15px;text-align:center;vertical-align:top;"><!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" width="600px" ><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:570px;" width="570" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]--><div style="background:#F48668;background-color:#F48668;Margin:0px auto;border-radius:8px 8px 0 0;max-width:570px;"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#F48668;background-color:#F48668;width:100%;border-radius:8px 8px 0 0;"><tbody><tr><td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;"><!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr></tr></table><![endif]--></td></tr></tbody></table></div><!--[if mso | IE]></td></tr></table></td></tr><tr><td class="" width="600px" ><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:570px;" width="570" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]--><div style="background:#FFFFFF;background-color:#FFFFFF;Margin:0px auto;border-radius:0 08px 8px;max-width:570px;"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;border-radius:0 08px 8px;"><tbody><tr><td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;"><!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:570px;" ><![endif]--><div class="mj-column-per-100 outlook-group-fix" style="font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%"><tr><td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:Trebuchet MS;font-size:22px;font-weight:600;line-height:1;text-align:center;color:#173940;">Welcome to James French Photography</div></td></tr><tr><td style="font-size:0px;word-break:break-word;"><!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="20" style="vertical-align:top;height:20px;"><![endif]--><div style="height:20px;">&nbsp;</div><!--[if mso | IE]></td></tr></table><![endif]--></td></tr><tr><td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:Trebuchet MS;font-size:16px;line-height:1;text-align:center;color:#173940;">Hello {{email}}, here is a link to create your account:</div></td></tr><tr><td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:1;text-align:center;color:#000000;"><a href="{{link}}">Create Account</a></div></td></tr></table></div><!--[if mso | IE]></td></tr></table><![endif]--></td></tr></tbody></table></div><!--[if mso | IE]></td></tr></table></td></tr></table><![endif]--></td></tr></tbody></table></div><!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]--><div style="Margin:0px auto;border-radius:8px;max-width:600px;"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-radius:8px;"><tbody><tr><td style="direction:ltr;font-size:0px;padding:15px;text-align:center;vertical-align:top;"><!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" width="600px" ><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:570px;" width="570" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]--><div style="background:#FFFFFF;background-color:#FFFFFF;Margin:0px auto;border-radius:8px;max-width:570px;"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;border-radius:8px;"><tbody><tr><td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;"><!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:570px;" ><![endif]--><div class="mj-column-per-100 outlook-group-fix" style="font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%"><tr><td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:Trebuchet MS;font-size:16px;line-height:1;text-align:center;color:#173940;">Ran into a problem ? Do not hesitate to contact us at <a href="mailto:contact@jamesfrenchphotography.com"><b>contact@jamesfrenchphotography.com</b></a></div></td></tr></table></div><!--[if mso | IE]></td></tr></table><![endif]--></td></tr></tbody></table></div><!--[if mso | IE]></td></tr></table></td></tr></table><![endif]--></td></tr></tbody></table></div><!--[if mso | IE]></td></tr></table><![endif]--></div></body></html>`

export const handler = async (event: IEmail) => {
  const attributes = Object.entries(event.attributes)
	if (!attributes || attributes.length <= 0){
		throw new Error(JSON.stringify(['no message attributes', event]))
	}

	let email = event.address
	let uid: string | undefined = event.attributes['uid']
	let expiration: Date | undefined = new Date(event.attributes['expiration'] ? event.attributes['expiration'] : new Date(new Date().getTime() + 24 * 60 * 60 * 1000))
  console.log(email, uid, expiration)
	
	//something went wrong
	if(!email || !uid || !expiration){
		throw new Error(JSON.stringify(['Error response from event bridge, stopping queue', event]))
	}
	else if(expiration.getTime() < new Date().getTime()){
		throw new Error(JSON.stringify(['Authentication Expired' , event]))
	}

	//temporary link for testing
	let link: string | undefined
	// if(Aws.STACK_NAME.includes('sandbox')) {
		link = `http://localhost:5173/register?emai=${email}&auth=${uid}`
	// }

	// if(!link) {
	// 	throw new Error(JSON.stringify('Production link is not created yet'))
	// }

	console.log('Using Link: ', link)
  
  const sesResponse = await sendEmail(
    template.replace('{{email}}', email).replace('{{link}}', link),
    'User Creation Notification',
    'no-reply@jamesfrenchphotography.com',
    email
  )
	if(sesResponse.$metadata.httpStatusCode !== 200){
		throw new Error(JSON.stringify(['Failed to send ses message', sesResponse]))
	}
	console.log([event, sesResponse])
  return JSON.stringify([event])
}