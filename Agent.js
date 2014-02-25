console.log('Iniciant mòdul agent.');

var os = require('os'),
    http = require('http');


var ResumenEstadisticas = function(id, segonsPeriode, timestamp, memoriaTotal, memoriaLibre, usCpuPeriode) {
	this.id = id;
    this.segonsPeriode = segonsPeriode;
	this.timestamp = timestamp;
	this.memoriaTotal = memoriaTotal;
	this.memoriaLibre = memoriaLibre;
	this.usCpuPeriode = usCpuPeriode;
}


var Estadistica = function () {
    var fecha = new Date();
    this.fechaHoraDato = fecha.getTime();
//  this.fechaHoraDato = fecha.getTime() / 1000 / (60 * 60 * 24 * 365.25);
//  this.fechaHoraDato = fecha.getHours() + ':' + fecha.getMinutes() + ':' + fecha.getSeconds() + '.' + fecha.getMilliseconds();
    this.memoriaLibre = os.freemem();
    this.TiempoCpuTotal = this._obtTiempoCpuTotal();
    this.TiempoCpuParada = this._obtTiempoCpuParada();
};


Estadistica.prototype._obtTiempoCpuTotal = function() {
    var dadesCPUs = os.cpus();
    var tempsTotal = 0;

    for (var ii = 0; ii < dadesCPUs.length; ii++) {
        var cpuActual = dadesCPUs[ii];
        tempsTotal = tempsTotal + cpuActual.times.user +
                                  cpuActual.times.nice +
                                  cpuActual.times.sys +
                                  cpuActual.times.idle +
                                  cpuActual.times.irq;
    };

    return tempsTotal;
};


Estadistica.prototype._obtTiempoCpuParada = function() {
    var dadesCPUs = os.cpus();
    var tempsParada = 0;

    for (var ii = 0; ii < dadesCPUs.length; ii++) {
        var cpuActual = dadesCPUs[ii];
        tempsParada = tempsParada + cpuActual.times.idle;
    };

    return tempsParada;
};


var Agente = function (id, segons) {
    this.id = id;       // this.id -> id de l'objecte: heap <<<--->>> id a la dreta del '=' -> paràmetre id: stack.
    this.segons = segons;
    this.memoriaTotal = os.totalmem();
    this.datosEstadisticos = [];
    console.info('Objecte agent inicialitzat amb l\'id ' + this.id + ' i ' + this.segons + ' segons.');
}


Agente.prototype._agregarEstadistica = function() {
    var estadisticaActual = new Estadistica();
    this.datosEstadisticos.push(estadisticaActual);
    console.log('Nova estadística registrada: ' + JSON.stringify(estadisticaActual));
    if (this.datosEstadisticos.length > (this.segons + 1)) {
        console.log('Massa estadístiques registrades. Esborrant la més antiga.');
        this.datosEstadisticos.shift();
    };
};


Agente.prototype.activar = function() {
    var self = this;                            // Manera de salvar el problema de undefined que es produiria més endavant amb this.
	var contador = 0;
    console.info('Agent ' + this.id + ' activat.');
    setInterval(function() {
/*      console.log('**** ' + this.id);         // Això dona undefined.
        console.log('**** ' + self.id);
        var zData = new Date();
        console.log(zData.getHours() + ':' + zData.getMinutes() + ':' + zData.getSeconds() + '.' + zData.getMilliseconds());
*/
		contador = contador + 1;
        self._agregarEstadistica();
		var cpu = self.obtUsoCpuMedioUltPeriodo();
		var mensaje = (cpu == undefined) ? 'No disponible.' : cpu + '%';
        console.log('Ús mitjà de CPU dels últims ' + self.segons + ' segons: ' + mensaje);
//		console.log(JSON.stringify(self));
		if (contador % self.segons == 0) {
			var resumen = new ResumenEstadisticas(self.id, self.segons, new Date().getTime(), self.memoriaTotal, os.freemem(), cpu);
			self._enviarResumen(resumen);
		}
    }, 1000);
};


Agente.prototype._enviarResumen = function(resumen) {
    console.log('Enviant resum.');
	var serializacionResumen = JSON.stringify(resumen);
	var llargSerial = Buffer.byteLength(serializacionResumen);
	var opciones = {host: '127.0.0.1',
	                port: 80,
					path: '/estadistica',
					method: 'POST',
					headers: {
						'Content-Type' : 'application/json',
						'Content-Length' : llargSerial
					}
	};
	var peticion = http.request(opciones);
	peticion.write(serializacionResumen);
	peticion.end();
}


Agente.prototype.obtUsoCpuMedioUltPeriodo = function() {
    if (this.datosEstadisticos.length < this.segons) {
        return;
    };

    var tiempoMedioTotal = 0;
    var tiempoMedioParado = 0;
    var porcUsoMedio = 0;

    for (var ii = 1; ii < this.datosEstadisticos.length; ii++) {
        tiempoMedioTotal  = tiempoMedioTotal  + (this.datosEstadisticos[ii].TiempoCpuTotal - 
                                                 this.datosEstadisticos[ii - 1].TiempoCpuTotal);
        tiempoMedioParado = tiempoMedioParado + (this.datosEstadisticos[ii].TiempoCpuParada - 
                                                 this.datosEstadisticos[ii - 1].TiempoCpuParada);
    };

    tiempoMedioTotal = tiempoMedioTotal / this.datosEstadisticos.length;
    tiempoMedioParado = tiempoMedioParado / this.datosEstadisticos.length;
    porcUsoMedio = parseInt(((tiempoMedioTotal - tiempoMedioParado) / tiempoMedioTotal) * 10000) / 100;

    return porcUsoMedio;
};


if ((process.argv.length < 3) || (process.argv.length > 4)) {
	console.warn('Nombre d\'arguments incorrecte (Id de l\'agent i nombre de segons).');
} else {
	var nomAgent = process.argv[2];
	var segons = parseInt(process.argv[3]);

    if ((segons >= 4) && (segons <= 60)) {
        var miAgente = new Agente(nomAgent, segons);
        miAgente.activar();
    } else {
        console.warn('L\'argument d\'interval de segons ha de ser un valor numèric entre 4 i 60.');
    }
}
