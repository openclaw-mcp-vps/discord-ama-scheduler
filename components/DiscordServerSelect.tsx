"use client";

import { Select } from "@/components/ui/select";

export interface DiscordServerOption {
  id: string;
  name: string;
}

interface DiscordServerSelectProps {
  servers: DiscordServerOption[];
  value: string;
  onChange: (value: string) => void;
}

export function DiscordServerSelect({ servers, value, onChange }: DiscordServerSelectProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="guildId" className="text-sm font-medium text-slate-200">
        Discord server
      </label>
      <Select id="guildId" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select a server you can manage</option>
        {servers.map((server) => (
          <option key={server.id} value={server.id}>
            {server.name}
          </option>
        ))}
      </Select>
      <p className="text-xs text-slate-400">Only servers where your account has Manage Server permission appear here.</p>
    </div>
  );
}
