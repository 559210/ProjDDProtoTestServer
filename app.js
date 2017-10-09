"use strict";
// dependencies

var cluster = require('cluster');
var os = require('os');

// if (cluster.isMaster) {
//     // 繁衍工人进程，数量跟系统中的CPU数量一样
//     for (var i = 0, n = os.cpus().length; i < n; i += 1) {
//         cluster.fork();
//     }
// } else {
// 启动程序

var fs = require('fs');
// var http = require('http');
var express = require('express');
var routes = require('./routes');
var path = require('path');
var Account = require('./models/account');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


let g_protoMgr = require('./public/js/protocolRunner/protocolManager');
let g_protoRunner = require('./public/js/protocolRunner/protocolRunner');
// var SS = require('./public/js/ServerStatus');
// var SGM = require('./public/js/SendGameMail');
// var Loading = require('./public/js/loading');
// var Server = require('./public/js/ServerIp');
// main config
var app = express();
var parseCookie = express.cookieParser("keyboard cat")
var http = require('http').Server(app);
var io = require('socket.io')(http);

let g_jobServerMgr = require('./public/js/protocolRunner/jobServerManager');

io.use(function(socket, next) {
    //parseCookie会解析socket.request.headers.cookie并赋值给执行socket.request.cookies
    parseCookie(socket.request, null, function(err) {
        if (err) {
            console.log("err parse");
            return next(new Error("cookie err"));
        }
        // cookie中获取sessionId
        var connect_sid = socket.request.signedCookies['xxkey'];

        next();
        if (connect_sid) {
            //通过cookie中保存的session的id获取到服务器端对应的session
            Account.getSessionStore().get(connect_sid, function(error, session) {
                if (error) {
                    return next(new Error('Authentication error'));
                } else {
                    // save the session data and accept the connection
                    socket.request.session = session;
                    next();
                }
            });
        }
    });

});

app.set('port', process.env.PORT || 2773);
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.set('view options', {
    layout: false
});
app.use(express.logger());
app.use(express.bodyParser({
    uploadDir: './uploadsTmp'
}));
app.use(express.methodOverride());
app.use(parseCookie);
app.use(express.session({
    secret: 'keyboard cat',
    key: 'xxkey',
    store: Account.getSessionStore()
        // ,
        // resave: true,
        // saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.configure('development', function() {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});

// passport config

passport.use(new LocalStrategy(Account.authenticate));
passport.serializeUser(Account.serializeUser);
passport.deserializeUser(Account.deserializeUser);


g_protoRunner.start(io);
// SS.Start(io);
// SGM.Start(io);
// Loading.Start(io);

/**
 * 针对服务器的socket.io
 */

let jobServerIo = require('socket.io')(2777);
g_jobServerMgr.start(jobServerIo);

// routes
routes(app, io);

// app.get('/UserCountData', function(req, res){
//     SS.GetAllServerStatus(function(err, ret){
//       // res.write(JSON.stringify(ret));
//       // res.end();
//       // return;
//       var str=[];
//       var ret2 = "<div style='float:left'>";
//       var sum = 0;
// 	  for(var i = 0; i < Server.length;i++)
// 	  {
// 	  	str[i] = JSON.stringify(ret[i].status[5].status);
//       	str[i] = str[i].replace('ON -> ', '');
//       	str[i] = str[i].replace('"', '');
// 	  	ret2 += Server[i].name+":"+"GS:"+parseInt(str[i])+"<br>";
// 	  	sum += parseInt(str[i]);
// 	  }
// 	  ret2 += "<p style='color:red'>GS sum:"+sum+"</p></div><div style='float:left;margin-left:50px'>";
// 	  var str2=[];
//       var ret3 = "";
//       var sum1 = 0;
// 	  for(var i = 0; i < Server.length;i++)
// 	  {
// 	  	str2[i] = JSON.stringify(ret[i].status[6].status);
//       	str2[i] = str2[i].replace('ON -> ', '');
//       	str2[i] = str2[i].replace('"', '');
// 	  	ret2 += Server[i].name+":"+"GW:"+parseInt(str2[i])+"<br>";
// 	  	sum1 += parseInt(str2[i]);
// 	  }
// 	  ret2 += "<p style='color:red'>GW sum:"+sum1+"</p></div>";
//       res.write(JSON.stringify(ret2));
//       res.end();
//     });
//   });


process.on('uncaughtException', function(err) {
    console.error('Error caught in uncaughtException event:', err);
});

console.log('wait for initialize...');

function startServer() {
    g_protoMgr.init((err) => {
        if (err) {
            console.error(err);
            return;
        }

        http.listen(app.get('port'), function() {
            console.log(("Express server listening on port " + app.get('port')))
        });
    });
}

startServer();



// }