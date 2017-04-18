'use restrict'

var async = require('async');
var assert = require('chai').assert;
var expect = require('chai').expect;

var commonJs = require('../CommonJs/common');
var protoMgr = require('../public/js/protocolRunner/protocolManager');
var protoInstrumentClass = require('../public/js/protocolRunner/protoInstrument');
var variableManagerClass = require('../public/js/protocolRunner/variableManager');
var protoRunnerJobClass = require('../public/js/protocolRunner/protoRunnerJob');

var protoRunnerPersisitent = require('../models/protocolRunnerPersistent');

describe('protocol manager', function() {
    describe('load from db', function() {

        // it('save', function(done) {
        //     protoMgr.saveBriefList((err) => {
        //         expect(commonJs.isUndefinedOrNull(err)).to.be.true;
        //         done();
        //     });
        // });

        it('init', function(done) {
            protoMgr.init((err) => {
                expect(commonJs.isUndefinedOrNull(err)).to.be.true;
                done();
            });
        });

        // let jobObj = null;
        // it('create a job', function(done) {
        //     protoMgr.createJob('majunTestJob', (err, _jobObj) => {
        //         console.log(err);
        //         expect(commonJs.isUndefinedOrNull(err)).to.be.true;
        //         expect(commonJs.isUndefinedOrNull(_jobObj)).to.be.not.true;
        //         jobObj = _jobObj;
        //         done();                
        //     });
        // });

        // it('save/update a job', function(done) {
        //     jobObj.name = 'majunTestNew';
        //     protoMgr.saveJob(jobObj, (err) => {
        //         expect(commonJs.isUndefinedOrNull(err)).to.be.true;
        //         done();                   
        //     });
        // });


        // it('remove job', function(done) {
        //     protoMgr.removeJob(jobObj.id, (err) => {
        //         expect(commonJs.isUndefinedOrNull(err)).to.be.true;
        //         jobObj = null;
        //         done();
        //     });
        // });
    });
});

// describe('protoInstrument', function() {
//     describe('getParsedC2SParams', function() {
//         it('getParsedC2SParams 01', function() {
//             let protos = protoMgr.getProtocolBriefList();
//             for (let key in protos) {
//                 let pro = protos[key];
//                 for (let i = 0; i < pro.length; ++i) {
//                     let protoIns = new protoInstrumentClass(pro[i].id);
//                     protoIns.getParsedC2SParams();
//                 }
//             }
//         });

//         it('getParsedC2SParams setC2SParamValue', function() {
//             let protos = protoMgr.getProtocolBriefList();
//             let loginProto = protos['登陆协议'];
//             let protoIns = new protoInstrumentClass(37);    // connector.connectorHandler.registerRequest
//             let params = protoIns.getParsedC2SParams(protoIns);

//             for (let paramName in params) {
//                 let param = params[paramName];
//                 switch (param.type) {
//                     case 'string':
//                         expect(protoIns.setC2SParamValue(param.name, "it's a test string")).to.be.not.null;
//                         break;
//                     case 'int':
//                         expect(protoIns.setC2SParamValue(param.name, 12)).to.be.not.null;
//                         break;
//                     default:
//                         assert(false);
//                         break;
//                 }
//             }
//         });
//     });

// });


// describe('variableManager', function() {
//     let va = new variableManagerClass();
//     describe('createVariable', function() {
//         it('createVariable ok', function() {
//             expect(va.createVariable('vName', 15)).to.be.true;

//         });

//         it('createVariable with duplicated name', function() {
//             expect(va.createVariable('vName', 13)).to.be.true;
//         });
//     });

//     describe('getVariableValue', function() {
//         it('getVariableValue ok', function() {
//             expect(va.getVariableValue('vName')).to.be.equal(13);
//         });

//         it('getVariableValue with a name that is not exists', function() {
//             expect(va.getVariableValue('vvName')).to.be.null;
//         });
//     });


//     describe('setVariableValue', function() {
//         it('setVariableValue ok', function() {
//             expect(va.setVariableValue('vName', 'a string')).to.be.true;
//             expect(va.getVariableValue('vNmae')).to.be.string;
//         });
//     });

//     describe('removeVariable', function() {
//         it('removeVariable ok', function() {
//             expect(va.removeVariable('vName', 'a string')).to.be.true;
//             expect(va.getVariableValue('vNmae')).to.be.null;
//         });
//     });
// });



// /**
//  *  外部接口
//  */



describe('protoRunnerJob', function() {
    let prj = null;

    describe('runInstrument', function() {
        it('create job', function(done) {
            protoMgr.createJob('xxx', (err, jobObj) => {
                expect(commonJs.isUndefinedOrNull(err)).to.be.true;
                expect(commonJs.isUndefinedOrNull(jobObj)).not.to.be.true;
                prj = jobObj;
                done();
            });
        });

        // it('load job', function(done) {
        //     protoMgr.loadJobByName('xxx', (err, jobObj) => {
        //         expect(commonJs.isUndefinedOrNull(err)).to.be.true;
        //         expect(commonJs.isUndefinedOrNull(jobObj)).not.to.be.true;
        //         prj = jobObj;
        //         done();                
        //     })
        // });


        it('runInstrument login', function(done) {
            this.timeout(20000);

            let ins = new protoInstrumentClass(1);    // connect

            ins.setC2SParamValue('host', '123.59.150.143');
            ins.setC2SParamValue('port', 5010);
            prj.addInstrument(ins);

            ins = new protoInstrumentClass(5);    // balance.balanceHandler.getCipherCodeRequest
            var script = "{\
                let decipheriv = function (enData)\
                {\
                    let crypto = require('crypto');\
                    let bufKey = new Buffer('YY`VBEyn');\
                    let bufIV = new Buffer('YY`VBEyn');\
                \
                    let aBuffer = new Buffer(enData,'base64');\
                    let decipher = crypto.createDecipheriv('des',bufKey,bufIV);\
                    let decodeData = decipher.update(enData,'base64','utf8');\
                    decodeData += decipher.final('utf8');\
                    return decodeData;\
                };\
                \
                let cipherCode = variableManager.getVariableValue(varPrefix + 'cipherCode');\
                variableManager.setVariableValue(varPrefix + 'cipherCode', decipheriv(cipherCode));\
                \
                }";

            ins.setPluginFunc(script);
            prj.addInstrument(ins);

            ins = new protoInstrumentClass(12);    // balance.balanceHandler.checkCodeRequest
            ins.setC2SParamValue('code', 'balance.balanceHandler.getCipherCodeRequest#cipherCode', true);
            prj.addInstrument(ins);

            ins = new protoInstrumentClass(20);    // balance.balanceHandler.getConnectorInfoRequest
            prj.addInstrument(ins);

            // connector
            ins = new protoInstrumentClass(1);    // connect
            ins.setC2SParamValue('host', 'balance.balanceHandler.getConnectorInfoRequest#connectorIp', true);
            ins.setC2SParamValue('port', 'balance.balanceHandler.getConnectorInfoRequest#connectorPort', true);
            prj.addInstrument(ins);

            ins = new protoInstrumentClass(41);    // connector.connectorHandler.loginRequest
            ins.setC2SParamValue('userId', 'ccss006');
            ins.setC2SParamValue('password', '111');
            ins.setC2SParamValue('deviceId', 'protocalTestTool');
            ins.setC2SParamValue('platformId', '0');
            prj.addInstrument(ins);

            prj.runAll(function(error) {
                console.log(error);
                expect(commonJs.isUndefinedOrNull(error)).to.be.true;
                done();
            });

        });

        it('update(save) job', function(done) {
            protoMgr.saveJob(prj, function (err) {
                console.log(err);
                expect(commonJs.isUndefinedOrNull(err)).to.be.true;
                done();
            })
        });


        it('runInstrumentStepByStep', function(done) {
            this.timeout(20000);

            async.eachSeries([0, 1, 2, 3, 4, 5], function(idx, cb) {
                prj.runByStep(idx, cb);
            }, function(err) {
                expect(commonJs.isUndefinedOrNull(err)).to.be.true;
                done();
            });
        });


        it('removeInstrument', function() {
            let oldCount = prj.getAllInstruments().length;
            let ins = new protoInstrumentClass(1);    // connect
            prj.addInstrument(ins);
            prj.removeInstrument(prj.getAllInstruments().length - 1);
            expect(oldCount == prj.getAllInstruments().length).to.be.true;
        });


        it('runInstrument with sub job', function(done) {
            let newPrj = null;
            async.series(
                [
                (cb) => {
                    protoMgr.createJob('yyy', (err, newJobObj) => {
                        if (err) {
                            return cb(err);
                        }
                        newPrj = newJobObj;
                        cb(null);
                    });
                },
                (cb) => {
                    let protoId = protoMgr.getJobInstId(prj.id);
                    let ins = new protoInstrumentClass(protoId);
                    newPrj.addInstrument(ins);
                    newPrj.runAll(cb);
                },
                (cb) => {
                    protoMgr.saveJob(newPrj, cb);
                }
                ], (err) => {
                    newPrj = null;
                    expect(commonJs.isUndefinedOrNull(err)).to.be.true;
                    done();
                });
        });


    });

    // describe('serialize/deserialize', function() {
    //     let serializedStr;
    //     it('serialize', function() {
    //         serializedStr = prj.serialize();
    //         expect(serializedStr).to.be.string;
    //     });

    //     it('deserialize', function(done) {
    //         prj = new protoRunnerJobClass();
    //         expect(prj.deserialize(serializedStr)).to.be.ok;

    //         prj.runAll(function(err) {
    //             expect(commonJs.isUndefinedOrNull(err)).to.be.true;
    //             done();
    //         })
    //     });

    //     it('serialize persistent save', function(done) {
    //         protoRunnerPersisitent.save(prj.name, serializedStr, false, null, function(err) {
    //             expect(commonJs.isUndefinedOrNull(err)).to.be.true;
    //             done();
    //         });
    //     });

    //     it('serialize persistent save the same(update)', function(done) {
    //         protoRunnerPersisitent.save(prj.name, serializedStr, false, null, function(err) {
    //             expect(commonJs.isUndefinedOrNull(err)).to.be.true;
    //             done();
    //         });
    //     });

    //     it('load job list', function(done) {
    //         protoRunnerPersisitent.loadJobList(function(err, list) {
    //             expect(commonJs.isUndefinedOrNull(err)).to.be.true;
    //             done();
    //         });
    //     });

    //     it('load job by name', function(done) {
    //         protoRunnerPersisitent.loadJobByName('xxx', function(err, job) {
    //             expect(commonJs.isUndefinedOrNull(err)).to.be.true;
    //             done();
    //         });
    //     });

    //     it('load job that is not exists', function(done) {
    //         protoRunnerPersisitent.loadJobByName('xyxyxyx', function(err, job) {
    //             expect(commonJs.isUndefinedOrNull(err)).to.be.true;
    //             expect(commonJs.isUndefinedOrNull(job)).to.be.true;
    //             done();
    //         });
    //     });

    //     it('rename job', function(done) {
    //         protoRunnerPersisitent.loadJobByName('xxx', function(err, job) {
    //             expect(commonJs.isUndefinedOrNull(err)).to.be.true;
    //             let jobObj = new protoRunnerJobClass();
    //             expect(jobObj.deserialize(job.job)).to.be.ok;
    //             jobObj.name = 'xxx_new';

    //             protoRunnerPersisitent.updateJobName('xxx', jobObj.name, jobObj.serialize(), function(_err) {
    //                 expect(commonJs.isUndefinedOrNull(_err)).to.be.true;
    //                 done();
    //             });

    //         });
    //     });

    //     it('delete job', function(done) {
    //         protoRunnerPersisitent.removeJobByName('xxx_new', function(err) {
    //             expect(commonJs.isUndefinedOrNull(err)).to.be.true;
    //             done();
    //         });
    //     });
    // });
});