"use strict";

var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'feathers',
    password: '1qazxsw2',
    database: 'DDProjServTest'
});


module.exports = pool;