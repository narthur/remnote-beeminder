import { RNPlugin, Rem } from '@remnote/plugin-sdk';
import axios from 'axios';

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

export async function syncBeeminderData(
  countId: string,
  goalId: string,
  plugin: RNPlugin
): Promise<boolean> {
  await logMessage('syncBeeminderData', plugin);

  const prev = await getCount(countId, plugin);
  const value = prev + 1;

  await logMessage(`Setting ${countId} to ${value}`, plugin);
  await plugin.storage.setSynced(countId, value);

  const bmuser = await plugin.settings.getSetting(BM_IDS.authUser);
  const bmtoken = await plugin.settings.getSetting(BM_IDS.authToken);
  const slug = await plugin.settings.getSetting(goalId);

  if (!slug || !bmuser || !bmtoken) {
    await logMessage('Missing settings', plugin);
    return false;
  }

  const url = `https://www.beeminder.com/api/v1/users/${bmuser}/goals/${slug}/datapoints.json?auth_token=${bmtoken}`;

  await logMessage(`Posting to ${bmuser}/${slug}`, plugin);
  await axios.post(url, {
    daystamp: makeDaystamp(),
    value,
    comment: 'via RemNote Beeminder plugin',
    requestid: countId,
  });

  return true;
}

async function getCount(key: string, plugin: RNPlugin): Promise<number> {
  return (await plugin.storage.getSynced(key)) || 0;
}
