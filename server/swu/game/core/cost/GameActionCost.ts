import type { AbilityContext } from '../ability/AbilityContext';
import type { Cost, Result } from '../../costs/CostLibrary';
import type { GameSystem } from '../gameSystem/GameSystem';

export class GameActionCost implements Cost {
    constructor(public action: GameSystem) {}

    getActionName(context: AbilityContext): string {
        return this.action.name;
    }

    canPay(context: AbilityContext): boolean {
        return this.action.hasLegalTarget(context);
    }

    addEventsToArray(events: any[], context: AbilityContext, result: Result): void {
        context.costs[this.action.name] = this.action.getProperties(context).target;
        this.action.addEventsToArray(events, context);
    }

    getCostMessage(context: AbilityContext): [string, any[]] {
        return this.action.getCostMessage(context);
    }
}
