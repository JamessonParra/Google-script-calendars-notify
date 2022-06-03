/**
 * This script have commets spanish and english.
 * Only the english its for descriptions and variables into the functions
 * and the spanish for the descriptive actions lines
 * Hugs! 
 */

var config = null;

function configuration() {
  return {

    //Bucle personalizado para mayor optimización
    bucle             : function(r,callback,i=0){ while(r[i]){ callback(r[i],i); i++; } },
    
    //URL completo del sheet donde guardar la info
    sheetCalendar     : "https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXX/edit#gid=XXXXXXXXX",
    sheetForSMS       : "https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXX/edit#gid=XXXXXXXXX",
    sheetSmsLogs      : "https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXX/edit#gid=XXXXXXXXX",
    sheetSmsMedi      : "https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXX/edit#gid=XXXXXXXXX",
    colourForSMS      : "#b7e1cd",
    
    fechaInicio       : "2022-"+new Date().getDay()+"-01",
    separadorInvitados: "|",

    // ****** TWILIO ****** <<< WhatsApp notifications | TEST its a Sandbox for testing in twilio
    twilioURL         : "https://api.twilio.com/2010-04-01/Accounts/XXXX/Messages.json",
    //                          ------ TEST ------
    // twilioAccountSID  : "AC0b9215bfa5ab790ae60a4ca1396dbe81",   
    // twilioAuthToken   : "994eeefa6db4ad8816f96923b517504b",    
    // twilioPhone       : "+14155238886",

    //                       ------ PRODUCCION  ------
    twilioAccountSID  : "YOU-twilioAccountSID",
    twilioAuthToken   : "YOU-twilioAuthToken",
    twilioPhone       : "YOU-twilioPhone", // <<<< Needs a twilio phone activate from SMS and WhatsApp  

    // ****** SMS-MASIVOS ******   <<< SMS notifications (ARGENTINA COUNTRY)
    smsUrl            : "http://servicio.smsmasivos.com.ar/enviar_sms.asp?API=1&",
    textMasivo:{
      patient       : 'Text Here what do u want',
      errorMedics   : 'TRIGGER STATUS: No data para SMS-Medics',
      errorPatients : 'TRIGGER STATUS: No data para SMS-Patients',
    },
    smsMasivo_TEST    : [  
      "TOS=1144445555",
      "USUARIO=DEMO500",
      "CLAVE=DEMO500",
      "TEXTO=XXXX"
    ],
    smsMasivo_PROD    : [  
      "TOS=VAR1",
      "USUARIO=YOU-USER-SMS-MASIVE",
      "CLAVE=YOU-PASS-SMS-MASIVE",
      "TEXTO=XXXX"
    ],

    //Objetos de GoogleScript
    ss                : SpreadsheetApp,
    c                 : CalendarApp,
    urlFetch          : UrlFetchApp
  }
}

/**
 * @summary Function used for capture the events at calendars from user.
 * @author jamesson.parra@gmail.com
 * @name get_calendars
 * @returns empty
 */
function get_calendars() 
{
  //Configuracion
  if(config == null)  config = configuration();
  
  //Variables de carga
  config.data           = [];
  config.allCalendars   = [];
  config.idsCalendars   = [];
  
  //Seleccionar Hojas
  config.sheetCalendar  = getSheetById( defragUrl( config.sheetCalendar ).ss, config.ss.getActive() );

  //Settear eventos de los calendarios
  config.allCalendars   = config.c.getAllCalendars().map( e=>{ return { 
    name  : e.getName(), 
    //events: e.getEvents( new Date( config.fechaInicio ), new Date() ) << If you want events Between dates
    events: e.getEventsForDay(new Date()) // Events today
  }});
  
  //Take first all idCalendars at google sheet for duplicate prevent
  config.idsCalendars   = config
                          .sheetCalendar
                          .getRange("A2:B"+config.sheetCalendar.getLastRow()) // Ranges depends of the GoogleSheet
                          .getValues()
                          .filter(e=>e!="")
  ;
  
  if(config.idsCalendars.length) config.idsCalendars = config.idsCalendars.map((r,i)=>r.shift()+r.shift());

  config.bucle( config.allCalendars ,function(r,i)
  { 
    //Si existen eventos en el calendario
    if( r.events.length ) config.bucle(r.events,function(rr,i)
    {
      //Si el evento no esta registrado
      if( !config.idsCalendars.includes( rr.getId()+rr.getStartTime() )) 
        config.data.push([
          rr.getId(),                                                                       //ID-Evento
          rr.getStartTime(),                                                                //Inicio (Fecha)
          rr.getStartTime(),                                                                //Inicio (Hora)
          rr.getTitle().trim(),                                                             //Titulo
          rr.getLocation().trim(),                                                          //Locacion
          r.name,                                                                           //Nombre del Calendario
          rr.getGuestList().map(e=>{return e.getEmail()}).join( config.separadorInvitados ) //Invitados
        ]);
    });
  });

  if(!config.data.length) return;

  config.sheetCalendar.getRange( 
    config.sheetCalendar.getLastRow()+1,  //FILA
    1,                                    //COLUMNA
    config.data.length,                   //CANT_FILAS
    config.data[0].length                 //CANT_COLUMNAS
  )
  .setValues(config.data);

  config.sheetCalendar.insertRowsAfter(config.sheetCalendar.getLastRow(), 1);  

}

/**
 * @summary Function used only for capture the dataset. 
 * @author jamesson.parra@gmail.com
 * @name patients_notification
 * @returns empty
 */
function patients_notification()
{
  let to_notify = [];

  //Configuracion
  if(config == null)  config  = configuration();

  //Apertura y selección de las hojas por ID
  config.sheetForSMS  = getSheetById( defragUrl( config.sheetForSMS ).ss,   config.ss.getActive() );
  config.sheetSmsLogs = getSheetById( defragUrl( config.sheetSmsLogs ).ss,  config.ss.getActive() );
  config.sheetSmsMedi = getSheetById( defragUrl( config.sheetSmsMedi ).ss,  config.ss.getActive() );

  // ****** Sección Pacientes  ******  
  config.sheetForSMS.getRange("E2:E"+config.sheetForSMS.getLastRow())
                    .getBackgrounds()
                    .filter((r,i)=>{ 
                      if(r[0] == config.colourForSMS) to_notify.push("X:X".replace(/X/gi,i+2));
                    });
  
  //Si no hay personas, retornar error en logs
  if(!to_notify.length) config.sheetSmsLogs
                              .getRange( config.sheetSmsLogs.getLastRow()+1, 1, 1, 1 )
                              .setValues([["-",new Date(),config.textMasivo.errorPatients,"-"]]);

  else                  actions_by_notify(to_notify,"patients");

  // ****** Sección Medicos ****** 
  to_notify = [];

  //Obtenemos la data para los medicos
  config.sheetSmsMedi .getRange("E2:F"+config.sheetSmsMedi.getLastRow())
                      .getDisplayValues()
                      .filter(r=>{ if(r[0] != "") to_notify.push(r); });

  //Si no hay medicos, registrar logs
  if(!to_notify.length) config.sheetSmsLogs
                              .getRange( config.sheetSmsLogs.getLastRow()+1, 1, 1, 4 )
                              .setValues([["-",new Date(),config.textMasivo.errorMedics,"-"]]);

  else                  actions_by_notify(to_notify,"medics");

}

/**
 * @summary This function only works with parameters previusly setted with information for send the SMS.
 *          It will record the registration information depending on the parameters 
 * @name actions_by_notify
 * @author jamesson.parra@gmail.com
 * @returns empty
 * @to_notify: array
 * @type: String
 */
function actions_by_notify( to_notify,type ){

  let to_report=[], request, response;

  //to_notify = to_notify.slice(0,1);

  switch(type)
  {
    case 'patients':
    
      //Extraer los datos y su contenido para notificar
      config.sheetForSMS.getRangeList(to_notify)
                        .getRanges()
                        .filter((r,i)=>{
                          if(!i) to_notify = [];
                          to_notify.push(r.getDisplayValues().shift());
                        });

      to_notify.filter(r=>
      {
        [id,,hora,lugar,nombre,dni,contacto] = r;

        nombre  = nombre.length > 10 ? nombre.substr(0,8)+".." : nombre;
        request = config.smsUrl + 
                  config.smsMasivo_PROD.join("&")
                  .replace( 'VAR1', contacto                  )
                  .replace( 'XXXX', config.textMasivo.patient )
                  .replace( 'VAR2', nombre                    )
                  .replace( 'VAR3', hora                      )
                  .replace( 'VAR4', lugar                     )
        ;

        try{      
          response = config.urlFetch.fetch( request ); 
          to_report.push([ id, new Date(), request,  response  ]);
        }
        catch(e){ to_report.push([ id, new Date(), request,  e ]); }

      });
    break;

    case 'medics':
      to_notify.filter(r=>
      {
        [contacto,textMsg] = r;
        
        request = config.smsUrl + 
                  config.smsMasivo_PROD.join("&")
                  .replace( 'VAR1', contacto )
                  .replace( 'XXXX', textMsg  )
        ;

        try{      
          response = config.urlFetch.fetch( request ); 
          to_report.push([ id, new Date(), request,  response  ]);
        }
        catch(e){ to_report.push([ id, new Date(), request,  e ]); }

      });
    break;
  }

  config.sheetSmsLogs 
        .getRange( config.sheetSmsLogs.getLastRow()+1, 1, to_report.length, to_report[0].length )
        .setValues( to_report )
  ;
}

function sendWhatsapp(phoneTo)
{
  
  if(config == null) config = configuration();

  try {
    config.response = config.urlFetch
                      .fetch( config.twilioURL.replace("XXXX",config.twilioAccountSID ) , { 
                      method: 'POST',
                      headers: {  Authorization: 'Basic ' + Utilities.base64Encode(config.twilioAccountSID + ':' + config.twilioAuthToken)  },
                      payload: {
                                  To  : "whatsapp:"+phoneTo.toString(),
                                  Body: "Testing desde el "+config.twilioPhone+" Google Sheet",
                                  From: "whatsapp:"+config.twilioPhone
                      },
    });
    Logger.log('sent: ' + config.response);
  } catch (err) {
    Logger.log('error: ' + err);
  }
}

function sendSMS(phoneTo)
{
  let response;

  if(config == null) config = configuration();

  try{ 
    response = config.urlFetch.fetch( config.smsUrl+config.smsMasivo_PROD.join("&").replace('XXXXX',phoneTo) ); 
    return response; 
  }catch(e){ 
    return e; 
  }

}

function defragUrl(url) {

  [, , , , , idS, idSS] = url.split("/");
  [, idSS] = idSS.split("id=");

  return {
    ss: parseInt(idSS),
    id: idS
  }
}

function getSheetById(id, ss){
  return ss.getSheets().filter( r => [id].includes(r.getSheetId()) ).shift();
}
