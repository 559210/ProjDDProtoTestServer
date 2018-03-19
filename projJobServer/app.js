"use strict";

var cluster = require('cluster');
var os = require('os');

// if (cluster.isMaster) {
//     // 繁衍工人进程，数量跟系统中的CPU数量一样
//     for (var i = 0, n = os.cpus().length; i < n; i += 1) {
//         cluster.fork();
//     }
// } else {
// 启动程序

let io = require('socket.io-client');
let g_runningJobMgr = require('./public/js/protocolRunner/runningJobManager');

// 主服ip，测试时请用实际主服的ip
//var socket = io.connect("http://106.75.21.175:2777");
//var socket = io.connect("http://123.59.150.142:2777");
var socket = io.connect("http://127.0.0.1:2777");
socket.on('connect', () => { 
    console.log('connect main server ok.');

    // 注册主服
    socket.emit('register', os.hostname());

    // 运行job
    socket.on('runJob', function(data) {
        console.log('-----> gameUserId = %j, runningJobId = %j', data.gameUserId, data.runningJobId);
        //console.log('runJob ----- data = %j', data);
        g_runningJobMgr.runJob(socket, data, function(err) {
            console.log('runJob result = %j', err);
        });
    });

    // 订阅
    socket.on('subscribeToJobConsole', function(data) {
        console.log('subscribeToJobConsole ----- data = %j', data);
        g_runningJobMgr.subscribeToJobConsole(socket, data, function(err) {
            console.log('subscribeToJobConsole result = %j', err);
        });
    });

    // 取消订阅
    socket.on('unSubscribeToJobConsole', function(data) {
        console.log('unSubscribeToJobConsole ----- data = %j', data);
        g_runningJobMgr.unSubscribeToJobConsole(socket, data, function(err) {
            console.log('unSubscribeToJobConsole result = %j', err);
        });
    });

    // 设置颜色
    // socket.on('setSubscribedConsoleColor', function(data) {
    //     console.log('setSubscribedConsoleColor ----- data = %j', data);
    //     g_runningJobMgr.setSubscribedConsoleColor(socket, data, function(err) {
    //         console.log('setSubscribedConsoleColor result = %j', err);
    //     });
    // });

    socket.on('runProtocol', function(data) {
        g_runningJobMgr.runProtocol(data);
    });
    

    // 断开连接
    socket.on('disconnect', function(data) {
        console.log('disconnect -----');
    });
});

