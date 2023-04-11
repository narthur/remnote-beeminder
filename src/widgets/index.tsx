import {
  AppEventListerKey,
  AppEvents,
  declareIndexPlugin,
  ReactRNPlugin,
  WidgetLocation,
} from '@remnote/plugin-sdk';
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

  const bmuser = await plugin.settings.getSetting('bmuser');
  const bmtoken = await plugin.settings.getSetting('bmtoken');
  const url = `https://www.beeminder.com/api/v1/users/${bmuser}/goals.json?auth_token=${bmtoken}`;
  const { data } = await axios.get(url);
  const slugs = data.map((g: Goal) => g.slug);

  slugs.sort();

  const options = slugs.map((s: string) => ({ key: s, value: s, label: s }));

  await plugin.settings.registerDropdownSetting({
    id: 'goal-reviews',
    title: 'Beeminder goal for review count',
    options,
  });

  await plugin.settings.registerDropdownSetting({
    id: 'goal-edits',
    title: 'Beeminder goal for edit count',
    options,
  });

  // // A command that inserts text into the editor if focused.
  // await plugin.app.registerCommand({
  //   id: 'editor-command',
  //   name: 'Editor Command',
  //   action: async () => {
  //     plugin.editor.insertPlainText('Hello World!');
  //   },
  // });

  // // Show a toast notification to the user.
  // await plugin.app.toast("I'm a toast!");

  // Register a sidebar widget.
  await plugin.app.registerWidget('sample_widget', WidgetLocation.RightSidebar, {
    dimensions: { height: 'auto', width: '100%' },
  });

  // Register event handlers
  plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, async (e) => {
    plugin.app.toast('Card completed!');
    console.log('QueueCompleteCard', e);
    console.log({
      streak: '',
      remaining: '',
    });
  });

  plugin.event.addListener(AppEvents.QueueEnter, undefined, async (e) => {
    plugin.app.toast('Queue entered!');
    console.log('QueueEnter', e);
  });

  plugin.event.addListener(AppEvents.QueueLoadCard, undefined, async (e) => {
    plugin.app.toast('Card loaded!');
    console.log('QueueLoadCard', e);
  });

  plugin.event.addListener(AppEvents.QueueExit, undefined, async (e) => {
    plugin.app.toast('Queue exited!');
    console.log('QueueExit', e);
  });

  // useAPIEventListener(AppEvents.QueueCompleteCard, 'bm_queue_complete_card', async (e) => {
  //   console.log('QueueCompleteCard', e);
  // });
}

async function onDeactivate(plugin: ReactRNPlugin) {
  // plugin.event.removeListener('QueueCompleteCard', 'bm-queue-complete-card');
  // plugin.event.removeListener('QueueEnter', 'bm-queue-enter');
  // plugin.event.removeListener('QueueLoadCard', 'bm-queue-load-card');
  // plugin.event.removeListener('QueueExit', 'bm-queue-exit');
}

declareIndexPlugin(onActivate, onDeactivate);
