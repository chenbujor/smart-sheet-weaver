import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Moon, Sunrise } from 'lucide-react';
import type { Character } from '@/lib/types';
import type { Derived } from '@/lib/rules';
import { useAppStore } from '@/lib/store';
import { CLASSES } from '@/lib/srd';
import { abilityMod } from '@/lib/rules';
import { toast } from 'sonner';

interface Props { character: Character; derived: Derived }

export const RestControls = ({ character: c, derived: d }: Props) => {
  const shortRest = useAppStore((s) => s.shortRest);
  const longRest = useAppStore((s) => s.longRest);
  const [open, setOpen] = useState(false);
  const [diceToSpend, setDiceToSpend] = useState(1);
  const cls = CLASSES.find((x) => x.id === c.classId);
  const die = cls?.hitDie ?? 8;
  const conMod = abilityMod(c.abilities.con);

  const rollDice = (count: number) => {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.max(1, Math.floor(Math.random() * die) + 1) + conMod;
    }
    return total;
  };

  const handleShort = () => {
    const cap = Math.min(diceToSpend, d.hitDiceRemaining);
    if (cap <= 0) {
      toast.error('No hit dice remaining');
      return;
    }
    const rolled = rollDice(cap);
    shortRest(c.id, { rolled, count: cap });
    toast.success(`Short rest: spent ${cap} hit di${cap === 1 ? 'e' : 'ce'}, recovered ${rolled} HP`);
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="border-ink/40 bg-parchment-light hover:bg-secondary">
            <Sunrise className="mr-1.5 h-4 w-4" /> Short Rest
          </Button>
        </DialogTrigger>
        <DialogContent className="parchment-card">
          <DialogHeader>
            <DialogTitle className="font-display text-oxblood-deep">Short Rest</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-faded">
            Spend hit dice (d{die}+{conMod >= 0 ? `+${conMod}` : conMod} CON). Resets short-rest features
            {cls?.caster === 'pact' ? ' and pact slots' : ''}.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm">Hit dice to spend:</span>
            <Input
              type="number"
              min={0}
              max={d.hitDiceRemaining}
              value={diceToSpend}
              onChange={(e) => setDiceToSpend(Math.max(0, Math.min(d.hitDiceRemaining, parseInt(e.target.value || '0', 10))))}
              className="w-20"
            />
            <span className="text-xs text-ink-faded">({d.hitDiceRemaining} available)</span>
          </div>
          <DialogFooter>
            <Button onClick={handleShort} className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep">
              Take Short Rest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        className="bg-royal text-primary-foreground hover:opacity-90"
        onClick={() => {
          longRest(c.id);
          toast.success('Long rest taken — fully restored');
        }}
      >
        <Moon className="mr-1.5 h-4 w-4" /> Long Rest
      </Button>
    </div>
  );
};
