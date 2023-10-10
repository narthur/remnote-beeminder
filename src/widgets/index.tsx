import {
  AppEvents,
  declareIndexPlugin,
  EventCallbackFn,
  ReactRNPlugin,
  WidgetLocation,
} from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';
import debounce from 'debounce';
import {
  BM_IDS,
  getAncestorTextTags,
  logMessage,
  shouldCountEdits,
  syncBeeminderData,
} from '../shared';

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

  await plugin.settings.registerBooleanSetting({
    id: BM_IDS.enableLogging,
    title: 'Enable logging',
    defaultValue: false,
  });

  // Register widgets
  await plugin.app.registerWidget(BM_IDS.widget, WidgetLocation.RightSidebar, {
    dimensions: {
      height: 'auto',
      width: '100%',
    },
  });

  // Register event handlers
  addEventListener(
    'QueueCompleteCard',
    async () => {
      await logMessage('QueueCompleteCard', plugin);
      await syncBeeminderData(BM_IDS.reviewCount, BM_IDS.goalReviews, plugin);
    },
    plugin
  );

  addEventListener(
    'EditorTextEdited',
    async () => {
      await logMessage(`EditorTextEdited`, plugin);

      const rem = await plugin.focus.getFocusedPortal();

      if (!rem) {
        await logMessage('No focused portal', plugin);
        return;
      }

      const shouldCount = await shouldCountEdits(rem);

      if (!shouldCount) {
        const tags = await getAncestorTextTags(rem);
        await logMessage(
          `Should not count. ${tags.length ? `Tags: ${tags.join(', ')}` : 'No tags'}`,
          plugin
        );
        return;
      }

      await logMessage('Should count', plugin);
      await syncBeeminderData(BM_IDS.editCount, BM_IDS.goalEdits, plugin);
    },
    plugin
  );
}

function addEventListener(
  event: keyof typeof AppEvents,
  callback: EventCallbackFn,
  plugin: ReactRNPlugin
) {
  plugin.event.addListener(AppEvents[event], undefined, debounce(callback, 1000));
}

async function onDeactivate(plugin: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
