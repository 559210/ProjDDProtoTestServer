"use strict";
let g_protoMgr = require('./protocolManager');
const PROTO_TYPE = require('./protocolType');
let async = require('async');


// TODO: 此类应该定位应该是协议和Job等所有数据的统一出入口
class JobServerManager {
    constructor() {
        this.runIndex = -1;   // 轮询分配服务器的序号
        this.io = null;       // 主服IO对象
        this.socketList = []; // job服socket列表
    }

    // 增加job服
    _addServer(hostname, socket) {
        this.socketList.push({
            hostname:hostname,
            socket:socket,
            runningJobIdList:[]
        });
    }

    // 删除job服
    _deleteServer(socket) {
        for (let i = 0; i < this.socketList.length; i++) {
            if (this.socketList[i].socket == socket) {
                this.socketList.splice(i, 1);
                break;
            }
        }
    }

    // 遍历所有涉及的job和ins
    _getInsList(jobObject, jobList, idList, cb) {
        let self = this;
        
        let jobId = jobObject.route;
        if (jobObject.route === null || jobObject.route === undefined) {
            jobId = jobObject.id;
        }

        g_protoMgr.getCacheJobById(jobId, function(err, jobStr) {
            if (err) {
                cb(new Error(err));
            } else {
                jobList.push(jobStr);
                let jobJson = jobStr.jobJson;
                let jobObj = g_protoMgr._deserializeJob(jobJson);

                async.eachSeries(jobObj.instruments, function (ins, callback) {
                    idList[ins.id] = g_protoMgr.getBriefProtocolById(ins.id);
                    if (ins.type == PROTO_TYPE.JOB) {
                        self._getInsList(ins, jobList, idList, callback);
                    } else if (ins.type == PROTO_TYPE.SYSTEM && ins.route == 'timer') {
                        let timerJobId = ins.getC2SMsg().jobId;
                        g_protoMgr.getCacheJobById(timerJobId, (err, cacheJob) => {
                            if (err) {
                                return callback(err);
                            }
                            let timerJobStr = cacheJob.jobJson;
                            let timerJob = JSON.parse(timerJobStr);
                            idList[timerJob.id] = g_protoMgr.getBriefProtocolById(timerJob.id);
                            self._getInsList(timerJob, jobList, idList, callback);
                        });
                    } else if (ins.type == PROTO_TYPE.SYSTEM && ins.route == 'switch') {
                        let c2sMsg = ins.getC2SMsg();
                        let switchJobId = c2sMsg['jobId' + c2sMsg.runIndex];
                        g_protoMgr.getCacheJobById(switchJobId, (err, cacheJob) => {
                            if (err) {
                                return callback(err);
                            }
                            let switchJobStr = cacheJob.jobJson;
                            let switchJob = JSON.parse(switchJobStr);
                            idList[switchJob.id] = g_protoMgr.getBriefProtocolById(switchJob.id);
                            self._getInsList(switchJob, jobList, idList, callback);
                        });
                        
                    } else {
                        callback(null);
                    }
                }, function (err) {
                    return cb(err, jobList, idList);
                });
            }
        });
    }

    // 运行job
    runJob(uid, jobObj, gameUserIdList, cb) {
        let self = this;
        if (this.socketList.length === 0) {
            return cb(new Error('没有可用的job服!'));
        }

        let jobList = [];
        let idList = {};
        self._getInsList(jobObj, jobList, idList, (err) => {
            if (err) {
                return cb(new Error('error happend , err = ' + err));
            }

            let curRunningJobIdList = [];
            for (let i = 0; i < gameUserIdList.length; i++) {
                let g_runningJobMgr = require('./runningJobManager');
                let runningJobId = g_runningJobMgr.createRunningJob(jobObj, uid);
                self.runIndex = ++self.runIndex % self.socketList.length;
                let runSocket = self.socketList[self.runIndex].socket;
                curRunningJobIdList.push(runningJobId);
                runSocket.emit('runJob', {uid:uid, jobList:jobList, idList:idList, runningJobId:runningJobId, gameUserId:gameUserIdList[i]});
            }
            this.socketList[self.runIndex].runningJobIdList.push.apply(this.socketList[self.runIndex].runningJobIdList, curRunningJobIdList);
            return cb(null, curRunningJobIdList);
        });
    }

    // job运行日志
    _doJobLog(logData) {
        let g_runningJobMgr = require('./runningJobManager');
        g_runningJobMgr.log(logData.runningJobId, logData.text, logData.timestamp);
    }

    subscribeToJobConsole(uid, runningJobId, color) {
        let tarSocket = null;
        for (let i = 0; i < this.socketList.length; i++) {
            let runningJobIdList = this.socketList[i].runningJobIdList;
            for (let j = 0; j < runningJobIdList.length; j++) {
                if (runningJobIdList[j] == runningJobId) {
                    tarSocket = this.socketList[i].socket;
                    break;
                }
            }
        }

        if (tarSocket) {
            tarSocket.emit('subscribeToJobConsole', {uid:uid, runningJobId:runningJobId, color:color});
        }
    }

    setSubscribedConsoleColor(uid, runningJobId, color) {
        let tarSocket = null;
        for (let i = 0; i < this.socketList.length; i++) {
            let runningJobIdList = this.socketList[i].runningJobIdList;
            for (let j = 0; j < runningJobIdList.length; j++) {
                if (runningJobIdList[j] == runningJobId) {
                    tarSocket = this.socketList[i].socket;
                    break;
                }
            }
        }

        // if (tarSocket) {
        //     tarSocket.emit('setSubscribedConsoleColor', {uid:uid, runningJobId:runningJobId, color:color});
        // }
    }

    unSubscribeToJobConsole(uid, runningJobId) {
        let tarSocket = null;
        for (let i = 0; i < this.socketList.length; i++) {
            let runningJobIdList = this.socketList[i].runningJobIdList;
            for (let j = 0; j < runningJobIdList.length; j++) {
                if (runningJobIdList[j] == runningJobId) {
                    tarSocket = this.socketList[i].socket;
                    break;
                }
            }
        }

        if (tarSocket) {
            tarSocket.emit('unSubscribeToJobConsole', {uid:uid, runningJobId:runningJobId});
        }
    }

    // 监听socket事件
    start(io) {
        this.io = io;
        let self = this;
        this.io.sockets.on('connection', function(socket) {
            socket.on('register', function(hostname) {
                console.log('jobServer register --- hostname = %j, address = %j', hostname, socket.handshake.address);
                self._addServer(hostname, socket);
            });

            socket.on('jobLog', function(logData) {
                console.log('jobServer jobLog --- logData = %j', logData);
                self._doJobLog(logData);
            });

            socket.on('disconnect', function() {
                console.log('client disconnect --- ');
                self._deleteServer(socket);
            });
        });
    }
}

module.exports = new JobServerManager();