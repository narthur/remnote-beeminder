import { renderWidget, usePlugin, useTracker } from "@remnote/plugin-sdk";

function MyWidget() {
  const plugin = usePlugin();

  const name = useTracker(() => plugin.settings.getSetting<string>("name"));

  return <div>Hello, {name}</div>;
}

renderWidget(MyWidget);
