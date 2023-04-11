import {
  declareIndexPlugin,
  ReactRNPlugin,
  WidgetLocation,
} from "@remnote/plugin-sdk";

const params = new URLSearchParams(window.location.search);

function initPlugin() {
  // const { initReact } = window.__plugin;

  // const root = document.getElementById("root");

  // if (!root) throw new Error("No root element found");

  // initReact(window.__plugin, root, window.location.origin);

  async function onActivate(plugin: ReactRNPlugin) {
    console.log("custom onActivate");

    await plugin.settings.registerStringSetting({
      id: "name",
      title: "Name",
      defaultValue: "Bobe",
    });

    await plugin.app.registerWidget(
      "hello-world",
      WidgetLocation.RightSidebar,
      {
        dimensions: {
          width: 300,
          height: "auto",
        },
      }
    );
  }

  async function onDeactivate() {
    console.log("custom onDeactivate");
    // TODO
  }

  console.log("declaring index plugin");
  declareIndexPlugin(onActivate, onDeactivate);
}

if (params.has("widgetName")) {
  const widgetName = params.get("widgetName");
  import(`./widgets/${widgetName}.tsx`).then(initPlugin);
} else {
  document.body.innerHTML =
    "No widget name provided. Please append ?widgetName=yourWidgetName to the URL.";
}

export {};
