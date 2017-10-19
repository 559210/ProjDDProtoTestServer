'use strict'
let commonJs = require('../../../CommonJS/common');

class variable {
    constructor(name, value, type) {
        this.name = name;
        this.value = value;
        this.type = type;
    }
}

class variableManager {
    constructor() {
        this.variables = {};
    }

    isVariableExists(varName) {
        if (commonJs.isUndefinedOrNull(this.variables[varName])) {
            return false;
        }

        return true;
    }

    createVariable(varName, value, type) {
        if (this.isVariableExists(varName)) {
            return this.setVariableValue(varName, value);
        }

        // if (type == null || type == undefined) {
        //     type = 'string';
        // }
        this.variables[varName] = new variable(varName, value, type);

        return true;
    }

    setVariableValue(varName, value) {
        if (!this.isVariableExists(varName)) {
            return false;
        }
        switch(this.variables[varName].type) {
            case 'int':
            value = parseInt(value);
            break;
            case 'string':
            value = value.toString();
            break;
        }
        this.variables[varName].value = value;
        return true;
    }

    getVariableValue(varName) {
        if (!this.isVariableExists(varName)) {
            return null;
        }
        return this.variables[varName].value;
    }

    removeVariable(varName) {
        if (this.isVariableExists(varName)) {
            delete this.variables[varName];
            return true;
        }

        return false;
    }
}

module.exports = variableManager;