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


