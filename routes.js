'use strict';

let async = require('async');
let passport = require('passport');
let Account = require('./models/account');
let log4js = require('log4js');
let logger = log4js.getLogger();

let g_protoMgr = require('./public/js/protocolRunner/protocolManager');
let g_protoJobManager = require('./public/js/protocolRunner/protocolRunner');
let commonJs = require('./CommonJS/common');
let g_runningJobMgr = require('./public/js/protocolRunner/runningJobManager');
let g_protocolRunnerPersistent = require('./models/protocolRunnerPersistent');

let connectorServerList = require('./models/connectorServerList');

var checkLogin = function(req, res, next) {
    // console.log(req.session);
    if (req.isAuthenticated()) {
        return next(null);
    }

    res.redirect('/Login');
};

var _getConnectorInfo = function() {
    let sid = '142';
    var stamp = new Date().getTime();
    var idx = stamp % connectorServerList[sid].length;
    return {
        host:connectorServerList[sid][idx].host,
        port:connectorServerList[sid][idx].port
    };
};

module.exports = function(app, io) {

    // app.get('/*', checkLogin);
    app.get('/', checkLogin, function(req, res) {
        res.render('index', {
            userName: req.user.userName
        });
    });

    app.get('/register', function(req, res) {
        if (req.isAuthenticated()) {
            res.redirect('/');
            return;
        }
        res.render('register', {});
    });

    app.post('/register', function(req, res) {
        // console.log(req.body);
        Account.createUser(req.body, (err) => {
            if (err) {
                res.write(err.toString(), 'utf-8');
                res.end();
                return;
            }

            res.redirect('/Login');
        });
    });

    app.post('/register/checkun', function(req, res) {
        // Account.find({username:req.body.username}, {_id:0, username:1}, function(err, user) {
        //   if (user.length == 0) {
        //     res.write('{ "OK": true }', "utf-8");
        //   }
        //   else {
        //     res.write('{ "OK": false }', "utf-8");
        //   }
        //   res.end();
        // });
    });

    app.get('/login', function(req, res) {
        res.render('login', {
            user: req.user
        });
    });

    app.post('/login', passport.authenticate('local', {
            failureRedirect: '/login'
        }),
        function(req, res) {
            res.redirect('/');
        });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/protocollist', checkLogin, (req, res) => {
        let ap = g_protoMgr.getProtocolBriefList();
        res.render('protocolViews/protocolView', {
            protocolList: ap
        });
    });

    app.get('/protocolEdit', checkLogin, (req, res) => {
        // console.log('----------->', req.query);
        if (req.query.protoId){
            let proto = g_protoMgr.getBriefProtocolById(req.query.protoId);
            console.log('-------->', proto);
            res.render('protocolViews/protocolEdit', {proto: proto});
        }
        else {
            res.render('protocolViews/protocolEdit');
        }
    });

    // app.get('/PopupTest', checkLogin, (req, res) => {
    //     let ap = g_protocolManager.getProtocolBriefList();
    //     res.render('protocolViews/popupTest', {
    //         protocolList: ap
    //     });
    // });

    app.get('/ProtocolJobs', checkLogin, (req, res) => {
        var resJson = {};

        async.series([
            (cb) => {
                let openedJobDetail = g_protoJobManager.getOpenedJobDetail(req.session.passport.user);
                if (openedJobDetail) {
                    resJson.jobDetail = openedJobDetail;
                }

                cb(null);
            },
            (cb) => {
                resJson.jobList = g_protoMgr.getAllJobList();
                cb(null);             
            },
            (cb) => {
                resJson.protocolList = g_protoMgr.getProtocolBriefList();
                cb(null);
            }
            ], (err) => {
                if (err) {
                    res.writeHead(500);
                    res.end();
                    return;
                }
                
                res.render('protocolViews/protocolJobs', resJson);
            });
    });

    app.get('/RunningJobs', checkLogin, (req, res) => {
        let resJson = {
            runningJobs: {}
        };

        resJson.runningJobs = g_runningJobMgr.getAllRunningJobs(req.session.passport.user);
        // for (let key in runningJobsMap) {
        //     if (resJson.runningJobs[key] === undefined || resJson.runningJobs[key] === null) {
        //         resJson.runningJobs[key] = [];
        //     }

        //     for (let runningJobId in runningJobsMap[key]) {
        //         let runningJobObject = runningJobsMap[key][runningJobId];
        //         resJson.runningJobs[key].push({name:runningJobObject.getName(), runningJobId: runningJobId});
        //     }

        // }
        // console.log('--------------------===============')
        // console.log(resJson);
        res.render('protocolViews/runningJobView', resJson);
    });

    app.get('/RunProtocol', checkLogin, (req, res) => {      
        res.render('protocolViews/RunProtocol');
    });

    app.post('/RunProtocolButton', checkLogin, (req, res) => {
        g_protocolRunnerPersistent.loadUserSessionList(-1, -1, (err, datas, dataCount, pageCount) => {
            async.eachSeries(datas, (sessionData, _cb) => {
                g_protocolRunnerPersistent.loadUserSessionProtocolList(sessionData.sessionId, sessionData.userId, (err, datas) => {
                    var connectorInfo = _getConnectorInfo();
                    g_runningJobMgr.runProtocol(connectorInfo, datas, _cb);
                });
            }, (err) => {
                if(err){
                    res.send({result:1,message:err});
                } else {
                    res.send({result:0,message:"全部执行完毕"});
                }
            });
        });
    });

    app.post('/RunProtocol', checkLogin, (req, res) => {  
        var page = req.body.page || 1; 
        var pageSize = req.body.rows || 40;
        var mRows = [];//行记录集合
        g_protocolRunnerPersistent.loadUserSessionList(page,pageSize,(err, datas,dataCount,pageCount) => {
            async.eachSeries(datas, (sessionData, _cb) => {
                var i = 0;
                var row = {};
                row.id = i++;//行id
                row.cell = [];//单元格集合
                row.cell.push(sessionData.sessionId);
                row.cell.push(sessionData.userId);  
                // console.log('sessionId:',sessionData.sessionId,'userId:',sessionData.userId);
                g_protocolRunnerPersistent.loadUserSessionProtocolList(sessionData.sessionId, sessionData.userId, (err, datas) => {
                    // console.log('err = %j, length = %j', err, datas);
                    row.cell.push(datas);
                    if (err) {
                        return _cb(err);
                    }
                    mRows.push(row);
                    _cb(null);
                });
            }, (err) => {
                if(err){
                    console.log('loadUserSessionProtocolList ---> err = %j', err);
                    res.send({error:err});
                } else{
                    var data = {
                        page:page,
                        total:pageCount,
                        records:dataCount,
                        rows:mRows
                    };
                    res.send(data);
                }
            });
        });
    });    

    // app.get('/CodeTest', checkLogin, (req, res) => {
    //     res.render('codeTest');
    // });

    // app.get('/ServerConfigUpload', function(req, res){
    //   ServerConfigUpload.getServerBriefList(function(err, servers){
    //     if (servers) {
    //       res.render('ServerConfigUpload', {servers:servers, user : req.user});
    //     }
    //     else {
    //       res.writeHead(500);
    //       res.end();
    //     }
    //   });
    // });

    // app.post('/ServerList/Operator/ServerConfigUpload/:name', function(req, res){
    //   ServerConfigUpload.upload(req.params.name, function(err){
    //     if (err) {
    //        res.write('{ "result": "上传失败" }', "utf-8");
    //     }
    //     else {
    //       res.write('{ "result": "上传成功" }', "utf-8");
    //     }
    //     res.end();
    //   });
    // });


    // app.post('/jump', function(req, res){
    //   res.redirect(req.body.url);
    // });


    // app.get('/ServerList/Operator/:name', function(req, res) {
    //   ServerConfigUpload.getServerListByName(req.params.name, function(err, doc){
    //     if (err || doc == null) {
    //       res.writeHead(500);
    //       res.end();
    //     }
    //     else {
    //       ServerConfigUpload.getServerStatus(doc.Ip, function(err, status){
    //         res.render('ServerOperator', {server : doc, user : req.user, status: status});
    //       });
    //     }
    //   });
    // });

    // app.post('/ServerList/Operator/StartServer/:name', function(req, res){
    //   ServerConfigUpload.startServer(req.params.name, function(err){
    //     res.redirect('/ServerList/Operator/' + req.params.name);
    //   });
    // });

    // app.post('/ServerList/Operator/StopServer/:name', function(req, res){
    //   ServerConfigUpload.stopServer(req.params.name, function(err){
    //     res.redirect('/ServerList/Operator/' + req.params.name);
    //   });
    // });

    // app.post('/ServerList/Operator/Save/Name/:name', function(req, res){
    //   if (req.params.name == req.body.name) {
    //     res.redirect('/ServerList/Operator/' + req.params.name);
    //   }
    //   else {
    //     ServerConfigUpload.changeServerConfig(req.params.name, {Name:req.body.name}, function(err, docs){
    //       if (err || docs == 0) {
    //         res.redirect('/ServerList/Operator/' + req.params.name);
    //       }
    //       else {
    //         res.redirect('/ServerList/Operator/' + req.body.name);
    //       }
    //     });
    //   }
    // });

    // app.post('/ServerList/Operator/Save/SvnPath/:name', function(req, res){
    //   ServerConfigUpload.changeServerConfig(req.params.name, {SvnPath:req.body.svnPath}, function(err, docs){
    //       res.redirect('/ServerList/Operator/' + req.params.name);
    //   });
    // });

    // app.post('/ServerList/Operator/Save/Ip/:name', function(req, res){
    //   ServerConfigUpload.changeServerConfig(req.params.name, {Ip:req.body.ip}, function(err, docs){
    //       res.redirect('/ServerList/Operator/' + req.params.name);
    //   });
    // });

    // app.post('/ServerList/Operator/Save/SvnIp/:name', function(req, res){
    //   ServerConfigUpload.changeServerConfig(req.params.name, {SvnIp:req.body.svnIp}, function(err, docs){
    //       res.redirect('/ServerList/Operator/' + req.params.name);
    //   });
    // });

    // app.post('/ServerList/Operator/Save/SvnUserName/:name', function(req, res){
    //   ServerConfigUpload.changeServerConfig(req.params.name, {SvnUserName:req.body.svnUserName}, function(err, docs){
    //       res.redirect('/ServerList/Operator/' + req.params.name);
    //   });
    // });

    // app.post('/ServerList/Operator/Save/SvnPassword/:name', function(req, res){
    //   ServerConfigUpload.changeServerConfig(req.params.name, {SvnPassword:req.body.svnPassword}, function(err, docs){
    //       res.redirect('/ServerList/Operator/' + req.params.name);
    //   });
    // });

    // app.get('/ServerList/Operator/DelFile/:name', function(req, res){
    //   // console.log(req.params);
    //   // console.log(req.body);
    //   // console.log(req.query);
    //   ServerConfigUpload.removeFileFromServerConfig(req.params.name, req.query.filename, function(err){
    //     res.redirect('/ServerList/Operator/' + req.params.name);
    //   });
    // });

    // app.post('/ServerList/Operator/NewFile/:name', function(req, res){
    //   ServerConfigUpload.addFileToServerConfig(req.params.name, req.body.filename, function(err){
    //     res.redirect('/ServerList/Operator/' + req.params.name);
    //   })
    // });

    // app.post('/ServerList/Operator/Save/:name', function(req, res){
    //   ServerConfigUpload.changeFileToServerConfig(req.params.name, req.query.oldName, req.body.filename, function(err){
    //     res.redirect('/ServerList/Operator/' + req.params.name);
    //   })
    // });

    // app.get('/Download', function(req, res){
    //   res.render('download', {});
    // });

    // app.get('/Download/:filename', function(req, res){
    //   var transfer = Transfer(req, res);
    //   var filePath = './download/' + req.params.filename;
    //   transfer.Download(filePath);
    // });

    // // app.get('/FirstPay', function(req, res){
    // //   CheckFirstPay(function(err, rs){
    // //     console.log(rs);
    // //     res.render('FirstPay', {result: rs});
    // //   });
    // // });


    // app.get('/OnlineServer', function(req, res){
    //   SS.GetAllServerStatus(function(err, ret){
    //     var url = req.url;
    //     if (url[url.length-1] !== '/') {
    //       url += '/';
    //     }
    //     res.render('OnlineServer', {baseUrl:url, serverStatusList:ret}); 
    //   });
    // });

    // app.get('/OnlineServer/Start/:servId', function(req, res){

    //     SSB.AddJob(req.params.servId, 0);
    //     res.redirect('/');

    // });

    // app.get('/OnlineServer/Stop/:servId', function(req, res){

    //     SSB.AddJob(req.params.servId, 1);
    //     res.redirect('/');
    // });

    // app.get('/Upload', function(req, res){
    //   res.render("UploadFile");
    // });

    // app.post('/upload', function(req, res){
    //   var upfile = req.files.upload;
    //   var files = [];
    //   if (upfile instanceof  Array) {
    //       files = upfile;
    //   } else {
    //       files.push(upfile);
    //   }


    //   //var t_path = __dirname + "/ServerDir/";
    //   var t_path = "./ServerDir/";
    //   console.log(t_path);
    //   async.eachSeries(files, function(file, cb){
    //       var path = file.path;
    //       var name = file.name;
    //       var target_path = t_path + name;
    //       fs.rename(path, target_path, function (err) {
    //           if (err) {
    //             cb(er);
    //             return;
    //           }

    //           var AdmZip = require('adm-zip');

    //           // reading archives
    //           var zip = new AdmZip(target_path);
    //           zip.extractAllTo(t_path, true);

    //           var files = fs.readdirSync(t_path);
    //           files.forEach(function(file){
    //               var pathname = t_path + file
    //               , stat = fs.lstatSync(pathname);
    //               if (stat.isDirectory()){
    //                   var output = fs.createWriteStream(pathname +　'.zip');
    //                   var archive = archiver('zip');
    //                   archive.pipe(output);
    //                   archive.bulk([
    //                     { expand: true, cwd: pathname, src: ['**'] }
    //                   ]);

    //                   archive.finalize();
    //               }
    //           });

    //           res.render('UploadSucess', {Status:true, backUrl:'upload'});
    //       });
    //   }, function(err){
    //           res.render('UploadSucess', {Status:false, backUrl:'upload'});
    //   });
    // });

    //   app.get('/file/*', function(req, res){
    //       listFile.Show('./ServerDir/' + req.params[0], req, res);
    //   });

    //   app.get('/OnlineServer/UploadAll', function(req, res){
    //       var servers = [];
    //       for (var i in ServerIp) {
    //           for (var j in ServerIp[i].ServersFileUploadConf)
    //           {
    //               servers.push(ServerIp[i].ServersFileUploadConf[j]);
    //           }
    //       }
    //       serverFileUpload.upload(__dirname, servers, function(err){
    //           var text = '上传成功';
    //           if (err){
    //               console.error(err);
    //               text = err.toString();
    //           }
    //           setTimeout(function(){Loading.OK(text)}, 2000);
    //       })
    //       res.render('loading', {text:'请稍后........如果一直停留在此页，说明上传失败！'});
    //   });

    //   app.get('/OnlineServer/StartAll', function(req, res){
    //     for (var i = 0; i < ServerIp.length; i++) {        
    //       SSB.AddJob(i, 0);
    //     }; 
    //     res.redirect('/');
    //   });

    //   app.get('/OnlineServer/StopAll', function(req, res){
    //     for (var i = 0; i < ServerIp.length; i++) {        
    //       SSB.AddJob(i, 1);
    //     }; 
    //     res.redirect('/');
    //   });

    //   app.get('/GMTools', function(req, res){
    //       var serverList = [];
    //       for (var i = 0; i < ServerIp.length; ++i) {
    //           console.log(ServerIp[i].name);
    //           serverList.push({name:ServerIp[i].name, servId:i});
    //       }
    //       res.render('GMTools', {serverList:serverList});
    //   });

    //   app.get('/GMTools/SendBanner', function(req, res){
    //       var serverList = [];
    //       for (var i = 0; i < ServerIp.length; ++i) {
    //           serverList.push({name:ServerIp[i].name, servId:i});
    //       }
    //       res.render('GMTools', {serverList:serverList});       
    //   });

    //   app.post('/GMTools/SendBanner', function(req, res){
    //       var servers = req.body.servers;
    //       var text = req.body.text;
    //       BannerSender.SendBanner(servers, text, function(err, ret){
    //           if (ret.length == 0) {
    //               console.log('send ok');
    //           } else {
    //               console.log('send fail ---> ');
    //               console.log(ret);
    //           }
    //       });
    //       res.redirect('/GMTools');
    //   });

    //   app.get('/GMTools/SendMail', function(req, res){
    //       return;
    //       var serverList = [];
    //       for (var i = 0; i < ServerIp.length; ++i) {
    //           serverList.push({name:ServerIp[i].name, servId:i});
    //       }
    //       res.render('GMToolsSendMail', {serverList:serverList, partnerList : PartnerList.NameToID});       
    //   });

    //   app.post('/GMTools/SendMail/Excel', function(req, res) {
    //       return;
    //       var upfile = req.files.upload;
    //       SGM.SendExcelMail(upfile.path);
    //       res.redirect('/GMTools/SendMail');
    //   });


    //   app.get('/Data/FirstDay', function(req, res) {
    //       FirstDayData.GetFirstDayData(function(err, data){
    //         console.log('###=',data);
    //           res.render('ShowList', {data:data.data, title:'基本数据查询', tableTitle:data.tableTitle});
    //       });
    //   });

    //   app.get('/UserCount', function(req, res){
    //       UserCount.GetUserCountData(function(err, data){
    //           res.render('ShowList', {data:data.data, title:'在线人数查询', tableTitle:data.tableTitle});
    //       });
    //   });

    //   app.get('/MetricOverviewPage',function(req, res){
    //     res.render('MetricOverview');
    //   });

    //   app.get('/MetricOverview',function(req, res){
    //     var recordCount = 20;
    //     var Region = req.query.Region;
    //     var page = req.query.page;
    //     if(!page){
    //       page=1;
    //     }
    //     console.log(Region+'   '+page);
    //     UCloudApi.getUhostMetricOverview(Region,recordCount,recordCount*(page-1),function(err,data,refreshTime,totalCount){
    //       if(err){
    //         console.log('error:'+err);
    //         res.send({error:err});
    //       }else{
    //         res.send({UhostList:data,pages:Math.ceil(totalCount/recordCount)});
    //       }
    //     });
    //   });

};