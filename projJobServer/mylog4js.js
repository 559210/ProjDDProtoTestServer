var log4js = require('log4js')
log4js.configure({
	appenders: [
		{type: 'file', filename: __dirname + "/logs/success.log",category:'sucess',maxLogSize: 5120000, backups: 1000},
		{type: 'file', filename: __dirname + "/logs/error.log",category:'error',maxLogSize: 5120000, backups: 1000},
		{type: 'file', filename: __dirname + "/logs/other.log",category:'other',maxLogSize: 5120000, backups: 1000},
	]
});

var sucessLogger4js = log4js.getLogger('sucess');
var errorLogger4js = log4js.getLogger('error');
var otherLogger4js = log4js.getLogger('other');

module.exports.sucessLog = function (s){
	sucessLogger4js.info(s);
};

module.exports.errorLog = function (s){
	errorLogger4js.info(s);
};

module.exports.otherLog = function (s){
	otherLogger4js.info(s);
};


