import { RNPlugin, Rem } from '@remnote/plugin-sdk';

export function makeDaystamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function makeKey(prefix: string): string {
  return `${prefix}${makeDaystamp()}`;
}

export const BM_IDS = {
  reviewCount: makeKey('bm-review-count-'),
  editCount: makeKey('bm-edit-count-'),
  authUser: 'bm-auth-user',
  authToken: 'bm-auth-token',
  goalReviews: 'bm-goal-reviews',
  goalEdits: 'bm-goal-edits',
  widget: 'bm-widget',
  enableLogging: 'bm-enable-logging',
};

export async function getAncestorTextTags(rem: Rem): Promise<string[]> {
  return (await rem.ancestorTagRem())
    .map((t) => t.text?.toString())
    .filter((v): v is string => !!v);
}

export async function shouldCountEdits(rem: Rem): Promise<boolean> {
  return (await getAncestorTextTags(rem)).includes('BmCountEdits');
}

export async function getLogRem(plugin: RNPlugin): Promise<Rem | undefined> {
  const enabled = await plugin.settings.getSetting(BM_IDS.enableLogging);

  if (!enabled) return;

  const title = 'Beeminder Integration Logs';

  return (
    (await plugin.rem.findByName([title], null)) ??
    (await plugin.rem.createSingleRemWithMarkdown(title))
  );
}

export async function logMessage(message: string, plugin: RNPlugin): Promise<void> {
  const rem = await getLogRem(plugin);

  if (!rem) return;

  const entry = await plugin.rem.createSingleRemWithMarkdown(`${new Date()}: ${message}`);

  await entry?.setParent(rem);
}
