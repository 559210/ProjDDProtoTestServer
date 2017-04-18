var log4js = require('log4js')
log4js.configure({
	appenders: [
		{type: 'console'},
		{type: 'file', filename: __dirname + "/logs/gw.log",category:'gw',maxLogSize: 5120000, backups: 1000},
		{type: 'file', filename: __dirname + "/logs/gs.log",category:'gs',maxLogSize: 5120000, backups: 1000},
		{type: 'file', filename: __dirname + "/logs/gm.log",category:'gm',maxLogSize: 5120000, backups: 1000},
		{type: 'file', filename: __dirname + "/logs/gb.log",category:'gb',maxLogSize: 5120000, backups: 1000},
		{type: 'file', filename: __dirname + "/logs/bs.log",category:'bs',maxLogSize: 5120000, backups: 1000},
		{type: 'file', filename: __dirname + "/logs/rs.log",category:'rs',maxLogSize: 5120000, backups: 1000},
		{type: 'file', filename: __dirname + "/logs/other.log",category:'other',maxLogSize: 5120000, backups: 1000},
	]
});

var gwLogger4js = log4js.getLogger('gw');
var gsLogger4js = log4js.getLogger('gs');
var gmLogger4js = log4js.getLogger('gm');
var gbLogger4js = log4js.getLogger('gb');
var bsLogger4js = log4js.getLogger('bs');
var rsLogger4js = log4js.getLogger('rs');
var otherLogger4js = log4js.getLogger('other');

// GW信息日志
module.exports.gwInfoLog = function (s){
	s = process.pid + " -> " + s;
	gwLogger4js.info(s);
}

// GW错误日志
module.exports.gwErrLog = function (s){
	s = process.pid + " -> " + s;
	gwLogger4js.error(s);
}

// GS信息日志
module.exports.gsInfoLog = function (s){
	s = process.pid + " -> " + s;
	gsLogger4js.info(s);
}

// GS错误日志
module.exports.gsErrLog = function (s){
	s = process.pid + " -> " + s;
	gsLogger4js.error(s);
}

// GM信息日志
module.exports.gmInfoLog = function (s){
	s = process.pid + " -> " + s;
	gmLogger4js.info(s);
}

// GM错误日志
module.exports.gmErrLog = function (s){
	s = process.pid + " -> " + s;
	gmLogger4js.error(s);
}

// GB信息日志
module.exports.gbInfoLog = function (s){
	s = process.pid + " -> " + s;
	gbLogger4js.info(s);
}

// GB错误日志
module.exports.gbErrLog = function (s){
	s = process.pid + " -> " + s;
	gbLogger4js.error(s);
}

// other信息日志
module.exports.otherInfoLog = function (s){
	s = process.pid + " -> " + s;
	otherLogger4js.info(s);
}

// other错误日志
module.exports.otherErrLog = function (s){
	s = process.pid + " -> " + s;
	otherLogger4js.error(s);
}

// bs信息日志
module.exports.bsInfoLog = function (s){
	s = process.pid + " -> " + s;
	bsLogger4js.info(s);
}

// bs错误日志
module.exports.bsErrLog = function (s){
	s = process.pid + " -> " + s;
	bsLogger4js.error(s);
}

// rs信息日志
module.exports.rsInfoLog = function (s){
	s = process.pid + " -> " + s;
	rsLogger4js.info(s);
}

// rs错误日志
module.exports.rsErrLog = function (s){
	s = process.pid + " -> " + s;
	rsLogger4js.error(s);
}


