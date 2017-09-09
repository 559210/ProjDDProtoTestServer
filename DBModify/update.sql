/* modify 2017-08-27 */
INSERT INTO `DDProjServTest`.`InstrumentPrototypes` (`instId`, `name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('253', 'createVariable', '{}', '{}', '5', '创建变量', '变量系统');

/* modify 2017-08-29  15:05:00*/ 
UPDATE `DDProjServTest`.`InstrumentPrototypes` SET `c2s`='{\"name\":{\"type\":\"string\",\"desc\":\"变量名称\"},\"value\":{\"type\":\"string\",\"desc\":\"字符串类型值\"},\"desc\":{\"type\":\"string\",\"desc\":\"变量描述\"}}', `s2c`='{}', `type`='4', `note`='创建变量', `tag`='变量系统' WHERE (`name`='createVariable');

/* modify 2017-08-29  16:00:00*/
UPDATE `ddprojservtest`.`instrumentprototypes` SET `tag`='基础系统' WHERE (`tag`='连接服务器');
UPDATE `ddprojservtest`.`instrumentprototypes` SET `tag`='基础系统' WHERE (`tag`='变量系统');
DELETE FROM `ddprojservtest`.`instrumentprototypes` WHERE (`name`='createVariable');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('createIntVariable', '{\"name\":{\"type\":\"string\",\"desc\":\"变量名称\"},\"value\":{\"type\":\"int\",\"length\":4,\"desc\":\"整型类型初始值\"},\"desc\":{\"type\":\"string\",\"desc\":\"变量描述\"}}', NULL, '4', '创建整型变量', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('createStringVariable', '{\"name\":{\"type\":\"string\",\"desc\":\"变量名称\"},\"value\":{\"type\":\"string\",\"desc\":\"字符串类型初始值\"},\"desc\":{\"type\":\"string\",\"desc\":\"变量描述\"}}', NULL, '4', '创建字符串类型变量', '基础系统');

/* modify 2017-09-02  17:00:00*/
UPDATE `ddprojservtest`.`instrumentprototypes` SET `c2s`='{\"page\":{\"type\":\"int\",\"length\":4,\"desc\":\"请求列表的页数( 从0开始)\"},\"majorId\":{\"type\":\"int\",\"length\":4,\"desc\":\"新手大步编号(可选字段)\"},\"minorId\":{\"type\":\"int\",\"length\":4,\"desc\":\"新手小步编号(可选字段)\"}}' WHERE (`name`='friend.friendHandler.getFriendListRequest');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('tagItem', '{\"name\":{\"type\":\"string\",\"desc\":\"标签名称\"}}', '{}', '4', '标签条目', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('gg', '{\"param1\":{\"type\":\"int\",\"length\":4,\"desc\":\"第一个元素\"},\"param2\":{\"type\":\"int\",\"length\":4,\"desc\":\"第二个元素\"},\"tagName\":{\"type\":\"string\",\"desc\":\"标签名称\"}}', '{}', '4', 'goto的大于判定(只支持整型类型)', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('gge', '{\"param1\":{\"type\":\"int\",\"length\":4,\"desc\":\"第一个元素\"},\"param2\":{\"type\":\"int\",\"length\":4,\"desc\":\"第二个元素\"},\"tagName\":{\"type\":\"string\",\"desc\":\"标签名称\"}}', '{}', '4', 'goto的大于等于判定(只支持整型类型)', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('gl', '{\"param1\":{\"type\":\"int\",\"length\":4,\"desc\":\"第一个元素\"},\"param2\":{\"type\":\"int\",\"length\":4,\"desc\":\"第二个元素\"},\"tagName\":{\"type\":\"string\",\"desc\":\"标签名称\"}}', '{}', '4', 'goto的小于判定(只支持整型类型)', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('gle', '{\"param1\":{\"type\":\"int\",\"length\":4,\"desc\":\"第一个元素\"},\"param2\":{\"type\":\"int\",\"length\":4,\"desc\":\"第二个元素\"},\"tagName\":{\"type\":\"string\",\"desc\":\"标签名称\"}}', '{}', '4', 'goto的小于等于判定(只支持整型类型)', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('ge', '{\"param1\":{\"type\":\"string\",\"desc\":\"第一个元素\"},\"param2\":{\"type\":\"string\",\"desc\":\"第二个元素\"},\"tagName\":{\"type\":\"int\",\"length\":4,\"desc\":\"标签名称\"}}', '{}', '4', 'goto的等于判定(整型，字符串类型)', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('gne', '{\"param1\":{\"type\":\"string\",\"desc\":\"第一个元素\"},\"param2\":{\"type\":\"string\",\"desc\":\"第二个元素\"},\"tagName\":{\"type\":\"string\",\"desc\":\"标签名称\"}}', '{}', '4', 'goto的不等于判定(整型，字符串类型)', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('gnull', '{\"tagName\":{\"type\":\"string\",\"desc\":\"标签名称\"}}', '{}', '4', 'goto的无条件判定', '基础系统');
INSERT INTO `ddprojservtest`.`instrumentprototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('timer', '{\"second\":{\"type\":\"string\",\"desc\":\"秒位设定\"},\"minute\":{\"type\":\"string\",\"desc\":\"分位设定\"},\"hour\":{\"type\":\"string\",\"desc\":\"时位设定\"},\"day\":{\"type\":\"string\",\"desc\":\"天位设定\"},\"month\":{\"type\":\"string\",\"desc\":\"月位设定\"},\"week\":{\"type\":\"string\",\"desc\":\"周位设定\"}}', '{}', '4', '定时指令', '基础系统');

/* modify 2017-09-04  12:00:00*/
UPDATE `ddprojservtest`.`instrumentprototypes` SET `name`='gotoGreater' WHERE (`name`='gg');
UPDATE `ddprojservtest`.`instrumentprototypes` SET `name`='gotoGreaterOrEqual' WHERE (`name`='gge');
UPDATE `ddprojservtest`.`instrumentprototypes` SET `name`='gotoLess' WHERE (`name`='gl');
UPDATE `ddprojservtest`.`instrumentprototypes` SET `name`='gotoLessOrEqual' WHERE (`name`='gle');
UPDATE `ddprojservtest`.`instrumentprototypes` SET `name`='gotoEqual' WHERE (`name`='ge');
UPDATE `ddprojservtest`.`instrumentprototypes` SET `name`='gotoNotEqual' WHERE (`name`='gne');
UPDATE `ddprojservtest`.`instrumentprototypes` SET `name`='gotoNull' WHERE (`name`='gnull');
UPDATE `ddprojservtest`.`instrumentprototypes` SET `c2s`='{\"milliSecond\":{\"type\":\"int\",\"length\":4,\"desc\":\"间隔的毫秒数\"},\"count\":{\"type\":\"int\",\"length\":4,\"desc\":\"累计执行次数(默认无限)\"}}' WHERE (`name`='timer');

/* modify 2017-09-08  16:00:00*/
UPDATE `ddprojservtest`.`instrumentprototypes` SET `c2s`='{\"milliSecond\":{\"type\":\"int\",\"length\":4,\"desc\":\"间隔的毫秒数\"},\"count\":{\"type\":\"int\",\"length\":4,\"desc\":\"累计执行次数(默认无限)\"},\"jobId\":{\"type\":\"int\",\"length\":4,\"desc\":\"运行的JOB编号\"}}' WHERE (`name`='timer');

