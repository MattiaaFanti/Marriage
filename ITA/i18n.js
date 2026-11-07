/* Italiano: traduzione visiva dell'intero flusso RSVP.
   I valori tecnici e gli indirizzi email rimangono invariati. */
(() => {
  'use strict';
  const terms = new Map(Object.entries({
    "Tap to start music":"Tocca per avviare la musica",
    "Find your invitation":"Trova il tuo invito",
    "Type at least 3 letters of your first name or surname. Select the suggestion if one appears, or press Search.":"Inserisci almeno 3 lettere del nome o del cognome. Se compare un suggerimento, selezionalo; altrimenti cerca.",
    "Name or surname":"Nome o cognome",
    "Your name or surname":"Il tuo nome o cognome",
    "The RSVP database is not connected.":"Il sistema delle conferme non è collegato.",
    "Searching…":"Ricerca in corso…","Search invitation":"Cerca il tuo invito",
    "YOUR INVITATION":"IL TUO INVITO","Invitation unavailable":"Invito non disponibile",
    "Search again":"Cerca di nuovo",
    "Select Attending or Not Attending for":"Seleziona Parteciperò o Non parteciperò per",
    "every person":"ogni invitato","on your invitation.":"presente sull'invito.",
    "Attending":"Parteciperò","Not Attending":"Non parteciperò",
    "See you there!":"Ci vediamo alla festa!","I'll be there in spirit":"Sarò con voi con il pensiero",
    "Continue":"Continua","PLEASE REVIEW":"CONTROLLA LE RISPOSTE",
    "Confirm your answers":"Conferma le tue risposte","Saving…":"Salvataggio…",
    "Save responses":"Salva le risposte","Edit responses":"Modifica le risposte",
    "A LITTLE NOTE FROM US":"UN PICCOLO PROMEMORIA",
    "Celebrate in":"Festeggia in","Burgundy":"bordeaux",
    "We would be delighted to see you dressed in your finest semi-formal attire, complemented by our suggested color palette.":"Saremo felici di vedervi con un abbigliamento semiformale, ispirato ai colori scelti per il nostro matrimonio.",
    "SHADES OF RED TO BURGUNDY":"DAL ROSSO AL BORDEAUX",
    "Red":"Rosso","Crimson":"Cremisi","Cherry":"Ciliegia",
    "Wine":"Vino","Maroon":"Granata",
    "Consider it noted":"Ho capito","We’ll miss you":"Ci mancherete",
    "Though distance may keep us apart, you will always have a special place in our hearts.":"Anche se la distanza ci separa, avrete sempre un posto speciale nei nostri cuori.",
    "We warmly invite you to join us virtually and be part of our special day as we exchange our vows and begin this beautiful journey together.":"Vi invitiamo a partecipare virtualmente alla nostra giornata, mentre ci scambiamo le promesse e iniziamo insieme questo nuovo viaggio.",
    "WITH LOVE,":"CON AMORE,",
    "Thank you!":"Grazie!",
    "All responses for your invitation have been recorded.":"Abbiamo registrato tutte le risposte relative al vostro invito.",
    "Would you like to receive your invitation confirmation by e-mail?":"Desideri ricevere la conferma dell'invito tramite email?",
    "E-mail address":"Indirizzo email",
    "Enter your e-mail address":"Inserisci il tuo indirizzo email",
    "Sending your confirmation…":"Invio della conferma in corso…",
    "Sending…":"Invio in corso…",
    "Send email - See you soon!":"Invia l'email · A presto!",
    "Skip - I don't want a confirmation e-mail":"Salta · Non desidero ricevere la conferma via email",
    "Email sent successfully!":"Email inviata correttamente!",
    "Your wedding confirmation has been sent to":"La conferma del matrimonio è stata inviata a",
    "See you soon!":"A presto!",
    "Your email is on its way!":"La tua email è in arrivo!",
    "We are processing your wedding confirmation for":"Stiamo elaborando la conferma del matrimonio per",
    "OK":"OK",
    "Too many searches. Please try again later.":"Troppe ricerche. Riprova più tardi.",
    "Confirmation service unavailable.":"Il servizio email non è disponibile.",
    "Could not save your e-mail preference.":"Impossibile salvare la preferenza email.",
    "No attending guest needs a new email confirmation.":"Nessun invitato necessita di una nuova conferma via email.",
    "Please enter a valid e-mail address.":"Inserisci un indirizzo email valido.",
    "The confirmation e-mail service is not available.":"Il servizio di conferma email non è disponibile.",
    "Preparing your confirmation email…":"Preparazione dell'email di conferma…",
    "The confirmation could not be submitted.":"Impossibile inoltrare la richiesta di conferma.",
    "The confirmation service did not accept the email request.":"Il servizio non ha accettato la richiesta email.",
    "Email could not be submitted. Please retry.":"Impossibile inviare la richiesta email. Riprova.",
    "Select a response for every person before continuing.":"Seleziona una risposta per ogni invitato prima di proseguire.",
    "Enter at least 3 letters of your name or surname.":"Inserisci almeno 3 lettere del nome o del cognome.",
    "The RSVP database is not connected yet.":"Il sistema delle conferme non è ancora collegato.",
    "Unable to find the invitation.":"Impossibile trovare l'invito.",
    "Invalid invitation data.":"Dati dell'invito non validi.",
    "Search failed.":"Ricerca non riuscita.",
    "Answer for every person.":"Rispondi per ogni invitato.",
    "Could not save your responses.":"Impossibile salvare le risposte.",
    "Could not save. Please retry.":"Impossibile salvare. Riprova.",
    "Your invitation session expired. Search your name again.":"Sessione scaduta. Cerca di nuovo il tuo nome.",
    "Your invitation session has expired. Search your name again.":"Sessione scaduta. Cerca di nuovo il tuo nome.",
    "This invitation session has expired. Search your name again.":"Sessione scaduta. Cerca di nuovo il tuo nome.",
    "Invitation not found.":"Invito non trovato.",
    "Invitation not found. Check the spelling of your name.":"Invito non trovato. Controlla la grafia del nome.",
    "Several invitations match. Please enter your full name.":"Sono presenti diversi inviti. Inserisci il nome completo.",
    "Several guests match. Please choose your name from the suggestions.":"Più invitati corrispondono alla ricerca. Seleziona il tuo nome fra i suggerimenti.",
    "You must answer for every person in your group.":"Devi rispondere per ogni persona del gruppo.",
    "Select Attending or Not Attending for every person.":"Seleziona Parteciperò o Non parteciperò per ogni invitato.",
    "Confirm all guest responses first.":"Conferma prima le risposte di tutti gli invitati.",
    "The confirmation recipients changed. Reopen your invitation.":"I destinatari sono cambiati. Riapri l'invito.",
    "No attendee is awaiting an email confirmation.":"Nessun invitato è in attesa della conferma via email.",
    "Enter a valid e-mail address.":"Inserisci un indirizzo email valido.",
    "Confirmation image is too large.":"L'immagine di conferma è troppo grande.",
    "The confirmation image is invalid or too large.":"L'immagine di conferma non è valida o è troppo grande.",
    "The confirmation PNG image is corrupted.":"L'immagine di conferma PNG è danneggiata.",
    "Background email delivery is temporarily unavailable.":"L'invio email è temporaneamente non disponibile.",
    "Gmail confirmation is not configured yet. Please contact the couple.":"L'invio Gmail non è ancora configurato. Contatta gli sposi.",
    "An email request for these guests is already being processed.":"È già in elaborazione una richiesta email per questi invitati.",
    "A guest changed their response while the email was being prepared.":"Un invitato ha cambiato risposta durante la preparazione dell'email.",
    "Could not accept the email request.":"Impossibile accettare la richiesta email.",
    "No guests to send to.":"Nessun destinatario per l'email.",
    "Ninang":"Madrina","Ninong":"Padrino","Nina":"Madrina","Nino":"Padrino",
    "Tito":"Zio","Tita":"Zia","Umpe":"Zio","Kuya":"Fratello maggiore",
    "Butch's Friends":"Amici di Butch",
    "Monday":"Lunedì","December":"dicembre"
  }));
  function localize(value){
    const raw=String(value||''),trim=raw.trim();
    if(!trim)return raw;
    const direct=terms.get(trim);
    if(direct!==undefined)return raw.replace(trim,direct);
    let match=trim.match(/^(\d+) seats? reserved$/i);
    if(match)return raw.replace(trim,Number(match[1])===1?'1 posto riservato':match[1]+' posti riservati');
    match=trim.match(/^(\d+) of (\d+) responses selected$/i);
    if(match)return raw.replace(trim,match[1]+' risposte selezionate su '+match[2]);
    const sentence='Select Attending or Not Attending for every person on your invitation.';
    if(trim===sentence)return raw.replace(trim,'Seleziona Parteciperò o Non parteciperò per tutti gli invitati.');
    return raw;
  }
  function applyTo(root){
    if(!root)return;
    const scope=root.nodeType===1?root:null;
    const skip=node=>node?.parentElement?.closest('script,style,svg,textarea,code,[contenteditable="true"]');
    if(root.nodeType===3&&!skip(root)){
      const next=localize(root.nodeValue);
      if(next!==root.nodeValue)root.nodeValue=next;
    }
    if(scope){
      for(const key of ['placeholder','aria-label','title']){
        if(scope.hasAttribute(key)){
          const value=scope.getAttribute(key),newValue=localize(value);
          if(value!==newValue)scope.setAttribute(key,newValue);
        }
      }
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(skip(node))continue;
      const next=localize(node.nodeValue);
      if(next!==node.nodeValue)node.nodeValue=next;
    }
    if(scope)for(const el of scope.querySelectorAll('[placeholder],[aria-label],[title]')){
      for(const key of ['placeholder','aria-label','title']){
        if(!el.hasAttribute(key))continue;
        const value=el.getAttribute(key),next=localize(value);
        if(value!==next)el.setAttribute(key,next);
      }
    }
  }
  const start=()=>{
    applyTo(document.body);
    const watcher=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='characterData')applyTo(record.target);
        else if(record.type==='attributes')applyTo(record.target);
        else for(const node of record.addedNodes)applyTo(node);
      }
    });
    watcher.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,
      attributeFilter:['placeholder','aria-label','title']});
  };
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.ITALIAN_WEDDING_TRANSLATE=applyTo;
})();