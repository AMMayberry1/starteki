const _ = require('underscore');
const { AbilityContext } = require('../../ability/AbilityContext.js');
const EffectSource = require('../../effect/EffectSource.js');
const { UiPrompt } = require('./UiPrompt.js');

/**
 * General purpose menu prompt. Takes a choices object with menu options and
 * a handler for each. Handlers should return true in order to complete the
 * prompt.
 *
 * The properties option object may contain the following:
 * choices            - an array of titles for menu buttons
 * handlers           - an array of handlers corresponding to the menu buttons
 * choiceHandler      - handler which is called when a choice button is clicked
 * activePromptTitle  - the title that should be used in the prompt for the
 *                      choosing player.
 * waitingPromptTitle - the title to display for opponents.
 * source             - what is at the origin of the user prompt, usually a card;
 *                      used to provide a default waitingPromptTitle, if missing
 * cards              - a list of cards to display as buttons with mouseover support
 * cardCondition      - disables the prompt buttons for any cards which return false
 * cardHandler        - handler which is called when a card button is clicked
 */
class HandlerMenuPrompt extends UiPrompt {
    constructor(game, player, properties) {
        super(game);
        this.player = player;
        if (_.isString(properties.source)) {
            properties.source = new EffectSource(game, properties.source);
        } else if (properties.context && properties.context.source) {
            properties.source = properties.context.source;
        }
        if (properties.source && !properties.waitingPromptTitle) {
            properties.waitingPromptTitle = 'Waiting for opponent to use ' + properties.source.name;
        } else if (!properties.source) {
            properties.source = new EffectSource(game);
        }
        this.properties = properties;
        this.cardCondition = properties.cardCondition || (() => true);
        this.context = properties.context || new AbilityContext({ game: game, player: player, source: properties.source });
    }

    /** @override */
    activeCondition(player) {
        return player === this.player;
    }

    /** @override */
    activePrompt() {
        let buttons = [];
        if (this.properties.cards) {
            let cardQuantities = {};
            _.each(this.properties.cards, (card) => {
                if (cardQuantities[card.id]) {
                    cardQuantities[card.id] += 1;
                } else {
                    cardQuantities[card.id] = 1;
                }
            });
            let cards = _.uniq(this.properties.cards, (card) => card.id);
            buttons = _.map(cards, (card) => {
                let text = card.name;
                if (cardQuantities[card.id] > 1) {
                    text = text + ' (' + cardQuantities[card.id].toString() + ')';
                }
                return { text: text, arg: card.id, card: card, disabled: !this.cardCondition(card, this.context) };
            });
        }
        buttons = buttons.concat(_.map(this.properties.choices, (choice, index) => {
            return { text: choice, arg: index };
        }));
        if (this.game.manualMode && (!this.properties.choices || this.properties.choices.every((choice) => choice !== 'Cancel'))) {
            buttons = buttons.concat({ text: 'Cancel Prompt', arg: 'cancel' });
        }
        return {
            menuTitle: this.properties.activePromptTitle || 'Select one',
            buttons: buttons,
            controls: this.getAdditionalPromptControls(),
            promptTitle: this.properties.source.name
        };
    }

    getAdditionalPromptControls() {
        if (this.properties.controls && this.properties.controls.type === 'targeting') {
            return [{
                type: 'targeting',
                source: this.properties.source.getShortSummary(),
                targets: this.properties.controls.targets.map((target) => target.getShortSummaryForControls(this.player))
            }];
        }
        if (this.context.source.type === '') {
            return [];
        }
        let targets = this.context.targets ? Object.values(this.context.targets) : [];
        targets = targets.reduce((array, target) => array.concat(target), []);
        if (this.properties.target) {
            targets = Array.isArray(this.properties.target) ? this.properties.target : [this.properties.target];
        }
        if (targets.length === 0 && this.context.event && this.context.event.card) {
            targets = [this.context.event.card];
        }
        return [{
            type: 'targeting',
            source: this.context.source.getShortSummary(),
            targets: targets.map((target) => target.getShortSummaryForControls(this.player))
        }];
    }

    /** @override */
    waitingPrompt() {
        return { menuTitle: this.properties.waitingPromptTitle || 'Waiting for opponent' };
    }

    /** @override */
    menuCommand(player, arg) {
        if (_.isString(arg)) {
            if (arg === 'cancel') {
                this.complete();
                return true;
            }
            let card = _.find(this.properties.cards, (card) => card.id === arg);
            if (card && this.properties.cardHandler) {
                this.properties.cardHandler(card);
                this.complete();
                return true;
            }
            return false;
        }

        if (this.properties.choiceHandler) {
            this.properties.choiceHandler(this.properties.choices[arg]);
            this.complete();
            return true;
        }

        if (!this.properties.handlers[arg]) {
            return false;
        }

        this.properties.handlers[arg]();
        this.complete();

        return true;
    }
}

module.exports = HandlerMenuPrompt;
