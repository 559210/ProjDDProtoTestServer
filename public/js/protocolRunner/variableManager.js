'use strict'
let commonJs = require('../../../CommonJS/common');

class variable {
    constructor(name, value) {
        this.name = name;
        this.value = value;
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

    createVariable(varName, value) {
        if (this.isVariableExists(varName)) {
            return this.setVariableValue(varName, value);
        }

        this.variables[varName] = new variable(varName, value);

        return true;
    }

    setVariableValue(varName, value) {
        if (!this.isVariableExists(varName)) {
            return false;
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