var http = require('http'),
    url = require('url'),
    nodemailer = require('nodemailer');


var processarRegistrar = function(request, response, urlTrossejada) {
//	var instanciaTrobada = false;

	if (request.method == 'GET') {
		console.log('BÉ! >> Mètode GET.');
/*
		for (var nomProp in urlTrossejada.query) {
			if (nomProp == 'instancia') {
				instanciaTrobada = true;
			}
		}
		if (instanciaTrobada == true) {
*/
		if ('instancia' in urlTrossejada.query) {
			console.log('BÉ! >> Trobat el paràmetre instancia.');
			response.writeHead(200,{
				'Content-Type' : 'text/html'
			});
			response.write('<meta charset="utf-8">');
			response.write('<p>Instància ' + urlTrossejada.query.instancia + ' registrada</p>');
		} else {
			console.log('ERR >> No trobat el paràmetre instancia.');
			response.writeHead(403);
		}
	} else {
		console.log('ERR >> Mètode diferent de GET.');
		response.writeHead(405);
	}
	response.end();
}


var EnviarCorreuE = function(textTitol, textCorreu) {
    // create reusable transport method (opens pool of SMTP connections)
    var smtpTransport = nodemailer.createTransport('SMTP',{
        service: 'Gmail',
        auth: {
            user: adrCorreuE,
            pass: contrassenya
        }
    });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '<' + adrCorreuE + '>', // sender address
        to: 'nyapas@orangemail.es', // list of receivers
        subject: textTitol, // Subject line
        text: textCorreu, // plaintext body
        html: '<b>' + textCorreu + '</b>' // html body
    }

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response) {
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + response.message);
        }

        // if you don't want to use this transport object anymore, uncomment following line
        smtpTransport.close(); // shut down the connection pool, no more messages
    });


}


function SuperaLlindar(element) {
    return (element > 40);
}

var ProcessarUsCpu = function(dades) {
    var objDades = JSON.parse(dades);
    var idAgent = objDades.id;
    var usCpu = objDades.usCpuPeriode;

    var llindarMaximCpu = 40;
    var maxRegistres = 10;
    var maxRegsConsForaLlindar = 2;
    var regsConsForaLlindar = false;

    // Si l'objecte no té com a propietat el id de l'agent, es crea.
    // El valor de la propietat es l'array que emmagatzema les mesures de ús mitjà de Cpu.
    if (!(idAgent in InfoAgents)) {
        InfoAgents[idAgent] = [];   // new Array();
    }

    // S'insereix al final de l'array el nou element.
    InfoAgents[idAgent].push(usCpu);

    // Si l'array té massa elements s'esborra el més antic (el del començament de l'array).
    if (InfoAgents[idAgent].length > maxRegistres) {
        InfoAgents[idAgent].shift();
    }

    // Si l'array té com a mínim tants elements com mesures consecutives cal comprovar
    if (InfoAgents[idAgent].length >= maxRegsConsForaLlindar) {
/*
        regsConsForaLlindar = true;
        var ii = InfoAgents[idAgent].length - maxRegsConsForaLlindar;
        while ((ii < InfoAgents[idAgent].length) && (regsConsForaLlindar)) {
            if (InfoAgents[idAgent][ii] <= llindarMaximCpu) {
                regsConsForaLlindar = false;
            }
            ii++;
        }
*/
        regsConsForaLlindar = InfoAgents[idAgent].slice(InfoAgents[idAgent].length - maxRegsConsForaLlindar, 
                                                        InfoAgents[idAgent].length - 1).every(SuperaLlindar);
    }

    if (usCpu > llindarMaximCpu) {
        console.log('Avís \'' + idAgent + '\' ' + usCpu);
        if (regsConsForaLlindar) {
            var textTitol = 'Avis d\'us de CPU agent \'' + idAgent + '\'';
            var textAvis = 'L\'agent \'' + idAgent + '\' ' +
                           'ha reportat els últims ' + maxRegsConsForaLlindar + ' valors d\'ús mitjà de la CPU ' +
                           'per sobre del ' + llindarMaximCpu + '%.';
            console.log('MAIL ' + textAvis);
            EnviarCorreuE(textTitol, textAvis);
        }
    }

}


var procesarEstadistica = function(request, response) {
	if (request.method == 'POST') {
		var dades = '';

		// es defineix el callback per event o interrupció 'data'.
		// La funció tindrà accés al stack de procesarEstadistica
		// i, per tant, a 'dades', 'request' i 'response'.
		request.on('data', function(novesDades) {
			dades = dades + novesDades.toString();
		});

		// es defineix el callback per event o interrupció 'end'.
		// Aplica el mateix que per 'data'.
		request.on('end', function() {
			//
			response.writeHead(200);
			console.log('---------- Inici bloc dades ----------');
			console.log(dades);
            ProcessarUsCpu(dades);
			console.log('---------- Fi    bloc dades ----------');
			response.end();
		});
	} else {
		console.log('ERR >> Mètode diferent de POST.');
		response.writeHead(405);
		response.end();
	}
}

var procesador = function(request, response) {

	console.log('');
	console.log('>>>>>>>>>>>>>>>>>>>> Inici processament <<<<<<<<<<<<<<<<<<<<');

	var urlTrossejada = url.parse(request.url, true);

	if (urlTrossejada.pathname == '/registrar') {
		console.log('BÉ! >> S\'ha sol·licitat "registrar".');
		processarRegistrar(request, response, urlTrossejada);
	} else if (urlTrossejada.pathname == '/estadistica') {
		console.log('BÉ! >> S\'ha sol·licitat "estadistica".');
		procesarEstadistica(request, response);
	} else {
		console.log('ERR >> Petició diferent de "registrar" i "estadistica".');
		response.writeHead(404);
		response.end();
	}

//	response.end();

	console.log('>>>>>>>>>>>>>>>>>>>> Fi    processament <<<<<<<<<<<<<<<<<<<<');
}

if (process.argv.length == 4) {
    var adrCorreuE = process.argv[2];
    var contrassenya = process.argv[3];
    var InfoAgents = new Object();
    var server = http.createServer(procesador);
    server.listen(80);
} else {
    console.warn('Cal passar l\'adreça de correuE i la contrassenya.');
}

