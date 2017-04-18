'use strict'

let g_protoMgr = require('./protocolManager');

class protoJobSession {
    constructor(userObj) {
        this.userObj = userObj;
        this.curJob = null;
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
}

module.exports = protoJobSession;