var sql = require('mssql');
var g_ipTable = require('./ServerIp');
var async = require('async');


var GetFirstPay = function(servConf, callback) {
	var conn = new sql.Connection(servConf.GameDBConf, function(err){
		if (err) {
			callback(err);
			return;
		}

		var req = new sql.Request(conn);
		req.query("SELECT TOP 1 UserID, SUM(RealMoney) AS money " + 
			"FROM T_dance_Pay_Cash_Log " +
			"WHERE (CreateDate > '2014/12/25 00:00:00') " +
			"GROUP BY UserID " +
			"ORDER BY SUM(RealMoney) DESC", function(err, rs){

			if (err) {
				callback(err);
				return;
			}

			rs[0]['server'] = servConf.name;
			conn.close();
			callback(null, rs[0]);
		});
	});
}


module.exports = function(callback)
{
	var results = [];
	async.eachSeries(g_ipTable, function(item, cb){
		GetFirstPay(item, function(err, rs){
			if (err)
			{
				cb(err);
				return;
			}
			results.push(rs);
			cb(null);
		});
	}, function(err){
		if (err)
		{
			console.error(err);
		}
		callback(err, results);
	});
}