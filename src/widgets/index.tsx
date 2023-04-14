import {
  AppEvents,
  declareIndexPlugin,
  ReactRNPlugin,
  Rem,
  WidgetLocation,
} from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';
import axios from 'axios';
import debounce from 'debounce';
import { BM_IDS, makeDaystamp, shouldCountEdits } from '../shared';

async function onActivate(plugin: ReactRNPlugin) {
  // Register settings
  await plugin.settings.registerStringSetting({
    id: BM_IDS.authUser,
    title: 'Beeminder username',
    defaultValue: '',
  });

  await plugin.settings.registerStringSetting({
    id: BM_IDS.authToken,
    title: 'Beeminder auth token',
    defaultValue: '',
  });

  await plugin.settings.registerStringSetting({
    id: BM_IDS.goalReviews,
    title: 'Beeminder goal for review count',
    defaultValue: '',
  });

  await plugin.settings.registerStringSetting({
    id: BM_IDS.goalEdits,
    title: 'Beeminder goal for edit count',
    defaultValue: '',
  });

  // Register widgets
  await plugin.app.registerWidget(BM_IDS.widget, WidgetLocation.RightSidebar, {
    dimensions: {
      height: 'auto',
      width: '100%',
    },
  });

  // Register event handlers
  plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, () =>
    syncThrottled(BM_IDS.reviewCount, BM_IDS.goalReviews, plugin)
  );

  plugin.event.addListener(AppEvents.EditorTextEdited, undefined, async () => {
    const rem = await plugin.focus.getFocusedPortal();

    if (!rem) return;

    const shouldCount = await shouldCountEdits(rem);

    if (!shouldCount) return;

    await syncThrottled(BM_IDS.editCount, BM_IDS.goalEdits, plugin);
  });
}

const syncThrottled = debounce(syncBeeminderData, 1000);

async function getCount(key: string, plugin: ReactRNPlugin): Promise<number> {
  return (await plugin.storage.getSynced(key)) || 0;
}

async function syncBeeminderData(countId: string, goalId: string, plugin: ReactRNPlugin) {
  const prev = await getCount(countId, plugin);
  const value = prev + 1;

  await plugin.storage.setSynced(countId, value);

  const bmuser = await plugin.settings.getSetting(BM_IDS.authUser);
  const bmtoken = await plugin.settings.getSetting(BM_IDS.authToken);
  const slug = await plugin.settings.getSetting(goalId);

  if (!slug || !bmuser || !bmtoken) return;

  const url = `https://www.beeminder.com/api/v1/users/${bmuser}/goals/${slug}/datapoints.json?auth_token=${bmtoken}`;

  axios.post(url, {
    daystamp: makeDaystamp(),
    value,
    comment: 'via RemNote Beeminder plugin',
    requestid: countId,
  });
}

async function onDeactivate(plugin: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
