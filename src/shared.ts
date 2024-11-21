import { RNPlugin, Rem, Card } from '@remnote/plugin-sdk';
import axios from 'axios';

// Type definition for Int
export type Int = number & { readonly __int__: unique symbol };
const asInt = (n: number): Int => Math.floor(n) as Int;

export function makeDaystamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export const BM_IDS = {
  reviewCount: 'bm-review-count',
  editCount: 'bm-edit-count',
  authUser: 'bm-auth-user',
  authToken: 'bm-auth-token',
  goalReviews: 'bm-goal-reviews',
  goalEdits: 'bm-goal-edits',
  widget: 'bm-widget',
  enableLogging: 'bm-enable-logging',
} as const;

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




// Get maintained progress (cards that are started and caught up)
export async function getMaintainedProgress(plugin: RNPlugin): Promise<Int> {
  const allCards: Card[] = await plugin.card.getAll();

  const maintainedCards = allCards.filter(card => {
    if (!card.lastRepetitionTime) return false; // Filter out unstarted
    if (!card.nextRepetitionTime) return false; // Filter out disabled
    return card.nextRepetitionTime > Date.now(); // Only count if caught up
  });

  return asInt(maintainedCards.length);
}

// Update syncBeeminderData to use maintained progress
export async function syncBeeminderData(
  countId: string, 
  goalId: string,
  plugin: RNPlugin
): Promise<boolean> {
  await logMessage(`syncBeeminderData started for countId: ${countId}, goalId: ${goalId}`, plugin);

  const bmuser = await plugin.settings.getSetting(BM_IDS.authUser);
  const bmtoken = await plugin.settings.getSetting(BM_IDS.authToken);
  const slug = await plugin.settings.getSetting(goalId);

  if (!slug || !bmuser || !bmtoken) {
    await logMessage(`Missing settings: slug=${slug}, bmuser=${bmuser}, bmtoken=${bmtoken}`, plugin);
    return false;
  }

  const url = `https://www.beeminder.com/api/v1/users/${bmuser}/goals/${slug}/datapoints.json?auth_token=${bmtoken}`;
  await logMessage(`Beeminder API URL: ${url}`, plugin);

  const currentCount: Int = await getMaintainedProgress(plugin);
  await logMessage(`Current maintained progress count: ${currentCount}`, plugin);

  const latestDatapoint = await getLatestDatapoint(url);
  await logMessage(`Latest Beeminder datapoint: ${latestDatapoint}`, plugin);
  
  // Only post if value has changed
  if (latestDatapoint && (asInt(latestDatapoint.value) === currentCount)) {
    await logMessage('Count unchanged, skipping sync', plugin);
    return false;
  }

  const today = makeDaystamp();
  const requestId = `${countId}-${today}-${Date.now()}`;
  await logMessage(`Posting to ${bmuser}/${slug} with value: ${currentCount}, requestId: ${requestId}`, plugin);
  
  try {
    const postData = {
      daystamp: today,
      value: currentCount,
      comment: 'via RemNote Beeminder plugin',
      requestid: requestId,
    };
    await logMessage(`Post data: ${JSON.stringify(postData)}`, plugin);
    
    const response = await axios.post(url, postData);
    await logMessage(`Beeminder API response: ${JSON.stringify(response.data)}`, plugin);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      await logMessage(`Error posting to Beeminder: ${error.message}`, plugin);
      await logMessage(`Error response: ${JSON.stringify(error.response?.data)}`, plugin);
    } else {
      await logMessage(`Unknown error posting to Beeminder: ${error}`, plugin);
    }
    return false;
  }
}

// Get the latest datapoint from Beeminder to check if the count has changed
async function getLatestDatapoint(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    const datapoints = response.data;
    return datapoints.length > 0 ? datapoints[0] : null;
  } catch (error) {
    console.error('Error fetching latest datapoint:', error);
    return null;
  }
}

