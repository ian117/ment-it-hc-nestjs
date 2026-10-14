import { UnknownChannel } from '../errors';
import { ChannelName } from '../notification';
import { ChannelPolicy } from './channel-policy';

export class ChannelPolicyRegistry {
  private readonly policies = new Map<ChannelName, ChannelPolicy>();

  constructor(policies: ChannelPolicy[]) {
    for (const policy of policies) {
      if (this.policies.has(policy.channel)) {
        throw new Error(`Duplicate channel policy: ${policy.channel}`);
      }
      this.policies.set(policy.channel, policy);
    }
  }

  policy(channel: ChannelName): ChannelPolicy {
    const found = this.policies.get(channel);
    if (!found) throw new UnknownChannel(channel);
    return found;
  }

  has(channel: ChannelName): boolean {
    return this.policies.has(channel);
  }

  channels(): string[] {
    return [...this.policies.keys()];
  }
}
