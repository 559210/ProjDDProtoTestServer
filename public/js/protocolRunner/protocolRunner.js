'use strict'

let prism = require('prismjs');
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let g_account = require('../../../models/account');

let g_protoMgr = require('./protocolManager');
let variableManagerClass = require('./variableManager');
let protoInstrumentClass = require('./protoInstrument');
let protoRunnerJobClass = require('./protoRunnerJob');
let protoJobSessionClass = require('./protoJobSession');
const PROTO_TYPE = require('./protocolType');

class protoJobManager {
    constructor() {
        this.io = null;
        this.sessions = {};
    }

    _getCachedJobByName(jobName) {
        for (let i = 0; i < this.allJobs.length; ++i) {
            if (this.allJobs[i].jobName == jobName) {
                return this.allJobs[i];
            }
        }

        return null;
    }

    start(io) {
        this.io = io;
        let self = this;
        this.io.sockets.on('connection', function(socket) {
            function checkMsgResult(err, msg) {
                if (err) {
                    socket.emit('ErrorMsg', {
                        msg: msg
                    });
                    return;
                }

                socket.emit('Refresh');
            }

            if (commonJs.isUndefinedOrNull(socket.request.session) ||
                commonJs.isUndefinedOrNull(socket.request.session.passport)) {
                return;
            }

            g_account.deserializeUser(socket.request.session.passport.user, (err, userObj) => {
                if (commonJs.isUndefinedOrNull(userObj)) {
                    return;
                }

                if (commonJs.isUndefinedOrNull(self.sessions[userObj.uid])) {
                    self.sessions[userObj.uid] = new protoJobSessionClass(userObj);
                    self.sessions[userObj.uid].setSocket(socket);
                }
            });

            let session = self._getSession(socket);
            socket.on('OpenJob', (data) => {
                console.log(data);
                session.loadJobById(data.jobId, (err) => {
                    console.log(err);
                    checkMsgResult(err, 'OpenJob failed: ' + data.jobName);
                });
            });

            socket.on('AddJob', (data) => {
                async.series([
                    (cb) => {
                        session.saveCurrentJob(cb);
                    },
                    (cb) => {
                        session.createJob(data.jobName, cb);
                    }
                ], (err) => {
                    if (err)
                        console.log(err);
                    checkMsgResult(err, 'CreateJob failed: ' + data.jobName);

                });
            });

            socket.on('RenameJob', (data) => {
                // TODO: 要处理job改名以后，其他引用它的job怎么办
                // if (commonJs.isUndefinedOrNull(data.jobName) ||
                //     commonJs.isUndefinedOrNull(data.newJobName)) {
                //     checkMsgResult(new Error('missing param'), '参数格式不对');
                //     return;
                // }

                async.series([
                    (cb) => {
                        session.loadJobById(data.jobId, cb);
                    },
                    (cb) => {
                        session.renameJob(data.newJobName, cb);
                    }
                ], (err) => {
                    checkMsgResult(err, 'RenameJob failed: ' + data.jobName);
                });

            });

            socket.on('RemoveJob', (data) => {
                if (commonJs.isUndefinedOrNull(data.jobId)) {
                    checkMsgResult(new Error('missing param'), '参数格式不对');
                    return;
                }

                async.series([
                    (cb) => {
                        // 从数据库删除
                        g_protoMgr.removeJob(data.jobId, cb);
                    }
                ], (err) => {
                    checkMsgResult(err, 'Remove job failed: ' + data.jobName);
                });
            });

            socket.on('AddProto', (data) => {
                let ins = new protoInstrumentClass(data.protoId);

                if (ins.type == PROTO_TYPE.JOB) {
                    if (ins.route == session.curJob.id.toString()) {
                        return checkMsgResult(new Error(), '不能添加自己');
                    }

                    // let job = self._getCachedJobByName(data.routeName);
                    // if (job == null) {
                    //     return checkMsgResult(new Error(), '找不到job信息');
                    // }
                    // let prj = new protoRunnerJob(job.jobName);
                    // prj.deserialize(job.job);
                    // let firstIns = prj.getInstrument(0);
                    // if (commonJs.isUndefinedOrNull(firstIns)) {
                    //     return checkMsgResult(new Error(), '不能添加一个空的job');
                    // }
                    // let msg = firstIns.getC2SMsg();
                    // for (let key in msg) {
                    //     ins.setC2SParamValue(key, msg[key]);
                    // }
                }
                session.curJob.addInstrument(ins);
                session.saveCurrentJob((err) => {
                    checkMsgResult(err, 'AddProto failed: ' + data.protoId);
                });
            });

            socket.on('RemoveProto', (data) => {
                if (commonJs.isUndefinedOrNull(data.routeIndex)) {
                    checkMsgResult(new Error('missing param'), '参数格式不对');
                    return;
                }

                if (session.curJob.removeInstrument(data.routeIndex)) {
                    session.saveCurrentJob((err) => {
                        checkMsgResult(err, '无法删除协议');
                    });
                } else {
                    checkMsgResult(new Error('remove failed'), '无法删除协议');
                }
            });

            socket.on('SetC2SParamValue', (data) => {
                // data: { routeIndex: 0, paramName: 'host', value: 'abc', isVar: false }
                if (commonJs.isUndefinedOrNull(data.routeIndex) ||
                    commonJs.isUndefinedOrNull(data.paramName) ||
                    commonJs.isUndefinedOrNull(data.value) ||
                    commonJs.isUndefinedOrNull(data.isVar)) {
                    checkMsgResult(new Error('missing param'), '参数格式不对');
                    return;
                }

                let ins = session.curJob.getInstrument(data.routeIndex);

                if (commonJs.isUndefinedOrNull(ins)) {
                    checkMsgResult(new Error('missing param'), '找不到参数对应的协议');
                    return;
                }

                if (null == ins.setC2SParamValue(data.paramName, data.value, data.isVar)) {
                    checkMsgResult(new Error('set c2s param failed'), '设置参数失败');
                    return;
                }

                session.saveCurrentJob((err) => {
                    checkMsgResult(err, '修改的参数无法保存');
                });
            });

            socket.on('GetScript', (data) => {
                if (commonJs.isUndefinedOrNull(data.routeIndex)) {
                    checkMsgResult(new Error('missing param'), '参数格式不对');
                    return;
                }

                let ins = session.curJob.getInstrument(data.routeIndex);

                if (commonJs.isUndefinedOrNull(ins)) {
                    checkMsgResult(new Error('missing param'), '找不到参数对应的协议');
                    return;
                }

                let html = '';
                let script = ins.getPluginFunc();
                if (script) {
                    html = prism.highlight(script, prism.languages.javascript);
                }

                socket.emit('DispatchScript', {
                    codeHTML: html
                });
            });

            socket.on('SaveScript', (data) => {
                if (commonJs.isUndefinedOrNull(data.routeIndex)) {
                    checkMsgResult(new Error('missing param'), '参数格式不对');
                    return;
                }
                let ins = session.curJob.getInstrument(data.routeIndex);
                if (commonJs.isUndefinedOrNull(ins)) {
                    checkMsgResult(new Error('missing param'), '找不到参数对应的协议');
                    return;
                }

                if (data.code) {
                    let syntaxErr = ins.setPluginFunc(data.code);
                    if (syntaxErr) {
                        socket.emit('SaveScriptAck', {
                            ret: 1,
                            msg: syntaxErr
                        });
                        return;
                    }
                } else {
                    ins.removePluginFunc();
                }

                session.saveCurrentJob((err) => {
                    if (err) {
                        socket.emit('SaveScriptAck', {
                            ret: 1
                        });
                        return;
                    }

                    socket.emit('SaveScriptAck', {
                        ret: 0
                    });
                });
            });

            socket.on('Run', () => {
                session.curJob.runAll((err) => {
                    socket.emit('ErrorMsg', {
                        msg: err ? err.toString() : "成功"
                    });
                });
            });

            socket.on('MoveProtoUp', (data) => {
                if (commonJs.isUndefinedOrNull(data.routeIndex)) {
                    checkMsgResult(new Error('missing param'), '参数格式不对');
                    return;
                }

                if (session.curJob.moveInstrumentUp(data.routeIndex)) {
                    session.saveCurrentJob((err) => {
                        checkMsgResult(err, '服务器保存失败');
                    });
                }
            });

            socket.on('MoveProtoDown', (data) => {
                if (commonJs.isUndefinedOrNull(data.routeIndex)) {
                    checkMsgResult(new Error('missing param'), '参数格式不对');
                    return;
                }

                if (session.curJob.moveInstrumentDown(data.routeIndex)) {
                    session.saveCurrentJob((err) => {
                        checkMsgResult(err, '服务器保存失败');
                    });
                }
            });

            socket.on('AddRawProtocol', (data) => {
                g_protoMgr.addNewProtocol(data, (err) => {
                    checkMsgResult(err, '协议保存失败. ' + (err ? err.toString() : ''));
                });
            });

            socket.on('UpdateRawProtocol', (data) => {
                g_protoMgr.updateProtocol(data, (err) => {
                    checkMsgResult(err, '协议更新失败. ' + (err ? err.toString() : ''));
                });
            });

            socket.on('UpdateJobTagBatch', (data) => {
                console.log('---------------> data', data);
                async.map(data, (it, cb) => {
                    g_protoMgr.updateJobTag(it.jobId, it.newTag, cb);
                }, (err) => {
                    checkMsgResult(err, '一些或所有路径修改失败. ' + (err ? err.toString() : ''));
                });
            });
        });
    }

    _getSession(socket) {
        let obj = this.sessions[socket.request.session.passport.user];
        if (obj) {
            obj.setSocket(socket);
        }
        return obj;
    }

    getOpenedJobDetail(uid) {
        let session = this.sessions[uid];
        if (commonJs.isUndefinedOrNull(session)) {
            return null;
        }

        return session.getCurrentJobDetail();
    }

    getAllJobLists() {
        let list = [];
        for (let k in this.allJobs) {
            list.push(this.allJobs[k].jobName);
        }
        return list;
    }

    getProtocolList() {
        g_protoMgr.getProtocolBriefList();

    }

    _findJobByName(jobName) {
        for (let i = 0; i < this.allJobs.length; ++i) {
            if (this.allJobs[i].jobName == jobName) {
                return this.allJobs[i];
            }
        }

        return null;
    }
}

module.exports = new protoJobManager();


// if (require('process').env.NODE_ENV === 'test') {
//     module.exports._forTest = {
//         protoInstrumentClass: protoInstrument,
//         variableManagerClass: variableManager,
//         protoRunnerJobClass: protoRunnerJob,
//     }
// }