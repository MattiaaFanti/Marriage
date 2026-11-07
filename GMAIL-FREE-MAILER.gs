/*
 * Free wedding RSVP confirmation mailer for personal Gmail.
 * Copy this file into a Google Apps Script project, deploy as a Web App
 * executing as YOUR account with access "Anyone".
 *
 * In Apps Script → Project Settings → Script properties, set:
 *   WEDDING_MAIL_TOKEN = long random shared token (32+ characters)
 * Use the same token as Cloudflare Worker's secret GMAIL_SCRIPT_TOKEN.
 *
 * Never put a Gmail password or OAuth token in GitHub source.
 * Only the Cloudflare Worker should call this endpoint.
 */
function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('WEDDING_MAIL_TOKEN');
    if (!secret || secret.length < 32 || data.token !== secret) {
      return jsonResponse_({ok:false,error:'Unauthorized'});
    }
    const to = String(data.to || '').trim();
    if (to.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return jsonResponse_({ok:false,error:'Invalid recipient'});
    }
    const raw = String(data.image_base64 || '');
    if (raw.length < 1000 || raw.length > 9500000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
      return jsonResponse_({ok:false,error:'Invalid image'});
    }
    const bytes = Utilities.base64Decode(raw);
    if (bytes.length < 500 || bytes.length > 7125000 ||
        (bytes[0] & 255) !== 137 || (bytes[1] & 255) !== 80 ||
        (bytes[2] & 255) !== 78 || (bytes[3] & 255) !== 71 ||
        (bytes[4] & 255) !== 13 || (bytes[5] & 255) !== 10 ||
        (bytes[6] & 255) !== 26 || (bytes[7] & 255) !== 10) {
      return jsonResponse_({ok:false,error:'Invalid image'});
    }
    if (MailApp.getRemainingDailyQuota() < 1) {
      return jsonResponse_({ok:false,error:'Daily Gmail quota reached'});
    }
    const italian = data.locale === 'it';
    const inline = Utilities.newBlob(bytes, 'image/png',
      italian ? 'conferma-matrimonio-mattia-kirsten.png' : 'mattia-kirsten-confirmation.png');
    MailApp.sendEmail({
      to:to,
      subject:String(data.subject || (italian ?
        'Mattia & Kirsten - Conferma della partecipazione al matrimonio' :
        'Save the date! - Your Wedding Confirmation')).slice(0,180),
      body:' ',
      htmlBody:'<img src="cid:wedding" alt="'+(italian ?
        'Conferma del matrimonio di Mattia e Kirsten' :
        'Mattia and Kirsten wedding confirmation')+
        '" width="560" style="display:block;width:100%;max-width:560px;height:auto;margin:0 auto;border:0">',
      inlineImages:{wedding:inline},
      name:'Mattia & Kirsten'
    });
    return jsonResponse_({ok:true});
  } catch (error) {
    console.error('RSVP email error: ' + String(error));
    return jsonResponse_({ok:false,error:'Delivery could not be completed'});
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run this once in the Apps Script editor to request Google's permission
// to send emails from your Gmail account.
function authorizeWeddingMailer() {
  console.log('Available recipient quota: ' + MailApp.getRemainingDailyQuota());
}
