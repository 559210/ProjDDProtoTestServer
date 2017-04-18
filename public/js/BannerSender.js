var ttxwMsg = require('./TTXWMsg');
var protocol = require('./protocol');
var TTXWClient = require('./TTXWClientNet');
var ServerIp = require('./ServerIp');
var asyc = require('async');

var exp = module.exports

var SendBannerToOneGroup = exp.SendBannerToOneGroup = function(serv, text, callback) {
	var ret = false;
	var client = TTXWClient();
	client.on('error', function(err){
		callback(null, ret);
		return;
	});

	client.on('close', function(){
		client.Close();
		callback(null, ret);
	});

	client.on('connected', function(){
		var msg = ttxwMsg(protocol.GM_BANNER_REQ);
		msg.AddUInt32(0xffffffff).AddUInt32(0xffffffff).AddUInt8(0).AddString('System').AddString(text).AddString('1').AddString('2');
		client.SendMessage(msg);
	});

	client.on('message', function(msg){
		var mid = msg.GetID();
		if (mid == protocol.GM_BANNER_ACK) {
			ret = true;
			client.Close();
		}
	});

	client.Connect(serv.ip, serv.port);
}


var SendBanner = exp.SendBanner = function(servers, text, callback) {
	var servConfs = [];
	for (var k = 0; k < servers.length; ++k) {
		for (var i = 0; i < ServerIp.length; ++i) {
			if (ServerIp[i].name === servers[k]) {
				var sc = ServerIp[i].ServerConf;
				for (var j = 0; j < sc.length; ++j){
					if (sc[j].name === 'GM')
					{
						servConfs.push(sc[j]);
						break;
					}
				}
				break;
			}			
		}
	}
	asyc.map(servConfs, function(serv, cb){
		SendBannerToOneGroup(serv, text, cb);
	}, function(err, res){
		if (err) {
			callback(err);
			return;
		}
		var ret = [];
		for (var i = 0; i < res.length; ++i) {
			if (res[i] == false) {
				ret.push(servers[i]);
			}
		}

		callback(null, ret);
	});
}