import type { ClassDef, ConditionDef, SpellEntry, WeaponMastery } from './types';

export const CLASSES: ClassDef[] = [
  { id: 'barbarian', name: 'Barbarian', hitDie: 12, caster: 'none', primaryAbility: ['str'], saves: ['str', 'con'] },
  { id: 'bard', name: 'Bard', hitDie: 8, caster: 'full', primaryAbility: ['cha'], saves: ['dex', 'cha'] },
  { id: 'cleric', name: 'Cleric', hitDie: 8, caster: 'full', primaryAbility: ['wis'], saves: ['wis', 'cha'] },
  { id: 'druid', name: 'Druid', hitDie: 8, caster: 'full', primaryAbility: ['wis'], saves: ['int', 'wis'] },
  { id: 'fighter', name: 'Fighter', hitDie: 10, caster: 'none', primaryAbility: ['str', 'dex'], saves: ['str', 'con'] },
  { id: 'monk', name: 'Monk', hitDie: 8, caster: 'none', primaryAbility: ['dex', 'wis'], saves: ['str', 'dex'] },
  { id: 'paladin', name: 'Paladin', hitDie: 10, caster: 'half', primaryAbility: ['str', 'cha'], saves: ['wis', 'cha'] },
  { id: 'ranger', name: 'Ranger', hitDie: 10, caster: 'half', primaryAbility: ['dex', 'wis'], saves: ['str', 'dex'] },
  { id: 'rogue', name: 'Rogue', hitDie: 8, caster: 'none', primaryAbility: ['dex'], saves: ['dex', 'int'] },
  { id: 'sorcerer', name: 'Sorcerer', hitDie: 6, caster: 'full', primaryAbility: ['cha'], saves: ['con', 'cha'] },
  { id: 'warlock', name: 'Warlock', hitDie: 8, caster: 'pact', primaryAbility: ['cha'], saves: ['wis', 'cha'] },
  { id: 'wizard', name: 'Wizard', hitDie: 6, caster: 'full', primaryAbility: ['int'], saves: ['int', 'wis'] },
];

export const CONDITIONS: ConditionDef[] = [
  { id: 'blinded', name: 'Blinded', description: "You can't see, automatically failing ability checks that require sight. Attack rolls against you have Advantage, and your attack rolls have Disadvantage." },
  { id: 'charmed', name: 'Charmed', description: "You can't attack the charmer or target them with harmful effects. The charmer has Advantage on social ability checks against you." },
  { id: 'deafened', name: 'Deafened', description: "You can't hear, automatically failing ability checks that require hearing." },
  { id: 'exhaustion', name: 'Exhaustion', description: "Each level imposes a -2 penalty to D20 Tests (attack rolls, saves, ability checks) and reduces speed by 5 ft. Six levels = death. One level removed per long rest." },
  { id: 'frightened', name: 'Frightened', description: "Disadvantage on ability checks and attack rolls while the source is in line of sight; you can't willingly move closer to the source." },
  { id: 'grappled', name: 'Grappled', description: "Speed becomes 0. Ends if grappler is incapacitated or you're moved away by another effect." },
  { id: 'incapacitated', name: 'Incapacitated', description: "You can't take actions, bonus actions, or reactions. Your concentration is broken. You can't speak. Your initiative is treated as 0 if combat starts while you are incapacitated." },
  { id: 'invisible', name: 'Invisible', description: "Heavily obscured. You have the Surprise condition for initiative. Attacks against you have Disadvantage; your attacks have Advantage." },
  { id: 'paralyzed', name: 'Paralyzed', description: "Incapacitated, can't move/speak, auto-fails STR and DEX saves. Attacks have Advantage; hits within 5 ft are critical hits." },
  { id: 'petrified', name: 'Petrified', description: "Transformed into solid substance. Incapacitated, weight x10, ages no further. Resistance to all damage; immune to poison and disease." },
  { id: 'poisoned', name: 'Poisoned', description: "Disadvantage on attack rolls and ability checks." },
  { id: 'prone', name: 'Prone', description: "Only crawling movement. Disadvantage on attack rolls. Attacks within 5 ft have Advantage; ranged attacks have Disadvantage." },
  { id: 'restrained', name: 'Restrained', description: "Speed 0. Disadvantage on attack rolls and DEX saves. Attacks against you have Advantage." },
  { id: 'stunned', name: 'Stunned', description: "Incapacitated, can't move, can speak only falteringly. Auto-fail STR and DEX saves. Attacks have Advantage." },
  { id: 'unconscious', name: 'Unconscious', description: "Incapacitated, prone, drops what it holds. Auto-fail STR and DEX saves. Attacks have Advantage; hits within 5 ft are critical." },
  { id: 'surprised', name: 'Surprised', description: "Disadvantage on your initiative roll. Lasts only for the initiative roll." },
];

export const WEAPON_MASTERIES: WeaponMastery[] = [
  { id: 'cleave', name: 'Cleave', description: 'On a melee hit with this weapon, you can use the same attack roll against another creature within 5 ft of the first and within your reach. Damage = base weapon die without ability modifier. Once per turn.' },
  { id: 'graze', name: 'Graze', description: 'If your attack roll misses, you can deal damage to the target equal to the ability modifier used to make the attack roll. This damage is the same type as the weapon\'s damage.' },
  { id: 'nick', name: 'Nick', description: 'When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. Once per turn.' },
  { id: 'push', name: 'Push', description: 'On a hit, you can push the target up to 10 ft straight away from yourself if it is Large or smaller.' },
  { id: 'sap', name: 'Sap', description: 'On a hit, the target has Disadvantage on its next attack roll before the start of your next turn.' },
  { id: 'slow', name: 'Slow', description: "On a hit, the target's Speed is reduced by 10 ft until the start of your next turn. Doesn't stack." },
  { id: 'topple', name: 'Topple', description: 'On a hit, you can force the target to make a CON save (DC 8 + PB + ability mod). On a fail, it has the Prone condition.' },
  { id: 'vex', name: 'Vex', description: 'On a hit, you have Advantage on your next attack roll against the target before the end of your next turn.' },
];

// Small representative SRD spell sample (cantrip → L3) — full library expandable later
export const SAMPLE_SPELLS: SpellEntry[] = [
  {
    id: 'fire-bolt', name: 'Fire Bolt', level: 0, school: 'Evocation',
    castingTime: 'Action', range: '120 ft', components: 'V, S', duration: 'Instantaneous',
    description: 'Hurl a mote of fire at a creature or object within range. Make a ranged spell attack. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn\'t being worn or carried.',
    cantripScaling: { 5: '2d10', 11: '3d10', 17: '4d10' },
  },
  {
    id: 'sacred-flame', name: 'Sacred Flame', level: 0, school: 'Evocation',
    castingTime: 'Action', range: '60 ft', components: 'V, S', duration: 'Instantaneous',
    description: 'Flame-like radiance descends on a creature you can see. The target makes a DEX save, taking 1d8 radiant damage on a fail. The target gains no benefit from cover for this save.',
    cantripScaling: { 5: '2d8', 11: '3d8', 17: '4d8' },
  },
  {
    id: 'eldritch-blast', name: 'Eldritch Blast', level: 0, school: 'Evocation',
    castingTime: 'Action', range: '120 ft', components: 'V, S', duration: 'Instantaneous',
    description: 'A beam of crackling energy streaks toward a creature or object. Make a ranged spell attack. On a hit, the target takes 1d10 force damage.',
    cantripScaling: { 5: '2 beams', 11: '3 beams', 17: '4 beams' },
  },
  {
    id: 'mage-hand', name: 'Mage Hand', level: 0, school: 'Conjuration',
    castingTime: 'Action', range: '30 ft', components: 'V, S', duration: '1 minute',
    description: 'A spectral, floating hand appears at a point you choose within range. You can use your Action to control the hand: move up to 30 ft, manipulate objects, open doors/containers, retrieve items, pour contents.',
  },
  {
    id: 'cure-wounds', name: 'Cure Wounds', level: 1, school: 'Abjuration',
    castingTime: 'Action', range: 'Touch', components: 'V, S', duration: 'Instantaneous',
    description: 'A creature you touch regains hit points equal to 2d8 + your spellcasting ability modifier.',
    higherLevels: 'The healing increases by 2d8 for each spell slot level above 1.',
  },
  {
    id: 'shield', name: 'Shield', level: 1, school: 'Abjuration',
    castingTime: 'Reaction (when hit by attack or targeted by Magic Missile)', range: 'Self',
    components: 'V, S', duration: '1 round',
    description: 'An invisible barrier of magical force protects you. You gain a +5 bonus to AC, including against the triggering attack, and take no damage from Magic Missile.',
  },
  {
    id: 'magic-missile', name: 'Magic Missile', level: 1, school: 'Evocation',
    castingTime: 'Action', range: '120 ft', components: 'V, S', duration: 'Instantaneous',
    description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice you can see, dealing 1d4+1 force damage.',
    higherLevels: 'One additional dart for each spell slot level above 1.',
  },
  {
    id: 'healing-word', name: 'Healing Word', level: 1, school: 'Abjuration',
    castingTime: 'Bonus Action', range: '60 ft', components: 'V', duration: 'Instantaneous',
    description: 'A creature of your choice that you can see regains hit points equal to 1d4 + your spellcasting ability modifier.',
    higherLevels: 'The healing increases by 1d4 for each spell slot level above 1.',
  },
  {
    id: 'misty-step', name: 'Misty Step', level: 2, school: 'Conjuration',
    castingTime: 'Bonus Action', range: 'Self', components: 'V', duration: 'Instantaneous',
    description: 'Briefly surrounded by silvery mist, you teleport up to 30 ft to an unoccupied space you can see.',
  },
  {
    id: 'hold-person', name: 'Hold Person', level: 2, school: 'Enchantment',
    castingTime: 'Action', range: '60 ft', components: 'V, S, M', duration: 'Concentration, up to 1 minute',
    concentration: true,
    description: 'Choose a Humanoid you can see. The target makes a WIS save or has the Paralyzed condition for the duration. On subsequent turns, it can repeat the save at the end of each of its turns.',
    higherLevels: 'Target one additional Humanoid for each spell slot level above 2.',
  },
  {
    id: 'fireball', name: 'Fireball', level: 3, school: 'Evocation',
    castingTime: 'Action', range: '150 ft', components: 'V, S, M', duration: 'Instantaneous',
    description: 'A bright streak flashes from you to a point you choose. Each creature in a 20-ft-radius Sphere centered on that point makes a DEX save, taking 8d6 fire damage on a fail or half on success.',
    higherLevels: 'The damage increases by 1d6 for each spell slot level above 3.',
  },
  {
    id: 'counterspell', name: 'Counterspell', level: 3, school: 'Abjuration',
    castingTime: 'Reaction (when you see a creature within 60 ft cast a spell)', range: '60 ft',
    components: 'S', duration: 'Instantaneous',
    description: 'You attempt to interrupt a creature in the process of casting a spell. The target makes a CON save (DC 10 + spell\'s level). On a fail, the spell fizzles with no effect and the slot is wasted.',
  },
];

export const SPECIES = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling',
  'Dragonborn', 'Aasimar', 'Goliath', 'Orc',
];

export const BACKGROUNDS = [
  'Acolyte', 'Artisan', 'Charlatan', 'Criminal', 'Entertainer', 'Farmer',
  'Guard', 'Guide', 'Hermit', 'Merchant', 'Noble', 'Sage', 'Sailor', 'Scribe',
  'Soldier', 'Wayfarer',
];
