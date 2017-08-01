'use strict'

let g_protoMgr = require('./protocolManager');
let commonJs = require('../../../CommonJS/common');
let g_runningJobMgr = require('./runningJobManager');

class protoJobSession {
    constructor(userObj) {
        this.userObj = userObj;
        this.curJob = null;
        this.socket = null;
        
        this.runningJobIDs = [];
        this.sessionIDInRunningJobMgr = g_runningJobMgr.getSessionID(this);
    }

    getSessionIdInRunningJobMgr() {
        return this.sessionIDInRunningJobMgr;
    }

    setSocket(skt) {
        this.socket = skt;
    }

    Console(text, runningJobId) {
        if (commonJs.isUndefinedOrNull(this.socket) == false) {
            this.socket.emit("Console", {text: text, runningJobId: runningJobId});
        }
    }

    subscribeToJobConsole(runningJobId) {
        g_runningJobMgr.subscribeToJobConsole(this.sessionIDInRunningJobMgr, runningJobId);
    }


    unSubscribeToJobConsole(runningJobId) {
        g_runningJobMgr.unSubscribeToJobConsole(this.sessionIDInRunningJobMgr, runningJobId);
    }

    getCurrentJobDetail() {
        if (this.curJob) {
            return this.curJob.getJobDetail();
        }

        return false;
    }

    loadJobById(jobId, callback) {
        let self = this;
        g_protoMgr.loadJobById(jobId, (err, jobObj) => {
            if (err) {
                return callback(err);
            }

            self.curJob = jobObj;
            return callback(null);
        });
    }

    saveCurrentJob(callback) {

        if (this.curJob) {
            g_protoMgr.saveJob(this.curJob, callback);
        } else {
            callback(null);
        }
    }

    createJob(jobName, callback) {
        g_protoMgr.createJob(jobName, (err, jobObj) => {
            if (err) {
                return callback(err);
            }

            this.curJob = jobObj;
            callback(null);
        });
    }

    renameJob(newName, callback) {
        this.curJob.name = newName;
        this.saveCurrentJob(callback);
    }

    clearCurrentJob(callback) {
        this.curJob = null;
        callback(null);
    }

    runJob(callback) {
        let runningJobId = g_runningJobMgr.runJob(this.sessionIDInRunningJobMgr, this.curJob);
        this.runningJobIDs.push(runningJobId);

        callback(null);
    }

    close() {
        g_runningJobMgr.removeSession(this.sessionIDInRunningJobMgr);
    }
}

module.exports = protoJobSession;