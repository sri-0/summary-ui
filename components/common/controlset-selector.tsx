"use client";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { errorMessage } from "@/lib/api/client";
import { useMe } from "@/lib/api/me";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { ChevronsUpDownIcon, ShieldIcon } from "lucide-react";
import { useState } from "react";

/** Picks the control set requests run under: one of the signed-in user's own
 *  (GET /v1/me). Nothing is selected until the user picks; the choice is kept
 *  across reloads (stores/ui-store.ts) and every request then carries it as
 *  X-Control-Set. */
export function ControlsetSelector() {
  const [open, setOpen] = useState(false);
  const me = useMe();
  const selected = useUiStore((s) => s.controlset);
  const setControlset = useUiStore((s) => s.setControlset);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Control set: ${selected ?? "none"}`} className={cn(!selected && "text-muted-foreground")}>
          <ShieldIcon data-icon="inline-start" />
          {selected ? `Control set · ${selected}` : "Pick a control set"}
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-60" />
        </Button>
      </PopoverTrigger>
      {open && (
        <PopoverContent align="end" className="w-56 p-0">
          <Command>
            <CommandInput placeholder="Search control sets…" />
            <CommandList>
              <CommandEmpty>{me.isPending ? "Loading…" : me.error ? errorMessage(me.error) : "No control sets."}</CommandEmpty>
              <CommandGroup>
                {me.data?.controlsets.map((id) => (
                  <CommandItem
                    key={id}
                    value={id}
                    data-checked={selected === id}
                    onSelect={() => {
                      setControlset(id);
                      setOpen(false);
                    }}
                  >
                    {id}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
