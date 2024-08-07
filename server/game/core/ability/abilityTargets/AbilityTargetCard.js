const _ = require('underscore');

const CardSelector = require('../../cardSelector/CardSelector.js');
const { Stage, RelativePlayer, EffectName, TargetMode } = require('../../Constants.js');

class AbilityTargetCard {
    constructor(name, properties, ability) {
        this.name = name;
        this.properties = properties;
        for (let gameSystem of this.properties.gameSystem) {
            // TODO: is this ever actually used? need to consolidate how targeting is done
            gameSystem.setDefaultTargetFn((context) => context.targets[name]);
        }
        this.selector = this.getSelector(properties);
        this.dependentTarget = null;
        this.dependentCost = null;
        if (this.properties.dependsOn) {
            let dependsOnTarget = ability.targets.find((target) => target.name === this.properties.dependsOn);
            dependsOnTarget.dependentTarget = this;
        }
    }

    getSelector(properties) {
        let cardCondition = (card, context) => {
            let contextCopy = this.getContextCopy(card, context);
            if (context.stage === Stage.PreTarget && this.dependentCost && !this.dependentCost.canPay(contextCopy)) {
                return false;
            }
            return (!properties.cardCondition || properties.cardCondition(card, contextCopy)) &&
                   (!this.dependentTarget || this.dependentTarget.hasLegalTarget(contextCopy)) &&
                   (properties.gameSystem.length === 0 || properties.gameSystem.some((gameSystem) => gameSystem.hasLegalTarget(contextCopy)));
        };
        return CardSelector.for(Object.assign({}, properties, { cardCondition: cardCondition, targets: true }));
    }

    getContextCopy(card, context) {
        let contextCopy = context.copy();
        contextCopy.targets[this.name] = card;
        if (this.name === 'target') {
            contextCopy.target = card;
        }
        return contextCopy;
    }

    canResolve(context) {
        // if this depends on another target, that will check hasLegalTarget already
        return !!this.properties.dependsOn || this.hasLegalTarget(context);
    }

    hasLegalTarget(context) {
        return this.selector.optional || this.selector.hasEnoughTargets(context, this.getChoosingPlayer(context));
    }

    getGameAction(context) {
        return this.properties.gameSystem.filter((gameSystem) => gameSystem.hasLegalTarget(context));
    }

    getAllLegalTargets(context) {
        return this.selector.getAllLegalTargets(context, this.getChoosingPlayer(context));
    }

    resolve(context, targetResults) {
        if (targetResults.cancelled || targetResults.payCostsFirst || targetResults.delayTargeting) {
            return;
        }
        let player = context.choosingPlayerOverride || this.getChoosingPlayer(context);
        if (player === context.player.opponent && context.stage === Stage.PreTarget) {
            targetResults.delayTargeting = this;
            return;
        }
        if (context.player.autoSingleTarget) {
            let legalTargets = this.selector.getAllLegalTargets(context, player);
            if (legalTargets.length === 1) {
                context.targets[this.name] = legalTargets[0];
                if (this.name === 'target') {
                    context.target = legalTargets[0];
                }
                return;
            }
        }
        let otherProperties = _.omit(this.properties, 'cardCondition', 'player');

        let buttons = [];
        let waitingPromptTitle = '';
        if (context.stage === Stage.PreTarget) {
            if (!targetResults.noCostsFirstButton) {
                buttons.push({ text: 'Pay costs first', arg: 'costsFirst' });
            }
            buttons.push({ text: 'Cancel', arg: 'cancel' });
            if (context.ability.abilityType === 'action') {
                waitingPromptTitle = 'Waiting for opponent to take an action or pass';
            } else {
                waitingPromptTitle = 'Waiting for opponent';
            }
        }
        let mustSelect = this.selector.getAllLegalTargets(context, player).filter((card) =>
            card.getEffects(EffectName.MustBeChosen).some((restriction) => restriction.isMatch('target', context))
        );
        let promptProperties = {
            waitingPromptTitle: waitingPromptTitle,
            context: context,
            selector: this.selector,
            buttons: buttons,
            mustSelect: mustSelect,
            onSelect: (player, card) => {
                context.targets[this.name] = card;
                if (this.name === 'target') {
                    context.target = card;
                }
                return true;
            },
            onCancel: () => {
                targetResults.cancelled = true;
                return true;
            },
            onMenuCommand: (player, arg) => {
                if (arg === 'costsFirst') {
                    targetResults.payCostsFirst = true;
                    return true;
                }
                return true;
            }
        };
        context.game.promptForSelect(player, Object.assign(promptProperties, otherProperties));
    }

    checkTarget(context) {
        if (!context.targets[this.name]) {
            return false;
        } else if (context.choosingPlayerOverride && this.getChoosingPlayer(context) === context.player) {
            return false;
        }
        let cards = context.targets[this.name];
        if (!Array.isArray(cards)) {
            cards = [cards];
        }
        return (cards.every((card) => this.selector.canTarget(card, context, context.choosingPlayerOverride || this.getChoosingPlayer(context))) &&
                this.selector.hasEnoughSelected(cards, context) && !this.selector.hasExceededLimit(cards, context));
    }

    getChoosingPlayer(context) {
        let playerProp = this.properties.player;
        if (typeof playerProp === 'function') {
            playerProp = playerProp(context);
        }
        return playerProp === RelativePlayer.Opponent ? context.player.opponent : context.player;
    }

    hasTargetsChosenByInitiatingPlayer(context) {
        if (this.getChoosingPlayer(context) === context.player && (this.selector.optional || this.selector.hasEnoughTargets(context, context.player.opponent))) {
            return true;
        }
        return !this.properties.dependsOn && this.checkGameActionsForTargetsChosenByInitiatingPlayer(context);
    }

    checkGameActionsForTargetsChosenByInitiatingPlayer(context) {
        return this.getAllLegalTargets(context).some((card) => {
            let contextCopy = this.getContextCopy(card, context);
            if (this.properties.gameSystem.some((action) => action.hasTargetsChosenByInitiatingPlayer(contextCopy))) {
                return true;
            } else if (this.dependentTarget) {
                return this.dependentTarget.checkGameActionsForTargetsChosenByInitiatingPlayer(contextCopy);
            }
            return false;
        });
    }
}

module.exports = AbilityTargetCard;
