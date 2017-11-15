'use strict'
let vm = require('vm');

let commonJs = require('../../../CommonJS/common');
let g_protoMgr = require('./protocolManager');

class protoInstrument {
    // proto: {route: xxx, type: <request|push|notify>, request/ack OR push OR notify }
    constructor(id) {
        g_protoMgr = require('./protocolManager');      // protoMgr和protoInstrument存在互相require的问题，所以在构造instrument时再require一次

        this.pluginFunc = null;
        this.runner = null;

        let proto = g_protoMgr.getBriefProtocolById(id);
        if (proto) {
            this.id = id;
            this.route = proto.route || '';
            this.type = proto.type;
            this.note = proto.note;

            this.c2sParsedParams = this._makeParsedC2SParams(proto.c2s);
            this.s2cParsedParams = this._makeParsedS2CParams(proto.s2c);
        }
        else {
            console.error('xxxxxxxxxxx', id);
        }
    }

    getParsedC2SParams() {
        return this.c2sParsedParams;
    }

    getParsedS2CParams() {
        return this.s2cParsedParams;
    }

    // paramName 参数名字
    // value 参数的值或参数变量名
    // isVar bool 默认false表示value是值，true表示value是变量
    setC2SParamValue(paramName, value, isVar) {
        let param = this.c2sParsedParams[paramName];
        if (commonJs.isUndefinedOrNull(param)) {
            return null;
        }

        param.value = value;
        param.isVar = isVar || false;
        return param;
    }

    getC2SMsg() {
        let msg = {};
        for (let key in this.c2sParsedParams) {
            if (commonJs.isUndefinedOrNull(this.c2sParsedParams[key])) {
                return null;
            }
            let isVar = this.c2sParsedParams[key].isVar;
            let type = this.c2sParsedParams[key].type;
            if (isVar) {
                // if (key === 'tagName') {
                //     msg[key] = this.c2sParsedParams[key].value;
                // } else {
                //     msg[key] = this.runner.envirment.variableManager.getVariableValue(this.c2sParsedParams[key].value);
                // }
                msg[key] = this.c2sParsedParams[key].value;
            } else {
                if (this.c2sParsedParams[key].value !== null && 
                    this.c2sParsedParams[key].value !== undefined) {
                    msg[key] = this.c2sParsedParams[key].value;
                    if (type == 'int') {
                        msg[key] = parseInt(msg[key]);
                    } else if (type == 'string') {
                        msg[key] = msg[key].toString();
                    }
                }
            }
        }

        return msg;
    }

    clearC2SParams() {
        for (let key in this.c2sParsedParams) {
            this.c2sParsedParams[key].isVar = false;
            this.c2sParsedParams[key].value = undefined;
        }
    }

    _makeParsedC2SParams(c2sParams) {
        if (commonJs.isUndefinedOrNull(c2sParams)) {
            return null;
        }

        let params = {};

        for (let key in c2sParams) {
            let param = c2sParams[key];
            params[key] = {
                name: key,
                type: param.type,
                desc: param.desc,
                value: undefined,
                isVar: false
            };
        }

        return params;
    }

    _makeParsedS2CParams(s2cParams) {
        if (commonJs.isUndefinedOrNull(s2cParams)) {
            return null;
        }

        let params = {};

        for (let key in s2cParams) {
            let param = s2cParams[key];

            params[key] = {
                name: key,
                type: param.type,
                desc: param.desc,
            }
        }

        return params;
    }


    getPluginFunc() {
        return this.pluginFunc;
    }

    _checkPluginSyntax(script) {
        try {
            new vm.Script(script, {}, "plugin", 5000);
        } catch (e) {
            return e.toString();
        }

        return null;
    }

    setPluginFunc(funcScriptString) {
        if (funcScriptString) {
            let syntaxErr = this._checkPluginSyntax(funcScriptString);
            if (syntaxErr) {
                return syntaxErr;
            }

            this.pluginFunc = funcScriptString;
        }
        return null;
    }

    removePluginFunc() {
        this.pluginFunc = null;
    }

    onS2CMsg(data, callback) {
        this.runner.sendSessionLog('ack' + JSON.stringify(data));
        // console.log('ack', data);
        let varPrefix = this.route + '#';
        for (let key in data) {
			if (key == 'errorCode' && data[key] !== 0) {
                return callback(new Error('protocal run error ! route = ' + this.route));
            }
            if (!this.runner.envirment.variableManager.createVariable(varPrefix + key, data[key])) {
                return callback(new Error('duplicated varialbe name: ' + varPrefix + key));
            }
        }

        if (this.pluginFunc) {
            global.variableManager = this.runner.envirment.variableManager;
            global.varPrefix = varPrefix;
            global.require = require;

            try {
                const script = new vm.Script(this.pluginFunc, {}, "plugin", 5000);
                script.runInThisContext();
            } catch (e) {
                return callback(new Error(e.toString()));
            }

            // eval(funcObj.funcScriptString);
            callback(null);
        } else {
            callback(null);
        }
    }

    // serialize() {
    //     let obj = {
    //         route: this.route,
    //         pluginFunc: this.pluginFunc,
    //         params: []
    //     };

    //     for (let key in this.c2sParsedParams) {
    //         let param = this.c2sParsedParams[key];
    //         obj.params.push({
    //             name: param.name,
    //             value: param.value,
    //             isVar: param.isVar
    //         });
    //     }

    //     return JSON.stringify(obj);
    // }

    // deserialize(json) {

    // }
}


module.exports = protoInstrument;