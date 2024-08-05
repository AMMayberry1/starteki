import type { AbilityContext } from '../../AbilityContext.js';
import CardAbility from './CardAbility.js';
import { AbilityTypes, CardTypes, EffectNames, Phases } from '../Constants.js';
import type { ActionProps } from '../../Interfaces.js';
import type BaseCard from '../card/basecard.js';
import type Game from '../Game.js';

/**
 * Represents an action ability provided by card text.
 *
 * Properties:
 * title        - string that is used within the card menu associated with this
 *                action.
 * condition    - optional function that should return true when the action is
 *                allowed, false otherwise. It should generally be used to check
 *                if the action can modify game state (step #1 in ability
 *                resolution in the rules).
 * cost         - object or array of objects representing the cost required to
 *                be paid before the action will activate. See Costs.
 * phase        - string representing which phases the action may be executed.
 *                Defaults to 'any' which allows the action to be executed in
 *                any phase.
 * location     - string indicating the location the card should be in in order
 *                to activate the action. Defaults to 'play area'.
 * limit        - optional AbilityLimit object that represents the max number of
 *                uses for the action as well as when it resets.
 * max          - optional AbilityLimit object that represents the max number of
 *                times the ability by card title can be used. Contrast with
 *                `limit` which limits per individual card.
 * anyPlayer    - boolean indicating that the action may be executed by a player
 *                other than the card's controller. Defaults to false.
 * clickToActivate - boolean that indicates the action should be activated when
 *                   the card is clicked.
 */
export class CardActionAbility extends CardAbility {
    abilityType = AbilityTypes.Action;

    anyPlayer: boolean;
    doesNotTarget: boolean;
    phase: string;
    evenDuringDynasty: boolean;

    condition?: (context?: AbilityContext) => boolean;

    constructor(game: Game, card: BaseCard, properties: ActionProps) {
        super(game, card, properties);

        this.phase = properties.phase ?? 'any';
        this.evenDuringDynasty = properties.evenDuringDynasty ?? false;
        this.anyPlayer = properties.anyPlayer ?? false;
        this.condition = properties.condition;
        this.doesNotTarget = (properties as any).doesNotTarget;
    }

    meetsRequirements(context: AbilityContext = this.createContext(), ignoredRequirements = []) {
        if (!ignoredRequirements.includes('location') && !this.isInValidLocation(context)) {
            return 'location';
        }

        if (!ignoredRequirements.includes('phase') && this.phase !== 'any' && this.phase !== this.game.currentPhase) {
            return 'phase';
        }

        const canOpponentTrigger =
            this.card.anyEffect(EffectNames.CanBeTriggeredByOpponent) &&
            this.abilityType !== AbilityTypes.ForcedInterrupt &&
            this.abilityType !== AbilityTypes.ForcedReaction;
        const canPlayerTrigger = this.anyPlayer || context.player === this.card.controller || canOpponentTrigger;
        if (!ignoredRequirements.includes('player') && this.card.type !== CardTypes.Event && !canPlayerTrigger) {
            return 'player';
        }

        if (!ignoredRequirements.includes('condition') && this.condition && !this.condition(context)) {
            return 'condition';
        }

        return super.meetsRequirements(context, ignoredRequirements);
    }

    isAction() {
        return true;
    }
}