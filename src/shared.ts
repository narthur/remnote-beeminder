import { RNPlugin, Rem } from '@remnote/plugin-sdk';
import axios from 'axios';

export function makeDaystamp(): string {
  const now = new Date();
  if (now.getHours() < 3) {
    now.setDate(now.getDate() - 1); // Subtract one day if before 3am
  }
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// Remove this function
// function makeKey(prefix: string): string {
//   return `${prefix}${makeDaystamp()}`;
// }

export const BM_IDS = {
  reviewCount: 'bm-review-count',
  editCount: 'bm-edit-count',
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

  // Get the latest datapoint from Beeminder
  const latestDatapoint = await getLatestDatapoint(url);
  await logMessage(`Latest Beeminder datapoint: ${JSON.stringify(latestDatapoint)}`, plugin);
  const latestValue = latestDatapoint ? latestDatapoint.value : 0;
  await logMessage(`Latest Beeminder value: ${latestValue}`, plugin);

  // Get the current count from storage
  const currentCount = await getCount(countId, plugin);
  await logMessage(`Current count from storage: ${currentCount}`, plugin);

  // Calculate the difference
  const difference = currentCount - latestValue;
  await logMessage(`Calculated difference: ${difference}`, plugin);

  if (difference <= 0) {
    await logMessage('No new data to sync, exiting', plugin);
    return false;
  }

  const today = makeDaystamp();
  const requestId = `${countId}-${today}-${Date.now()}`;
  await logMessage(`Posting to ${bmuser}/${slug} with value: ${difference}, requestId: ${requestId}`, plugin);
  
  try {
    const postData = {
      daystamp: today,
      value: difference,
      comment: 'via RemNote Beeminder plugin',
      requestid: requestId,
    };
    await logMessage(`Post data: ${JSON.stringify(postData)}`, plugin);
    
    const response = await axios.post(url, postData);
    await logMessage(`Beeminder API response: ${JSON.stringify(response.data)}`, plugin);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      await logMessage(`Error posting to Beeminder: ${error.message}`, plugin);
      await logMessage(`Error response: ${JSON.stringify(error.response?.data)}`, plugin);
    } else {
      await logMessage(`Unknown error posting to Beeminder: ${error}`, plugin);
    }
    return false;
  }

  await logMessage('syncBeeminderData completed successfully', plugin);
  return true;
}

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

async function getCount(key: string, plugin: RNPlugin): Promise<number> {
  return (await plugin.storage.getSynced(key)) || 0;
}
