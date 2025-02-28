import { Schema } from "../../data/resource";
import sgMail from '@sendgrid/mail'

const template = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
      <!--[if !mso]><!-->
      <meta http-equiv="X-UA-Compatible" content="IE=Edge">
      <!-- <![endif]-->
      <!--[if (gte mso 9)|(IE)]>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
      <![endif]-->
      <!--[if (gte mso 9)|(IE)]>
  <style type="text/css">
    body {width: 600px;margin: 0 auto;}
    table {border-collapse: collapse;}
    table, td {mso-table-lspace: 0pt;mso-table-rspace: 0pt;}
    img {-ms-interpolation-mode: bicubic;}
  </style>
<![endif] -->
      <style type="text/css">
    body, p, div {
      font-family: inherit;
      font-size: 14px;
    }
    body {
      color: #000000;
    }
    body a {
      color: #1188E6;
      text-decoration: none;
    }
    p { margin: 0; padding: 0; }
    table.wrapper {
      width:100% !important;
      table-layout: fixed;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
      -moz-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    img.max-width {
      max-width: 100% !important;
    }
    .column.of-2 {
      width: 50%;
    }
    .column.of-3 {
      width: 33.333%;
    }
    .column.of-4 {
      width: 25%;
    }
    ul ul ul ul  {
      list-style-type: disc !important;
    }
    ol ol {
      list-style-type: lower-roman !important;
    }
    ol ol ol {
      list-style-type: lower-latin !important;
    }
    ol ol ol ol {
      list-style-type: decimal !important;
    }
    @media screen and (max-width:480px) {
      .preheader .rightColumnContent,
      .footer .rightColumnContent {
        text-align: left !important;
      }
      .preheader .rightColumnContent div,
      .preheader .rightColumnContent span,
      .footer .rightColumnContent div,
      .footer .rightColumnContent span {
        text-align: left !important;
      }
      .preheader .rightColumnContent,
      .preheader .leftColumnContent {
        font-size: 80% !important;
        padding: 5px 0;
      }
      table.wrapper-mobile {
        width: 100% !important;
        table-layout: fixed;
      }
      img.max-width {
        height: auto !important;
        max-width: 100% !important;
      }
      a.bulletproof-button {
        display: block !important;
        width: auto !important;
        font-size: 80%;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      .columns {
        width: 100% !important;
      }
      .column {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      .social-icon-column {
        display: inline-block !important;
      }
      #link:hover {
        text-decoration-line: underline;
      }
      #link {
        text-decoration-line: none;
      }
    }
  </style>
      <!--user entered Head Start--><link href="https://fonts.googleapis.com/css?family=DM+Serif+Display&display=swap" rel="stylesheet"><style>
    body {font-family: 'DM Serif Display', serif;}
</style><!--End Head user entered-->
    </head>
    <body>
      <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#f1f1f1;">
        <div class="webkit">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#f1f1f1">
            <tr>
              <td valign="top" bgcolor="#f1f1f1" width="100%">
                <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="100%">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <!--[if mso]>
    <center>
    <table><tr><td width="600">
  <![endif]-->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center">
                                      <tr>
                                        <td role="modules-container" style="padding:0px 0px 0px 0px; color:#000000; text-align:left;" bgcolor="#FFFFFF" width="100%" align="left"><table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">
    <tr>
      <td role="module-content">
        <p></p>
      </td>
    </tr>
  </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 0px 30px 10px;" bgcolor="#000000" data-distribution="1">
    <tbody>
      <tr role="module-content">
        <td height="100%" valign="top"><table width="570" style="width:570px; border-spacing:0; border-collapse:collapse; margin:0px 10px 0px 10px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-0">
      <tbody>
        <tr>
          <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="f4a414df-a163-417a-95dd-bbcbad52b8a0">
    <tbody>
      <tr>
        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
          <span class="max-width" border="0" style="display:block; color:#ffffff; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:24px;" width="251" alt="" data-proportionally-constrained="true" data-responsive="false" src="" height="33">James French Photography</span>
        </td>
      </tr>
    </tbody>
  </table></td>
        </tr>
      </tbody>
    </table></td>
      </tr>
    </tbody>
  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="cb56948d-1f08-4be0-8178-b17cd448e133" data-mc-module-version="2019-10-22">
    <tbody>
      <tr>
        <td style="padding:40px 0px 10px 40px; line-height:36px; text-align:inherit; background-color:#85c1e9;" height="100%" valign="top" bgcolor="#739e86" role="module-content">
          <div>
            <div style="font-family: inherit; text-align: inherit;">
              <span style="color: #ffffff; font-size: 42px; font-family: inherit; text-wrap-mode: wrap; text-wrap: stable;">{{header_1}}</span>
            </div>
          <div>
        </div>
      </div>
    </td>
  </tr>
  </tbody>
  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="cb56948d-1f08-4be0-8178-b17cd448e133.1" data-mc-module-version="2019-10-22">
    <tbody>
      <tr>
        <td style="padding:18px 0px 30px 40px; line-height:28px; text-align:inherit; background-color:#85c1e9;" height="100%" valign="top" bgcolor="#739e86" role="module-content">
          <div>
            <div style="font-family: inherit; text-align: inherit">
              <span style="color: #ffffff; font-size: 28px; font-family: inherit; text-wrap-mode: wrap; text-wrap: stable;">{{header_2}}</span>
            </div>
            <div></div>
          </div>
        </td>
      </tr>
    </tbody>
  </table><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a14e01f4-fd68-4f7a-bb08-453a2be0f1c9">
    <tbody>
      <tr>
        <td style="font-size:6px; line-height:10px; padding-left: 1rem; padding-right: 1rem; position: relative;" valign="top" align="center">
          <div style="position: relative; display: inline-block; width: 100%;">
            <img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px; max-width:100% !important; width:100%; height:auto !important;" width="600" alt="" data-proportionally-constrained="true" data-responsive="true" src="../../../secrets/CAMI5795.jpg">
            <span style="position: absolute; top: 60%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #000000; font-size: 32px; font-family: inherit; bottom: -100px;">{{collection_name}}</span>
          </div>
        </td>
      </tr>
    </tbody>
  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="cb56948d-1f08-4be0-8178-b17cd448e133.1.1" data-mc-module-version="2019-10-22">
    <tbody>
      <tr>
        <td style="padding:40px 20px 10px 40px; line-height:28px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content">
          <div>
            <div style="font-family: inherit; text-align: inherit">
              <span style="color: #2874a6; font-size: 28px; font-family: inherit; text-wrap-mode: wrap; text-wrap: stable;">{{body_1}}</span>
            </div>
            <div></div>
          </div>
        </td>
      </tr>
    </tbody>
  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="cb56948d-1f08-4be0-8178-b17cd448e133.1.1.1" data-mc-module-version="2019-10-22">
    <tbody>
      <tr>
        <td style="padding:18px 20px 30px 40px; line-height:20px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content">
          <div>
            <div style="font-family: inherit; text-align: inherit">
              <span style="color: #2874a6; font-size: 18px; font-family: inherit; text-wrap-mode: wrap; text-wrap: stable;">{{footer}}</span>
            </div>
            <div></div>
          </div>
        </td>
      </tr>
    </tbody>
  </table><table class="module" role="module" data-type="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="38d9c9c6-c486-4e61-a94c-96a7c47ef96b">
    <tbody>
      <tr>
        <td style="padding:0px 30px 0px 30px;" role="module-content" height="100%" valign="top" bgcolor="">
          <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" height="3px" style="line-height:3px; font-size:3px;">
            <tbody>
              <tr>
                <td style="padding:0px 0px 3px 0px;" bgcolor="#2874a6"></td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
    <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:10px 0px 0px 0px;" bgcolor="#FFFFFF" data-distribution="1,1">
      <tbody>
        <tr role="module-content">
          <td height="100%" valign="top">
            <table width="280" style="width:280px; border-spacing:0; border-collapse:collapse; margin:0px 20px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-0">
              <tbody>
                <tr>
                  <td style="padding:0px;margin:0px;border-spacing:0;">
                    <table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="cb56948d-1f08-4be0-8178-b17cd448e133.1.1.1.1.1" data-mc-module-version="2019-10-22">
                      <tbody>
                        <tr>
                          <td style="padding:18px 20px 30px 40px; line-height:20px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content">
                            <div>
                              <div style="font-family: inherit; text-align: inherit">
                                <a href={{collection_link}}>
                                  <span style="color: #2874a6; font-size: 18px; font-family: inherit">
                                    <u>View Collection Here</u>
                                  </span>
                                </a>
                              </div>
                              <div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table width="280" style="width:280px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 20px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-1">
              <tbody>
                <tr>
                  <td style="padding:0px;margin:0px;border-spacing:0;"></td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </table>
</td>
</tr>
                                    </table>
                                    <!--[if mso]>
                                  </td>
                                </tr>
                              </table>
                            </center>
                            <![endif]-->
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </center>
    </body>
  </html>`

export const handler: Schema['ShareCollection']['functionHandler'] = async (event) => {
  const emails = event.arguments.email

  if(!process.env.SENDGRID_API_KEY) return JSON.stringify('Missing API Key')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  if(!process.env.BASE_LINK) return JSON.stringify('Missing Base Link')

  //elements
  const header = event.arguments.header
  const header2 = event.arguments.header2
  const body = event.arguments.body
  const footer = event.arguments.footer
  const link = process.env.BASE_LINK + '/' + event.arguments.link
  const name = event.arguments.name
  
  //transformation
  const modifiedTemplate = template
    .replace('{{header_1}}', header ?? '')
    .replace('{{header_2}}', header2 ?? '')
    .replace('{{cover_path}}', `'${link}'`)
    .replace('{{body_1}}', body ?? '')
    .replace('{{footer}}', footer ?? '')
    .replace('{{collection_link}}', `'${link}'`)
    .replace('{{collection_name}}', name)

  //send message

  const message: sgMail.MailDataRequired = {
    to: emails,
    from: 'no-reply@jamesfrenchphotography.com',
    subject: `James French Photography Collection: ${name}`,
    html: modifiedTemplate,
  }

  const response = await sgMail.send(message)
  console.log(response)

  return JSON.stringify([response])
}