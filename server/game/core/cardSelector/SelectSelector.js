const _ = require('underscore');
const BaseCardSelector = require('./BaseCardSelector.js');

class SelectSelector extends BaseCardSelector {
    constructor(properties) {
        super(properties);
        this.choices = properties.choices;
    }

    /** @override */
    hasEnoughTargets(context) {
        return _.any(this.choices, (condition) => condition(context));
    }

    /** @override */
    defaultActivePromptTitle() {
        return 'Select one';
    }
}

module.exports = SelectSelector;
