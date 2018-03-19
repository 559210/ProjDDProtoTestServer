"use strict";
/////////////////////////////////////////////////////////////
var WebSocket = require('ws');
var userName = require('pomelo-protocol');
var Package = userName.Package;
var Message = userName.Message;
var EventEmitter = require('events').EventEmitter;
var protocol = require('pomelo-protocol');
var protobuf = require('pomelo-protobuf');
var cwd = process.cwd();
var util = require('util');

var JS_WS_CLIENT_TYPE = 'js-websocket';
var JS_WS_CLIENT_VERSION = '0.0.1';

var RES_OK = 200;
var RES_OLD_CLIENT = 501;

var handshakeBuffer = {
    'sys': {
        type: JS_WS_CLIENT_TYPE,
        version: JS_WS_CLIENT_VERSION
    },
    'user': {}
};

var handlers = {};

var heartbeatInterval = 5000;
var heartbeatTimeout = heartbeatInterval * 2;
var gapThreshold = 100; // heartbeat gap threshold

var client = function() {
    this.socket = null;
    this.reqId = 0;
    this.callbacks = {};
    this.routeMap = {};

    this.heartbeatId = null;
    this.heartbeatTimeoutId = null;

    this.handshakeCallback = null;
    this.initCallback = null;

    this.nextHeartbeatTimeout = 0;
}

util.inherits(client, EventEmitter);

module.exports = client;

client.prototype.init = function(params, cb) {
    this.params = params;
    this.initCallback = cb;

    var host = params.host;
    var port = params.port;

    var url = 'ws://' + host;
    if (port) {
        url += ':' + port;
    }

    handshakeBuffer.user = params.user;
    this.handshakeCallback = params.handshakeCallback;
    this.initWebSocket(url);
};

client.prototype.initWebSocket = function(url) {
    var self = this;

    var onopen = function(event) {
        console.log('[pomeloclient.init] websocket connected!');
        var obj = Package.encode(Package.TYPE_HANDSHAKE, userName.strencode(JSON.stringify(handshakeBuffer)));
        send(self, obj);
    };

    var onmessage = function(event) {
        processPackage(self, Package.decode(event.data));
        // new package arrived, update the heartbeat timeout
        if (heartbeatTimeout) {
            self.nextHeartbeatTimeout = Date.now() + heartbeatTimeout;
        }
    };

    var onerror = function(event) {
        self.emit('io-error', event);
        console.log('socket error %j ', event);
    };

    var onclose = function(event) {
        self.emit('close', event);
        console.log('socket close %j ', event);
    };


    this.socket = new WebSocket(url);
    this.socket.binaryType = 'arraybuffer';
    this.socket.onopen = onopen;
    this.socket.onmessage = onmessage;
    this.socket.onerror = onerror;
    this.socket.onclose = onclose;
};

client.prototype.disconnect = function() {
    if (this.socket) {
        if (this.socket.disconnect) this.socket.disconnect();
        if (this.socket.close) this.socket.close();
        console.log('disconnect');
        this.socket = null;
    }

    if (this.heartbeatId) {
        clearTimeout(this.heartbeatId);
        this.heartbeatId = null;
    }

    if (this.heartbeatTimeoutId) {
        clearTimeout(this.heartbeatTimeoutId);
        this.heartbeatTimeoutId = null;
    }
};

client.prototype.request = function(route, msg, cb) {
    msg = msg || {};
    route = route || msg.route;
    if (!route) {
        console.log('fail to send request without route.');
        return;
    }

    this.reqId++;
    sendMessage(this, this.reqId, route, msg);

    this.callbacks[this.reqId] = cb;
    this.routeMap[this.reqId] = route;
};

client.prototype.notify = function(route, msg) {
    msg = msg || {};
    sendMessage(this, 0, route, msg);
};

var sendMessage = function(client, reqId, route, msg) {
    var type = reqId ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;

    //compress message by protobuf
    var protos = !!client.data.protos ? client.data.protos.client : {};
    if (!!protos[route]) {
        msg = protobuf.encode(route, msg);
    } else {
        msg = userName.strencode(JSON.stringify(msg));
    }

    var compressRoute = 0;
    if (client.dict && client.dict[route]) {
        route = client.dict[route];
        compressRoute = 1;
    }

    msg = Message.encode(reqId, type, compressRoute, route, msg);
    var packet = Package.encode(Package.TYPE_DATA, msg);
    send(client, packet);
};

var send = function(client, packet) {
    //console.log('----' + client.socket);
    if (!!client.socket) {
        client.socket.send( /*packet.buffer || */ packet, {
            binary: true,
            mask: true
        });
    }
};

var heartbeat = function(client, data) {
    var obj = Package.encode(Package.TYPE_HEARTBEAT);
    if (client.heartbeatTimeoutId) {
        clearTimeout(client.heartbeatTimeoutId);
        client.heartbeatTimeoutId = null;
    }

    if (client.heartbeatId) {
        // already in a heartbeat interval
        return;
    }

    client.heartbeatId = setTimeout(function() {
        client.heartbeatId = null;
        send(client, obj);

        client.nextHeartbeatTimeout = Date.now() + heartbeatTimeout;
        client.heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb, heartbeatTimeout);
    }, heartbeatInterval);
};

var heartbeatTimeoutCb = function(client) {
    var gap = client.nextHeartbeatTimeout - Date.now();
    if (gap > gapThreshold) {
        client.heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb, gap);
    } else {
        console.error('server heartbeat timeout');
        client.emit('heartbeat timeout');
        client.disconnect();
    }
};

var handshake = function(client, data) {
    data = JSON.parse(userName.strdecode(data));
    if (data.code === RES_OLD_CLIENT) {
        client.emit('error', 'client version not fullfill');
        return;
    }

    if (data.code !== RES_OK) {
        client.emit('error', 'handshake fail');
        return;
    }

    handshakeInit(client, data);

    var obj = Package.encode(Package.TYPE_HANDSHAKE_ACK);
    send(client, obj);

    if (client.initCallback) {
        client.initCallback(client.socket);
        client.initCallback = null;
    }
};

var onData = function(client, data) {
    //probuff decode
    var msg = Message.decode(data);

    if (msg.id > 0) {
        msg.route = client.routeMap[msg.id];
        delete client.routeMap[msg.id];
        if (!msg.route) {
            return;
        }
    }

    msg.body = deCompose(client, msg);

    processMessage(client, msg);
};

var onKick = function(client, data) {
    client.emit('onKick');
};

handlers[Package.TYPE_HANDSHAKE] = handshake;
handlers[Package.TYPE_HEARTBEAT] = heartbeat;
handlers[Package.TYPE_DATA] = onData;
handlers[Package.TYPE_KICK] = onKick;

var processPackage = function(client, msg) {
    handlers[msg.type](client, msg.body);
};

var processMessage = function(client, msg) {
    if (!msg || !msg.id) {
        // server push message
        // console.error('processMessage error!!!');
        client.emit(msg.route, msg.body);
        return;
    }

    //if have a id then find the callback function with the request
    var cb = client.callbacks[msg.id];

    delete client.callbacks[msg.id];
    if (typeof cb !== 'function') {
        return;
    }

    cb(msg.body);
    return;
};

var deCompose = function(client, msg) {
    var protos = !!client.data.protos ? client.data.protos.server : {};
    var abbrs = client.data.abbrs;
    var route = msg.route;

    try {
        //Decompose route from dict
        if (msg.compressRoute) {
            if (!abbrs[route]) {
                console.error('illegal msg!');
                return {};
            }

            route = msg.route = abbrs[route];
        }
        if (!!protos[route]) {
            return protobuf.decode(route, msg.body);
        } else {
            return JSON.parse(userName.strdecode(msg.body));
        }
    } catch (ex) {
        console.error('route, body = ' + route + ", " + msg.body);
    }

    return msg;
};

var handshakeInit = function(client, data) {
    if (data.sys && data.sys.heartbeat) {
        heartbeatInterval = data.sys.heartbeat * 1000; // heartbeat interval
        heartbeatTimeout = heartbeatInterval * 2; // max heartbeat timeout
    } else {
        heartbeatInterval = 0;
        heartbeatTimeout = 0;
    }

    initData(client, data);

    if (typeof client.handshakeCallback === 'function') {
        client.handshakeCallback(data.user);
    }
};

//Initilize data used in pomelo client
var initData = function(client, data) {
    if (!data || !data.sys) {
        return;
    }
    client.data = client.data || {};
    var dict = data.sys.dict;
    var protos = data.sys.protos;

    //Init compress dict
    if (!!dict) {
        client.data.dict = dict;
        client.data.abbrs = {};

        for (var route in dict) {
            client.data.abbrs[dict[route]] = route;
        }
    }

    //Init protobuf protos
    if (!!protos) {
        client.data.protos = {
            server: protos.server || {},
            client: protos.client || {}
        };
        if (!!protobuf) {
            protobuf.init({
                encoderProtos: protos.client,
                decoderProtos: protos.server
            });
        }
    }
};