import {
  declareIndexPlugin,
  ReactRNPlugin,
  WidgetLocation,
} from "@remnote/plugin-sdk";

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.app.registerWidget("hello-world", WidgetLocation.RightSidebar, {
    dimensions: {
      width: 300,
      height: "auto",
    },
  });
}

async function onDeactivate() {
  // TODO
}

declareIndexPlugin(onActivate, onDeactivate);
