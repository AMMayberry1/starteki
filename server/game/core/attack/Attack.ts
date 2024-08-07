import { GameObject } from '../GameObject';
import { EffectName, EventName, Location } from '../Constants';
import { isArena } from '../utils/EnumHelpers';
import { EventRegistrar } from '../event/EventRegistrar';
import type Game from '../Game';
import type Player from '../Player';
import { AbilityContext } from '../ability/AbilityContext';
import type Card from '../card/Card';
import Contract from '../utils/Contract';

export interface IAttackAbilities {
    saboteur: boolean;
}

enum AttackParticipant {
    Attacker,
    Target
}

type StatisticTotal = number;

export class Attack extends GameObject {
    // #modifiers = new WeakMap<Player, IAttackAbilities>();
    previousAttack: Attack;

    constructor(
        game: Game,
        public attacker: Card,
        public target: Card
    ) {
        super(game, 'Attack');
    }

    get participants(): undefined | Card[] {
        return [...[this.attacker], this.target];
    }

    isInvolved(card: Card): boolean {
        return (
            isArena(card.location) &&
            ([this.attacker as Card, this.target as Card].includes(card))
        );
    }

    getTotalsForDisplay(): string {
        const rawAttacker = this.getTotalPower(this.attacker);
        const rawTarget = this.getTotalPower(this.target);

        return `${this.attacker.name}: ${typeof rawAttacker === 'number' ? rawAttacker : 0} vs ${typeof rawTarget === 'number' ? rawTarget : 0}: ${this.target.name}`;
    }

    get attackerTotalPower(): number | null {
        return this.getTotalPower(this.attacker);
    }

    get defenderTotalPower(): number | null {
        return this.targetIsBase ? null : this.getTotalPower(this.target);
    }

    get targetIsBase(): boolean {
        return this.target.isBase;
    }

    // TODO: implement power modifiers (use Card.getPowerModifiers()), making sure to check if they are live for this specific attack
    private getTotalPower(involvedUnit: Card): StatisticTotal {
        if (!Contract.assertTrue(isArena(involvedUnit.location), `Unit ${involvedUnit.name} location is ${involvedUnit.location}, cannot participate in combat`)) {
            return null;
        }

        return involvedUnit.getBasePower();
    }
}
