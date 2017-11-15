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
    _getInsList(jobObject, jobList, idList) {
        let self = this;
        
        let jobId = jobObject.route;
        if (jobObject.route === null || jobObject.route === undefined) {
            jobId = jobObject.id;
        }
        let resultData = g_protoMgr.getCacheJobById(jobId);
        if (resultData.err) {
            return resultData.err;
        }
        let jobStr = resultData.data;
        jobList.push(jobStr);
        let jobJson = jobStr.jobJson;
        let jobObj = g_protoMgr._deserializeJob(jobJson);
        for (let m = 0; m < jobObj.instruments.length; m++) {
            let ins = jobObj.instruments[m];

            idList[ins.id] = g_protoMgr.getBriefProtocolById(ins.id);
            if (ins.type == PROTO_TYPE.JOB) {
                let err = self._getInsList(ins, jobList, idList);
                if (err) {
                    return err;
                }
            } else if (ins.type == PROTO_TYPE.SYSTEM && ins.route == 'timer') {
                let timerJobId = ins.getC2SMsg().jobId;
                let resultData = g_protoMgr.getCacheJobById(timerJobId);
                if (resultData.err) {
                    return resultData.err;
                }
                let cacheJob = resultData.data;
                let timerJobStr = cacheJob.jobJson;
                let timerJob = JSON.parse(timerJobStr);
                idList[timerJob.id] = g_protoMgr.getBriefProtocolById(timerJob.id);
                let err = self._getInsList(timerJob, jobList, idList);
                if (err) {
                    return err;
                }
            } else if (ins.type == PROTO_TYPE.SYSTEM && ins.route == 'switch') {
                let c2sMsg = ins.getC2SMsg();
                for (let s = 1; s <= 20; s++) {
                    let switchJobId = c2sMsg['jobId' + s];
                    if (switchJobId > 0) {
                        let resultData = g_protoMgr.getCacheJobById(switchJobId);
                        if (resultData.err) {
                            return resultData.err;
                        }
                        let cacheJob = resultData.data;
                        let switchJobStr = cacheJob.jobJson;
                        let switchJob = JSON.parse(switchJobStr);
                        idList[switchJob.id] = g_protoMgr.getBriefProtocolById(switchJob.id);
                        let err = self._getInsList(switchJob, jobList, idList);
                        if (err) {
                            return err;
                        }
                    }
                } 
            } else if (ins.type == PROTO_TYPE.SYSTEM && (ins.route == 'createIntVariable' || ins.route == 'createStringVariable')) {
                let c2sMsg = ins.getC2SMsg();
                if (c2sMsg.name === undefined || c2sMsg.name === null || c2sMsg.name === '') {
                    return new Error('变量指令中的变量名不能为空。');
                }
            }
        }
        return null;
    }

    // 运行job
    runJob(uid, jobObj, gameUserIdList, cb) {
        let self = this;
        if (this.socketList.length === 0) {
            return cb(new Error('没有可用的job服!'));
        }

        let jobList = [];
        let idList = {};
        let err = self._getInsList(jobObj, jobList, idList);
        if (err) {
            return cb(err);
        }
        let curRunningJobIdList = [];
        let result = {};
        for (let i = 0; i < gameUserIdList.length; i++) {
            let g_runningJobMgr = require('./runningJobManager');
            let runningJobId = g_runningJobMgr.createRunningJob(jobObj, uid);
            self.runIndex = ++self.runIndex % self.socketList.length;
            if (!result[self.runIndex]) {
                result[self.runIndex] = {userList:[], runningJobId:0};
            }
            result[self.runIndex].userList.push(gameUserIdList[i]);
            result[self.runIndex].runningJobId = runningJobId;
            curRunningJobIdList.push(runningJobId);
        }

        for (let idx in result) {
            let runSocket = self.socketList[idx].socket;
            runSocket.emit('runJob', {uid:uid, jobList:jobList, idList:idList, runningJobId:result[idx].runningJobId, userList:result[idx].userList});
        }

        this.socketList[self.runIndex].runningJobIdList.push.apply(this.socketList[self.runIndex].runningJobIdList, curRunningJobIdList);
        return cb(null, curRunningJobIdList);
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