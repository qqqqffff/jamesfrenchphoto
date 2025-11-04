import { Schema } from "../../data/resource"
import sgMail from '@sendgrid/mail'

const template = `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
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
          <span class="max-width" border="0" style="display:block; color:#ffffff; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:24px;" width="251" alt="" data-proportionally-constrained="true" data-responsive="false" height="33">James French Photography</span>
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
        <td style="padding:40px 0px 10px 40px; line-height:32px; text-align:inherit; background-color:#85c1e9;" height="100%" valign="top" bgcolor="#739e86" role="module-content">
          <div>
            <div style="font-family: inherit; text-align: inherit;">
              <span style="color: #ffffff; font-size: 32px; font-family: inherit; text-wrap-mode: wrap; text-wrap: stable;">Welcome {{_first_}} {{_last_}},</span>
            </div>
          <div>
        </div>
      </div>
    </td>
  </tr>
  </tbody>
  </table>
  <table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="cb56948d-1f08-4be0-8178-b17cd448e133.1.1" data-mc-module-version="2019-10-22">
    <tbody>
      <tr>
        <td style="padding:40px 20px 10px 40px; line-height:28px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content">
          <div>
            <div style="font-family: inherit; text-align: inherit">
              <span style="color: #2874a6; font-size: 28px; font-family: inherit; text-wrap-mode: wrap; text-wrap: stable;">You have been invited to join!</span>
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
              <span style="color: #2874a6; font-size: 18px; font-family: inherit; text-wrap-mode: wrap; text-wrap: stable;">Click the link below to confirm your information and create a new password.</span>
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
                                <a href={{_link_}}>
                                  <span style="color: #2874a6; font-size: 18px; font-family: inherit">
                                    <u>Register Here</u>
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
  </html>
`

export const handler: Schema['ShareUserInvite']['functionHandler'] = async (event) => {
  const email = event.arguments.email

  const firstName = event.arguments.firstName
  const lastName = event.arguments.lastName
  const link = event.arguments.link

  if(!process.env.SENDGRID_API_KEY) return JSON.stringify('Missing Api Key')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  if(!email || !firstName || !lastName || !link) return JSON.stringify('Missing Required Fields')
  
  const modifiedTemplate = template
    .replace('{{_first_}}', firstName)
    .replace('{{_last_}}', lastName)
    .replace('{{_link_}}', link)

  const message: sgMail.MailDataRequired = {
    to: email,
    from: 'no-reply@jamesfrenchphotography.com',
    subject: 'You have been invited to join James French Photography',
    html: modifiedTemplate
  }

  const response = await sgMail.send(message)
  console.log(response)

  return JSON.stringify(response)
}