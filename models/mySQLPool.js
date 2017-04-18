var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'feathers',
    password: '',
    database: 'DDProjServTest'
});


module.exports = pool;