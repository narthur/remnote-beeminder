const params = new URLSearchParams(window.location.search);
const root = document.getElementById("root");

if (!root) throw new Error("No root element found");

if (params.has("widgetName")) {
  const widgetName = params.get("widgetName");
  import(`./widgets/${widgetName}.tsx`).then(() => {
    const { initReact } = window.__plugin;
    initReact(window.__plugin, root, window.location.origin);
  });
} else {
  document.body.innerHTML =
    "No widget name provided. Please append ?widgetName=yourWidgetName to the URL.";
}

export {};
