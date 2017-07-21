'use strict'
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let runningJobClass = require('./runningJob');


class runningJobManager{
    constructor() {
        this.globalIndex = 0;
        this.sessionMap = {};           // id -> session
        this.runningJobMap = {};        // id -> job array
    };

    getID(session) {
        let id = this.globalIndex;
        this.globalIndex++;
        this.sessionMap[id] = session;
        return id;
    }

    runJob(id, jobObj) {
        let session = this.sessionMap[id];
        if (commonJs.isUndefinedOrNull(session)) {
            return -1;
        }
        if (commonJs.isUndefinedOrNull(this.runningJobMap[id])) {
            this.runningJobMap[id] = [];
        }

        let runningJobObj = new runningJobClass(jobObj, session, 0, null);
        let runningJobId = this.runningJobMap[id].length;
        this.runningJobMap[id].push(runningJobObj);
        runningJobObj.runAll((err) => {});

        return runningJobId;
    }

    stopJob(id, runningJobId) {
        let runningJobs = this.runningJobMap[id]
        if (commonJs.isUndefinedOrNull(runningJobs)) {
            return false;
        }

        if (runningJobId < 0 || runningJobId >= runningJobs.length) {
            return false;
        }

        let runningJob = runningJobs[runningJobId];
        runningJobs[runningJobId] = null;
        runningJob.stop();
        return true;
    }
};