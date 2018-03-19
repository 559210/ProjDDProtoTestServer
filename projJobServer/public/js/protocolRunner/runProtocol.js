'use strict';
let async = require('async');
var crypto = require('crypto');
let pomeloClass = require('./pomeloClient');

class runProtocol{

    constructor() {
        
    }

    decipheriv(enData) {
        var bufKey = new Buffer('YY`VBEyn');
        var bufIV = new Buffer('YY`VBEyn');
        var aBuffer = new Buffer(enData,'base64');
        var decipher = crypto.createDecipheriv('des',bufKey,bufIV);
        var decodeData = decipher.update(enData,'base64','utf8');
        decodeData += decipher.final('utf8');
        return decodeData;
    }

    // connector校验客户端
    checkConnector(host, port, cb) {
        var self = this;
        var pomelo = new pomeloClass();
        pomelo.init({host: host, port: port, log: true}, function(socketObj) {
            if (!socketObj) {
                return cb(new Error('pomelo init failed!'));
            }

            pomelo.on('io-error', () => {
                //return cb(new Error('io-error'));
            });
            pomelo.on('close', () => {
                //return cb(new Error('network closed'));
            });

            //console.log('connect connector server ... OK! ');
            var sendMsg = {};
            pomelo.request('connector.connectorHandler.getCipherCodeRequest', sendMsg, function(data) {
                //console.log('connector-getCipherCodeRequest--- = %j', data);
                var code = self.decipheriv(data.cipherCode);
                sendMsg = {code:code};
                pomelo.request('connector.connectorHandler.checkCodeRequest', sendMsg, function(data) {
                    //console.log('connector-checkCodeRequest--- = %j', data);
                    cb(data.errorCode, pomelo);
                });
            });
        });
    }

    

    run(data) {
        console.log('-------> data = %j', data);
        this.checkConnector(data.connInfo.host, data.connInfo.port, (err, pomelo) => {
            if (err) {
                console.log('checkConnector --- err = %j', err);
                return;
            }
            let index = 0;
            async.whilst(
                function breaker () {
                    return index < data.protocolList.length;
                },
                function iterator (_cb) {
                    let subProtoObject = data.protocolList[index];
                    let beforeData = JSON.parse(subProtoObject.beforeData);
                    let body = beforeData.body;

                    if (subProtoObject.id === 1 || subProtoObject.id === 2) {
                        return _cb(null);
                    }
                    //console.log('1---------- route = %j, ', beforeData.route);
                    //console.log('2---------- body = %j, ', beforeData.body);
                    setTimeout(function() {
                        if (pomelo.socket.readyState === 1) {
                            pomelo.request(beforeData.route, beforeData.body, function(data) {
                                //console.log('---- result ---  data = %j, route = %j, body = %j', data, beforeData.route, beforeData.body);
                                //  屏蔽掉:列表为空 等这类的非异常的错误码
                                if (data.errorCode) {
                                    if (data.errorCode != 38 && 
                                        data.errorCode != 85 && 
                                        data.errorCode != 39 && 
                                        data.errorCode != 114 && 
                                        data.errorCode != 115 && 
                                        data.errorCode != 110 && 
                                        data.errorCode != 62 && 
                                        data.errorCode != 102) {
                                        _cb(new Error('error happened --- errorCode = ' + data.errorCode + ', route = ' + beforeData.route + ', body = ' + beforeData.body));
                                    } else {
                                        ++index;
                                        _cb(null);
                                    }
                                } else {
                                    ++index;
                                    _cb(null);
                                }
                            });
                        } else {
                            _cb(new Error('socket error.'));
                        }
                    },500);
                }, function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('执行完成');
                    }
                }
            )
        });
    }
}

module.exports = runProtocol;

