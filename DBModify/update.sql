/* modify 2017-08-27 */
INSERT INTO `DDProjServTest`.`InstrumentPrototypes` (`instId`, `name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES ('253', 'createVariable', '{}', '{}', '5', '创建变量', '变量系统');

/* modify 2017-08-28 */ 
UPDATE `DDProjServTest`.`InstrumentPrototypes` SET `instId`='245', `name`='createVariable', `c2s`='{\"name\":{\"type\":\"string\",\"desc\":\"变量名称\"},\"value\":{\"type\":\"string\",\"desc\":\"字符串类型值\"},\"desc\":{\"type\":\"string\",\"desc\":\"变量描述\"}}', `s2c`='{}', `type`='5', `note`='创建变量', `tag`='变量系统' WHERE (`instId`='253');

/* modify 2017-08-29  15:05:00*/ 
UPDATE `DDProjServTest`.`InstrumentPrototypes` SET `c2s`='{\"name\":{\"type\":\"string\",\"desc\":\"变量名称\"},\"value\":{\"type\":\"string\",\"desc\":\"字符串类型值\"},\"desc\":{\"type\":\"string\",\"desc\":\"变量描述\"}}', `s2c`='{}', `type`='5', `note`='创建变量', `tag`='变量系统' WHERE (`name`='createVariable');