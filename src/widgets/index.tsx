import { AppEvents, declareIndexPlugin, ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';
import axios from 'axios';

type Goal = {
  slug: string;
};

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

  // Register a sidebar widget.
  // await plugin.app.registerWidget('sample_widget', WidgetLocation.RightSidebar, {
  //   dimensions: { height: 'auto', width: '100%' },
  // });

  // Register event handlers
  plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, async (e) => {
    const yyyymmdd = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const prev: number = (await plugin.storage.getSynced(yyyymmdd)) || 0;
    const next = prev + 1;

    await plugin.storage.setSynced(yyyymmdd, next);

    const bmuser = await plugin.settings.getSetting('bmuser');
    const bmtoken = await plugin.settings.getSetting('bmtoken');
    const goalReviews = await plugin.settings.getSetting('goal-reviews');

    if (!goalReviews || !bmuser || !bmtoken) return;

    const url = `https://www.beeminder.com/api/v1/users/${bmuser}/goals/${goalReviews}/datapoints.json?auth_token=${bmtoken}`;

    axios.post(url, {
      daystamp: yyyymmdd,
      value: next,
      comment: 'via RemNote Beeminder plugin',
    });
  });
}

async function onDeactivate(plugin: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
