import { ReactRNPlugin, Rem } from '@remnote/plugin-sdk';

export function makeDaystamp(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

function makeKey(prefix: string): string {
  return `${prefix}${makeDaystamp()}`;
}

export const BM_IDS: Record<string, string> = {
  reviewCount: makeKey('bm-review-count-'),
  editCount: makeKey('bm-edit-count-'),
  authUser: 'bm-auth-user',
  authToken: 'bm-auth-token',
  goalReviews: 'bm-goal-reviews',
  goalEdits: 'bm-goal-edits',
  widget: 'bm-widget',
};

export async function shouldCountEdits(rem: Rem): Promise<boolean> {
  const tags = await rem.getTagRems();
  const shouldCount = tags.find((t) => t.text?.toString() === 'BmCountEdits');

  if (shouldCount) return true;

  const parent = await rem.getParentRem();

  if (parent) return shouldCountEdits(parent);

  return false;
}

export async function logMessage(message: string, plugin: ReactRNPlugin): Promise<void> {
  const title = 'Beeminder Integration Logs'
  const parent = await plugin.rem.findByName([title], null) ?? await plugin.rem.createSingleRemWithMarkdown(title);

  if (!parent) return;

  const entry = await plugin.rem.createSingleRemWithMarkdown(message);

  await entry?.setParent(parent);
}
