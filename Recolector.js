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


function SuperaLlindar(element) {
    return (element > 40);
}

function EnviarCorreuE = function() {
    // create reusable transport method (opens pool of SMTP connections)
    var smtpTransport = nodemailer.createTransport('SMTP',{
        service: 'Gmail',
        auth: {
            user: 'gmail.user@gmail.com',
            pass: 'userpass'
        }
    });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: 'Fred Foo ✔ <foo@blurdybloop.com>', // sender address
        to: 'bar@blurdybloop.com, baz@blurdybloop.com', // list of receivers
        subject: 'Hello ✔', // Subject line
        text: 'Hello world ✔', // plaintext body
        html: '<b>Hello world ✔</b>' // html body
    }

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response) {
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + response.message);
        }

        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
    });


}

var ProcessarUsCpu = function(dades) {
    var objDades = JSON.parse(dades);
    var idAgent = objDades.id;
    var usCpu = parseInt(objDades.usCpuPeriode * 10000) / 100;      // conversió de tant per 1 a % amb dos decimals.

    var llindarMaximCpu = 40;
    var maxRegistres = 10;
    var maxRegsConsForaLlindar = 6;
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
            console.log('MAIL \'' + idAgent + '\' Últims ' + maxRegsConsForaLlindar + ' superen ' + llindarMaximCpu + ' %.');
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
    var correuE = process.argv[2];
    var contrassenya = process.argv[3];
    var InfoAgents = new Object();
    var server = http.createServer(procesador);
    server.listen(80);
} else {
    console.warn('Cal passar l\'adreça de correuE i la contrassenya.');
}

