import { AppEvents, declareIndexPlugin, ReactRNPlugin, Rem } from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';
import axios from 'axios';
import debounce from 'debounce';

async function onActivate(plugin: ReactRNPlugin) {
  // Register settings
  await plugin.settings.registerStringSetting({
    id: 'bmuser',
    title: 'Beeminder username',
    defaultValue: '',
  });

  await plugin.settings.registerStringSetting({
    id: 'bmtoken',
    title: 'Beeminder auth token',
    defaultValue: '',
  });

  await plugin.settings.registerStringSetting({
    id: 'goal-reviews',
    title: 'Beeminder goal for review count',
    defaultValue: '',
  });

  await plugin.settings.registerStringSetting({
    id: 'goal-edits',
    title: 'Beeminder goal for edit count',
    defaultValue: '',
  });

  // Register event handlers
  plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, () =>
    syncThrottled('review-count-', 'goal-reviews', plugin)
  );

  plugin.event.addListener(AppEvents.EditorTextEdited, undefined, async () => {
    const rem = await plugin.focus.getFocusedPortal();

    if (!rem) return;

    const shouldCount = await shouldCountEdits(rem);

    if (!shouldCount) return;

    await syncThrottled('edit-count-', 'goal-edits', plugin);
  });
}

const syncThrottled = debounce(syncBeeminderData, 1000);

async function syncBeeminderData(keyPrefix: string, goalSetting: string, plugin: ReactRNPlugin) {
  const yyyymmdd = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const key = `${keyPrefix}${yyyymmdd}`;
  const prev: number = (await plugin.storage.getSynced(key)) || 0;
  const next = prev + 1;

  await plugin.storage.setSynced(key, next);

  const bmuser = await plugin.settings.getSetting('bmuser');
  const bmtoken = await plugin.settings.getSetting('bmtoken');
  const slug = await plugin.settings.getSetting(goalSetting);

  if (!slug || !bmuser || !bmtoken) return;

  const url = `https://www.beeminder.com/api/v1/users/${bmuser}/goals/${slug}/datapoints.json?auth_token=${bmtoken}`;

  axios.post(url, {
    daystamp: yyyymmdd,
    value: next,
    comment: 'via RemNote Beeminder plugin',
    requestid: key,
  });
}

async function shouldCountEdits(rem: Rem): Promise<boolean> {
  const tags = await rem.getTagRems();
  const shouldCount = tags.find((t) => t.text.toString() === 'BmCountEdits');

  if (shouldCount) return true;

  const parent = await rem?.getParentRem();

  if (parent) return shouldCountEdits(parent);

  return false;
}

async function onDeactivate(plugin: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
